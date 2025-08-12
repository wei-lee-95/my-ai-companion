from flask import Blueprint, request, jsonify
import os, base64, logging, traceback
from services.VoiceLogic import run_tts_script, run_prerequisites_script, run_infer_script, run_preprocess_script, run_extract_script, run_train_script, BASE_DIR

voice_bp = Blueprint('voice', __name__)

# @voice_bp.route('/train-voice-model', methods=['POST'])
# def auto_create_rvc_model():
    
#     # print("form 資料:", request.form)
#     # print("files 資料:", request.files)

#     form = request.form
#     model_name = form.get("model_name")
#     sample_rate = int(form.get("sample_rate", 40000))
#     epochs = int(form.get("epochs", 1))
#     batch_size = int(form.get("batch_size", 8))
#     gpu = int(form.get("gpu", 0))
#     pretrained = form.get("pretrained", "true").lower() == "true"
#     f0_method = form.get("f0_method", "rmvpe")
#     save_every_epoch = int(form.get("save_every_epoch", 1))
#     save_only_latest = form.get("save_only_latest", "true").lower() == "true"
#     save_every_weights = form.get("save_every_weights", "false").lower() == "true"

#     model_folder = os.path.join(BASE_DIR, "assets", "Voice", "Models", model_name)
    
#     if os.path.exists(model_folder):
#         pth_file = next((os.path.join(model_folder, f)
#                         for f in os.listdir(model_folder) if f.endswith('.pth')), None)
#         if pth_file:
#             print(f"模型 {model_name} 已存在，跳過訓練。")
#             return jsonify({"success": True, "message": "模型已存在，無需重新訓練"})

#     # 讀檔案
#     audio_file = request.files.get('file')
#     if audio_file is None:
#         return {"error": "沒有上傳音檔"}, 400

#     # 把檔案存起來，方便後續處理
#     save_dir = os.path.join(BASE_DIR, "assets", "Voice", "Datasets", model_name)
#     os.makedirs(save_dir, exist_ok=True)
#     save_path = os.path.join(save_dir, audio_file.filename)
#     audio_file.save(save_path)

#     print("開始建立RVC模型...")
#     try:
#         run_prerequisites_script(
#             pretraineds_hifigan = True,
#             models = True,
#             exe = True,
#         )

#         preprocess_result = run_preprocess_script(
#             model_name=model_name,
#             dataset_path=save_dir,
#             sample_rate=sample_rate,
#             cpu_cores=4,
#             cut_preprocess="Automatic",
#             process_effects=True,
#             noise_reduction=True,
#             clean_strength=0.7,
#             chunk_len=0.5,
#             overlap_len=0.1
#         )
#         print(f"預處理完成: {preprocess_result}")

#         extract_result = run_extract_script(
#             model_name=model_name,
#             f0_method="rmvpe",
#             hop_length=128,
#             cpu_cores=4,
#             gpu="-",
#             sample_rate=sample_rate,
#             embedder_model="contentvec",
#             include_mutes=0
#         )
#         print(f"特徵提取完成: {extract_result}")

#         train_result = run_train_script(
#             model_name=model_name,
#             save_every_epoch=save_every_epoch,
#             save_only_latest=save_only_latest,
#             save_every_weights=save_every_weights,
#             total_epoch=1,
#             sample_rate=sample_rate,
#             batch_size=batch_size,
#             gpu=-1,
#             pretrained=pretrained,
#             overtraining_detector=True,
#             overtraining_threshold=5,
#             cleanup=True,
#             index_algorithm="Auto",
#             cache_data_in_gpu=False,
#             vocoder="HiFi-GAN",
#             checkpointing=False
#         )
#         print(f"訓練完成: {train_result}")

#         return jsonify({"success": True, "message": "模型建立完成"})

#     except Exception as e:
#         print(f"建立RVC模型出錯: {str(e)}")
#         traceback.print_exc()
#         return jsonify({"success": False, "error": str(e)}), 500


# @voice_bp.route('/generate-voice', methods=['POST'])
# def generate_voice():
#     data = request.json
#     text = data.get('text')
#     rate = data.get('rate', 0)
#     pitch = data.get('pitch', 0)
#     model_name = data.get('model_name', 'Mingyu')

#     model_folder = os.path.join(BASE_DIR, "assets", "Voice", "Models", model_name)
#     output_dir = os.path.join(BASE_DIR, "Outputs", "Voice")
#     os.makedirs(output_dir, exist_ok=True)

#     tts_path = os.path.join(output_dir, 'tts_output.wav')
#     final_output_path = os.path.join(output_dir, 'final_output.wav')

#     try:
#         pth_file = next((os.path.join(model_folder, f)
#                          for f in os.listdir(model_folder) if f.endswith('.pth')), None)
#         if not pth_file:
#             return jsonify({"error": "找不到模型檔案"}), 500
        
#         # "zh-TW-YunJheNeural"

#         run_tts_script(
#             tts_text=text,
#             tts_voice="zh-TW-HsiaoYuNeural",
#             tts_rate=rate,
#             pitch=pitch,
#             output_tts_path=tts_path,
#             clean_audio=True,
#             clean_strength=0.5,
#             export_format="WAV",
#             tts_file="",
#             index_rate=0.75,
#             volume_envelope=1,
#             protect=0.33,
#             hop_length=128,
#             f0_method="rmvpe",
#             output_rvc_path=final_output_path,
#             pth_path=pth_file,
#             index_path="",
#             split_audio=False,
#             f0_autotune=False,
#             f0_autotune_strength=0,
#             f0_file=None,
#             embedder_model="contentvec"
#         )

#         if os.path.exists(final_output_path):
#             with open(final_output_path, "rb") as f:
#                 encoded = base64.b64encode(f.read()).decode("utf-8")
#                 return jsonify({"message": "生成成功", "audio_base64": encoded})
#         else:
#             return jsonify({"error": "生成失敗"}), 500

#     except Exception as e:
#         logging.exception("TTS 生成錯誤：")
#         return jsonify({"error": str(e)}), 500

@voice_bp.route('/get-audio-base64', methods=['GET'])
def get_audio_base64():
    audio_path = os.path.join(BASE_DIR, "Outputs", "Voice", "final_output.wav")
    if os.path.exists(audio_path):
        with open(audio_path, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf-8")
            return jsonify({"audio_base64": encoded})
    else:
        return jsonify({"error": "音檔不存在"}), 404
