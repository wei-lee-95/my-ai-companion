"""
資料庫管理模組
提供資料庫連接、初始化、模型管理等功能
"""

import sqlite3
import os
import json
from datetime import datetime, date
from contextlib import contextmanager
from typing import Optional, Dict, List, Any, Union

class DatabaseManager:
    """資料庫管理器"""
    
    def __init__(self, db_path: str = None):
        if db_path is None:
            # 預設資料庫路徑
            base_dir = os.path.dirname(os.path.dirname(__file__))
            db_dir = os.path.join(base_dir, "database")
            os.makedirs(db_dir, exist_ok=True)
            db_path = os.path.join(db_dir, "ai_companion.db")
        
        self.db_path = db_path
        self.schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
        
    def initialize_database(self):
        """初始化資料庫，建立所有資料表"""
        if not os.path.exists(self.schema_path):
            raise FileNotFoundError(f"Schema file not found: {self.schema_path}")
        
        with open(self.schema_path, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
        
        with self.get_connection() as conn:
            # 執行多個SQL語句
            conn.executescript(schema_sql)
            conn.commit()
        
        print(f"✅ 資料庫初始化完成: {self.db_path}")
    
    @contextmanager
    def get_connection(self):
        """取得資料庫連接 (使用 context manager)"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # 讓查詢結果可以用欄位名稱存取
        try:
            yield conn
        finally:
            conn.close()
    
    def execute_query(self, sql: str, params: tuple = None) -> List[sqlite3.Row]:
        """執行查詢並返回結果"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if params:
                cursor.execute(sql, params)
            else:
                cursor.execute(sql)
            return cursor.fetchall()
    
    def execute_insert(self, sql: str, params: tuple = None) -> int:
        """執行插入並返回新記錄的ID"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if params:
                cursor.execute(sql, params)
            else:
                cursor.execute(sql)
            conn.commit()
            return cursor.lastrowid
    
    def execute_update(self, sql: str, params: tuple = None) -> int:
        """執行更新並返回影響的行數"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if params:
                cursor.execute(sql, params)
            else:
                cursor.execute(sql)
            conn.commit()
            return cursor.rowcount

class UserModel:
    """用戶資料模型"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
    
    def create_user(self, username: str, password_hash: str, email: str, age: int) -> int:
        """創建新用戶"""
        if age is not None:
            if not (1 <= age <= 120):
                raise ValueError("age 必須介於 1 到 120 之間")
        
        sql = """
        INSERT INTO users (username, email, password_hash, age) 
        VALUES (?, ?, ?, ?)
        """
        return self.db.execute_insert(sql, (username, email, password_hash, age))

    def get_user_by_username(self, username: str) -> Optional[sqlite3.Row]:
        """根據用戶名獲取用戶"""
        sql = "SELECT * FROM users WHERE username = ? AND is_active = TRUE"
        results = self.db.execute_query(sql, (username,))
        return results[0] if results else None
    
    def get_user_by_id(self, user_id: int) -> Optional[sqlite3.Row]:
        """根據ID獲取用戶"""
        sql = "SELECT * FROM users WHERE id = ? AND is_active = TRUE"
        results = self.db.execute_query(sql, (user_id,))
        return results[0] if results else None

    def get_user_by_email(self, email: str) -> Optional[sqlite3.Row]:
        """根據email獲取用戶"""
        sql = "SELECT * FROM users WHERE email = ? AND is_active = TRUE"
        results = self.db.execute_query(sql, (email,))
        return results[0] if results else None
    
    def update_last_login(self, user_id: int):
        """更新最後登入時間"""
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        sql = "UPDATE users SET last_login = ? WHERE id = ?"
        self.db.execute_update(sql, (now_str, user_id,))

class CharacterModel:
    """角色資料模型"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
    
# =====================================================
#                      character
# =====================================================

    def create_character(self, user_id: int, character_data: Dict[str, Any]) -> int: 
        """創建新角色"""
        
        # 插入主要角色資料
        sql = """
        INSERT INTO characters (user_id, name, gender, age, occupation, relationship, 
                              relationship_stage, meeting_context) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        character_id = self.db.execute_insert(sql, (
            user_id,
            character_data['name'],
            character_data['gender'],
            character_data.get('age', 25),
            character_data.get('occupation'),
            character_data.get('relationship'),
            character_data.get('relationship_stage'),
            character_data.get('meeting_context')
        ))
        
        # 創建相關的子資料表記錄
        self._create_character_personality(character_id, character_data)
        self._create_character_stats(character_id)
        self._create_character_voice(character_id, character_data)
        self._create_character_appearance(character_id)
        self._create_memory_category(character_id)
        
        return character_id


    def get_character_by_user(self, user_id: int) -> List[int]:
        """取出特定user的全部character"""

        sql = """
        SELECT id FROM characters
        WHERE user_id = ? AND is_active = 1
        """
        rows = self.db.execute_query(sql, (user_id,))
        return [row[0] for row in rows]  # 取出所有 character_id
    

    def get_character(self, character_id: int) -> Optional[sqlite3.Row]:
        """根據 character_id 取得characters資料(name、gender、age、occupation、relationship、meeting_context)"""
        sql = """
        SELECT * FROM characters WHERE id = ?
        """
        results = self.db.execute_query(sql, (character_id,))
        if results:
            print(f"[DEBUG] get_character_personality({character_id}) found:", results[0])
            return results[0]
        else:
            print(f"[DEBUG] get_character_personality({character_id}) found nothing")
            return None
        
    def get_username_by_character_id(self, character_id: int) -> Optional[str]:
        """根據 character_id 取得對應的 username"""
         
        sql = """
        SELECT u.username
        FROM characters c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
        """
        result = db_manager.execute_query(sql, (character_id,))
        if result:
            username = result[0]["username"]
            print(f"[DEBUG] 找到 username: {username} for character_id={character_id}")
            return username
        else:
            print(f"[DEBUG] 沒有找到對應 username for character_id={character_id}")
            return None
    
        
    def delete_character(self, character_id: int) -> None:
        """刪除角色及其所有相關資料"""

        # 1. 刪除角色動畫
        self.db.execute_update("""
            DELETE FROM character_animations
            WHERE character_id = ?
        """, (character_id,))

        # 2. 刪除角色外觀
        self.db.execute_update("""
            DELETE FROM character_appearances
            WHERE character_id = ?
        """, (character_id,))

        # 3. 刪除角色個性
        self.db.execute_update("""
            DELETE FROM character_personalities
            WHERE character_id = ?
        """, (character_id,))

        # 4. 刪除角色狀態
        self.db.execute_update("""
            DELETE FROM character_stats
            WHERE character_id = ?
        """, (character_id,))

        # 5. 刪除角色聲音
        self.db.execute_update("""
            DELETE FROM character_voices
            WHERE character_id = ?
        """, (character_id,))

        # 6. 刪除與角色相關的聊天訊息
        # 找出所有 session_id
        sessions = self.db.execute_query("""
            SELECT id FROM chat_sessions
            WHERE character_id = ?
        """, (character_id,))

        for s in sessions:
            self.db.execute_update("""
                DELETE FROM chat_messages
                WHERE session_id = ?
            """, (s["id"],))

        # 7. 刪除聊天會話
        self.db.execute_update("""
            DELETE FROM chat_sessions
            WHERE character_id = ?
        """, (character_id,))

        # 8. 刪除記憶
        self.db.execute_update("""
            DELETE FROM memories
            WHERE character_id = ?
        """, (character_id,))

        self.db.execute_update("""
            DELETE FROM memory_categories
            WHERE character_id = ?
        """, (character_id,))

        # 9. 最後「判死刑」角色（軟刪除）
        self.db.execute_update("""
            UPDATE characters
            SET is_active = 0
            WHERE id = ?
        """, (character_id,))


# =====================================================
#               character_personalitites
# =====================================================
    def _create_character_personality(self, character_id: int, data: Dict[str, Any]):
        """創建角色性格資料"""
        print(f"[DEBUG] create_character_personality called for character_id={character_id}")

        sql = """
        INSERT INTO character_personalities (character_id, personality, speaking_style, 
                                         skills) 
        VALUES (?, ?, ?, ?)
        """
        self.db.execute_insert(sql, (
            character_id,
            data.get('personality'),
            data.get('speaking_style'),
            data.get('skills'),
        ))

    def update_character_personality(self, character_id: int, data: dict):
        """寫入角色狀態"""
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        sql = """
        UPDATE character_personalities 
        SET personality = ?, speaking_style = ?, skills = ?, updated_at = ?
        WHERE character_id = ?
        """
        self.db.execute_update(sql, (
            data.get('personality', ''),
            data.get('speaking_style', ''),
            data.get('skills', ''),
            now_str,
            character_id
        ))

    def get_character_personality(self, character_id: int) -> Optional[sqlite3.Row]:
        """根據 character_id 取得角色性格資料(personality、speaking_style、skills)"""
        sql = """
        SELECT * FROM character_personalities WHERE character_id = ?
        """
        results = self.db.execute_query(sql, (character_id,))
        if results:
            print(f"[DEBUG] get_character_personality({character_id}) found:", results[0])
            return results[0]
        else:
            print(f"[DEBUG] get_character_personality({character_id}) found nothing")
            return None

# =====================================================
#                  character_state
# =====================================================
    def _create_character_stats(self, character_id: int): # mood改成固定幾種
        print(f"[DEBUG] _create_character_stats called for character_id={character_id}")
        """創建角色狀態資料"""
        sql = """
        INSERT INTO character_stats (character_id, mood, affection, last_chat_time) 
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        """
        self.db.execute_insert(sql, (character_id, '中立', 30))
      
    def update_character_stats(self, character_id: int, stats_data: Dict[str, Any]):
        """更新角色狀態"""
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        sql = """
        UPDATE character_stats 
        SET mood = ?, affection = ?, last_chat_time = ?
        WHERE character_id = ?
        """
        self.db.execute_update(sql, (
            stats_data.get('mood', '中立'),
            stats_data.get('affection', 30),
            now_str,
            character_id
        ))

    def get_character_stats(self, character_id: int) -> Optional[sqlite3.Row]:
        """根據 character_id 取得角色狀態資料"""
        sql = """
        SELECT * FROM character_stats WHERE character_id = ?
        """
        results = self.db.execute_query(sql, (character_id,))
        if results:
            print(f"[DEBUG] get_character_stats({character_id}) found:", results[0])
            return results[0]
        else:
            print(f"[DEBUG] get_character_stats({character_id}) found nothing")
            return None
        
# =====================================================
#                   character_voices
# =====================================================
    def _create_character_voice(self, character_id: int, data: Dict[str, Any]):
        """創建角色聲音資料"""
        sql = """
        INSERT INTO character_voices (character_id, voice_model_name, pitch_adjustment, 
                                   speed_adjustment) 
        VALUES (?, ?, ?, ?)
        """
        self.db.execute_insert(sql, (
            character_id,
            data['name'],  # 使用角色名稱作為語音模型名稱
            0,  # 預設音高
            0   # 預設語速
        ))
    
    def update_voice_pitch_speed(self, character_id: int, pitch: int, speed: int):
        """更新角色語音音高、語速"""
        sql = """
        UPDATE character_voices
        SET pitch_adjustment = ?, 
            speed_adjustment = ?
        WHERE character_id = ?
        """
        self.db.execute_update(sql, ( pitch, speed, character_id ))


    def update_character_voice_path(self, character_id: int, voice_path: str):
        """更新角色語音模型路徑"""
        sql = """
        UPDATE character_voices
        SET voice_model_path = ?
        WHERE character_id = ?
        """
        self.db.execute_update(sql, ( voice_path, character_id ))
        

    def get_voice_path_by_id(self, character_id: int) -> Optional[sqlite3.Row]:
        """取出特定角色voice的path"""

        sql = """
        SELECT voice_model_path
        FROM character_voices
        WHERE character_id = ?
        """
        rows = self.db.execute_query(sql, (character_id,))
        if rows:
            return rows[0]
        return None

# =====================================================
#               character_appearances
# =====================================================
    def _create_character_appearance(self, character_id: int):
        """創建角色外型資料"""
        sql = """
        INSERT INTO character_appearances (character_id) 
        VALUES (?)
        """
        self.db.execute_insert(sql, (character_id,))
    
    def update_clothing_style(self, character_id: int, clothing_style: str):
        """當使用者確定設定後 將clothing_style(前端叫selectstyle)"""
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        sql = """
        UPDATE character_appearances
        SET clothing_style = ?, updated_at = ?
        WHERE character_id = ?
        """
        self.db.execute_update(sql, (clothing_style, now_str, character_id))

    def update_avatar_and_fullbody(self, character_id: int, avatar_path: str, fullbody_path: str):
        """人物生成完後 將path更新進資料庫"""
        # 用的到嗎?
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        sql = """
        UPDATE character_appearances
        SET avatar_image_path = ?, full_body_image_path = ?, updated_at = ?
        WHERE character_id = ?
        """
        self.db.execute_update(sql, (avatar_path, fullbody_path, now_str, character_id))


    def get_image_path_by_id(self, character_id: int) -> Optional[sqlite3.Row]:
        """取出特定角色image的path"""

        sql = """
        SELECT avatar_image_path, full_body_image_path
        FROM character_appearances
        WHERE character_id = ?
        """
        rows = self.db.execute_query(sql, (character_id,))
        if rows:
            return rows[0]
        return None

# =====================================================
#                  memory_categories
# =====================================================  
    def _create_memory_category(self, character_id: int):
        """創建預設的回憶分類"""
        default_categories = [
            ("紀念日", "❤️"),
            ("事件", "📅"),
            ("情緒", "😄")
        ]
        for category, icon in default_categories:
            sql = """
            INSERT OR IGNORE INTO memory_categories (character_id, category, icon)
            VALUES (?, ?, ?)
            """
            self.db.execute_insert(sql, (character_id, category, icon))


    def add_memory_category(self, character_id: int, category: str, icon: str = None)-> int:
        """新增一個回憶分類"""

        sql = """
        INSERT OR IGNORE INTO memory_categories (character_id, category, icon)
        VALUES (?, ?, ?)
        """
        return self.db.execute_insert(sql, (character_id, category, icon))


    def get_memory_categories(self, character_id: int) -> List[sqlite3.Row]:
        """取得角色的所有回憶分類"""
        sql = """
        SELECT * FROM memory_categories
        WHERE character_id = ?
        ORDER BY id ASC
        """
        return self.db.execute_query(sql, (character_id,))

 
    # 這個不一定要有 但還缺一個add_memory_category 這個一定要有
    def update_memory_category(self, category_id: int, new_category: str, new_icon: str = None) -> None: 
        """更新記憶分類的名稱與 icon。"""
        sql = """
        UPDATE memory_categories
        SET category = ?, icon = ?, 
        WHERE id = ?
        """
        self.db.execute_update(sql, (new_category, new_icon, category_id))


    # 先取得 focus_message_id 在取得其created_at
    def get_date_of_memory(self, memory_id: int) -> Optional[str]:

        sql_focus_msg = """
        SELECT focus_message_id 
        FROM memories 
        WHERE id = ?"""

        focus_results = self.db.execute_query(sql_focus_msg, (memory_id,))
        if not focus_results:
            return None
        
        focus_message_id = focus_results[0]["focus_message_id"]

        sql_created_at = """
        SELECT created_at 
        FROM chat_messages 
        WHERE id = ?"""

        created_at_results = self.db.execute_query(sql_created_at, (focus_message_id,))
        if not created_at_results:
            return None  
        
        created_at_str = created_at_results[0]["created_at"]  # 格式通常是 'YYYY-MM-DD HH:MM:SS'
        try:
            dt = datetime.strptime(created_at_str, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            return created_at_str
        
        return f"{dt.year}年{dt.month}月{dt.day}日"
    
# =====================================================
#                       memory
# =====================================================  
    def create_memory(self, character_id: int, category_id: int,
                    focus_message_id: int, title: str, location: str = None,
                    mood: str = None, time_of_day: str = None) -> int:
        """創建新回憶"""
        sql = """
        INSERT INTO memories (character_id, category_id, focus_message_id,
                            title, location, mood, time_of_day)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        return self.db.execute_insert(sql, (
            character_id, category_id, focus_message_id,
            title, location, mood, time_of_day
        ))


    def get_memories_by_character(self, character_id: int, category_id: int = None) -> List[sqlite3.Row]:
        """取得角色某一分類的所有回憶（可選擇分類）"""
        if category_id:
            sql = """
            SELECT * FROM memories
            WHERE character_id = ? AND category_id = ?
            ORDER BY id DESC
            """
            return self.db.execute_query(sql, (character_id, category_id))
        else:
            sql = """
            SELECT * FROM memories
            WHERE character_id = ?
            ORDER BY id DESC
            """
            return self.db.execute_query(sql, (character_id,))


    def update_memory(self, memory_id: int, data: Dict[str, Any]) -> None:
        """更新現有回憶"""
        sql = """
        UPDATE memories
        SET title=?, location = ?, mood = ?, time_of_day = ?
        WHERE id = ?
        """
        self.db.execute_update(sql, (
            data.get('title'),
            data.get('location'),
            data.get('mood'),
            data.get('time_of_day'),
            memory_id
        ))
 
    def delete_memory(self, memory_id: int) -> None:
        """刪除指定的回憶"""
        sql = """
        DELETE FROM memories
        WHERE id = ?
        """
        self.db.execute_update(sql, (memory_id,))


    def get_memory_by_memory_id(self, memory_id: int) -> List[sqlite3.Row]:
        """找到指定的回憶"""
        
        sql = """
        SELECT * FROM memories
        WHERE id = ?
        """
        row = self.db.execute_query(sql, (memory_id,))
    
        return row

# =====================================================
#                         其他
# =====================================================    
    def get_character_by_name(self, name: str, user_id: int = None) -> Optional[sqlite3.Row]:
        """根據名稱獲取角色 (可選擇指定用戶)"""
        if user_id:
            sql = """
            SELECT c.*, cp.*, cs.*, cv.* 
            FROM characters c
            LEFT JOIN character_personalities cp ON c.id = cp.character_id
            LEFT JOIN character_stats cs ON c.id = cs.character_id
            LEFT JOIN character_voices cv ON c.id = cv.character_id
            WHERE c.name = ? AND c.user_id = ? AND c.is_active = TRUE
            """
            results = self.db.execute_query(sql, (name, user_id))
        else:
            sql = """
            SELECT c.*, cp.*, cs.*, cv.* 
            FROM characters c
            LEFT JOIN character_personalities cp ON c.id = cp.character_id
            LEFT JOIN character_stats cs ON c.id = cs.character_id
            LEFT JOIN character_voices cv ON c.id = cv.character_id
            WHERE c.name = ? AND c.is_active = TRUE
            """
            results = self.db.execute_query(sql, (name,))
        
        return results[0] if results else None


    '''
    def get_user_characters(self, user_id: int) -> List[sqlite3.Row]:
        """獲取用戶的所有角色"""
        sql = """
        SELECT c.*, cp.personality_traits, cs.mood, cs.affection 
        FROM characters c
        LEFT JOIN character_personalities cp ON c.id = cp.character_id
        LEFT JOIN character_stats cs ON c.id = cs.character_id
        WHERE c.user_id = ? AND c.is_active = TRUE
        ORDER BY c.created_at DESC
        """
        return self.db.execute_query(sql, (user_id,))
    '''


class ChatModel:
    """聊天資料模型"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
    
    def get_or_create_session(self, character_id: int, user_id: int, session_date: str = None) -> int:
        """獲取或創建聊天會話"""
        if session_date is None:
            session_date = date.today().isoformat()
        
        # 先查找是否已存在
        sql = """
        SELECT id FROM chat_sessions 
        WHERE character_id = ? AND session_date = ?
        """
        results = self.db.execute_query(sql, (character_id, session_date))
        
        if results:
            return results[0]['id']
        
        # 創建新會話
        sql = """
        INSERT INTO chat_sessions (character_id, session_date) 
        VALUES (?, ?)
        """
        return self.db.execute_insert(sql, (character_id, session_date))
    
    def get_chat_session_id_by_character_id(self, character_id: int) -> List[int]:
        """根據角色 ID 取得所有對應的 session_id（由新到舊）"""
        sql = """
        SELECT id
        FROM chat_sessions
        WHERE character_id = ?
        ORDER BY session_date DESC
        """
        results = self.db.execute_query(sql, (character_id,)) 
        return [row["id"] for row in results]
    
    #def create_memory(self, character_id: int, category_id: int, session_id: int,
    #                focus_message_id: int, title: str, location: str = None,
    #                mood: str = None, time_of_day: str = None) -> int:
    #    """創建新回憶"""
    #    sql = """
    #    INSERT INTO memories (character_id, category_id, session_id, focus_message_id,
    #                        title, location, mood, time_of_day)
    #    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    #    """
    #    return self.db.execute_insert(sql, (
    #        character_id, category_id, session_id, focus_message_id,
    #        title, location, mood, time_of_day
    #    ))'''
    
    def add_message(self, session_id: int, role: str, content: str) -> int:
        """添加聊天訊息"""
        
        sql = """
        INSERT INTO chat_messages (session_id, role, content) 
        VALUES (?, ?, ?)
        """
        message_id = self.db.execute_insert(sql, (session_id, role, content))
        
        return message_id
    
    
    def get_chat_history(self, session_id: int, limit: int = 50) -> List[sqlite3.Row]:
        """根據 character_id 和 session_id 取得該 session 的聊天歷史，最新在前"""
        sql = """
        SELECT role, content, created_at
        FROM chat_messages
        WHERE session_id = ?
        ORDER BY created_at DESC
        LIMIT ?
        """
        results = self.db.execute_query(sql, (session_id, limit))
        return list(results)


    def get_chat_history_by_id(self, session_id: int, limit: int = 50) -> List[sqlite3.Row]:
        """根據 character_id 和 session_id 取得該 session 的聊天歷史，最新在前"""
        sql = """
        SELECT role, content, created_at
        FROM chat_messages
        WHERE session_id = ?
        ORDER BY created_at DESC
        LIMIT ?
        """
        results = self.db.execute_query(sql, (session_id, limit))
        return list(results)
    

    def get_time_by_message_id(self, message_id:int) -> str: #for memory_categories 用
        """根據 message_id 取出 當則訊息的時間"""
        sql ="""
        SELECT created_at
        FROM chat_messages
        WHERE id=?
        """
        return self.db.execute_query(sql, (message_id,))
    
    
    def get_message_by_id(self, message_id:int) -> str:
        """根據 message_id 取出 當則訊息"""
        sql ="""
        SELECT content
        FROM chat_messages
        WHERE id=?
        """
        return self.db.execute_query(sql, (message_id,))
    

def update_message(self, ooc_text: str, message_id: int) -> int:
        """根據 message_id 修改 content 內容 變成 ooc_text"""
        sql ="""
        UPDATE chat_messages
        SET content = ?
        WHERE id = ?
        """
        return self.db.execute_update(sql, (ooc_text, message_id))
class VedioModel:
    """視訊資料模型"""

    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager

    '''好像用不到
    def create_character_animation(self, character_id: int, emotion: str, emotion_image_path: str) -> int:
        """新增角色動畫資料（表情與圖片路徑），回傳新增的 animation id。"""

        sql = """
        INSERT INTO character_animations (character_id, emotion, emotion_image_path)
        VALUES (?, ?, ?)
        """
        return self.db.execute_insert(sql, (character_id, emotion, emotion_image_path))
    '''

    def get_character_animation(self, character_id: int, emotion: str) -> List[sqlite3.Row]:
        """取出特定角色的特定情緒圖"""

        sql = """
        SELECT id, emotion, emotion_image_path
        FROM character_animations
        WHERE character_id = ? AND emotion = ?
        """
        return self.db.execute_query(sql, (character_id, emotion))


# 全域資料庫管理器實例
db_manager = DatabaseManager()
user_model = UserModel(db_manager)
character_model = CharacterModel(db_manager)
chat_model = ChatModel(db_manager)
vedio_model = VedioModel(db_manager)

def init_database():
    """初始化資料庫"""
    db_manager.initialize_database()

if __name__ == "__main__":
    # 如果直接執行此檔案，則初始化資料庫
    init_database()
    print("資料庫初始化完成！")