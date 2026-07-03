from datetime import datetime
import urllib.request
import base64
import json
import time
import os
import cv2
import numpy as np
from PIL import Image
from rembg import remove
from database.database import user_model
from typing import Optional
from config import STABLE_DIFFUSION_WEBUI_URL

webui_server_url = STABLE_DIFFUSION_WEBUI_URL

openpose_image_path = './assets/Appearance/openpose.png'

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

# 輸出的圖片存這裡
out_dir = 'outputs'
out_dir_t2i = os.path.join(out_dir, 'txt2img')
#out_dir_i2i = os.path.join(out_dir, 'img2img')
os.makedirs(out_dir_t2i, exist_ok=True)
#os.makedirs(out_dir_i2i, exist_ok=True)

rem_dir = os.path.join(BASE_DIR, 'outputs', 'removed')
os.makedirs(rem_dir, exist_ok=True)

def timestamp():
    return datetime.fromtimestamp(time.time()).strftime("%Y%m%d-%H%M%S")

def encode_file_to_base64(path):
    with open(path, 'rb') as file:
        return base64.b64encode(file.read()).decode('utf-8')

def decode_and_save_base64(base64_str, save_path):
    """解碼並保存 base64 圖片"""
    try:
        with open(save_path, "wb") as file:
            file.write(base64.b64decode(base64_str))
        return True
    except Exception as e:
        print(f"保存圖片時出錯: {e}")
        return False
    
def call_api(api_endpoint, **payload):
    try:
        data = json.dumps(payload).encode('utf-8')
        request = urllib.request.Request(
            f'{webui_server_url}/{api_endpoint}',
            headers={'Content-Type': 'application/json'},
            data=data,
        )
        
        # 增加超時設置
        response = urllib.request.urlopen(request, timeout=10000)  # 1000秒超時
        return json.loads(response.read().decode('utf-8'))
    except urllib.error.URLError as e:
        print(f"API 調用失敗: {str(e)}")
        if hasattr(e, 'read'):
            try:
                error_details = e.read().decode('utf-8')
                print(f"詳細錯誤: {error_details}")
            except:
                print("無法讀取詳細錯誤信息")
        return None

def call_txt2img_api(**payload):
    try:
        response = call_api('sdapi/v1/txt2img', **payload)
        if not response:
            return False
        
        success = False  # 追踪是否有任何圖片成功保存
        for index, image in enumerate(response.get('images', [])):
            save_path = os.path.join(out_dir_t2i, f'txt2img-{timestamp()}-{index}.png')
            if decode_and_save_base64(image, save_path):
                success = True  # 只要有一張圖片保存成功就設為 True
        
        return success
    except Exception as e:
        print(f"處理過程中出錯: {str(e)}")
        return False
    
    
def generate_with_faceid(face_image_base64, seed, prompt, negative_prompt):

    """使用 IP-Adapter FaceID 生成圖片"""

    payload = {
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        "seed": 503754738,  # 隨機種子
        "steps": 20,
        "width": 576,
        "height": 768,
        "cfg_scale": 7,
        "sampler_name": "DPM++ 2M",
        "scheduler": "Karras",
        "n_iter": 1,
        "batch_size": 1,
        #"denoising_strength": 0.3,
        
        "alwayson_scripts": {
            "ControlNet": {
                "args": [
                    {
                        "enabled": True,
                        "model" : "ip-adapter-faceid-plusv2_sd15 [6e14fc1a]",
                        "module" : "ip-adapter_face_id_plus",
                        "weight": 1.6,
                        "image": {
                            "image": face_image_base64,
                            "mask": None
                        },
                        "resize_mode": "Crop and Resize",
                        "control_mode": "Balanced",
                        "pixel_perfect": True,
                        "processor_res": 576,
                        "threshold_a": 0.5,
                        "threshold_b": 0.5,
                        "guidance_start": 0.0,
                        "guidance_end": 0.9,
                        "advanced_weighting": [1.5] * 16,  # 16個相同的權重值
                        "save_detected_map": True
                    },
                    {
                        "advanced_weighting" : None,
                        "animatediff_batch" : False,
                        "control_mode" : "Balanced",
                        "effective_region_mask" : None,
                        "enabled" : True,
                        "guidance_end" : 1,
                        "guidance_start" : 0,
                        "hr_option" : "Both",
                        "image" : {
                            "image" : encode_file_to_base64(openpose_image_path),
                            "mask" : None
                        },
                        "inpaint_crop_input_image" : False,
                        "input_mode" : "simple",
                        "ipadapter_input" : None,
                        "is_ui" : True,
                        "loopback" : False,
                        "low_vram" : False,
                        "mask" : None,
                        "model" : "ControlNet OpenPose [fef5e48e]",
                        "module" : "none",
                        "output_dir" : "",
                        "pixel_perfect" : False,
                        "processor_res" : 512,
                        "pulid_mode" : "Fidelity",
                        "resize_mode" : "Crop and Resize",
                        "save_detected_map" : True,
                        "threshold_a" : 0.5,
                        "threshold_b" : 0.5,
                        "union_control_type" : "OpenPose",
                        "weight" : 1.0

                    },
                ]
            }
        },
        # "enable_hr": True,
        # "hr_upscaler": "R-ESRGAN 4x+ Anime6B",
        # "hr_scale": 2,
        # "denoising_strength": 0.5,
    }

    call_txt2img_api(**payload)
    return "圖片生成完成！"

def build_custom_prompt(outfit_style):

    outfit_map = {
        "original":"",
        "casual": "casual t-shirt, denim jacket",
        "formal": "<lora:formal-suit:0.5>, formal suit, elegant attire",
        "idol": "stage outfit, fashionable, trendy",
    }

    outfit_desc = outfit_map.get(outfit_style, "")

    prompt = f"""
    <lora:IP Adapter FaceID Plus v2:0.8>, <lora:EyesGen:0.3>,
    masterpiece, best quality, 8k uhd, RAW photo,
    1girl, solo, young woman, canny face, delicate features, gentle smile,
    (black eyes), (black hair), (face ratio balance:1.2), (symmetrical face:1.2),
    {outfit_desc},
    pure white background
    
    """.strip()


    negative_prompt = f"""
    (worst quality, low quality),
    (watermark, text, signature, blurry),
    disgusting, amputation, bad hands, error, missing fingers, extra digit, fewer digits, cropped, normal quality, ugly, odd, bad hands, nudity ,red eye, naked
    
    """.strip()

    return prompt, negative_prompt


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
