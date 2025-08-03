from flask import Blueprint, request, jsonify
import os, base64, logging, traceback
import whisper
import tempfile
import openai
from services.VideoLogic import process_chat_response, initialize_resources

# 初始化 OpenAI client（填入你的 API 金鑰）
client = openai.OpenAI(api_key="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")  # ✅ 替換為你的金鑰
model = whisper.load_model("small") 
video_bp = Blueprint('video', __name__)

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

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


@video_bp.route('/video-response', methods=['POST'])
def process_video_response():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return {"error": "缺少文字內容"}, 400

        user_text = data['text']
        response = process_chat_response(user_text, context=None)

        return response  # 這裡 response 已經是 jsonify 格式（從 service 傳回的）
    
    except Exception as e:
        print("⚠️ 回覆產生失敗:", str(e))
        return {"error": "產生回覆失敗"}, 500