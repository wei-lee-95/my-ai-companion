# 包含註冊、登入系統
# ai-companion --> table --> users

import hashlib
from werkzeug.security import check_password_hash, generate_password_hash
from database.database import user_model,db_manager

def hash_password(password: str) -> str:
    return generate_password_hash(password)

def verify_password(stored_hash: str, password: str) -> bool:
    # Backward compatible with older SHA256-only rows in local/dev databases.
    if stored_hash == hashlib.sha256(password.encode()).hexdigest():
        return True
    return check_password_hash(stored_hash, password)

def register_user(email: str, password: str, username: str, age: int):
    if user_model.get_user_by_email(email):
        return None, "Email 已被註冊"

    password_hash = hash_password(password)
    # 如果 username 沒有給，可以用 email 或空字串
    user_id = user_model.create_user(username, password_hash, email, age)
    return user_id, None

def login_user(email: str, password: str):
    user = user_model.get_user_by_email(email)

    if not user:
        print("[DEBUG] 找不到使用者")
        return None, "帳號錯誤"

    db_pw = user['password_hash']

    # 強制轉字串並去除空白
    #db_pw_str = str(db_pw).strip()
    #input_pw_str = str(input_pw).strip()

    #print(f"[DEBUG] 去除空白後比較：{db_pw_str == input_pw_str}")

    if not verify_password(db_pw, password):
        print("[DEBUG] 密碼不匹配，登入失敗")
        return None, "密碼錯誤"

    print("[DEBUG] 密碼匹配，登入成功")
    user_model.update_last_login(user['id'])
    return user, None

def change_profile(user_id: int, email: str, password: str,age: int):
    print(f"這是AuthLogic中的email={email}, user_id={user_id}")
    existing_user = user_model.get_user_by_email(email)
    if existing_user and existing_user["id"] != user_id:
        return None, "Email 已被註冊"

    password_hash = hash_password(password)
    # 如果 username 沒有給，可以用 email 或空字串
    user_id = user_model.update_user_profile(user_id, email, password_hash, age)
    return user_id, None

def get_info(user_id:int):
    rows = user_model.get_user_by_id(user_id)
    if not rows:
        return None
    print({rows})

    old_profile = {
        'username': rows['username'],
        'email': rows['email'],
        'age': rows['age'],
    }

    return old_profile
        
