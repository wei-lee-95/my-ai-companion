# 匯入套件
from flask import Flask, Response, request, jsonify # 用flask來做前後端串聯
import openai
import json
import os
from datetime import datetime
import re
import whisper
import tempfile
import subprocess
import base64

# 初始化 Flask 應用
app = Flask(__name__)

# ✅ 手動加入 ffmpeg 路徑（請改成你自己的路徑）
os.environ["PATH"] += os.pathsep + r"D:\ffmpeg-2025-07-01-git-11d1b71c31-full_build\bin"
try:
    result = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True)
    print("✅ FFmpeg 找到了：")
    print(result.stdout.splitlines()[0])
except FileNotFoundError:
    print("❌ Python 找不到 ffmpeg！")

# 載入 Whisper 模型
model = whisper.load_model("small")  # 你可以換成 tiny, base, small, medium, large  # ✅medium效果最好 但在本地端要跑很久 需要GPU比較快

# 初始化 OpenAI client（填入你的 API 金鑰）
client = openai.OpenAI(api_key="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")  # ✅ 替換為你的金鑰

# 絕對路徑建立 chat_histories 資料夾
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HISTORY_DIR = os.path.join(BASE_DIR, "chat_histories")
os.makedirs(HISTORY_DIR, exist_ok=True)  # ✅ 確保資料夾存在

# ====== Stats ======
# ====== Stats 改用 json 儲存 ======
def make_json_response(data):
    return Response(
        json.dumps(data, ensure_ascii=False, indent=2),
        mimetype='application/json'
    )

def save_stats(character_name, stats_dict):
    path = os.path.join(HISTORY_DIR, f"{character_name}_stats.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(stats_dict, f, ensure_ascii=False, indent=2)

def load_stats(character_name):
    path = os.path.join(HISTORY_DIR, f"{character_name}_stats.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    else:
        print("⚠️ 找不到 stats，將建立新 stats。")
        return {
            "mood": "中立",
            "affection": "30",
            "last_chat_time": datetime.now().isoformat()
        }

# ====== 對話紀錄 Memory ======
def load_chat_history(character_name):
    path = os.path.join(HISTORY_DIR, f"{character_name}.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    else:
        print(" 找不到對話紀錄，將建立新角色。")
        return None

def save_chat_history(character_name, messages):
    path = os.path.join(HISTORY_DIR, f"{character_name}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(messages, f, ensure_ascii=False, indent=2)

def load_profile(character_name):
    path = os.path.join(HISTORY_DIR, f"{character_name}_profile.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None

# ===== Prompt 建立函式 =====
def generate_prompt(profile, stats):
    base = f"""
你的名字叫做 {profile['name']}，年齡 {profile['age']} 歲，性別為 {profile['gender']}，是一位 {profile['occupation']}。
你與使用者 {profile['user_name']} 的關係可能是「{profile['relationship']}」，目前你們正處於「{profile['relationship_progress']}」階段。
你們開始對話的場景是「{profile['meeting_context']}」。

你的個性設定如下：
{profile['personality']}
你的喜好或擅長 : {profile['skills']}
說話風格：{profile['speaking_style']}

目前你的情緒是「{stats['mood']}」，你和使用者的親密度是 {stats['affection']}（0~100）。
請根據這些狀態自然地調整你的語氣與互動行為。
請你回覆正文後，附上 STATS 區塊如下：
[STATS]
{{
  "mood": "情緒文字",
  "affection_change": 數字（-3 到 +3）
}}
[/STATS]
"""
    return base

def extract_reply_text(full_reply):
    if "[STATS]" in full_reply:
        return full_reply.split("[STATS]")[0].strip()
    return full_reply.strip()

# 解析 STATS
def parse_stats(reply, prev_stats):
    if "[STATS]" in reply and "[/STATS]" in reply:
        stats_block = reply.split("[STATS]")[1].split("[/STATS]")[0].strip()
        stats_block = re.sub(r':\s*\+(\d+)', r': \1', stats_block)

        try:
            stats_json = json.loads(stats_block)
            mood = stats_json.get("mood", prev_stats["mood"])
            delta = int(stats_json.get("affection_change", 0))
            affection = max(0, min(100, int(prev_stats["affection"]) + delta))

            return {
                "mood": mood,
                "affection": str(affection),
                "last_chat_time": datetime.now().isoformat()
            }
        
        except Exception as e:
            print(f"❌ stats 解析錯誤: {e}")
        
        #fallback
        return {
            "mood": prev_stats.get("mood", "中立"),
            "affection": prev_stats.get("affection", "30"),
            "last_chat_time": datetime.now().isoformat()
        }
# ===== GPT 4o 處裡圖片 =====
def gpt4o_image_caption(image_base64):
    messages = [
        {"role": "system", "content": "你是一個幫助描述圖片內容的助手。"},
        {"role": "user", "content": "請描述以下圖片內容。"},
    ]
    # GPT-4o 圖片格式輸入，目前官方主要用 url 或 multipart upload，這裡先示意放 base64
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        # 假設 OpenAI SDK 支援 image_url 或 image_base64 格式，依官方文件調整
        inputs=[{"type": "image_url", "image_url": {"url": image_base64}}],
        temperature=0
    )
    return response.choices[0].message.content

# ===== 單一角色的聊天 API（前端只看到對話） =====
@app.route("/chat", methods=["POST"])
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

    return make_json_response({
        "reply": reply_text, # ✅ 只回傳角色說的話，stats 不出現在前端
        "stats": new_stats
    })

#================上傳圖片======================== 
@app.route("/chat_image", methods=["POST"])
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
@app.route("/chat_vocal", methods=["POST"])
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


# ===== Flask 主程式 =====
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True) # 因為flask不能只跑localhost(手機前端會連不到) 這樣flask會監聽整台電腦的IP 手機能透過區網IP訪問
