import requests
import base64
import os
import shutil
import time
from rembg import remove

EXPRESSION_CONFIGS = {
    "開心": {"aaa": -10, "blink": 0, "eee": 0, "eyebrow": 0, "smile": 1.3, "woo": 0},
    "驚訝": {"aaa": 45, "blink": 7, "eee": 0, "eyebrow": 10, "smile": 0, "woo": 10},
    "生氣": {"aaa": -40, "blink": 3, "eee": 10, "eyebrow": -10, "smile": -0.5, "woo": 20},
    "傷心": {"aaa": -30, "blink": -5, "eee": 0, "eyebrow": -10, "smile": -0.9, "woo": 15},
    # "中立" 不需 API
}

API_KEY = "SG_079a62025c687848"
API_URL = "https://api.segmind.com/v1/expression-editor"
HEADERS = {'x-api-key': API_KEY}

import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # backend
rem_dir = os.path.join(BASE_DIR, 'outputs', 'removed')

def image_file_to_base64(image_path):
    with open(image_path, 'rb') as f:
        return base64.b64encode(f.read()).decode('utf-8')

def generate_emotions(user_name, character_name):
    
    # input_path = f"backend/outputs/removed/removed_background_boy.png"
    input_path = os.path.join(rem_dir, f"{user＿name}_{character_name}.png")

    if not os.path.exists(input_path):
        raise FileNotFoundError(f"找不到圖片：{input_path}")

    base_image_b64 = image_file_to_base64(input_path)

    output_folder = os.path.join(BASE_DIR, "outputs/emotion", f"{user_name}_{character_name}")
    os.makedirs(output_folder, exist_ok=True)

    # ✅ 複製中立圖片
    neutral_path = os.path.join(output_folder, "中立.png")
    shutil.copyfile(input_path, neutral_path)
    print(f"✅ 已複製中立圖片：{neutral_path}")

    emotion_keys = list(EXPRESSION_CONFIGS.keys())

    for i, emotion in enumerate(emotion_keys):
        print(f"\n📤 發送第 {i+1} 筆請求：{emotion}")

        payload = {
            **EXPRESSION_CONFIGS[emotion],
            "image": base_image_b64,
            "image_format": "png",
            "image_quality": 95,
            "wink": 0,
            "pupil_x": 0,
            "pupil_y": 0,
            "rotate_pitch": 0,
            "rotate_roll": 0,
            "rotate_yaw": 0,
            "sample_parts": "OnlyExpression",
        }

        response = requests.post(API_URL, json=payload, headers=HEADERS)

        if response.status_code == 200 and response.headers.get("Content-Type", "").startswith("image"):
            output_path = os.path.join(output_folder, f"{emotion}.png")
            with open(output_path, "wb") as f:
                f.write(response.content)
            print(f"✅ 已儲存：{output_path}")

            # ✅ 去背生成的表情圖片
            with open(output_path, "rb") as f:
                removed_data = remove(f.read())
            with open(output_path, "wb") as f:
                f.write(removed_data)
            print(f"去背後檔案: {output_path}")

        else:
            print(f"⚠️ 錯誤：{emotion}")
            print("Status Code:", response.status_code)
            print("Response Text:", response.text)

        # ⏳ 等待 5 分鐘（除最後一張外）
        if i < len(emotion_keys) - 1:
            print("⏳ 等待 12 秒再送下一張...")
            time.sleep(12)

