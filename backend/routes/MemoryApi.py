from flask import Blueprint, Flask, Response, request, jsonify # 用flask來做前後端串聯
import json
import os
import time
import openai

memory_bp = Blueprint('memory', __name__)

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
MEMORY_DIR = os.path.join(BASE_DIR, 'assets', 'Memory')
HISTORY_DIR = os.path.join(BASE_DIR, "assets", "Chat", "chat_histories")

client = openai.OpenAI(api_key="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") 

@memory_bp.route("/generate_memory", methods=["POST"])
def generate_memory():
    data = request.get_json()
    character_name = data.get("character_name", "未命名角色")
    focus = data.get("focus")
    context = data.get("context", [])
    category = data.get("category", "未分類")

    # 保證 context 至少有 4 筆
    while len(context) < 4:
        context.insert(0, "（空）")

    # 載入 prompt 模板
    prompt_path = os.path.join(MEMORY_DIR, "memory_prompt.txt")
    with open(prompt_path, "r", encoding="utf-8") as f:
        prompt_template = f.read()

    prompt = prompt_template.format(
        context_1=context[0],
        context_2=context[1],
        context_3=context[2],
        context_4=context[3],
        focus=focus,
        category=category
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        title = response.choices[0].message.content.strip()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    record = {
        "category": category,
        "focus": focus,
        "context": context,
        "title": title,
        "timestamp": int(time.time()),
    }

    # 儲存位置統一改為 HISTORY_DIR（跟你的其他角色資料一起）
    record_file_path = os.path.join(HISTORY_DIR, f"{character_name}_record.json")
    if os.path.exists(record_file_path):
        with open(record_file_path, "r", encoding="utf-8") as f:
            records = json.load(f)
    else:
        records = []

    records.append(record)

    with open(record_file_path, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print(f"\n📝 產生的標題：{title}")
    print(f"🔍 來自句子：{focus}")
    print(f"📂 類別：{category}")
    print(f"📁 共儲存記錄：{len(records)} 筆")

    return jsonify({"message": "記憶儲存成功", "title": title})
