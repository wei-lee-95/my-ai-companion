from flask import Blueprint, request, jsonify
import os, base64, logging, traceback
import whisper
import tempfile
import openai
import uuid
import random
import json
from services.VideoLogic import process_chat_response, initialize_resources, process_environment

# 初始化 OpenAI client（填入你的 API 金鑰）
client = openai.OpenAI(api_key="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")  # ✅ 替換為你的金鑰
model = whisper.load_model("small") 
video_bp = Blueprint('video', __name__)

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
STATS_DIR = os.path.join(BASE_DIR, "assets/Chat/chat_histories")
VIDEO_DIR = os.path.join(BASE_DIR, "outputs/video")

@video_bp.route('/video-voice', methods=['POST'])
def save_voice_file():
    print("form 資料:", request.form)
    print("files 資料:", request.files)

    # 讀音檔
    audio_file = request.files.get('file')
    if audio_file is None:
        return {"error": "沒有上傳音檔"}, 400

    try:
        # 儲存為暫存檔
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(audio_file.read())
            tmp_path = tmp.name

        # Whisper 語音辨識
        result = model.transcribe(tmp_path, language="zh")
        whisper_recognized_text = result["text"]
        print(f"🗣 Whisper 辨識結果: {whisper_recognized_text}")

        # 傳給 GPT 做校正
        gpt_input = f"""這是語音辨識結果：
「{whisper_recognized_text}」
請幫我修正錯字，並且為了讓句子通順，可以稍微修改內容，但不可以偏離語句原本的意思。請直接回覆：修正後的一句完整通順句子（不要附加其他說明）。"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "你是一個負責文字校正的助手。"},
                {"role": "user", "content": gpt_input}
            ],
            temperature=0,
        )
        corrected_text = response.choices[0].message.content.strip()
        print(f"📝 GPT 修正後：{corrected_text}")

        return {
            "success": True,
            "raw_text": whisper_recognized_text,
            "corrected_text": corrected_text,
        }

    except Exception as e:
        print(f"❌ 錯誤: {str(e)}")
        traceback.print_exc()
        return {"error": str(e)}, 500

@video_bp.route('/video-photo', methods=['POST'])
def anallyze_photo():
    try:
        # ⬇️ 讀取上傳的圖片
        file = request.files['file']
        if not file:
            return {'error': '缺少圖片'}, 400

        # ⬇️ 生成唯一檔名 + 儲存路徑
        filename = f"{uuid.uuid4().hex}.jpg"
        image_path = os.path.join("/tmp", filename)
        file.save(image_path)

        # ⬇️ 呼叫你的分析主函式
        result = process_environment(image_path)

        # ⬇️ 可選：刪除暫存圖片
        os.remove(image_path)

        return result if result else {'has_update': False}, 200

    except Exception as e:
        print(f"❌ 處理失敗: {str(e)}")
        return {'error': '處理失敗'}, 500


@video_bp.route('/video-response', methods=['POST'])
def process_video_response():
    try:
        data = request.get_json()
        if not data:
            return {"error": "缺少文字內容"}, 400

        voice_result = data.get('voice')  # 你從前端傳過來的錄音結果
        image_result = data.get('image')  # 你從前端傳過來的圖片辨識結果

        response = process_chat_response(voice_result, image_result)

        return response  # 這裡 response 已經是 jsonify 格式（從 service 傳回的）
    
    except Exception as e:
        print("⚠️ 回覆產生失敗:", str(e))
        return {"error": "產生回覆失敗"}, 500
    
@video_bp.route('/get-no-lip-sync-video', methods=['POST'])
def video_response():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "缺少資料"}), 400

        username = "test1"
        character_name = "金珉奎"
        reply_text = data.get("reply")

        # 讀取角色 stats（取得 mood）
        stats_path = os.path.join(STATS_DIR, f"{character_name}_stats.json")
        if not os.path.exists(stats_path):
            print(f"[DEBUG] 找不到角色 stats: {stats_path}")
            return jsonify({"error": "找不到角色 stats"}), 404

        with open(stats_path, "r", encoding="utf-8") as f:
            stats = json.load(f)

        mood = stats.get("mood", "中立")

        # 選影片
        video_folder = os.path.join(VIDEO_DIR, f"{username}_{character_name}", mood)
        if not os.path.exists(video_folder):
            return jsonify({"error": f"找不到影片資料夾: {video_folder}"}), 404

        
        candidates = [f for f in os.listdir(video_folder)
                      if f.lower().startswith("voice") and f.endswith(".mp4")]

        if not candidates:
            return jsonify({"error": "找不到影片檔"}), 404

        selected_video = random.choice(candidates)
        video_path_fs = os.path.join(video_folder, selected_video)  # 真實檔案路徑

        if os.path.exists(video_path_fs):
            with open(video_path_fs, "rb") as f:
              encoded = base64.b64encode(f.read()).decode()

        return jsonify({
            "reply": reply_text,
            "mood": mood,
            "video_base64": encoded,  
        })

    except Exception as e:
        print(f"⚠️ video-response 發生錯誤: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
