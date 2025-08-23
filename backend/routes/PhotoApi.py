from flask import Blueprint, Flask, Response, request, jsonify # 用flask來做前後端串聯
import os, base64
import openai
import requests
from services.PhotoLogic import image_to_data_url, AI_BOY_DESC

photo_bp = Blueprint('photo', __name__)

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

openai.api_key = "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"

@photo_bp.route("/generate", methods=["POST"])
def generate():
    uploaded_file = request.files["file"]
    user_prompt = request.form.get("user_prompt", "").strip()

    # 把檔案存起來，方便後續處理
    save_dir = os.path.join(BASE_DIR, "assets", "Photo")
    os.makedirs(save_dir, exist_ok=True)
    filepath = os.path.join(save_dir, uploaded_file.filename)
    uploaded_file.save(filepath)
    data_url = image_to_data_url(filepath)

    def translate_to_english(text):
        output = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a translator that only outputs English."},
                {"role": "user", "content": text}
            ]
        )
        return output.choices[0].message.content.strip()


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
    final_prompt = (
        f"Generate a semi-realistic anime style image of two people: "
        f"{AI_BOY_DESC} and the image depicts {user_desc}. They are standing together, "
        f"soft pastel gradient background, full-body, natural head-to-body ratio, smooth shading, modern outfits, natural proportion, like illustrated character profile."
    )
    if user_prompt:
        translated_prompt = translate_to_english(user_prompt)
        final_prompt = (
            f"Generate a semi-realistic anime style image of the character: {AI_BOY_DESC}, "
            f"placed inside a scene that includes {user_desc}. The background and object should be animated, clean pastel style, like illustrated character profile, and smooth shading."
            f"Also include these details: {translated_prompt}"
        )
    
    print(f"\n[Prompt] {final_prompt}\n")

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