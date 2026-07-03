from flask import Blueprint, Flask, Response, request, jsonify # 用flask來做前後端串聯
import json
import os
import time
import openai
from config import OPENAI_API_KEY
from services.MemoryLogic import get_character_memory_category, generate_title, generate_memory_detail, get_time_of_day_by_message_id, add_memory_detail, update_memory_details, delete_memory_db, get_single_memories_by_id, add_new_memory_category, get_single_memory

memory_bp = Blueprint('memory', __name__)

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
MEMORY_DIR = os.path.join(BASE_DIR, 'assets', 'Memory')
HISTORY_DIR = os.path.join(BASE_DIR, "assets", "Chat", "chat_histories")

client = openai.OpenAI(api_key=OPENAI_API_KEY) 


@memory_bp.route("/get-memory-categories", methods=["GET"])
def get_memory_categories_api():

    character_id = request.args.get("character_id", type=int)
    if not character_id:
        return jsonify({"error": "缺少 character_id"}), 400
    
    categories = get_character_memory_category(character_id)
    
    print("[後端 API] get_character_memory_category 回傳 =", categories)

    return jsonify({"categories": categories})


@memory_bp.route("/get-memory-detail", methods=["GET"])
def get_memory_detail_api():

    character_id = request.args.get("character_id", type=int)
    category_id = request.args.get("category_id", type=int)

    if not character_id or not category_id:
        return jsonify({"error": "缺少 character_id 或 category_id"}), 400
    
    mem_details = get_single_memories_by_id(character_id, category_id)
    
    print("[後端 API] get_memory_detail_api 回傳 =", mem_details)

    return jsonify({"memories": mem_details})


@memory_bp.route("/generate-memory", methods=["POST"])
def generate_memory():
    data = request.get_json()
    category_id = data.get("category_id")
    focus = data.get("focus")
    context = data.get("context", [])
    character_id = data.get("character_id")
    name = data.get("name")
    category = data.get("category")
    focus_message_id = data.get("focus_message_id")

    # 保證 context 至少有 4 筆
    while len(context) < 4:
        context.insert(0, "（空）")

    # 1️⃣ 產生標題
    title_prompt = generate_title(category, context[:4], focus)

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": title_prompt}],
            temperature=0.7
        )
        title = response.choices[0].message.content.strip()
        print(title)

    except Exception as e:
        return jsonify({"error": f"產生標題失敗:str(e)"}), 500

    # 2️⃣ 產生情緒與地點
    detail_prompt = generate_memory_detail(focus, context[:4])

    try:
        resp_detail = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": detail_prompt}],
            temperature=0.7
        )
        detail_raw = resp_detail.choices[0].message.content.strip()
        try:
            detail_json = json.loads(detail_raw)
            print(detail_json)

        except json.JSONDecodeError:
            detail_json = {"情緒": "", "地點": ""}
    except Exception as e:
        return jsonify({"error": f"產生情緒與地點失敗: {str(e)}"}), 500

    mood = detail_json.get("情緒", "")
    location = detail_json.get("地點", "")

    # 3️⃣ 取得整點時間（HH）
    try:
        time_info = get_time_of_day_by_message_id(focus_message_id)
        date_str = f"{time_info['year']}年{time_info['month']}月{time_info['day']}日"
        time_of_day = time_info['hour']

    except Exception as e:
        time_of_day = None
        date_str = ""
        print(f"⚠️ 取得時間失敗: {e}")

    # 4️⃣ 寫入資料庫
    try:
        memory_id = add_memory_detail(
            character_id=character_id,
            category_id=category_id,
            focus_message_id=focus_message_id,
            title=title,
            location=location,
            mood=mood,
            time_of_day=time_of_day
        )
    except Exception as e:
        return jsonify({"error": f"資料庫寫入失敗: {str(e)}"}), 500

    print(f"\n📝 新記憶 ID: {memory_id}")
    print(f"🔍 標題：{title}")
    print(f"😊 情緒：{mood}")
    print(f"📍 地點：{location}")
    print(f"⏰ 時段：{time_of_day}")

    return jsonify({
        "message": "記憶儲存成功",
        "memory_id": memory_id,
        "title": title,
        "mood": mood,
        "location": location,
        "time_of_day": time_of_day,
        "date": date_str
    })


@memory_bp.route("/update-memory", methods=["POST"])
def revise_memory():
    data = request.get_json()
    memory_id = data.get('memory_id')
    new_title = data.get('new_title')
    new_location = data.get('new_location')
    new_time = data.get('new_time')
    new_mood = data.get('new_mood')

    print(f"new_title:{new_title}")
    print(f"new_location:{new_location}")
    print(f"new_time:{new_time}")
    print(f"new_mood:{new_mood}")

    memory_data = {
        'title':new_title,
        'location': new_location,
        'time_of_day': new_time,
        'mood': new_mood
    }

    try:
        update_memory_details(memory_id, memory_data)
        return {"status": "success"}
    
    except Exception as e:
        print("revise_memory失敗:", str(e))
        return {"status": "fail", "error": str(e)}, 500
    

@memory_bp.route("/delete-memory", methods=["POST"])
def api_delete_memory():
    data = request.get_json()
    memory_id = data.get('memory_id')

    print(f"memory_id:{memory_id}")
    try:
        delete_memory_db(memory_id)
        return {"status": "success"}
    except Exception as e:
        print("api_delete_memory失敗:", str(e))
        return {"status": "fail", "error": str(e)}, 500


@memory_bp.route("/add-memory-category", methods=["POST"])
def add_memory_category_api():
    data = request.get_json()
    character_id = data.get('character_id')
    category = data.get('category')
    icon = data.get('icon')

    print(f"memory_id:{character_id}")
    print(f"memory_id:{category}")
    print(f"memory_id:{icon}")
 
    try:
        new_id = add_new_memory_category(character_id, category, icon)
        print(f"成功新增 {category} 的記憶類別，ID={new_id}")
        return {"status": "success", "category_id": new_id}
    
    except Exception as e:
        print("新增回憶類別失敗:", str(e))
        return {"status": "fail", "error": str(e)}, 500
    


@memory_bp.route("/get-single-memory", methods=["GET"])
def get_single_memory_api():
    memory_id = request.args.get('memory_id', type=int)
    print(f"[check] API 呼叫開始，memory_id={memory_id}")
    if not memory_id:
        return jsonify({"error": "缺少 memory_id"}), 400

    try:
        mem_row = get_single_memory(memory_id)
        if not mem_row:
            return jsonify({"error": "找不到該記憶"}), 404
        
        print(f"[check] mem_row = {mem_row}")
        # mem_row 已是 dict，直接回傳
        return jsonify({"memory": mem_row})        

    except Exception as e:
        print("提取單項回憶失敗:", str(e))
        return jsonify({"status": "fail", "error": str(e)}), 500

