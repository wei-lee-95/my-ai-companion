from flask import Blueprint, request, jsonify
from services.RouteInfoLogic import get_all_character_full_body_path, get_single_character_image_path

# from services.DatabaseCharacters import database_character()

routeinfo_bp = Blueprint('routeinfo', __name__)

@routeinfo_bp.route('/rolelist', methods=['GET']) 
def get_role_list():
    # 這裡 user_id 改成重前端傳
    try:
        user_id = request.args.get('userId', type=int)
        if not user_id:
            return jsonify({"success": False, "error": "缺少 userId"}), 400

        result = get_all_character_full_body_path(user_id)
        # debug 印出 result
        print("DEBUG: get_role_list result =", result)

        return jsonify({"success": True, "roles": result})
    
    except Exception as e:
        return jsonify({"sucess": False, "error" :str(e)}),500
    

@routeinfo_bp.route('/get-image', methods=['GET']) 
def get_mainscreen_image():
    try:
        character_id = request.args.get('characterId', type=int)
        if not character_id:
            return jsonify({"success": False, "error": "缺少 character_id"}), 400
        
        result = get_single_character_image_path(character_id)

        if not result:
            return jsonify({"success": False, "error": f"找不到角色 {character_id} 的圖片"}), 404
        
        # debug 印出 result
        print("DEBUG: get_role_list result =", result)
        return jsonify({"success": True, "roles": result})

    except Exception as e:
        return jsonify({"sucess": False, "error" :str(e)}),500
