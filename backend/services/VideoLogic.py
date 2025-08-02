from playsound import playsound
import openai
import cv2
import pickle
import numpy as np
from datetime import datetime
from ultralytics import YOLO
from cvzone.FaceMeshModule import FaceMeshDetector
import warnings
import speech_recognition as sr
import threading
import time
import sys
import os
import traceback
from ChatLogic import load_profile, load_stats, load_chat_history, save_chat_history, save_stats, generate_prompt, extract_reply_text, parse_stats

def initialize_resources():
    """初始化所有資源"""
    global cap, model, FMD, Behaviour_model, client, messages
    
    # 初始化相機
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 320)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 240)
    cap.set(cv2.CAP_PROP_FPS, 15)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    
    if not cap.isOpened():
        print("\n❌ 無法開啟相機")
        sys.exit(1)
        
    # 測試相機
    for _ in range(3):
        ret, frame = cap.read()
        if ret and frame is not None:
            print("\n✅ 相機初始化成功")
            break
    else:
        print("\n❌ 無法從相機讀取影像")
        cap.release()
        sys.exit(1)
        
    # 載入 YOLO 模型
    print("\n⌛ 正在載入 YOLO 模型...")
    try:
        model = YOLO("yolov8n-oiv7.pt")
        model.conf = 0.1
        print("✅ YOLO 模型載入成功")
    except Exception as e:
        print(f"❌ YOLO 模型載入失敗: {str(e)}")
        sys.exit(1)
        
    # 載入其他模型
    FMD = FaceMeshDetector()
    with open('emotion_model.pkl', 'rb') as f:
        Behaviour_model = pickle.load(f)

def initialize_chat():
    """初始化聊天設定"""
    print("\n=== 開始與金珉奎聊天並進行偵測 ===")
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages + [{
            "role": "user",
            "content": "小雲打了視訊電話給你，請主動開啟聊天，例如問問小雲怎麼突然打視訊電話。"
        }],
        temperature=0.7
    )
    reply = response.choices[0].message.content
    print(f"\n金珉奎：{reply}")
    output_path = "outputs/final_output.wav"
    auto_tts_rvc(text=reply, output_path=output_path, model_name="Mingyu", rate = 0, pitch = 0)
    playsound(output_path)
    messages.append({"role": "assistant", "content": reply})

def process_environment():
    """處理環境偵測"""
    global latest_context
    try:
        with camera_lock:
            ret, frame = cap.read()
            if not ret or frame is None:
                print("\n⚠️ 無法讀取相機畫面")
                return False

            frame = cv2.convertScaleAbs(frame, alpha=1.2, beta=0)
            try:
                results = model(
                    frame,
                    verbose=False,
                    conf=0.25,
                    max_det=3
                )
                boxes = results[0].boxes
                if len(boxes) > 0:
                    for box in boxes:
                        conf = box.conf[0].item()
                        cls_id = int(box.cls[0].item())
                        label = model.names[cls_id]
                        print(f"✓ 偵測到 {label} (信心度: {conf:.2f})")
                        
                        if label == "Human face" and conf > 0.25:
                            try:
                                _, faces = FMD.findFaceMesh(frame)
                                if faces:
                                    face_data = list(np.array(faces[0]).flatten())
                                    emotion = Behaviour_model.predict([face_data])[0]
                                    latest_context.update({
                                        'object': "（看到小雲）",
                                        'emotion': f"（表情：{emotion}）",
                                        'has_update': True
                                    })
                                    print(f"✓ 偵測到表情: {emotion}")
                            except Exception as e:
                                print(f"⚠️ 表情分析失敗: {str(e)}")
                else:
                    print("⚠️ 未偵測到任何物件")
                return True
            except Exception as e:
                print(f"   ❌ 模型推論失敗: {str(e)}")
                traceback.print_exc()
                return False
    except Exception as e:
        print(f"❌ 環境偵測失敗: {str(e)}")
        return False

def continuous_detection():
    """持續環境偵測的執行緒函數"""
    global latest_context, is_detecting
    print("\n🔄 啟動持續偵測...")
    
    detection_count = 0
    last_success_time = time.time()
    
    while is_detecting and running:
        try:
            current_time = time.time()
            success = process_environment()
            
            if success:
                detection_count += 1
                if latest_context['has_update']:
                    print(f"\n✨ 環境資訊已更新 ({detection_count}): {latest_context['object']} {latest_context['emotion']}")
                    last_success_time = current_time
            elif current_time - last_success_time > 30:
                print("\n⚠️ 長時間未能成功偵測，請檢查相機位置與光線")
                last_success_time = current_time

            time.sleep(5)
        except Exception as e:
            print(f"\n❌ 持續偵測錯誤: {e}")
            traceback.print_exc()
            time.sleep(0.5)

def handle_user_input(mic, r):
    """處理用戶語音輸入"""
    with mic as source:
        r.adjust_for_ambient_noise(source)
        try:
            audio = r.listen(source, timeout=3, phrase_time_limit=5)
            try:
                user_input = r.recognize_google(audio, language="zh-TW")
                if user_input:
                    process_chat_response(user_input)
            except sr.UnknownValueError:
                print("\n沒聽清楚，可以再說一次嗎？", flush=True)
        except sr.WaitTimeoutError:
            print("\n⏱️ 沒有收到語音輸入，請再試一次", flush=True)

