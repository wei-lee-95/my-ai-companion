from flask import Blueprint, request, jsonify
import os, base64, logging, traceback
import whisper
import tempfile
import openai
import uuid
import random
import json
import traceback
from services.VideoLogic import process_chat_response, initialize_resources, process_environment, get_username, get_gender, get_pitch_and_rate
from database.database import character_model, chat_model
from services.VoiceLogic import get_username, run_tts_script
from services.ChatLogic import  get_db_stats
from config import OPENAI_API_KEY


# 初始化 OpenAI client
client = openai.OpenAI(api_key=OPENAI_API_KEY)
model = whisper.load_model("small") 
video_bp = Blueprint('video', __name__)

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
STATS_DIR = os.path.join(BASE_DIR, "assets/Chat/chat_histories")
VIDEO_DIR = os.path.join(BASE_DIR, "outputs/video")

@video_bp.route("/get-default-video", methods=["POST"])
def get_default_video():

    data = request.get_json()
    user_id = data.get("userId")
    character_name = data.get("name")

    username = get_username(user_id)

    try:

        video_folder = os.path.join(VIDEO_DIR, f"{username}_{character_name}", "中立")

        candidates = [f for f in os.listdir(video_folder)
                    if f.lower().startswith("no") and f.endswith(".mp4")]

        if not os.path.exists(video_folder):
            return jsonify({"error": f"找不到影片資料夾: {video_folder}"}), 404

        selected_video = random.choice(candidates)
        video_path_fs = os.path.join(video_folder, selected_video)  # 真實檔案路徑

        if os.path.exists(video_path_fs):
            with open(video_path_fs, "rb") as f:
                encoded = base64.b64encode(f.read()).decode()

        return jsonify({"video_base64": encoded})

    except Exception as e:
        print(f"⚠️ video-response 發生錯誤: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


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
        user_id = data.get("userId")
        character_id = data.get("character_id")
        name = data.get("name")
        if not user_id or not character_id or not name:
            return jsonify({"success": False, "error": "缺少 user_id 或 character_id 或 name"}), 400
        
        voice_text = data.get("voice")  # 🔑 改這裡，抓取 voice 而不是 text
        image_info = data.get("image")  # 影像上傳的結果（如果之後要用的話）
        if not voice_text:
            return jsonify({"success": False, "error": "缺少 voice"}), 400

        #user_text = data['text']
        try:
            response = process_chat_response(user_id, character_id, name, voice_text, image_info)

        except Exception as e:
            print("❌ process_chat_response 出錯:", str(e))
            traceback.print_exc()
            return jsonify({"success": False, "error": "process_chat_response 執行失敗"}), 500

        return response  # 這裡 response 已經是 jsonify 格式（從 service 傳回的）
    
    except Exception as e:
        print("⚠️ 回覆產生失敗:", str(e))
        return {"error": "產生回覆失敗"}, 500
    
@video_bp.route('/video-generate-voice', methods=['POST'])
def generate_voice():
    data = request.json
    text = data.get('text')
    model_name = data.get('model_name')
    userId = data.get('userId')
    character_id = data.get('character_id')
    gender = get_gender(character_id, userId)

    setting = get_pitch_and_rate(character_id)
    pitch = setting.get('pitch', 0)
    rate = setting.get('rate', 0)

    if gender == 'female':
        tts_voice="zh-TW-HsiaoYuNeural"
    else:
        tts_voice="zh-TW-YunJheNeural"

    user_name = get_username(userId)

    model_folder = os.path.join(BASE_DIR, "assets", "Voice", "Models", f"{user_name}_{model_name}")

    output_dir = os.path.join(BASE_DIR, "outputs", "Voice")
    os.makedirs(output_dir, exist_ok=True)

    tts_path = os.path.join(output_dir, 'tts_output.wav')
    final_output_path = os.path.join(output_dir, 'final_output.wav')

    try:
        pth_file = next((os.path.join(model_folder, f)
                         for f in os.listdir(model_folder) if f.endswith('.pth')), None)
        if not pth_file:
            return jsonify({"error": "找不到模型檔案"}), 500
        
        # "zh-TW-YunJheNeural"
        # "zh-TW-HsiaoYuNeural"
        
        run_tts_script(
            tts_text=text,
            #tts_language_code="cmn-TW",
            tts_voice=tts_voice,
            tts_rate=rate,
            pitch=pitch,
            output_tts_path=tts_path,
            clean_audio=True,
            clean_strength=0.5,
            export_format="WAV",
            tts_file="",
            index_rate=0.75,
            volume_envelope=1,
            protect=0.33,
            hop_length=128,
            f0_method="rmvpe",
            output_rvc_path=final_output_path,
            pth_path=pth_file,
            index_path="",
            split_audio=False,
            f0_autotune=False,
            f0_autotune_strength=0,
            f0_file=None,
            embedder_model="contentvec"
        )

        if os.path.exists(final_output_path):
            with open(final_output_path, "rb") as f:
                encoded = base64.b64encode(f.read()).decode("utf-8")
                return jsonify({"message": "生成成功", "audio_base64": encoded})
        else:
            return jsonify({"error": "生成失敗"}), 500

    except Exception as e:
        logging.exception("TTS 生成錯誤：")
        return jsonify({"error": str(e)}), 500
    
@video_bp.route('/get-no-lip-sync-video', methods=['POST'])
def video_response():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "缺少資料"}), 400

        user_id = data.get("userId")
        character_id = data.get("character_id")
        character_name = data.get("name")
        reply_text = data.get("reply")

        username = get_username(user_id)

        stats_res = get_db_stats(character_id)
        if not stats_res["success"]:
            return jsonify({"error": stats_res["message"]}), 404
        stats = stats_res["data"]
        mood = stats.get("mood", "中立")

        # 選影片
        video_folder = os.path.join(VIDEO_DIR, f"{username}_{character_name}", mood)
        if not os.path.exists(video_folder):
            return jsonify({"error": f"找不到影片資料夾: {video_folder}"}), 404

        waiting = True if reply_text == "" else False

        if waiting:
            candidates = [f for f in os.listdir(video_folder)
                          if f.lower().startswith("no") and f.endswith(".mp4")]
        else:
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
