"""
資料遷移工具
將現有的JSON檔案遷移到新的資料庫結構
"""

import json
import os
import sys
from datetime import datetime
from typing import Dict, Any

# 添加父目錄到路徑
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database import db_manager, user_model, character_model, chat_model

class DataMigrator:
    """資料遷移器"""
    
    def __init__(self):
        # 專案根目錄 → /my-ai-companion/backend
        self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # /backend

        # Chat 資料夾路徑 → /backend/assets/Chat/
        self.chat_assets_dir = os.path.join(self.base_dir, "assets", "Chat")

        # 子目錄
        self.chat_histories_dir = os.path.join(self.chat_assets_dir, "chat_histories")  # 記錄聊天內容
        self.profile_dir = os.path.join(self.chat_assets_dir, "profile")                # 角色設定檔
        self.stats_dir = os.path.join(self.chat_assets_dir, "stats") 
        
    def migrate_all(self):
        print("開始 migrate_characters")
        """執行完整遷移"""
        print("🚀 開始資料遷移...")
        
        # 1. 初始化資料庫
        print("1. 初始化資料庫...")
        db_manager.initialize_database() # 這個還要嗎? database.py不是做過嗎
        
        # 2. 創建測試用戶
        print("2. 創建測試用戶...")
        self.create_test_users()
        
        # 3. 遷移角色資料
        print("3. 遷移角色資料...")
        self.migrate_characters()
        
        # 4. 遷移聊天記錄
        print("4. 遷移聊天記錄...")
        self.migrate_chat_histories()
        
        print("✅ 資料遷移完成！")
    
    def create_test_users(self):
        """創建測試用戶"""
        try:
            # 創建預設用戶
            user_model.create_user("admin", "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", "admin",20) #username, password_hash, email, age
            user_model.create_user("admin2", "1c142b2d01aa34e9a36bde480645a57fd69e14155dacfab5a3f9257b77fdc8d8", "admin2",25)
            print("  ✅ 測試用戶創建完成")
        except Exception as e:
            print(f"  ⚠️ 用戶可能已存在: {e}")
    
    def migrate_characters(self):
        """遷移角色資料"""
        if not os.path.exists(self.profile_dir):
            print(f"  ❌ 角色資料profile不存在: {self.profile_dir}")
            return
        
        # 掃描所有 _profile.json 檔案
        profile_files = [f for f in os.listdir(self.profile_dir) if f.endswith('_profile.json')]
        
        for profile_file in profile_files:
            print(f"[DEBUG] profile_files: {profile_files}")
            character_name = profile_file.replace('_profile.json', '')
            print(f"  📄 處理角色: {character_name}")
            
            try:
                self.migrate_single_character(character_name)
                print(f"    ✅ {character_name} 遷移完成")
            except Exception as e:
                print(f"    ❌ {character_name} 遷移失敗: {e}")
    
    def migrate_single_character(self, character_name: str):
        """遷移單個角色"""
        # 讀取 profile 檔案
        profile_path = os.path.join(self.profile_dir, f"{character_name}_profile.json")
        # 讀取 stats 檔案 (在 stats 資料夾)
        stats_path = os.path.join(self.stats_dir, f"{character_name}_stats.json")
        
        if not os.path.exists(profile_path):
            raise FileNotFoundError(f"Profile file not found: {profile_path}")
        
        with open(profile_path, 'r', encoding='utf-8') as f:
            profile_data = json.load(f)
        
        # 讀取 stats 檔案 (如果存在)
        stats_data = {'mood': '中立', 'affection': 30}
        if os.path.exists(stats_path):
            # print(f"{character_name}stats存在")
            with open(stats_path, 'r', encoding='utf-8') as f:
                stats_data.update(json.load(f))
        
        # === 檢查角色是否已存在 ===
        existing_character = character_model.get_character_by_name(character_name)
        if existing_character:
            print(f"    ⚠️ 角色 {character_name} 已存在，跳過")
            return existing_character['id']

        # === 建立角色主資料 ===
        character_data = {
            'name': character_name,
            'gender': self.map_gender(profile_data.get('gender', '男')),
            'age': profile_data.get('age', 25),
            'occupation': profile_data.get('occupation', ''),
            'relationship': profile_data.get('relationship', '朋友'),
            'relationship_stage': profile_data.get('relationship_progress', '普通朋友'),
            'meeting_context': profile_data.get('meeting_context', ''),
            'speaking_style': profile_data.get('speaking_style', ''),
            'personality': profile_data.get('personality', ''),
            'skills': profile_data.get('skills', ''),
        }

        # 預設指派給 user_id 1
        character_id = character_model.create_character(1, character_data)

        # 更新角色狀態
        character_model.update_character_stats(character_id, stats_data)
        
        # 更新語音模型資訊 (vocal path)
        self.update_voice_model_info(character_id, character_name)

        # 加入外貌圖片資訊更新 (avatar跟full_body的path)
        self.update_appearance_info(character_id, character_name)

        # 加入情緒資訊(整個表格)
        self.update_animation_info(character_id)


        
        return character_id
    
    
    def map_gender(self, gender_str: str) -> str: 
        """轉換性別字串"""
        gender_map = {
            '男': 'male',
            '女': 'female',
            'male': 'male',
            'female': 'female',
            '男性': 'male',
            '女性': 'female',
        }
        return gender_map.get(gender_str, 'other')
    
    def update_voice_model_info(self, character_id: int, character_name: str):
        """更新語音模型資訊"""

        # 先查 user_name
        sql = "SELECT u.username FROM users u JOIN characters c ON u.id = c.user_id WHERE c.id = ?"
        rows = db_manager.execute_query(sql, (character_id,))
        if not rows:
            print(f"  ⚠️ 找不到 character_id={character_id} 對應的使用者")
            return

        user_name = rows[0][0]  # 取第一筆 user_name

        model_path = os.path.join(self.base_dir, "assets", "Voice", "Models", f"{user_name}_{character_name}")
        pth_file = None
            
        if os.path.exists(model_path):
            # 查找 .pth 檔案
            for file in os.listdir(model_path):
                if file.endswith('.pth'):
                    pth_file = os.path.join("assets", "Voice", "Models",f"{user_name}_{character_name}", file)
                    break
        else:
            print(f"  ⚠️ 語音模型資料夾不存在: {model_path}")

        # 更新資料庫
        sql = """
        UPDATE character_voices 
        SET voice_model_path = ?
        WHERE character_id = ?
        """
        db_manager.execute_update(sql, (pth_file,  character_id))
    

    def update_appearance_info(self, character_id: int, character_name: str):
        """更新appearance表格中avatar_image_path跟full_body_imaage_path"""

        # 1. 查出角色對應的使用者名稱
        sql = """
        SELECT c.name AS character_name, u.username
        FROM characters c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
        """
        result = db_manager.execute_query(sql, (character_id,))
        if not result:
            print(f"❌ 找不到角色 ID {character_id} 的對應資訊")
            return

        row = result[0]
        username = row["username"]
        character_name = row["character_name"]

        # 2. 組合圖片檔名
        base_filename = f"{username}_{character_name}.png"
        avatar_filename = f"{username}_{character_name}_avatar.png"

        # 3. 組合絕對路徑並檢查是否存在
        BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        AVATAR_DIR = os.path.join(BASE_DIR, "outputs", "avatar")
        FULLBODY_DIR = os.path.join(BASE_DIR, "outputs", "removed")

        avatar_path = os.path.join(AVATAR_DIR, f"{avatar_filename}")
        full_body_path = os.path.join(FULLBODY_DIR, f"{base_filename}")

        if not os.path.exists(avatar_path):
            print(f"⚠️ 頭像圖片不存在：{avatar_path}")
            avatar_path = None
        if not os.path.exists(full_body_path):
            print(f"⚠️ 全身圖片不存在：{full_body_path}")
            full_body_path = None

        # 4. 轉換為相對路徑（給前端用） - 這邊保持 forward slash
        relative_avatar = os.path.relpath(avatar_path, BASE_DIR).replace("\\", "/") if avatar_path else None
        relative_full_body = os.path.relpath(full_body_path, BASE_DIR).replace("\\", "/") if full_body_path else None
        
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # 5. 寫入資料庫（有就更新，沒有就新增）
        update_sql = """
        INSERT INTO character_appearances (character_id, clothing_style, avatar_image_path, full_body_image_path, updated_at)
        VALUES (?, '', ?, ?, ?)
        ON CONFLICT(character_id) DO UPDATE SET
            avatar_image_path = excluded.avatar_image_path,
            full_body_image_path = excluded.full_body_image_path,
            updated_at = excluded.updated_at
        """
        db_manager.execute_update(update_sql, (character_id, relative_avatar, relative_full_body, now_str))

        print(f"✅ 已更新外觀圖片路徑：角色 ID {character_id}")

    
    def update_animation_info(self, character_id: int):
        """更新animations表格中的emotion跟emotion_image_path"""

        # 1. 先查使用者名稱和角色名稱
        sql = """
        SELECT c.name AS character_name, u.username
        FROM characters c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
        """
        result = db_manager.execute_query(sql, (character_id,))
        if not result:
            print(f"❌ 找不到角色 ID {character_id} 的對應資訊")
            return

        row = result[0]
        username = row["username"]
        character_name = row["character_name"]

        # 2. emotion 資料夾路徑設定
        BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        EMOTION_DIR = os.path.join(BASE_DIR, "outputs", "emotion")

        folder_name = f"{username}_{character_name}"
        emotion_folder_path = os.path.join(EMOTION_DIR, folder_name)

        if not os.path.exists(emotion_folder_path):
            print(f"❌ 找不到情緒資料夾：{emotion_folder_path}")
            return

        # 3. 定義要找的五種情緒與檔名
        emotions = {
            "開心": "開心.png",
            "傷心": "傷心.png",
            "驚訝": "驚訝.png",
            "生氣": "生氣.png",
            "中立": "中立.png"
        }

        for emotion, filename in emotions.items():
            file_path = os.path.join(emotion_folder_path, filename)
            if not os.path.exists(file_path):
                print(f"⚠️ 找不到 {emotion} 圖片：{file_path}")
                continue

            # 4. 轉成相對路徑（前端用，斜線固定為 /）
            relative_path = os.path.relpath(file_path, BASE_DIR).replace("\\", "/")

            # 5. 插入或更新 character_animations 資料表
            upsert_sql = """
            INSERT INTO character_animations (character_id, emotion, emotion_image_path)
            VALUES (?, ?, ?)
            ON CONFLICT(character_id, emotion) DO UPDATE SET
                emotion_image_path = excluded.emotion_image_path
            """
            db_manager.execute_update(upsert_sql, (character_id, emotion, relative_path))

            print(f"✅ 已處理情緒：{emotion}，路徑：{relative_path}")

        print(f"✅ 完成更新角色 ID {character_id} 的動畫資料")

    
    def update_animation_info(self, character_id: int):
        """更新 character_animations 表格中的 emotion, 圖片路徑, 影片路徑"""

        # 1. 先查使用者名稱和角色名稱
        sql = """
        SELECT c.name AS character_name, u.username
        FROM characters c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
        """
        result = db_manager.execute_query(sql, (character_id,))
        if not result:
            print(f"❌ 找不到角色 ID {character_id} 的對應資訊")
            return

        row = result[0]
        username = row["username"]
        character_name = row["character_name"]

        # 2. 設定基礎路徑
        BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")

        folder_name = f"{username}_{character_name}"
        emotion_folder = os.path.join(OUTPUT_DIR, "emotion", folder_name)
        vedio_folder = os.path.join(OUTPUT_DIR, "vedio", folder_name)

        # 3. 定義要處理的五種情緒
        emotions = ["開心", "傷心", "驚訝", "生氣", "中立"]

        for emotion in emotions:
            # ========== 確認圖片 ==========
            image_filename = f"{emotion}.png"
            image_path = os.path.join(emotion_folder, image_filename)
            if not os.path.exists(image_path):
                print(f"⚠️ 找不到 {emotion} 圖片：{image_path}")
                continue

            print(f"找到{emotion}.png")
            relative_image_path = os.path.relpath(image_path, BASE_DIR).replace("\\", "/")

            # ========== 確認影片 ==========
            emotion_vedio_folder = os.path.join(vedio_folder, emotion)
            vedio1_path = os.path.join(emotion_vedio_folder, "voice1.mp4")
            vedio1_no_path = os.path.join(emotion_vedio_folder, "no1.mp4")

            if not os.path.exists(vedio1_path) or not os.path.exists(vedio1_no_path):
                print(f"⚠️ 找不到 {emotion} 的影片檔案：{vedio1_path}, {vedio1_no_path}")
                continue
            
            print(f"找到{emotion}的影片檔")
            relative_vedio1 = os.path.relpath(vedio1_path, BASE_DIR).replace("\\", "/")
            relative_vedio1_no = os.path.relpath(vedio1_no_path, BASE_DIR).replace("\\", "/")

            # 4. 插入或更新 character_animations 資料表
            upsert_sql = """
            INSERT INTO character_animations (character_id, emotion, emotion_image_path, vedio_path_1, vedio_path_1_no)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(character_id, emotion) DO UPDATE SET
                emotion_image_path = excluded.emotion_image_path,
                vedio_path_1 = excluded.vedio_path_1,
                vedio_path_1_no = excluded.vedio_path_1_no
            """
            db_manager.execute_update(upsert_sql, (character_id, emotion, relative_image_path, relative_vedio1, relative_vedio1_no))

            print(f"✅ 已處理情緒：{emotion}")
            print(f"   圖片：{relative_image_path}")
            print(f"   影片：{relative_vedio1}")
            print(f"   no影片：{relative_vedio1_no}")

        print(f"🎉 完成更新角色 ID {character_id} 的動畫與影片資料")

    
    def migrate_chat_histories(self):
        """遷移聊天記錄"""
        if not os.path.exists(self.chat_histories_dir):
            print(f"  ❌ 聊天記錄目錄不存在: {self.chat_histories_dir}")
            return
        
        # 掃描所有聊天記錄檔案
        chat_files = [f for f in os.listdir(self.chat_histories_dir) if f.endswith('.json')]
        
        for chat_file in chat_files:
            character_name = chat_file.replace('.json', '')
            print(f"  💬 處理聊天記錄: {character_name}")
            
            try:
                self.migrate_single_chat_history(character_name)
                print(f"    ✅ {character_name} 聊天記錄遷移完成")
            except Exception as e:
                print(f"    ❌ {character_name} 聊天記錄遷移失敗: {e}")
    
    def migrate_single_chat_history(self, character_name: str):
        """遷移單個角色的聊天記錄"""
        chat_file = os.path.join(self.chat_histories_dir, f"{character_name}.json")
        
        if not os.path.exists(chat_file):
            return
        
        with open(chat_file, 'r', encoding='utf-8') as f:
            messages = json.load(f)
        
        if not messages:
            return
        
        # 獲取角色ID
        character = character_model.get_character_by_name(character_name)
        if not character:
            print(f"    ⚠️ 角色 {character_name} 不存在，跳過聊天記錄")
            return
        
        character_id = character['id']
        user_id = 2  # 預設分配給 jennifer
        
        # 獲取或創建會話
        session_id = chat_model.get_or_create_session(character_id, user_id)
        
        # 遷移訊息
        for message in messages:
            if isinstance(message, dict) and 'role' in message and 'content' in message:
                role = message['role']
                content = message['content']
                
                # 跳過系統訊息 (通常是提示詞)
                if role == 'system':
                    continue
                
                # 添加訊息到資料庫
                chat_model.add_message(session_id, role, content)
    
    def migrate_characters_json(self):
        """遷移 characters.json 檔案 (如果存在)"""
        characters_file = os.path.join(self.assets_dir, "characters.json")
        
        if not os.path.exists(characters_file):
            print("  ⚠️ characters.json 不存在，跳過")
            return
        
        with open(characters_file, 'r', encoding='utf-8') as f:
            characters_data = json.load(f)
        
        for char_data in characters_data:
            try:
                character_name = char_data['name']
                
                # 檢查是否已存在
                if character_model.get_character_by_name(character_name):
                    continue
                
                # 創建角色
                character_data = {
                    'name': character_name,
                    'gender': self.map_gender(char_data.get('gender', '男')),
                    'age': char_data.get('character_age', 25),
                    'occupation': char_data.get('profession', ''),
                    'relationship': char_data.get('relationship', '朋友'),
                    'relationship_stage': char_data.get('relationship_stage', '普通朋友'),
                    'meeting_context': char_data.get('meeting_context', ''),
                    'personality': char_data.get('personality', ''),
                    'speaking_style': char_data.get('speaking_style', ''),
                    'skills': char_data.get('skills', ''),
                }
                
                user_id = char_data.get('user_id', 2)
                character_id = character_model.create_character(user_id, character_data)
                
                print(f"    ✅ 從 characters.json 創建角色: {character_name}")
                
            except Exception as e:
                print(f"    ❌ 創建角色失敗: {e}")

def main():
    """主程式"""
    migrator = DataMigrator()
    migrator.migrate_all()

if __name__ == "__main__":
    main()