from playsound import playsound
import openai
import cv2
import pickle
import numpy as np
from datetime import datetime
from ultralytics import YOLO
from cvzone.FaceMeshModule import FaceMeshDetector
import warnings
import speech_recognition as sr
import threading
import time
import sys
import os
import traceback
import json
from flask import jsonify
from services.ChatLogic import load_profile, load_stats, save_stats, load_chat_history, save_chat_history, generate_prompt, extract_reply_text, parse_stats

# 宣告全域變數
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
HISTORY_DIR = os.path.join(BASE_DIR, "assets", "Chat", "chat_histories")
os.makedirs(HISTORY_DIR, exist_ok=True)  # ✅ 確保資料夾存在
client = openai.OpenAI(api_key="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") 

# ================================ 分離state，保留純reply 為了回覆時不要被使用者看到後端的數據 ================================
def extract_stats(reply_text):
    """解析回覆中的 [STATS] 區塊（並修正 +2 類型錯誤）"""
    try:
        stats_block = reply_text.split("[STATS]")[1].split("[/STATS]")[0].strip()
        stats_block = stats_block.replace("+", "")  # 修正 +2 → 2，避免 json.loads 失敗
        return json.loads(stats_block)
    except Exception as e:
        print(f"⚠️ STATS 解析錯誤: {str(e)}")
        return None

def process_chat_response(user_input, context):
    """處理聊天回應（含後端角色資料與 context 資訊）"""
    

    messages = []

    character_name = "金珉奎"  # ex: chat_histories/mingyu_profile.json

    print("user_input type:", type(user_input), user_input)
    print("context type:", type(context), context)
    print("messages type:", type(messages), messages)

    # 載入角色資料
    profile = load_profile(character_name)
    stats = load_stats(character_name)
    chat_histories = load_chat_history(character_name)

    print(f"\n小雲（語音）：{user_input}", flush=True)

    if context:
        context_str = f"{context.get('object', '')} {context.get('emotion', '')}".strip()
        print(f"\n✅ 使用環境資訊: {context_str}")
    else:
        context_str = ""

    print("\n💬 思考回覆中...", flush=True)

    # 組裝 system prompt
    dynamic_prompt = f"""
    你的名字叫 {profile['name']}，{profile['age']} 歲，{profile['gender']}，是 {profile['occupation']}。
    你與使用者 {profile['user_name']} 的關係可能是 {profile['relationship']}，一開始處於 {profile['relationship_progress']} 階段。
    初次對話場景：「{profile['meeting_context']}」。

    你的個性：{profile['personality']}
    擅長／喜好：{profile['skills']}
    說話風格：{profile['speaking_style']}

    目前情緒「{stats['mood']}」，親密度 {stats['affection']}（0~100）。
    依親密度調整語氣：
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

    每次回覆不超過四句，字數精簡；每回合微調親密度（affection_change，-2～+2）。

    請在正文後附上：
    [STATS]
    {{
    "mood": "情緒文字",
    "affection_change": 數字
    }}
    [/STATS]
    """.strip()

    # 將 prompt + chat history 組成 messages
    local_messages = [{"role": "system", "content": dynamic_prompt}]
    local_messages += messages
    local_messages.append({
        "role": "user",
        "content": f"{user_input} {context_str}".strip()
    })

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=local_messages,
            temperature=0.7
        )
        full_reply = response.choices[0].message.content
        reply = extract_reply_text(full_reply)

        print(f"\n金珉奎：{reply}", flush=True)

        # 建立單筆對話物件
        chat_pair = {
            "user": {"role": "user", "content": user_input},
            "assistant": {"role": "assistant", "content": reply}
        }

        save_chat_history(character_name, chat_pair)


        # 嘗試更新 stats
        stats_new = extract_stats(full_reply)
        if stats_new:
            try:
                affection_new = int(stats.get("affection", "30")) + int(stats_new.get("affection_change", 0))
                stats_dict = {
                    "mood": stats_new.get("mood", stats.get("mood", "中立")),
                    "affection": str(max(0, min(100, affection_new))),
                    "last_chat_time": datetime.now().isoformat()
                }
                save_stats(character_name, stats_dict)
            except Exception as e:
                print(f"⚠️ 無法更新 stats: {str(e)}")
        
        # ✅ **回傳 dict，不 jsonify**
        return {
            "reply": reply,
            "user": chat_pair["user"],
            "assistant": chat_pair["assistant"]
        }

    except Exception as e:
        print(f"❌ GPT 回應錯誤: {str(e)}")
        return {"error": "伺服器錯誤"}



def initialize_resources():
    """初始化所有資源"""
    global model, FMD, Behaviour_model, client

    # YOLO 模型路徑
    yolo_path = os.path.join(BASE_DIR, "assets", "Video", "yolov8n-oiv7.pt")
    
    # 表情模型路徑
    emotion_model_path = os.path.join(BASE_DIR, "assets", "Video", "emotion_model.pkl")
        
    # 載入 YOLO 模型
    print("\n⌛ 正在載入 YOLO 模型...")
    try:
        model = YOLO(yolo_path)
        model.conf = 0.1
        print("✅ YOLO 模型載入成功")
    except Exception as e:
        print(f"❌ YOLO 模型載入失敗: {str(e)}")
        sys.exit(1)
        
    # 載入其他模型
    FMD = FaceMeshDetector()
    with open(emotion_model_path, 'rb') as f:
        Behaviour_model = pickle.load(f)

def initialize_chat():
    """初始化聊天設定"""
    print("\n=== 開始與金珉奎聊天並進行偵測 ===")
    process_chat_response("小雲打了視訊電話給你，請主動開啟聊天，例如問問小雲怎麼突然打視訊電話。")

def process_environment(image_path):

  initialize_resources()

  img = cv2.imread(image_path)
  if img is None:
      print("❌ 圖片讀取失敗")
      return False
  try:
      results = model(img, verbose=False, conf=0.25, max_det=3)
      boxes = results[0].boxes
      if len(boxes) > 0:
          for box in boxes:
              conf = box.conf[0].item()
              cls_id = int(box.cls[0].item())
              label = model.names[cls_id]
              print(f"✓ 偵測到 {label} (信心度: {conf:.2f})")
              if label == "Human face" and conf > 0.25:
                  _, faces = FMD.findFaceMesh(img)
                  if faces:
                      face_data = list(np.array(faces[0]).flatten())
                      emotion = Behaviour_model.predict([face_data])[0]
                      print(f"✓ 偵測到表情: {emotion}")
                      return {
                            'object': "（看到小雲）",
                            'emotion': f"（表情：{emotion}）",
                            'has_update': True
                      }
      else:
          print("⚠️ 未偵測到任何物件")
          return False
  except Exception as e:
      print(f"❌ 圖像推論失敗: {str(e)}")
      return False
    