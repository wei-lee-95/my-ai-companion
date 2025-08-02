import base64


# ✅ 固定 AI 男友特徵描述（你可微調）
AI_BOY_DESC = (
    "A handsome young man in semi-realistic anime style, like illustrated character profile, with fair skin, calm almond-shaped brown eyes, defined jawline, "
    "short neat black hair with center part, soft but masculine features, wearing a sleeveless white shirt and white pants. "
    "His facial expression is gentle and confident, looking forward with soft light hitting his face. He is fit but lean, "
    "and styled like a Korean male idol in a clean aesthetic. Do not change his appearance."
)

def image_to_data_url(image_path):
    with open(image_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("utf-8")
        mime = "image/png" if image_path.endswith("png") else "image/jpeg"
        return f"data:{mime};base64,{encoded}"