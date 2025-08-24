from flask import Blueprint, Flask, Response, request, jsonify # 用flask來做前後端串聯
import os, base64
import openai
import requests
from services.PhotoLogic import image_to_data_url, get_character_appearance

photo_bp = Blueprint('photo', __name__)

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

openai.api_key = "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"

@photo_bp.route("/generate", methods=["POST"])
def generate():
    try:
        uploaded_file = request.files.get("file")
        if not uploaded_file:
            return jsonify({"error": "no file uploaded"}), 400

        user_prompt = request.form.get("user_prompt", "").strip()
        character_id = request.form.get("character_id", 2)

        try:
            # 如果有使用者輸入，統一翻譯成英文（使用 gpt-4-mini）
            if user_prompt:
                translation_resp = openai.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "user",
                        "content": [
                            {"type": "text",
                            "text": f"請把下面文字翻譯成英文，保持原意，簡短即可:\n{user_prompt}"}
                        ]}
                    ]
                )
                user_prompt = translation_resp.choices[0].message.content.strip()
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"error": f"翻譯失敗: {str(e)}"}), 500
        
        try:
            character_desc = get_character_appearance(character_id)
        except FileNotFoundError as e:
            return jsonify({"error": f"角色圖片不存在: {str(e)}"}), 404


        # 把檔案存起來，方便後續處理
        save_dir = os.path.join(BASE_DIR, "assets", "Photo")
        os.makedirs(save_dir, exist_ok=True)
        filepath = os.path.join(save_dir, uploaded_file.filename)
        uploaded_file.save(filepath)
        data_url = image_to_data_url(filepath)


        # 🎯 Vision API 分析使用者圖片內容
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Describe the image. Be concise but include gender, clothing color, hairstyle, pose, and setting."},
                        {"type": "image_url", "image_url": {"url": data_url}}
                    ]
                }
            ]
        )
        user_desc = response.choices[0].message.content.lower()
        print(user_desc)
        is_person = any(w in user_desc for w in ["person", "people", "man", "woman", "boy", "girl", "face", "selfie"])
        
        # 🎨 根據四種情況組合 prompt
        if is_person and user_prompt:
            # 人物 + user_prompt
            final_prompt = (
                f"Generate a semi-realistic anime style **half-body** image: "
                f"{character_desc} interacting naturally with the image depicting {user_desc}, "
                f"in a scene described as '{user_prompt}', full-body visible from waist up, soft pastel gradient background, smooth shading, like an illustrated character profile."
            )
            print(f"\n[Prompt] 這是人物+user_prompt的狀況 {final_prompt}\n")

        elif is_person and not user_prompt:
            # 人物 + 沒有 user_prompt
            final_prompt = (
                f"Generate a semi-realistic anime style **half-body** image: "
                f"{character_desc} and the image depicting {user_desc}, both with happy expressions, posing peace sign together naturally, "
                f"full-body visible from waist up, soft pastel gradient background, smooth shading, like an illustrated character profile."
            )
            print(f"\n[Prompt] 這是人物 + 沒有user_prompt的狀況 {final_prompt}\n")

        elif not is_person and user_prompt:
            # 非人物 + user_prompt
            final_prompt = (
                f"Generate a semi-realistic anime style **half-body** image: "
                f"{character_desc} with a happy expression, placed in the environment described by {user_desc}, "
                f"and the scene should match the description '{user_prompt}', soft pastel gradient background, smooth shading, like an illustrated character profile."
            )
            print(f"\n[Prompt] 這是沒有人物 + user_prompt的狀況 {final_prompt}\n")

        else:  # not is_person and not user_prompt
            # 非人物 + 沒有 user_prompt
            final_prompt = (
                f"Generate a semi-realistic anime style **half-body** image: "
                f"{character_desc} with a happy expression, placed in the environment described by {user_desc}, "
                f"soft pastel gradient background, smooth shading, like an illustrated character profile."
            )
            print(f"\n[Prompt] 這是沒有人物 + 沒有user_prompt的狀況 {final_prompt}\n")

        # 🎨 使用 DALL·E 生成合成圖
        result = openai.images.generate(
            model="dall-e-3",
            prompt=final_prompt,
            n=1,
            size="1024x1024"
        )
        image_url = result.data[0].url

        image_data = requests.get(image_url).content
        encoded = base64.b64encode(image_data).decode("utf-8")
        return jsonify({ "result": encoded })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500