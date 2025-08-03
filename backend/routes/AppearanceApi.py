from flask import Blueprint, request, jsonify
from services.AppearanceGirlLogic import generate_with_faceid, build_custom_prompt
from rembg import remove
from PIL import Image
import base64, os
import time 

appearance_bp = Blueprint('appearance', __name__)

# 設定生成與輸出資料夾
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
out_dir = 'outputs'
out_dir_t2i = os.path.join(out_dir, 'txt2img')
rem_dir = os.path.join(BASE_DIR, 'outputs', 'removed')

@appearance_bp.route('/generate-appearance-girl', methods=['POST'])
def generate_appearance_girl():
    print("收到請求！")
    data = request.get_json()
    outfit_style = data.get('style')
    image_base64 = data.get('imageBase64')
    seed = -1

    if not image_base64:
        return jsonify({'error': '缺少圖片資料'}), 400

    prompt, negative_prompt = build_custom_prompt(outfit_style)
    # 直接用 base64 字串，不用存檔
    result = generate_with_faceid(image_base64, seed, prompt, negative_prompt)

    # 取得最新生成的圖片路徑
    generated_images = sorted(os.listdir(out_dir_t2i), reverse=True)
    if generated_images and len(generated_images) >= 3:
        image_filename = generated_images[2]  # 選第 3 張
        image_path = os.path.join(out_dir_t2i, image_filename)

        try:
            image = Image.open(image_path)
            removed_image = remove(image)

            # 儲存處理後的圖
            output_filename = 'removed_background.png'
            output_path = os.path.join(rem_dir, output_filename)
            removed_image.save(output_path)

            return jsonify({"message": "生成成功"})

        except Exception as e:
            return jsonify({"error": f"圖片處理失敗: {str(e)}"}), 500
    else:
        return jsonify({"error": "生成圖片數量不足"}), 500  # ✅ 加這個 fallback
        
@appearance_bp.route('/generate-appearance-boy', methods=['POST'])
def generate_appearance_boy():
    print("收到請求！")
    data = request.get_json()
    outfit_style = data.get('style')
    image_base64 = data.get('imageBase64')
    seed = -1

    if not image_base64:
        return jsonify({'error': '缺少圖片資料'}), 400

    prompt, negative_prompt = build_custom_prompt(outfit_style)
    # 直接用 base64 字串，不用存檔
    result = generate_with_faceid(image_base64, seed, prompt, negative_prompt)

    # 取得最新生成的圖片路徑
    generated_images = sorted(os.listdir(out_dir_t2i), reverse=True)
    if generated_images and len(generated_images) >= 3:
        image_filename = generated_images[2]  # 選第 3 張
        image_path = os.path.join(out_dir_t2i, image_filename)

        try:
            image = Image.open(image_path)
            removed_image = remove(image)

            # 儲存處理後的圖
            output_filename = 'removed_background.png'
            output_path = os.path.join(rem_dir, output_filename)
            removed_image.save(output_path)

            return jsonify({"message": "生成成功"})

        except Exception as e:
            return jsonify({"error": f"圖片處理失敗: {str(e)}"}), 500
    else:
        return jsonify({"error": "生成圖片數量不足"}), 500  # ✅ 加這個 fallback


@appearance_bp.route('/get-image-base64', methods=['GET'])
def get_image_base64():
    time.sleep(5)
    image_filename = 'removed_background.png'
    image_path = os.path.join(rem_dir, image_filename)

    if not os.path.exists(image_path):
        return jsonify({"error": "沒有生成的圖片"}), 404

    try:
        with open(image_path, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf-8")
            return jsonify({
                "image_base64": encoded,
                "filename": image_filename
            })
    except Exception as e:
        return jsonify({"error": f"讀取圖片失敗: {str(e)}"}), 500