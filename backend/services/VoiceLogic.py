from flask import Flask, request, jsonify, send_from_directory, send_file
import os
import logging
import sys
import base64

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

