from services.ChatLogic import (
    load_profile, load_stats, load_chat_history, save_chat_history,
    save_stats, generate_prompt, extract_reply_text, parse_stats
)
from flask import Blueprint, request, jsonify
import openai
import os
from datetime import datetime
import whisper
import tempfile

# ===== OpenAI / Whisper =====
client = openai.OpenAI(api_key="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")
_whisper = None
def _whisper_model():
    global _whisper
    if _whisper is None:
        _whisper = whisper.load_model("small")
    return _whisper

chatRoom_bp = Blueprint("chatRoom", __name__)
CHAR_NAME = "金珉奎"

# ===== 設定：歷史與摘要 =====
# 這裡不用精準 token，只用「字元數」估算長度，保守一些就好。
MAX_CHARS_TOTAL = 120_000   # 超過就開始摘要（rough 對應 128k token 上限的一部分）
KEEP_TAIL_TURNS = 24        # 即使摘要，也保留最近 24 則原文（約 12 個來回）
SUMMARY_TARGET_CHARS = 1200 # 濃縮後摘要長度目標

def _ensure_state(name: str):
    profile = load_profile(name)
    if not profile:
        return None, None, None
    stats = load_stats(name) or {"mood": "中立", "affection": "30", "last_chat_time": datetime.now().isoformat()}
    history = load_chat_history(name) or []
    return profile, stats, history

def _decay(stats: dict):
    try:
        last = datetime.fromisoformat(stats.get("last_chat_time"))
        days = (datetime.now() - last).days
        if days >= 2:
            stats["affection"] = str(max(0, int(stats.get("affection", "30")) - days * 2))
    except Exception:
        pass

def _filter_ua(history: list):
    """只保留 user/assistant 訊息"""
    return [m for m in history if m.get("role") in ("user", "assistant")]

def _estimate_chars(msgs: list):
    total = 0
    for m in msgs:
        total += len(str(m.get("content", "")))
    return total

def _summarize_history(older_msgs: list):
    """
    用模型把舊歷史濃縮成摘要（system 記憶片段）。
    這段不會存回歷史，只在本回合用來協助模型記住上下文。
    """
    if not older_msgs:
        return None

    # 把 older_msgs 簡單拼成「角色：內容」文本
    lines = []
    for m in older_msgs:
        who = "使用者" if m["role"] == "user" else CHAR_NAME
        content = str(m.get("content", ""))[:2000]  # 每則最多截 2000 字，避免太肥
        lines.append(f"{who}：{content}")
    raw = "\n".join(lines)

    prompt = (
        "請將以下對話濃縮成可供延續角色互動的摘要，保留：關係走向、衝突/和解、關鍵事件、承諾或界線、"
        "語氣/稱呼習慣與敏感點。不要逐字稿；控制在約 "
        f"{SUMMARY_TARGET_CHARS} 字內；用條列或短段落。以下是對話：\n\n" + raw
    )

    try:
        r = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "你是對話壓縮助手，擅長保留情感與關係線索的摘要。"},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,  # 摘要要穩定
            top_p=0.9,
        )
        summary = r.choices[0].message.content.strip()
        return {
            "role": "system",
            "content": (
                "【先前對話摘要（供延續記憶用，非逐字稿）】\n" + summary +
                "\n【以上為濃縮記憶；後續請延續其語氣、關係與界線】"
            )
        }
    except Exception:
        # 摘要失敗就不加
        return None

def _build_api_messages(profile, stats, full_history, user_input, context):
    """
    1) 先放你的角色 system prompt
    2) 若總長度過大 → 將「較舊部分」摘要成記憶，保留最近 KEEP_TAIL_TURNS 原文
    3) 接上最近原文歷史
    4) 最後加本回合 user 訊息
    """
    ua_history = _filter_ua(full_history)
    system_text = generate_prompt(profile, stats, context or "")
    base = [{"role": "system", "content": system_text}]

    # 估長度；若超過，做摘要
    if _estimate_chars(ua_history) > MAX_CHARS_TOTAL and len(ua_history) > KEEP_TAIL_TURNS:
        older = ua_history[:-KEEP_TAIL_TURNS]
        tail = ua_history[-KEEP_TAIL_TURNS:]
        mem = _summarize_history(older)
        if mem:
            base.append(mem)
        base += tail
    else:
        # 不超長 → 全部原文歷史
        base += ua_history

    base.append({"role": "user", "content": user_input})
    return base

