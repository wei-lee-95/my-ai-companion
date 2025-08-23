-- AI Companion Database Schema

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- ===========================================
-- 1. 登入系統
-- ===========================================

-- 用戶主表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    age INTEGER CHECK(age BETWEEN 1 AND 120) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- ===========================================
-- 2. 角色管理系統
-- ===========================================

-- 角色主表
CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    age INTEGER DEFAULT 25,
    occupation VARCHAR(100),
    relationship VARCHAR(50), -- 朋友、戀人、同事等
    relationship_stage VARCHAR(50), -- 普通朋友、曖昧、親密等
    meeting_context TEXT, -- 相遇背景
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
);

-- ===========================================
-- 3. 人物外型系統
-- ===========================================

-- 外型設定表
CREATE TABLE IF NOT EXISTS character_appearances (
    character_id INTEGER PRIMARY KEY,
    clothing_style VARCHAR(100), -- 服裝風格
    avatar_image_path VARCHAR(255), -- 頭像圖片路徑
    full_body_image_path VARCHAR(255), -- 全身圖片路徑
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

-- ===========================================
-- 4. 人物聲音系統
-- ===========================================

-- 聲音設定表
CREATE TABLE IF NOT EXISTS character_voices (
    character_id INTEGER PRIMARY KEY,
    voice_model_name VARCHAR(100), -- 語音模型名稱
    voice_model_path VARCHAR(255), -- .pth 檔案路徑
    pitch_adjustment INTEGER DEFAULT 0, -- 音高調整 (-10 to 10)
    speed_adjustment INTEGER DEFAULT 0, -- 語速調整 (-25 to 25)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

-- ===========================================
-- 5. 人物性格系統
-- ===========================================

-- 性格設定表
CREATE TABLE IF NOT EXISTS character_personalities (
    character_id INTEGER PRIMARY KEY,
    personality TEXT, -- 個性特質
    speaking_style VARCHAR(100), -- 說話風格
    skills TEXT, -- 技能或擅長領域
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

-- 角色狀態表 (情緒、好感度等)
CREATE TABLE IF NOT EXISTS character_stats (  --之後視訊要怎麼透過mood來加入情緒 去資料庫拿甚麼表情
    character_id INTEGER PRIMARY KEY, 
    mood TEXT CHECK (mood IN ('傷心', '驚訝', '生氣', '開心', '中立')) DEFAULT '中立', -- 當前情緒 
    affection INTEGER,
    last_chat_time TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id)
);

-- ===========================================
-- 6. 純文字聊天系統
-- ===========================================

-- 聊天會話表
CREATE TABLE IF NOT EXISTS chat_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    session_date DATE NOT NULL,
    UNIQUE (character_id, session_date),
    FOREIGN KEY (character_id) REFERENCES characters(id)
);

-- 聊天訊息表
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- ===========================================
-- 7. 動畫系統
-- ===========================================

CREATE TABLE IF NOT EXISTS character_animations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    emotion TEXT CHECK (emotion IN ('傷心', '驚訝', '生氣', '開心', '中立')),
    emotion_image_path TEXT,
    vedio_path_1 TEXT,
    vedio_path_1_no TEXT,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    UNIQUE(character_id, emotion)
);

-- ===========================================
-- 8. 記憶系統
-- ===========================================

-- 回憶總類
CREATE TABLE IF NOT EXISTS memory_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    icon TEXT,
    UNIQUE (character_id, category),
    FOREIGN KEY (character_id) REFERENCES characters(id)
);

--回憶details
CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    focus_message_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    location TEXT,
    mood TEXT,
    time_of_day TEXT,  -- SQLite沒有time型別，用TEXT或INTEGER存時間
    FOREIGN KEY (category_id) REFERENCES memory_categories(id),
    FOREIGN KEY (character_id) REFERENCES characters(id),
    FOREIGN KEY (focus_message_id) REFERENCES chat_messages(id)
);

-- ===========================================
-- 9. 索引建立
-- ===========================================

-- 用戶相關索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);


-- 角色相關索引
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(name);
CREATE INDEX IF NOT EXISTS idx_characters_is_active ON characters(is_active);

-- 聊天相關索引
CREATE INDEX IF NOT EXISTS idx_chat_sessions_character_date ON chat_sessions(character_id, session_date);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON chat_messages(role);

--視訊相關索引
CREATE INDEX IF NOT EXISTS idx_character_animations_character_id ON character_animations(character_id);
CREATE INDEX IF NOT EXISTS idx_character_animations_emotion ON character_animations(emotion);

-- 記憶相關索引
CREATE INDEX IF NOT EXISTS idx_memory_categories_character_id ON memory_categories(character_id);
CREATE INDEX IF NOT EXISTS idx_memory_categories_category ON memory_categories(category);
CREATE INDEX IF NOT EXISTS idx_memories_character_id ON memories(character_id);
CREATE INDEX IF NOT EXISTS idx_memories_focus_message_id ON memories(focus_message_id);
CREATE INDEX IF NOT EXISTS idx_memories_category_id ON memories(category_id);
CREATE INDEX IF NOT EXISTS idx_memories_title ON memories(title);

-- ===========================================
-- 10. 初始資料插入
-- ===========================================

-- 插入測試用戶 (密碼: test123)
--INSERT OR IGNORE INTO users (id, username, email, password_hash, created_at) VALUES --users的table有修改
--(1, 'admin', 'test@example.com', '8c6976e5b5410415bde908bd4dee15dfb16b67e5a9787b95e37d8e8f7e5a3b9b', datetime('now')),
--(2, 'admin2', 'test2@example.com', 'd0bd49b19c52f9d1178d7f45e9c889f4414d86512f2066ca18a9a10ccadf3bca', datetime('2025-05-30'));

-- 為現有角色創建資料庫記錄 (遷移現有的JSON檔案)
-- 這些記錄將在遷移腳本中自動創建