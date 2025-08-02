import os
import sys
os.environ["CUDA_VISIBLE_DEVICES"] = ""  # 隱藏所有 GPU，避免誤用 CUDA
# 加入根目錄（這裡的 __file__ 前提是你不是在 Jupyter 裡跑）
sys.path.append(os.path.abspath(os.path.join(__file__, "../../")))

from external.ditto_talkinghead.inference import StreamSDK, run

# 使用 PyTorch checkpoints
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ✅ 修改這裡的資料路徑
data_root = os.path.abspath(os.path.join(BASE_DIR, "../external/ditto_talkinghead/checkpoints/ditto_pytorch"))
cfg_pkl = os.path.abspath(os.path.join(BASE_DIR, "../external/ditto_talkinghead/checkpoints/ditto_cfg/v0.4_hubert_cfg_pytorch.pkl"))

print("Data root:", data_root)
print("Config path:", cfg_pkl)

# 初始化 SDK（使用 PyTorch 模型）
SDK = StreamSDK(cfg_pkl, data_root)

# 🔊 推論
audio_path = "/Users/v/Desktop/my-ai-companion/backend/external/ditto_talkinghead/example/audio.wav"       # 音訊路徑
source_path = "/Users/v/Desktop/my-ai-companion/backend/external/ditto_talkinghead/example/image.png"      # 圖片或影片
output_path = "/Users/v/Desktop/my-ai-companion/backend/external/ditto_talkinghead/example/test.mp4"          # 輸出結果

run(SDK, audio_path, source_path, output_path)

# import pickle

# with open(os.path.abspath(os.path.join(BASE_DIR, "../external/ditto_talkinghead/checkpoints/ditto_cfg/v0.4_hubert_cfg_pytorch.pkl")), "rb") as f:
#     cfg = pickle.load(f)

# # 簡單印出所有可能包含 "device" 的位置
# def print_device(cfg):
#     if isinstance(cfg, dict):
#         for k, v in cfg.items():
#             if k == "device":
#                 print(f"{k}: {v}")
#             else:
#                 print_device(v)
#     elif isinstance(cfg, list):
#         for item in cfg:
#             print_device(item)

# print_device(cfg)

# import pickle

# def replace_cuda_with_cpu(cfg):
#     if isinstance(cfg, dict):
#         for k, v in cfg.items():
#             if k == "device" and v == "cuda":
#                 cfg[k] = "cpu"
#             else:
#                 replace_cuda_with_cpu(v)
#     elif isinstance(cfg, list):
#         for item in cfg:
#             replace_cuda_with_cpu(item)

# with open(os.path.abspath(os.path.join(BASE_DIR, "../external/ditto_talkinghead/checkpoints/ditto_cfg/v0.4_hubert_cfg_pytorch.pkl")), "rb") as f:
#     cfg = pickle.load(f)

# replace_cuda_with_cpu(cfg)

# with open(os.path.abspath(os.path.join(BASE_DIR, "../external/ditto_talkinghead/checkpoints/ditto_cfg/v0.4_hubert_cfg_pytorch.pkl")), "wb") as f:
#     pickle.dump(cfg, f)

import pickle

def print_devices(cfg, prefix=""):
    if isinstance(cfg, dict):
        for k, v in cfg.items():
            if k == "device":
                print(f"{prefix}{k}: {v}")
            else:
                print_devices(v, prefix + k + ".")
    elif isinstance(cfg, list):
        for i, item in enumerate(cfg):
            print_devices(item, prefix + f"[{i}].")

with open("/Users/v/Desktop/my-ai-companion/backend/external/ditto_talkinghead/checkpoints/ditto_cfg/v0.4_hubert_cfg_pytorch.pkl", "rb") as f:
    cfg = pickle.load(f)

print_devices(cfg)

import torch
print(torch.__version__)
print(torch.cuda.is_available())
print(torch.version.cuda)