from flask import Blueprint, request, jsonify
import os, base64, logging, traceback

video_bp = Blueprint('video', __name__)

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

@video_bp.route('/video_voice', methods=['POST'])
def save_voice_file():
    
    print("form 資料:", request.form)
    print("files 資料:", request.files)
    form = request.form

    # 讀檔案
    audio_file = request.files.get('file')
    if audio_file is None:
        return {"error": "沒有上傳音檔"}, 400

    # 把檔案存起來，方便後續處理
    save_dir = os.path.join(BASE_DIR, "assets", "Video", "Input")
    os.makedirs(save_dir, exist_ok=True)
    save_path = os.path.join(save_dir, audio_file.filename)
    audio_file.save(save_path)

