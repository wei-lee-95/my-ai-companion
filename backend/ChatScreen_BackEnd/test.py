# 後端base64轉"請描述這張圖片內容"失敗
import base64
import json
import os

# 找到當前腳本的資料夾
current_dir = os.path.dirname(os.path.abspath(__file__))
image_path = os.path.join(current_dir, "test.jpg")
json_path = os.path.join(current_dir, "image_data.json")

# 讀取圖片並轉成 base64
with open(image_path, "rb") as f:
    img_base64 = base64.b64encode(f.read()).decode("utf-8")

# 包成 dict
data = {
    "image_base64": f"data:image/jpeg;base64,{img_base64}"
}

# 寫入 json 檔案
with open(json_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"成功寫入 {json_path}")