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
from services.ChatLogic import get_character_info, get_character_personalities_info, get_db_stats, save_db_stats, save_chat_histories, generate_prompt, extract_reply_text, parse_stats, get_chat_histories_by_sessions, generate_prompt_old
from typing import Dict, Any, List, Optional
from database.database import character_model, chat_model, user_model, vedio_model
    

# 宣告全域變數
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
HISTORY_DIR = os.path.join(BASE_DIR, "assets", "Chat", "chat_histories")
os.makedirs(HISTORY_DIR, exist_ok=True)  # ✅ 確保資料夾存在
client = openai.OpenAI(api_key="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") 

def get_pitch_and_rate(character_id: int) -> Optional[dict]:
    """取出特定角色的性別"""
    result = vedio_model.get_pitch_and_rate(character_id)

    if not result:
        print(f"❌ 找不到角色 {character_id}")
        return None
    
    row = result[0]  # 取第一筆
    pitch = row["pitch"]
    rate = row["rate"]
    
    return {"pitch": pitch, "rate": rate}

def get_gender(character_id: int, user_id: str)-> Optional[str]: 
    """取出特定角色的性別"""
    result = vedio_model.get_gender(character_id, user_id)

    if not result:
        print(f"❌ 找不到角色 {character_id} 或使用者 {user_id}")
        return None
    
    gender = result[0]["gender"]  # 取 list 第一筆的 gender

    return gender

def get_username(userId:int) -> Optional[str]: 
    result = user_model.get_user_by_id(userId)
    if not result:
        print(f"❌ 找不到使用者 ID {userId}")
        return None

    username = result["username"]  # 直接這樣取
    if not username:
        print(f"❌ 使用者 ID {userId} 沒有 username")
        return None
    
    print(f"使用者名稱為{username}")
    return username

def get_character_animation(character_id: int) -> Dict[str, Any]:
    """取得角色動畫資訊"""
    try:
        row = character_model.get_character(character_id)
        if row:
            data = dict(row)
            # 移除不必要欄位
            data.pop('emotion_image_path', None)
            return {"success": True, "data": data, "message": "✅ 取得角色動畫資訊character成功"}
        else:
            return {"success": False, "data": None, "message": "⚠️ 找不到角色動畫character資訊"}
    except Exception as e:
        return {"success": False, "data": None, "message": f"❌ 取得角色動畫character資訊錯誤: {str(e)}"}

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

def process_chat_response(user_id, character_id, name, user_input, context=None):
    """處理聊天回應（含後端角色資料與 context 資訊）"""
    global messages

    # 載入角色profile
    character_info_res = get_character_info(character_id) 
    if not character_info_res["success"]:
        return jsonify({"error": character_info_res["message"]}), 404
    profile = character_info_res["data"]
    
    personality_res = get_character_personalities_info(character_id)
    if not personality_res["success"]:
        return jsonify({"error": personality_res["message"]}), 404
    personality = personality_res["data"]
    
    profile.update(personality)
    profile["user_name"] = name
    profile["relationship_progress"] = profile.get("relationship_stage", "初識")

    # 載入角色stats
    stats_res = get_db_stats(character_id)
    if not stats_res["success"]:
        return jsonify({"error": stats_res["message"]}), 404
    stats = stats_res["data"]

    # 取得聊天歷史 (限制最新 50 條)
    chat_histories_res = get_chat_histories_by_sessions(user_id, character_id, limit=50)
    if not chat_histories_res["success"]:
        return jsonify({"error": chat_histories_res["message"]}), 404
    messages = chat_histories_res["data"]


    print(f"\使用者ID={user_id}（語音）：{user_input}", flush=True)

    if context:
        context_str = f"{context.get('object', '')} {context.get('emotion', '')}".strip()
        print(f"\n✅ 使用環境資訊: {context_str}")
    else:
        context_str = ""

    print("\n💬 思考回覆中...", flush=True)

    # 組裝提示詞 + 對話內容
    if not messages:
        # 新角色
        system_prompt = {"role": "system", "content": generate_prompt(profile, stats)}
        messages = [system_prompt, {"role": "user", "content": f"{user_input} {context_str}".strip()}]
    else:
        # 舊角色
        system_prompt = {"role": "system", "content": generate_prompt_old(profile, stats)}
        messages.append(system_prompt)
        messages.append({"role": "user", "content": f"{user_input} {context_str}".strip()})
    
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
    