import os
import logging
import sys
import base64
from database.database import user_model
from typing import Optional

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# 加入其他需要的模組路徑
sys.path.extend([
    str(BASE_DIR),
    str(BASE_DIR / "rvc"),
    str(BASE_DIR / "rvc" / "lib"),
    str(BASE_DIR / "rvc" / "configs"),
    str(BASE_DIR / "rvc" / "lib" / "tools"),
])

from external.Applio.core import run_prerequisites_script, run_infer_script, run_preprocess_script, run_extract_script, run_train_script, run_tts_script

def get_username(userId:int) -> Optional[str]: 
    result = user_model.get_user_by_id(userId)
    if not result:
        print(f"❌ 找不到使用者 ID {userId}")
        return None

    username = result["username"]  # 直接這樣取
    if not username:
        print(f"❌ 使用者 ID {userId} 沒有 username")
        return None
    
    print(f"使用者名稱為{username}")
    return username

