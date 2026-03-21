import base64
import openai
from database.database import character_model
import os

openai.api_key = ""

# backend 資料夾
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def get_character_appearance(character_id: int) -> str:
    """
    根據 character_id 取得角色的全身圖，並用 GPT-4o Vision 生成描述
    """
    # 1. 從資料庫查詢角色圖片路徑
    row = character_model.get_image_path_by_id(character_id)
    if not row or not row["full_body_image_path"]:
        raise ValueError(f"Character {character_id} 沒有對應的 full_body_image_path")

    image_path = row["full_body_image_path"]

    # 2. 把圖片轉換成 Data URL
    data_url = image_to_data_url(image_path)

    # 3. 丟給 GPT-4o Vision 做分析
    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Describe this character concisely. "
                            "Include: skin tone, eye shape & color, hairstyle, clothing style, pose, and overall vibe. "
                            "Format it as a short descriptive paragraph, suitable for use in an illustration prompt."
                        )
                    },
                    {"type": "image_url", "image_url": {"url": data_url}}
                ]
            }
        ]
    )

    # 4. 取出回傳的描述
    desc = response.choices[0].message.content.strip()

    return desc

def image_to_data_url(image_path):

    abs_path = os.path.join(BASE_DIR, image_path)
    if not os.path.exists(abs_path):
        raise FileNotFoundError(f"找不到檔案: {abs_path}")
    
    with open(abs_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("utf-8")
        mime = "image/png" if image_path.endswith("png") else "image/jpeg"
        return f"data:{mime};base64,{encoded}"