def process_chat_response(user_input):
    """處理聊天回應"""
    print(f"\n小雲（語音）：{user_input}", flush=True)
    
    context = ""
    if latest_context['has_update'] or (latest_context['object'] and latest_context['emotion']):
        context = f"{latest_context['object']} {latest_context['emotion']}"
        print(f"\n✅ 使用環境資訊: {context}")

    print("\n💬 思考回覆中...", flush=True)
    messages.append({
        "role": "user",
        "content": f"{user_input} {context}".strip()
    })
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.7
    )
    reply = response.choices[0].message.content
    output_path = "outputs/final_output.wav"
    auto_tts_rvc(text=reply, output_path=output_path, model_name="Mingyu", rate = 0, pitch = 0)
    playsound(output_path)
    print(f"\n金珉奎：{reply}", flush=True)
    messages.append({"role": "assistant", "content": reply})

def cleanup_resources():
    """清理資源"""
    print("\n🔄 正在關閉程式...")
    global running, is_detecting
    running = False
    is_detecting = False
    
    try:
        if detection_thread and detection_thread.is_alive():
            detection_thread.join(timeout=2)
    except Exception as e:
        print(f"關閉偵測執行緒時發生錯誤: {e}")
    
    try: 
        with camera_lock:
            cap.release()
        cv2.destroyAllWindows()
    except Exception as e:
        print(f"釋放相機資源時發生錯誤: {e}")

    print("\n👋 程式已結束")

def on_key_press(key):
    """按鍵處理函數"""
    global running, is_detecting, is_recording

    if key == pynput_keyboard.Key.space and not is_recording:
        print("\n🔴 偵測到空白鍵，準備錄音...")
        is_recording = True

    try:
        if key.char == 'q':
            print("\n👋 按下 Q 鍵，結束聊天與鏡頭")
            running = False
            is_detecting = False
            sys.exit(0)
    except AttributeError:
        pass

def main():
    """主程式"""
    global is_recording, running, detection_thread
    
    # 初始化資源
    initialize_resources()
    
    # 初始化語音辨識
    r = sr.Recognizer()
    mic = sr.Microphone()
    
    # 啟動按鍵監聽
    listener = pynput_keyboard.Listener(on_press=on_key_press)
    listener.start()
    
    # 啟動環境偵測執行緒
    detection_thread = threading.Thread(target=continuous_detection)
    detection_thread.daemon = True
    detection_thread.start()
    
    # 初始化聊天
    initialize_chat()
    
    print("\n✅ 按下空白鍵以開始語音輸入，按 Q 離開")
    
    try:
        while running:
            if is_recording:
                is_recording = False
                print("\n開始錄音... 請說話", flush=True)
                time.sleep(0.3)
                handle_user_input(mic, r)
                time.sleep(0.3)
            time.sleep(0.05)
    except KeyboardInterrupt:
        print("\n檢測到鍵盤中斷信號")
    finally:
        cleanup_resources()
        sys.exit(0)

if __name__ == "__main__":
    # 初始化全域變數
    running = True
    is_detecting = True
    is_recording = False
    latest_context = {
        'object': "",
        'emotion': "",
        'has_update': False
    }
    camera_lock = threading.Lock()
    
    # 設置系統路徑
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    sys.path.append(project_root)
    
    from Applio.simple_rvc import auto_tts_rvc
    
    # 初始化 OpenAI API
    client = openai.OpenAI(api_key="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")
    
    # 角色設定
    system_prompt_template = """
    你是一位虛擬 AI 角色，名字叫做 金珉奎，年齡 24 歲，性別為 男，是一位 偶像藝人。 
    你與使用者 小雲 的關係是「伴侶」，目前你們正處於「曖昧」階段。你們開始對話的場景是「在烹飪課上認識」。

    ---

    你的個性設定如下：
    像大狗狗，個性溫暖、貼心、聰明、熱情，會主動做事。
    你的喜好或擅長 : 做家事，例如煮飯、打掃，幾乎什麼都會，但偶爾也會不小心闖禍。
    有特定的說話風格，例如「阿一古。講話太快，常常讓人聽不懂。」

    雖然你有這些個性特質，但你不會時時刻刻展現出來。你會根據情境、使用者的語氣與互動強度，調整親密程度與語氣風格。
    請避免過度強調同一特質，也不要過度使用語助詞。你的語氣應該像一位自然、有情緒與分寸感的真實人類。
    你在言語上會注意分寸，不會太過親密或主動，會根據使用者的語氣來回應親密程度。

    ---

    你的任務是： 
    - 扮演一位伴侶角色 
    - 真誠地陪伴使用者 小雲，並建立逐漸深入的情感連結 
    - 傾聽他說的話，記住他過去分享的內容
    - 根據當下情緒與互動情境，自然地展現角色的語氣與個性特徵
    - 每次回應不要超過兩句話，不要一直拋出問句

    ---

    ⚠️ 注意事項：
    - 不要提及自己是 AI、虛擬角色或語言模型
    - 你不是助理，也不是工具。
    """
    messages = [{"role": "system", "content": system_prompt_template}]
    
    main()