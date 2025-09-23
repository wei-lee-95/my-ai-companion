from flask import Blueprint, request, jsonify
import json
import os
from datetime import datetime
from services.AuthLogic import change_profile, get_info

setting_bp = Blueprint('setting', __name__)

@setting_bp.route('/setting-profile', methods=['POST'])
def setting_profile():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    age = data.get('age')
    user_id = data.get('userId')
    print(f"這是SettingApi中的email={email}, password={password}, user_id={user_id}")

    # 確保每個欄位都有值，且非空字串，年齡是合法整數
    if not all([email, password, age]):
        return jsonify({"error": "所有欄位皆為必填，不能為空"}), 400
    
    email = str(email).strip()
    password = str(password).strip()

    # 額外檢查空白字串與年齡是否合法（1~120）
    if not email or not password :
        return jsonify({"error": "email、password 不能為空白"}), 400

    try:
        age = int(age)
        if not (1 <= age <= 120):
            return jsonify({"error": "年齡必須介於 1 到 120 歲之間"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "年齡格式不正確，必須是數字"}), 400
    
    # 修改user的資訊
    updated_user_id, error = change_profile(user_id=user_id, email=email, password=password, age=age)
    if error:
        return jsonify({"error": error}), 400

    return jsonify({"message": "user的profile更新失敗", "user_id": updated_user_id}), 201


@setting_bp.route('/get-profile', methods=['GET'])
def get_profile():
    try:
        user_id = request.args.get('userId', type=int)
        if not user_id:
            return jsonify({"success": False, "error": "缺少 userId"}), 400
        
        old_profile = get_info(user_id)
        if not old_profile:
            return jsonify({"success": False, "error": "找不到使用者"}), 404

        return jsonify({"success": True, "profile": old_profile})
    
    except Exception as e:
        return jsonify({"success":False, "error":str(e)}),500