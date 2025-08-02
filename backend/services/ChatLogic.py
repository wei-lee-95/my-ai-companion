import openai
import json
import os
from datetime import datetime
import re
import tempfile
import subprocess
import base64
import whisper

# 載入 Whisper 模型
model = whisper.load_model("small")  # 你可以換成 tiny, base, small, medium, large  # ✅medium效果最好 但在本地端要跑很久 需要GPU比較快

# 初始化 OpenAI client（填入你的 API 金鑰）
client = openai.OpenAI(api_key="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")  # ✅ 替換為你的金鑰

# 絕對路徑建立 chat_histories 資料夾
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
HISTORY_DIR = os.path.join(BASE_DIR, "assets", "Chat" "chat_histories")
os.makedirs(HISTORY_DIR, exist_ok=True)  # ✅ 確保資料夾存在

# ====== Stats ======
# ====== Stats 改用 json 儲存 ======
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
    
# ✅ 手動加入 ffmpeg 路徑（請改成你自己的路徑）
os.environ["PATH"] += os.pathsep + r"D:\ffmpeg-2025-07-01-git-11d1b71c31-full_build\bin"
try:
    result = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True)
    print("✅ FFmpeg 找到了：")
    print(result.stdout.splitlines()[0])
except FileNotFoundError:
    print("❌ Python 找不到 ffmpeg！")


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

