from services.ChatLogic import load_profile, load_stats, load_chat_history, save_chat_history, save_stats, generate_prompt, extract_reply_text, parse_stats
from flask import Blueprint, Flask, Response, request, jsonify # 用flask來做前後端串聯
import openai
import json
import os
from datetime import datetime
import re
import whisper
import tempfile
import subprocess
import base64

# 初始化 OpenAI client（填入你的 API 金鑰）
client = openai.OpenAI(api_key="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")  # ✅ 替換為你的金鑰
model = whisper.load_model("small") 

chatRoom_bp = Blueprint('chatRoom', __name__)

# ===== 單一角色的聊天 API（前端只看到對話） =====
@chatRoom_bp.route("/chat", methods=["POST"])
def chat():
    print("收到前端請求")
    user_input = request.get_json().get("message")
    name = "金珉奎"  # 🔒寫死角色

    profile = load_profile(name)
    if profile is None:
        # 找不到角色，回傳錯誤狀態碼和訊息
        return jsonify({"error": f"角色 '{name}' 不存在，請先建立角色資料。"}), 404

    stats = load_stats(name)
    if stats is None:
        return jsonify({"error": f"找不到 stats 資料 '{name}'，請先建立 stats。"}), 404

    messages = load_chat_history(name)
    if messages is None:
        return jsonify({"error": f"找不到聊天紀錄 '{name}'，請先建立聊天紀錄。"}), 404

    # 親密度下降邏輯
    last_time = datetime.fromisoformat(stats.get("last_chat_time"))
    days_gap = (datetime.now() - last_time).days
    if days_gap >= 2:
        stats["affection"] = str(max(0, int(stats["affection"]) - days_gap * 2))

    # 組裝提示詞 + 對話內容
    system_prompt = {"role": "system", "content": generate_prompt(profile, stats)}
    messages.append(system_prompt)
    messages.append({"role": "user", "content": user_input})

    # GPT 回應
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.7
    )
    reply_full = response.choices[0].message.content
    reply_text = extract_reply_text(reply_full)

    messages.append({"role": "assistant", "content": reply_full})
    save_chat_history(name, messages) 

    # 更新 stats
    new_stats = parse_stats(reply_full, stats)
    save_stats(name, new_stats)

    return jsonify({
        "reply": reply_text, 
        "stats": new_stats
    })

#================上傳圖片======================== 
@chatRoom_bp.route("/chat-image", methods=["POST"])
def chat_image():
    # 假設前端用 JSON 傳 base64 字串: { "image_base64": "data:image/png;base64,...." }
    data = request.get_json()
    image_base64 = data.get("image_base64")
    name = "金珉奎"  # 🔒寫死角色

    if not image_base64:
        return jsonify({"error": "沒有收到圖片的 base64 資料"}), 400

    # 保留完整 data:image/jpeg;base64,...
    if not image_base64.startswith("data:image"):
        return jsonify({"error": "圖片格式錯誤，請傳送正確的 base64 圖片"}), 400

    # 讀取資料
    profile = load_profile(name)
    stats = load_stats(name)
    messages = load_chat_history(name)

    if not profile or not stats or not messages:
        return jsonify({"error": "角色資料不完整"}), 500

    # 準備背景設定
    system_prompt = generate_prompt(profile, stats)

    # 抽取最近對話文字內容（只抽 user/assistant 的純文字）
    recent = []
    for msg in reversed(messages):
        if "role" in msg and "content" in msg and isinstance(msg["content"], str):
            if msg["role"] == "user":
                recent.append(f"使用者：{msg['content']}")
            elif msg["role"] == "assistant":
                recent.append(f"{name}：{msg['content']}")
        if len(recent) >= 6:
            break
    recent.reverse()  # 從舊到新排列

    context_text = system_prompt + "\n最近的對話紀錄如下：\n" + "\n".join(recent)
    context_text += "\n請根據這些背景與對話，自然地回應這張圖片。"

    try:
        # 呼叫 GPT-4o
        response = client.responses.create(
            model="gpt-4o",
            input=[
                {
                    "role": "user",
                    "content": [
                        { "type": "input_text", "text": context_text },
                        { "type": "input_image", "image_url": image_base64 }
                    ],
                }
            ],
            temperature=0.7
        )

        reply_full = response.output_text.strip()
        reply_text = extract_reply_text(reply_full)

        # 儲存到對話歷史
        messages.append({"role": "user", "content": "[圖片訊息]"})  # 不儲存 base64，太大
        messages.append({"role": "assistant", "content": reply_full})
        save_chat_history(name, messages)

        return jsonify({"reply": reply_text})

    except Exception as e:
        print("圖片分析錯誤:", e)
        return jsonify({"error": "圖片分析失敗，請稍後再試。"}), 500


#================語音訊息======================== 
@chatRoom_bp.route("/chat-vocal", methods=["POST"])
def chat_vocal():

    if "file" not in request.files:
        return jsonify({"error": "沒有上傳音檔檔案"}), 400

    audio_file = request.files["file"]

    # 儲存暫存檔案
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        tmp.write(audio_file.read())
        tmp_path = tmp.name

    try:
        # 使用 Whisper 轉錄
        result = model.transcribe(tmp_path, language="zh")  # 可以指定語言或自動偵測
        whisper_recognized_text = result["text"]

        # GPT 校正文字
        gpt_input = f"""這是語音辨識結果：
「{whisper_recognized_text}」
請幫我修正錯字，並且為了讓句子通順，可以稍微修改內容，但不可以偏離語句原本的意思。"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "你是一個負責文字校正的助手。"},
                {"role": "user", "content": gpt_input}
            ],
            temperature=0,
        )
        corrected_text=response.choices[0].message.content

        name = "金珉奎" # 點名鎖定角色

        profile = load_profile(name)
        if profile is None:
        # 找不到角色，回傳錯誤狀態碼和訊息
            return jsonify({"error": f"角色 '{name}' 不存在，請先建立角色資料。"}), 404

        stats = load_stats(name)
        if stats is None:
            return jsonify({"error": f"找不到 stats 資料 '{name}'，請先建立 stats。"}), 404

        messages = load_chat_history(name)
        if messages is None:
            return jsonify({"error": f"找不到聊天紀錄 '{name}'，請先建立聊天紀錄。"}), 404        

        # 親密度下降邏輯
        last_time = datetime.fromisoformat(stats.get("last_chat_time"))
        days_gap = (datetime.now() - last_time).days
        if days_gap >= 2:
            stats["affection"] = str(max(0, int(stats["affection"]) - days_gap * 2))

        # 加入提示詞與使用者訊息
        system_prompt = {"role": "system", "content": generate_prompt(profile, stats)}
        messages.append(system_prompt)
        messages.append({"role": "user", "content": corrected_text})

        # GPT 回覆角色內容
        role_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
        )
        reply_full = role_response.choices[0].message.content
        reply_text = extract_reply_text(reply_full)

        # 儲存到聊天紀錄
        messages.append({"role": "assistant", "content": reply_full})
        save_chat_history(name, messages)

        # 更新 stats
        new_stats = parse_stats(reply_full, stats)
        save_stats(name, new_stats)

        return jsonify({
            "text": corrected_text,     # 校正後的用戶輸入
            "reply": reply_text,        # 角色回應（前端顯示）
            "stats": new_stats          # stats 更新（選擇要不要前端顯示）
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        # 清除暫存檔
        if os.path.exists(tmp_path):
            os.remove(tmp_path)