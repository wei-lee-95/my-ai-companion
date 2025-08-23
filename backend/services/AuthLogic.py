# 包含註冊、登入系統
# ai-companion --> table --> users

import hashlib
from database.database import user_model,db_manager

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

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
    input_pw = hash_password(password)

    print(f"[DEBUG] 資料庫密碼雜湊：'{db_pw}'")
    print(f"[DEBUG] 輸入密碼雜湊：'{input_pw}'")
    print(f"[DEBUG] type(db_pw): {type(db_pw)}, type(input_pw): {type(input_pw)}")

    # 強制轉字串並去除空白
    #db_pw_str = str(db_pw).strip()
    #input_pw_str = str(input_pw).strip()

    #print(f"[DEBUG] 去除空白後比較：{db_pw_str == input_pw_str}")

    if db_pw != input_pw:
        print("[DEBUG] 密碼不匹配，登入失敗")
        return None, "密碼錯誤"

    print("[DEBUG] 密碼匹配，登入成功")
    user_model.update_last_login(user['id'])
    return user, None