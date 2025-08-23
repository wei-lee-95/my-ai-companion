from services.ChatLogic import get_character_info, get_character_personalities_info, get_db_stats, get_chat_histories_by_sessions, save_chat_histories, generate_prompt, extract_reply_text, parse_stats, save_db_stats, replace_message, generate_prompt_old
from flask import Blueprint, request, jsonify
import openai
import os
from datetime import datetime
import whisper
import tempfile
from database.database import character_model

# ===== OpenAI / Whisper =====
client = openai.OpenAI(api_key="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")  # ✅ 替換為你的金鑰
model = whisper.load_model("small") 

chatRoom_bp = Blueprint("chatRoom", __name__)

# ===== 單一角色的聊天 API（前端只看到對話） =====
@chatRoom_bp.route("/chat", methods=["POST"])
def chat():
    print("收到前端請求")
    data = request.get_json()
    user_input = data.get("message")
    character_id = data.get("character_id")
    user_id = data.get("user_id")
    character_name = data.get("name")  

    # 取得角色資訊（改用資料庫）
    character_info_res = get_character_info(character_id) 
    if not character_info_res["success"]:
        return jsonify({"error": character_info_res["message"]}), 404
    profile = character_info_res["data"]

    # 取得角色性格資料
    personality_res = get_character_personalities_info(character_id)
    if not personality_res["success"]:
        return jsonify({"error": personality_res["message"]}), 404
    personality = personality_res["data"]

    # 合併 profile 與 personality，方便後面 prompt 用
    profile.update(personality)
    # 你可以自行加 user_name 與 relationship_progress，或從資料庫另外抓
    profile["user_name"] = character_name
    profile["relationship_progress"] = profile.get("relationship_stage", "初識")

    # 取得 stats
    stats_res = get_db_stats(character_id)
    if not stats_res["success"]:
        return jsonify({"error": stats_res["message"]}), 404
    stats = stats_res["data"]

    # 取得聊天歷史 (限制最新 50 條)
    chat_histories_res = get_chat_histories_by_sessions(user_id, character_id, limit=50)
    if not chat_histories_res["success"]:
        return jsonify({"error": chat_histories_res["message"]}), 404
    messages = chat_histories_res["data"]

    # 親密度下降邏輯
    last_time = datetime.fromisoformat(stats.get("last_chat_time"))
    days_gap = (datetime.now() - last_time).days
    if days_gap >= 2:
        stats["affection"] = str(max(0, int(stats["affection"]) - days_gap * 2))

    # 組裝提示詞 + 對話內容
    if not messages:
        # 新角色
        system_prompt = {"role": "system", "content": generate_prompt(profile, stats)}
        messages = [system_prompt, {"role": "user", "content": user_input}]
    else:
        # 舊角色
        system_prompt = {"role": "system", "content": generate_prompt_old(profile, stats)}
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

    # 最新兩筆訊息，user 跟 assistant
    latest_messages = [
        {"role": "user", "content": user_input},
        {"role": "assistant", "content": reply_text},
    ]
    save_res = save_chat_histories(character_id, user_id, messages=latest_messages)

    # 更新 stats
    new_stats = parse_stats(reply_full, stats)
    save_stats_res = save_db_stats(character_id, stats_data=new_stats)

    print("=== saved_messages ===")
    for m in save_res.get("saved_messages", []):
        print(m)
    print("======================")
    
    return jsonify({
        "reply": reply_text,
        "saved_messages": save_res.get("saved_messages",[]),
        "stats": new_stats,
        "chat_history_save": {
            "success": save_res["success"],
            "message": save_res["message"]
        },
        "stats_save": save_stats_res,
    })

