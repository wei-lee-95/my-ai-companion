from flask import Blueprint, request, jsonify
from services.CreateCharacterLogic import create_character_db, update_appearance_clothingstyle, update_voice_reference, update_appearance_image_path, update_animation_path, update_voice_path
from database.migrate_data import DataMigrator
import traceback

createcharacter_bp = Blueprint('create_character', __name__)

@createcharacter_bp.route('/create-character', methods=['POST'])
def api_create_character():
    try:
        data = request.get_json()
        print("收到的 gender:", data.get('gender'))  # 這行會在後端終端機輸出 gender 的值

        user_id = data.get('user_id')
        if not user_id:
            return jsonify({"success": False, "error": "缺少 user_id"}), 400

        # 驗證必填欄位，這邊不需要 user_id
        required_fields = ['name', 'gender']
        for field in required_fields:
            if field not in data:
                return jsonify({"success": False, "error": f"缺少必要欄位: {field}"}), 400

        transgender = DataMigrator()

        character_data = {
            'name': data['name'],
            'gender':transgender.map_gender(data['gender']),
            'age': data.get('age', 25),
            'occupation': data.get('occupation'),
            'relationship': data.get('relationship'),
            'relationship_stage': data.get('relationship_stage'),
            'meeting_context': data.get('meeting_context'),
            'personality': data.get('personality'),
            'speaking_style': data.get('speaking_style'),
            'skills': data.get('skills'),
        }

        print("收到的 第二個gender:", transgender.map_gender(data['gender']))  # 這行會在後端終端機輸出轉換玩 gender 的值
        
        character_id = create_character_db(user_id, character_data)

        '''
        # === 新增：存成 JSON 檔 ===
        save_dir = os.path.join(os.path.dirname(__file__), 'assets', 'Chat', 'profiles')
        os.makedirs(save_dir, exist_ok=True)  # 確保資料夾存在

        json_filename = f"{character_data['name']}_profile.json"
        json_path = os.path.join(save_dir, json_filename)

        # 要儲存的資料（可加上 character_id & user_id）
        save_data = {
            "character_id": character_id,
            "user_id": user_id,
            **character_data
        }

        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(save_data, f, ensure_ascii=False, indent=2)

        print(f"📁 JSON 檔已儲存到: {json_path}")'''

        return jsonify({"success": True, "character_id": character_id}), 201

    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500
 


@createcharacter_bp.route('/update_clothing_style', methods=['POST'])
def api_update_clothing_style():
    try:
        data = request.get_json()
        character_id = data.get("character_id")
        clothing_style = data.get("clothing_style")

        if not character_id or not clothing_style:
            return jsonify({"success": False, "error": "缺少 character_id 或 clothing_style"}), 400

        update_appearance_clothingstyle(character_id, clothing_style)

        return jsonify({"success": True, "message": "api_update_clothing_style:clothing_style 更新成功"})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    

@createcharacter_bp.route('/update_pitch_speed', methods=['POST'])
def api_update_pitch_speed():
    try:
        data = request.get_json()
        character_id = data.get("character_id")
        pitch = data.get("pitch")
        speed = data.get("speed")

        if not character_id or pitch is None or speed is None:
            return jsonify({"success": False, "error": "缺少 character_id 或 pitch 或 speed"}), 400

        update_voice_reference(character_id, pitch, speed)

        return jsonify({"success": True, "message": "api_update_pitch_speed:pitch / speed更新成功"})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    
 

@createcharacter_bp.route('/update_appearance_path', methods=['POST'])
def api_update_appearance_path():
    try:
        data = request.get_json()
        character_id = data.get("character_id")
 

        if not character_id :
            return jsonify({"success": False, "error": "缺少 character_id"}), 400

        update_appearance_image_path(character_id)

        return jsonify({"success": True, "message": "api_update_avatar_full_body 更新成功"})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    


@createcharacter_bp.route('/update_animation_path', methods=['POST'])
def api_update_animation_path():
    try:
        data = request.get_json()
        character_id = data.get("character_id")

        if not character_id :
            return jsonify({"success": False, "error": "缺少 character_id"}), 400

        update_animation_path(character_id)

        return jsonify({"success": True, "message": "api_update_animation_path 更新成功"})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@createcharacter_bp.route('/update_voice_path', methods=['POST'])
def api_update_voice_path():
    try:
        data = request.get_json()
        character_id = data.get("character_id")

        if not character_id :
            return jsonify({"success": False, "error": "缺少 character_id"}), 400

        update_voice_path(character_id)

        return jsonify({"success": True, "message": "api_update_voice_path 更新成功"})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500