from flask import Blueprint, request, jsonify
import json
import os
from datetime import datetime
from services.AuthLogic import register_user, login_user

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """用戶註冊"""
    data = request.get_json()
    # 支援前端的 account 參數，同時保持 username 兼容性
    email = data.get('account')
    password = data.get('password')
    username = data.get('name')
    age = data.get('age')

    # 確保每個欄位都有值，且非空字串，年齡是合法整數
    if not all([email, password, username, age]):
        return jsonify({"error": "所有欄位皆為必填，不能為空"}), 400

    email = str(email).strip()
    password = str(password).strip()
    username = str(username).strip()

    # 額外檢查空白字串與年齡是否合法（1~120）
    if not email or not password or not username:
        return jsonify({"error": "email、password、username 不能為空白"}), 400

    try:
        age = int(age)
        if not (1 <= age <= 120):
            return jsonify({"error": "年齡必須介於 1 到 120 歲之間"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "年齡格式不正確，必須是數字"}), 400

    # 執行註冊
    user_id, error = register_user(email=email, password=password, username=username, age=age)
    if error:
        return jsonify({"error": error}), 400

    return jsonify({"message": "註冊成功", "user_id": user_id}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    """用戶登入"""
    try:
        data = request.get_json()
        # 支援前端的 account 參數，同時保持 username 兼容性
        email = data.get('account')
        password = data.get('password')
        
        # 確保每個欄位都有值，且非空字串，年齡是合法整數
        if not all([email, password]):
            return jsonify({"error": "所有欄位皆為必填，不能為空"}), 400

        email = str(email).strip()
        password = str(password).strip()

        if not email or not password:
            return jsonify({"error": "帳號和密碼不能為空"}), 400
        
        user, error = login_user(email, password)
        if error:
            return jsonify({"error": error}), 401

        return jsonify({
            "message": "登入成功",
            "user": {
                "id": user["id"],
                "username": user["username"],
                "email": user["email"]
            }
        }), 200

    except Exception as e:
        return jsonify({"error": f"登入失敗: {str(e)}"}), 500
'''
@auth_bp.route('/users', methods=['GET'])
def get_users():
    """獲取所有用戶（除了密碼）"""
    try:
        users = load_users()
        safe_users = []
        for user in users:
            safe_user = {k: v for k, v in user.items() if k != 'password'}
            safe_users.append(safe_user)
        return jsonify({"users": safe_users}), 200
    except Exception as e:
        return jsonify({"error": f"獲取用戶失敗: {str(e)}"}), 500
'''