#================上傳圖片======================== 
@chatRoom_bp.route("/chat-image", methods=["POST"])
def chat_image():
    # 假設前端用 JSON 傳 base64 字串: { "image_base64": "data:image/png;base64,...." }
    data = request.get_json()
    image_base64 = data.get("image_base64")
    character_id = data.get("character_id")
    user_id = data.get("user_id")
    character_name = data.get("name") 

    if not image_base64:
        return jsonify({"error": "沒有收到圖片的 base64 資料"}), 400

    # 保留完整 data:image/jpeg;base64,...
    if not image_base64.startswith("data:image"):
        return jsonify({"error": "圖片格式錯誤，請傳送正確的 base64 圖片"}), 400

    # 取得角色資訊（改用資料庫）
    character_info_res = get_character_info(character_id) 
    if not character_info_res["success"]:
        return jsonify({"error": character_info_res["message"]}), 404
    profile = character_info_res["data"]

    # 取得角色性格資料
    personality_res = get_character_personalities_info(character_id)
    if not personality_res["success"]:
        return jsonify({"error": personality_res["message"]}), 404
    personality = personality_res["data"]

    # 合併 profile 與 personality，方便後面 prompt 用
    profile.update(personality)
    # 你可以自行加 user_name 與 relationship_progress，或從資料庫另外抓
    profile["user_name"] = character_name
    profile["relationship_progress"] = profile.get("relationship_stage", "初識")

    # 取得 stats
    stats_res = get_db_stats(character_id)
    if not stats_res["success"]:
        return jsonify({"error": stats_res["message"]}), 404
    stats = stats_res["data"]

    # 取得聊天歷史 (限制最新 50 條)
    chat_histories_res = get_chat_histories_by_sessions(user_id, character_id, limit=50)
    if not chat_histories_res["success"]:
        return jsonify({"error": chat_histories_res["message"]}), 404
    messages = chat_histories_res["data"]

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
                recent.append(f"{character_name}：{msg['content']}")
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
        latest_messages = [
            {"role": "user", "content":  "[圖片訊息]"},
            {"role": "assistant", "content": reply_text},
        ]
        save_res = save_chat_histories(character_id, user_id, messages=latest_messages)

        # 更新 stats
        new_stats = parse_stats(reply_full, stats)
        save_db_stats(character_id, stats_data=new_stats)
    

        return jsonify({
            "reply": reply_text,
            "saved_messages": save_res.get("saved_messages",[]),
            "stats": new_stats,
            "chat_history_save": {
                "success": save_res["success"],
                "message": save_res["message"]
            },
        })    

    except Exception as e:
        print("圖片分析錯誤:", e)
        return jsonify({"error": "圖片分析失敗，請稍後再試。"}), 500


#================語音訊息======================== 
@chatRoom_bp.route("/chat-vocal", methods=["POST"])
def chat_vocal():
    character_id = request.form.get("character_id")
    user_id = request.form.get("user_id")
    character_name = request.form.get("name")

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
                {"role": "system", "content": "你是一個只輸出修正結果的文字助手，請只回覆修正後的文字，不要多說其他話。"},
                {"role": "user", "content": gpt_input}
            ],
            temperature=0,
        )
        corrected_text=response.choices[0].message.content


        # 取得角色資訊（改用資料庫）
        character_info_res = get_character_info(character_id) 
        if not character_info_res["success"]:
            return jsonify({"error": character_info_res["message"]}), 404
        profile = character_info_res["data"]

        # 取得角色性格資料
        personality_res = get_character_personalities_info(character_id)
        if not personality_res["success"]:
            return jsonify({"error": personality_res["message"]}), 404
        personality = personality_res["data"]

        # 合併 profile 與 personality，方便後面 prompt 用
        profile.update(personality)
        # 你可以自行加 user_name 與 relationship_progress，或從資料庫另外抓
        profile["user_name"] = character_name
        profile["relationship_progress"] = profile.get("relationship_stage", "初識")

        # 取得 stats
        stats_res = get_db_stats(character_id)
        if not stats_res["success"]:
            return jsonify({"error": stats_res["message"]}), 404
        stats = stats_res["data"]

        # 取得聊天歷史 (限制最新 50 條)
        chat_histories_res = get_chat_histories_by_sessions(user_id, character_id, limit=50)
        if not chat_histories_res["success"]:
            return jsonify({"error": chat_histories_res["message"]}), 404
        messages = chat_histories_res["data"]

        if not profile or not stats or not messages:
            return jsonify({"error": "角色資料不完整"}), 500  

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

        # 最新兩筆訊息，user 跟 assistant
        latest_messages = [
            {"role": "user", "content": corrected_text},
            {"role": "assistant", "content": reply_text},
        ]
        save_res = save_chat_histories(character_id, user_id, messages=latest_messages)

        # 更新 stats
        new_stats = parse_stats(reply_full, stats)
        save_stats_res = save_db_stats(character_id, stats_data=new_stats)
        

        return jsonify({
            "reply": reply_text, # 角色回應（前端顯示）
            "saved_messages": save_res.get("saved_messages",[]),
            "stats": new_stats,
            "chat_history_save": {
                "success": save_res["success"],
                "message": save_res["message"]
            },
            "stats_save": save_stats_res,
        })

        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        # 清除暫存檔
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

# ===================OOC=====================
@chatRoom_bp.route("/ooc", methods=["POST"])
def ooc_situation():
    data = request.get_json()
    message_id = data.get("message_id")
    ooc_text = data.get("ooc_text")
    character_id = data.get("character_id")
    user_id = data.get("user_id")

    print(f"message_id = {message_id}")
    print(f"ooc_text = {ooc_text}")
    print(f"character_id = {character_id}")
    print(f"user_id = {user_id}")

    if not message_id or not ooc_text or not character_id or not user_id:
        return jsonify({"error": "缺少 message_id 或 ooc_text 或 character_id 或 user_id "}), 400
    
    try:
        # 呼叫函式替換訊息
        updated_rows = replace_message(message_id, ooc_text)

        if updated_rows == 0:
            return jsonify({"error": "找不到該訊息或更新失敗"}), 404

        return jsonify({"success": True, "message_id": message_id, "ooc_text": ooc_text})

    except Exception as e:
        return jsonify({"error": str(e)}), 500