# ===== 文字訊息：POST /chat =====
@chatRoom_bp.route("/chat", methods=["POST"])
def chat():
    print("收到前端請求")
    data = request.get_json(force=True) or {}
    user_input = (data.get("message") or data.get("text") or "").strip()
    context = data.get("context")

    profile, stats, history = _ensure_state(CHAR_NAME)
    if not profile:
        return jsonify({"error": f"角色 '{CHAR_NAME}' 不存在，請先建立角色資料。"}), 404

    _decay(stats)
    api_messages = _build_api_messages(profile, stats, history, user_input, context)

    try:
        resp = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=api_messages,
            temperature=0.7,
            top_p=0.9,
        )
        full_reply = resp.choices[0].message.content or ""
        reply_text = extract_reply_text(full_reply)

        # 只存 user/assistant，不存任何 system（包括摘要）
        history.append({"role": "user", "content": user_input})
        history.append({"role": "assistant", "content": full_reply})
        save_chat_history(CHAR_NAME, history)

        new_stats = parse_stats(full_reply, stats) or stats
        save_stats(CHAR_NAME, new_stats)

        return jsonify({"reply": reply_text, "stats": new_stats}), 200

    except Exception as e:
        print("❌ /chat error:", e)
        return jsonify({"error": "伺服器錯誤"}), 500

# ===== 圖片訊息：POST /chat/chat-image =====
@chatRoom_bp.route("/chat-image", methods=["POST"])
def chat_image():
    data = request.get_json(force=True) or {}
    image_base64 = data.get("image_base64", "")
    if not image_base64 or not image_base64.startswith("data:image"):
        return jsonify({"error": "請傳 data:image/...;base64,xxx"}), 400

    profile, stats, history = _ensure_state(CHAR_NAME)
    if not profile:
        return jsonify({"error": f"角色 '{CHAR_NAME}' 不存在"}), 404

    # 用 system +（若太長則）摘要 + 最近 6 則原文 當脈絡
    sys_text = generate_prompt(profile, stats, data.get("context") or "")
    api_msgs_for_image = [{"role": "system", "content": sys_text}]

    ua = _filter_ua(history)
    if _estimate_chars(ua) > MAX_CHARS_TOTAL and len(ua) > KEEP_TAIL_TURNS:
        mem = _summarize_history(ua[:-KEEP_TAIL_TURNS])
        if mem:
            api_msgs_for_image.append(mem)
        recent = ua[-6:]
    else:
        recent = ua[-6:]

    recent_lines = []
    for m in recent:
        if m["role"] == "user":
            recent_lines.append(f"使用者：{m['content']}")
        elif m["role"] == "assistant":
            recent_lines.append(f"{CHAR_NAME}：{m['content']}")
    ctx_text = "\n最近的對話紀錄：\n" + "\n".join(recent_lines) + "\n請根據以上脈絡，自然地回應這張圖片。"

    try:
        r = client.responses.create(
            model="gpt-4.1",  # 圖片建議用 gpt-4o
            input=[{
                "role": "user",
                "content": [
                    {"type": "input_text", "text": ctx_text},
                    {"type": "input_image", "image_url": image_base64},
                ],
            }],
            temperature=0.7,
            top_p=0.9,
        )
        full_reply = r.output_text.strip()
        reply_text = extract_reply_text(full_reply)

        history.append({"role": "user", "content": "[圖片訊息]"})
        history.append({"role": "assistant", "content": full_reply})
        save_chat_history(CHAR_NAME, history)

        new_stats = parse_stats(full_reply, stats) or stats
        save_stats(CHAR_NAME, new_stats)

        return jsonify({"reply": reply_text, "stats": new_stats}), 200

    except Exception as e:
        print("❌ /chat-image error:", e)
        return jsonify({
            "error": "圖片分析失敗",
            "detail": str(e)
        }), 500

# ===== 語音訊息：POST /chat/chat-vocal =====
@chatRoom_bp.route("/chat-vocal", methods=["POST"])
def chat_vocal():
    if "file" not in request.files:
        return jsonify({"error": "沒有上傳音檔檔案"}), 400

    audio_file = request.files["file"]
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        tmp.write(audio_file.read())
        tmp_path = tmp.name

    try:
        # 語音轉文字
        asr = _whisper_model().transcribe(tmp_path, language="zh")
        asr_text = (asr.get("text") or "").strip()

        # 文字校正
        corr = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "你是一個負責文字校正的助手。"},
                {"role": "user", "content": f"請在不改變意思前提下修正：{asr_text}"},
            ],
            temperature=0,
        )
        corrected = corr.choices[0].message.content.strip()

        # 對話生成（帶摘要機制）
        profile, stats, history = _ensure_state(CHAR_NAME)
        if not profile:
            return jsonify({"error": f"角色 '{CHAR_NAME}' 不存在"}), 404

        _decay(stats)
        api_messages = _build_api_messages(profile, stats, history, corrected, context=None)

        role_resp = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=api_messages,
            temperature=0.7,
            top_p=0.9,
        )
        full_reply = role_resp.choices[0].message.content or ""
        reply_text = extract_reply_text(full_reply)

        history.append({"role": "user", "content": corrected})
        history.append({"role": "assistant", "content": full_reply})
        save_chat_history(CHAR_NAME, history)

        new_stats = parse_stats(full_reply, stats) or stats
        save_stats(CHAR_NAME, new_stats)

        return jsonify({"text": corrected, "reply": reply_text, "stats": new_stats}), 200

    except Exception as e:
        print("❌ /chat-vocal error:", e)
        return jsonify({"error": "語音處理失敗"}), 500

    finally:
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass
