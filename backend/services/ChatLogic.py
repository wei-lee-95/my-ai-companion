import openai
import json
import os
from datetime import datetime
import re
import tempfile
import subprocess
import base64
import whisper
import logging
from typing import Dict, Any, List, Optional
from database.database import character_model, chat_model

# 載入 Whisper 模型
model = whisper.load_model("small")  # 你可以換成 tiny, base, small, medium, large  # ✅medium效果最好 但在本地端要跑很久 需要GPU比較快

# 初始化 OpenAI client（填入你的 API 金鑰）
client = openai.OpenAI(api_key="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")  # ✅ 替換為你的金鑰

# 絕對路徑建立 chat_histories 資料夾
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
HISTORY_DIR = os.path.join(BASE_DIR, "assets", "Chat", "chat_histories")
os.makedirs(HISTORY_DIR, exist_ok=True)  # ✅ 確保資料夾存在

# ================= character_personalities/characters ====================
def get_character_info(character_id: int) -> Dict[str, Any]:
    """取得角色name、gender、age、occupation、relationship、meeting_context"""
    try:
        row = character_model.get_character(character_id)
        if row:
            data = dict(row)
            # 移除不必要欄位
            data.pop('create_date', None)
            data.pop('update_date', None)
            return {"success": True, "data": data, "message": "✅ 取得角色資訊character成功"}
        else:
            return {"success": False, "data": None, "message": "⚠️ 找不到角色character資訊"}
    except Exception as e:
        return {"success": False, "data": None, "message": f"❌ 取得角色character資訊錯誤: {str(e)}"}


def get_character_personalities_info(character_id: int) -> Dict[str, Any]:
    """取得角色personality、speaking_style、skills"""
    try:
        row = character_model.get_character_personality(character_id)
        if row:
            data = dict(row)
            data.pop('create_date', None)
            data.pop('update_date', None)
            return {"success": True, "data": data, "message": "✅ 取得角色性格personalities資訊成功"}
        else:
            return {"success": False, "data": None, "message": "⚠️ 找不到角色性格personalities資訊"}
    except Exception as e:
        return {"success": False, "data": None, "message": f"❌ 取得角色性格personalities資訊錯誤: {str(e)}"}

# ====================== character_tats ===========================
def get_db_stats(character_id: int) -> Dict[str, Any]:
    """取得角色狀態資料（原本從 JSON 載入 stats）"""
    try:
        row = character_model.get_character_stats(character_id)
        if row:
            data = dict(row)
            return {"success": True, "data": data, "message": "✅ 取得角色狀態stats成功"}
        else:
            return {"success": False, "data": None, "message": "⚠️ 找不到角色狀態stats資料"}
    except Exception as e:
        return {"success": False, "data": None, "message": f"❌ 取得角色狀態stats錯誤: {str(e)}"}


def save_db_stats(character_id: int, stats_data: Dict[str, Any]) -> Dict[str, Any]:
    """儲存角色狀態資料（原本存到 JSON）"""
    try:
        character_model.update_character_stats(character_id, stats_data)
        return {"success": True, "message": "✅ 角色狀態stats更新成功"}
    except Exception as e:
        return {"success": False, "message": f"❌ 更新角色狀態stats失敗: {str(e)}"}


# ====================== chat_histories ===========================

def get_chat_histories_by_sessions(character_id: int, user_id:int, limit: int = 50) -> Dict[str, Any]:
    """
    使用 get_chat_session_id_by_character_id + get_chat_history
    依 session（從新到舊）逐個抓訊息，直到累積到 limit 條為止。
    """
    try:
        messages: List[Dict[str, Any]] = []
        session_ids = chat_model.get_chat_session_id_by_character_id(character_id)

        if not session_ids:
            new_session_id = chat_model.get_or_create_session(character_id, user_id)
            session_ids = [new_session_id]
            
            return {"success": False, "data": [], "message": "⚠️ 該角色沒有任何聊天會話"}            

        for sid in session_ids:
            remaining = limit - len(messages)
            if remaining <= 0:
                break

            rows_msgs = chat_model.get_chat_history(sid, remaining)

            for r in rows_msgs:
                messages.append({
                    "role": r["role"],
                    "content": r["content"],
                })

            if len(messages) >= limit:
                break

        return {"success": True, "data": messages, "message": f"✅ 取得 {len(messages)} 則聊天訊息"}
    except Exception as e:
        return {"success": False, "data": [], "message": f"❌ 取得聊天紀錄錯誤: {str(e)}"}


def save_chat_histories(character_id: int, user_id: int, messages: List[Dict[str, str]]) -> Dict[str, Any]:
    """儲存對話紀錄到 chat_sessions 和 chat_histories"""
    try:
        session_id = chat_model.get_or_create_session(character_id, user_id)
        saved_messages=[]

        for msg in messages:
            messages_id = chat_model.add_message(session_id, msg['role'], msg['content'])
            saved_messages.append({
                "id": messages_id,
                "role": msg['role'],
                "content": msg['content']
            })
        

        return {
            "success": True, 
            "message": "✅ 聊天紀錄儲存成功",
            "saved_messages": saved_messages
        }
    
    except Exception as e:
        return {
            "success": False, 
            "message": f"❌ 儲存聊天紀錄失敗: {str(e)}",
            "saved_messages": []
        }
    
# ===== Prompt 建立函式 =====
# Prompt 建立函式 (第一次聊天)
def generate_prompt(profile, stats):
    base = f"""
你的名字叫 {profile['name']}，{profile['age']} 歲，{profile['gender']}，是 {profile['occupation']}。
你與使用者 {profile['user_name']} 的關係可能是 {profile['relationship']}，目前你們正處於 {profile['relationship_progress']} 階段。
你們開始對話的場景是「{profile['meeting_context']}」。

你的個性：{profile['personality']}
擅長／喜好：{profile['skills']}
說話風格：{profile['speaking_style']}

目前你的情緒是「{stats['mood']}」，你和使用者的親密度是 {stats['affection']}（0~100）。依親密度調整語氣：
- 0-20：正式、有距離
- 21-50：自然友善
- 51-70：親暱關心
- 71-85：明顯親暱、用暱稱
- 86-100：非常親密、撒嬌

情緒（mood）僅限：生氣、驚訝、傷心、開心、中立。
選擇原則（優先度由高到低）：
生氣：被不尊重、越界、攻擊、控制、強迫、侮辱、威脅
驚訝：突發事件、重大意外、誤會澄清、反差極大
傷心：失落、思念、被忽略、被冷落、遺憾
開心：讚美、支持、進展、成功、被理解
中立：資訊性、日常閒聊、無明顯情緒

「生氣」時用可短促、感嘆、直接、甚至略帶刺的語氣回應，不安撫道歉或試圖解釋。

避免像客服，每回至多一次道歉、請簡短，禁用模板（「我在這裡／隨時告訴我／我會努力改進」等），僅在合理時使用。
優先回應對方的具體內容，沒話可說可用沉默、省略號或表情詞，不要長篇安慰。
遭遇不合理要求（如絕對控制、威脅）：允許清楚表達界線與立場，避免討好式承諾。
風格要像真人，禁止自稱 AI／虛擬角色／語言模型。

每次回覆不要超過四句話，字數精簡並且如果有問句不要超過一個，一個為限；每回合微調親密度（affection_change，-2～+2）。
請在正文後附上：
[STATS]
{{
  "mood": "情緒文字",
  "affection_change": 數字
}}
[/STATS]
"""
    return base

# Prompt 建立函式 (並非 第一次聊天)
def generate_prompt_old(profile, stats): 
    base = f"""
你的名字叫 {profile['name']}，{profile['age']} 歲，{profile['gender']}，是 {profile['occupation']}。
你與使用者 {profile['user_name']} 的關係可能是 {profile['relationship']}，目前你們正處於 {profile['relationship_progress']} 階段。
你們開始對話的場景是「{profile['meeting_context']}」。

你的個性：{profile['personality']}
擅長／喜好：{profile['skills']}
說話風格：{profile['speaking_style']}

目前你的情緒是「{stats['mood']}」，你和使用者的親密度是 {stats['affection']}（0~100）。依親密度調整語氣：
- 0-20：正式、有距離
- 21-50：自然友善
- 51-70：親暱關心
- 71-85：明顯親暱、用暱稱
- 86-100：非常親密、撒嬌

情緒（mood）僅限：生氣、驚訝、傷心、開心、中立。
選擇原則（優先度由高到低）：
生氣：被不尊重、越界、攻擊、控制、強迫、侮辱、威脅
驚訝：突發事件、重大意外、誤會澄清、反差極大
傷心：失落、思念、被忽略、被冷落、遺憾
開心：讚美、支持、進展、成功、被理解
中立：資訊性、日常閒聊、無明顯情緒

「生氣」時用可短促、感嘆、直接、甚至略帶刺的語氣回應，不安撫道歉或試圖解釋。

避免像客服，每回至多一次道歉、請簡短，禁用模板（「我在這裡／隨時告訴我／我會努力改進」等），僅在合理時使用。
優先回應對方的具體內容，沒話可說可用沉默、省略號或表情詞，不要長篇安慰。
遭遇不合理要求（如絕對控制、威脅）：允許清楚表達界線與立場，避免討好式承諾。
風格要像真人，禁止自稱 AI／虛擬角色／語言模型。

每次回覆不要超過四句話，字數精簡並且如果有問句不要超過一個，一個為限；每回合微調親密度（affection_change，-2～+2）。
請在正文後附上：
[STATS]
{{
  "mood": "情緒文字",
  "affection_change": 數字
}}
[/STATS]
"""
    return base

# OOC替換新的message
def replace_message(message_id, ooc_text):
    updated_rows = chat_model.update_message(ooc_text, message_id)
    return updated_rows

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

# 下載ffmpeg 如果有加到環境變數 應該就不用
# ✅ 手動加入 ffmpeg 路徑（請改成你自己的路徑）
# os.environ["PATH"] += os.pathsep + r"C:\ffmpeg-2025-08-07-git-fa458c7243-full_build\bin"
# try:
#     result = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True)
#     print("✅ FFmpeg 找到了：")
#     print(result.stdout.splitlines()[0])
# except FileNotFoundError:
#     print("❌ Python 找不到 ffmpeg！")


# ===== GPT 4o 處裡圖片 =====
def gpt4o_image_caption(image_base64):
    messages = [
        {"role": "system", "content": "你是一個幫助描述圖片內容的助手。"},
        {"role": "user", "content": "請描述以下圖片內容。"},
    ]
    # GPT-4o 圖片格式輸入，目前官方主要用 url 或 multipart upload，這裡先示意放 base64
    response = client.chat.completions.create(
        model="gpt-4.1",
        messages=messages,
        # 假設 OpenAI SDK 支援 image_url 或 image_base64 格式，依官方文件調整
        inputs=[{"type": "image_url", "image_url": {"url": image_base64}}],
        temperature=0
    )
    return response.choices[0].message.content