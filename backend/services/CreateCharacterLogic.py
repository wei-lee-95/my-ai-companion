# 包含建角系統、rolelist的呈現
# ai-companion --> characters、personality
from database.database import db_manager, character_model
from database.migrate_data import DataMigrator
from typing import List, Dict, Optional
from PIL import Image
import os

#class DatabaseCharacter:
addpath = DataMigrator()

def create_character_db(user_id: int, character_data:dict)->int:
    """將資料傳進create_character """
    character_id = character_model.create_character(user_id, character_data)
    return character_id


def update_appearance_clothingstyle(character_id: int, clothing_style:str):
    """將colthing_style傳進character_appearances """
    character_id = character_model.update_clothing_style(character_id, clothing_style)

    print(f"[DEBUG] clothing_style 更新完成 for character_id={character_id}")
            

def update_voice_reference(character_id: int, pitch: int, speed: int):
    """將pitch和speed傳進character_voices """
    character_id = character_model.update_voice_pitch_speed(character_id, pitch, speed)

    print(f"[DEBUG] pitch和speed 更新完成 for character_id={character_id}")


def update_appearance_image_path(character_id: int):
    """先取出角色 name，再更新 appearance 的圖片路徑"""
 
    #  1️⃣  取出角色資料（包含 name）
    character = character_model.get_character(character_id)
    if not character:
        print(f"❌ 找不到角色 ID {character_id}")
        return
    character_name = character["name"] 
    print(f"[DEBUG] 角色名稱: {character_name} (id={character_id})")

    # 2️⃣ 取得 username
    username = character_model.get_username_by_character_id(character_id)
    if not username:
        print(f"❌ 找不到 username for character_id={character_id}")
        return
    print(f"[DEBUG] 對應使用者名稱: {username}")

    # 3️⃣ 檔案路徑設定
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    removed_dir = os.path.join(BASE_DIR, "outputs", "removed")
    avatar_dir = os.path.join(BASE_DIR, "outputs", "avatar")
    os.makedirs(avatar_dir, exist_ok=True)

    removed_filename = f"{username}_{character_name}.png"
    removed_path = os.path.join(removed_dir, removed_filename)

    if not os.path.exists(removed_path):
        print(f"⚠️ 找不到 removed 圖片: {removed_path}")
        return
    
    # 4️⃣ 裁切並生成 avatar
    try:
        img = Image.open(removed_path)

        # 固定裁切框（針對 600×768）
        left = 75
        upper = 0
        right = 525
        lower = 450

        cropped = img.crop((left, upper, right, lower))
        avatar = cropped.resize((512, 512), Image.LANCZOS)

        avatar_filename = f"{username}_{character_name}_avatar.png"
        avatar_path = os.path.join(avatar_dir, avatar_filename)
        avatar.save(avatar_path, format="PNG")

        print(f"✅ Avatar 生成成功: {avatar_path}")

    # 5️⃣ 更新資料庫 avatar/full_body path
        addpath.update_appearance_info(character_id, character_name)

    except Exception as e:
        print(f"❌ 生成 avatar 失敗: {e}")



def update_voice_path(character_id: int):
    """先取出角色 name，再更新 appearance 的圖片路徑"""

    # 1. 取出角色資料（包含 name）
    character = character_model.get_character(character_id)
    if not character:
        print(f"❌ 找不到角色 ID {character_id}")
        return

    character_name = character["name"]
    print(f"[DEBUG] 角色名稱: {character_name} (id={character_id})")

    # 2. 呼叫 update_appearance_info 更新資料
    try:
        addpath.update_voice_model_info(character_id, character_name)
        print(f"✅ update_voice_path 成功：角色 ID {character_id}")
    except Exception as e:
        print(f"❌ update_voice_path 失敗：角色 ID {character_id}, error={e}")


def update_animation_path(character_id: int):
    """更新 animation 的圖片路徑"""

    if not character_id:
        print(f"❌ 找不到角色 ID {character_id}")
        return
    try:
        addpath.update_animation_info(character_id) 
        print(f"✅ update_animation_image_path 成功：角色 ID {character_id}")
    except Exception as e:
        print(f"❌ update_animation_image_path 失敗：角色 ID {character_id}, error={e}")

def delete_character(character_id: int):

    if not character_id:
        print(f"❌ 找不到角色 ID {character_id}")
        return

    try:
        character_model.delete_character(character_id)
        print(f"✅ 刪除角色成功：角色 ID {character_id}")
    except Exception as e:
        print(f"❌ 刪除角色失敗：角色 ID {character_id}, error={e}")

