from database.database import db_manager, character_model, chat_model
from typing import List, Dict, Optional
from datetime import datetime


def get_character_memory_category(character_id: int) -> List[Dict[str, str]]:

    rows = character_model.get_memory_categories(character_id)  

    result = [{
        "id":row['id'],
        "category": row["category"], 
        "icon": row["icon"]
    } for row in rows]

    print("[Service] 整理後 categories =", result)
    return result


def get_single_memories_by_id(character_id: int, category_id: int) -> List[Dict[str, str]]:

    rows= character_model.get_memories_by_character(character_id, category_id)
    result = []
 
    for row in rows:
        date = character_model.get_date_of_memory(row['id'])
        result.append({
            "memory_id": row['id'],    # 修正拼寫
            "character_id": row['character_id'],
            "category_id": row['category_id'],
            "memory_title": row['title'],
            "date": date
        })
    print("get_single_memories_by_id 整理後", result)
    return result


def add_memory_detail(character_id: int, category_id: int, focus_message_id: int,
                      title: str, location: str = None, mood: str = None, time_of_day: str = None) -> int:

    # 除錯用，確認進資料庫前的資料
    print("✅ add_memory_detail 資料檢查通過：", {
        "character_id": character_id,
        "category_id": category_id,
        "focus_message_id": focus_message_id,
        "title": title,
        "location": location,
        "mood": mood,
        "time_of_day": time_of_day
    })

    return character_model.create_memory(
        character_id, category_id, focus_message_id, title, location, mood, time_of_day
    )



def generate_title(category: str, contexts: list[str], focus:str) ->str:

    # 把 context list 用換行及編號串起來
    context_text = "\n".join(f"{i+1}. {ctx}" for i, ctx in enumerate(contexts))

    base=f'''
請幫我為以下回憶對話生成一個有意義並簡潔的標題。
這段對話屬於「{category}」類別，請讓標題與「{category}」這個類別有所關聯。

這段回憶的對話內容如下：

前情提要，以下是使用者跟角色一人一句的對話：
{context_text}

使用者特別標記的句子是：
「{focus}」

請根據以上內容，發想一句不超過10個字的回憶標題，希望理性陳述事實，不要有延伸的感情，幫助我們記住這段對話的情緒與主題。
不要加上任何說明，直接輸出標題即可。
'''
    return base


def generate_memory_detail(focus: str, context: list[str]) -> str:
    context_text = ", ".join(context[:4])  # 取前四個 context 合成字串
    base = f'''
根據「{focus}」、以及以下對話內容：
{context_text}

判定內文是否可判斷出
1. 使用者的情緒
2. 這個對話情境的地點

若可判斷，請用下列 JSON 格式輸出：
{{ "情緒": "使用者的情緒", "地點": "判斷的地點" }}

若無法判斷，請回覆空值，如下：
{{ "情緒": "", "地點": "" }}
'''
    return base


def get_time_of_day_by_message_id(message_id: int) -> str:
    """根據 message_id 取出該訊息的小時 (HH 格式)"""

    rows = chat_model.get_time_by_message_id(message_id)

    # 確保不是空值並轉成 dict
    if not rows:
        print({"error": "rows 是空值"})
        return None
    
    row_dict = dict(rows[0])  # <sqlite3.Row> → dict
    print(row_dict)

    if "created_at" not in row_dict:
        return None

    created_at = row_dict["created_at"]  # '2025-08-11 19:32:00'
    dt = datetime.strptime(created_at, "%Y-%m-%d %H:%M:%S")

    result = {
        "year": dt.year,
        "month": dt.month,
        "day": dt.day,
        "hour": f"{dt.hour:02d}",
    }

    print(result)
    return result

def update_memory_details(memory_id: int, memory_data: dict[str, str]) -> None:
    try:
        character_model.update_memory(memory_id, memory_data)
        print("✅ memory_detail 成功更新資料")
    except Exception as e:
        print("❌ memory_detail 更新失敗:", str(e))


def delete_memory_db(memory_id:int) -> None:
    try:
        character_model.delete_memory(memory_id)
        print("成功刪除id={memory_id}的記憶")
    except Exception as e:
        print("刪除id={memory_id}記憶失敗",str(e))


def add_new_memory_category(character_id: int, category: str, icon: str = None) -> None:
    try:
        new_id = character_model.add_memory_category(character_id, category, icon)
        print(f"成功新增 {category} 的記憶類別，ID={new_id}")
        return new_id
    except Exception as e:
        print(f"新增{category}的記憶類別失敗",str(e))


def get_single_memory(memory_id: int):
    print(f"成功進入get_single_memory 這是id {memory_id} ")

    rows = character_model.get_memory_by_memory_id(memory_id)
    print(f"這是get_memory_by_memory_id的結果 {rows} ")

    if not rows:
        print(f"get_single_memory: 找不到 memory_id={memory_id} 的記憶")
        return None

    memory_row = rows[0]

    # 檢查欄位是否存在
    def safe_get(row, key, default=''):
        return row[key] if key in row.keys() else default

    # 從記憶資料撈指定欄位
    memory_data = {
        'title': safe_get(memory_row, 'title'),
        'location': safe_get(memory_row, 'location'),
        'mood': safe_get(memory_row, 'mood'),
        'time_of_day': safe_get(memory_row, 'time_of_day')
    }

    # 用記憶中的 focus_message_id 拿訊息內容
    focus_message_id = safe_get(memory_row, 'focus_message_id', None)
    print(f"這是focus_message_id {focus_message_id} ")

    if focus_message_id is None:
        memory_data['content'] = None
    else:
        msg_rows = chat_model.get_message_by_id(focus_message_id)
        if msg_rows and len(msg_rows) > 0:
            content_row = msg_rows[0]
            memory_data['content'] = content_row['content'] if 'content' in content_row.keys() else ''
            
        else:
            memory_data['content'] = None
            print(f"get_single_memory: 找不到 focus_message_id={focus_message_id} 對應的訊息")

        print(f"get_message_by_id:{memory_data} ")

    return memory_data
    

