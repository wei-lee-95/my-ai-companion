from database.database import db_manager, character_model
from typing import List, Dict, Optional


def get_all_character_full_body_path(user_id: int) -> List[Dict]:
    """取出某使用者的全部角色的full_body圖的路徑 """
    character_ids = character_model.get_character_by_user(user_id)
    result = []
    for cid in character_ids:
        row = character_model.get_image_path_by_id(cid)
        if row:
            result.append({
                "character_id": cid,
                "full_body_image_path": row['full_body_image_path']
            })
    return result

def get_single_character_image_path(character_id: int) -> List[Dict]:
    """取出單個角色的full_body圖的路徑和角色名稱"""
    result = []

    appearance_row = character_model.get_image_path_by_id(character_id)
    character_row = character_model.get_character(character_id)

    if appearance_row and character_row:
        result.append({
            "character_id": character_id,
            "full_body_image_path": appearance_row['full_body_image_path'],
            "avatar_image_path": appearance_row['avatar_image_path'],
            "character_name": character_row['name'],  # 從 characters 拿 name
        })
        return result

    return [] 