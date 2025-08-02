import speech_recognition as sr

# 建立辨識器
recognizer = sr.Recognizer()
recognizer.pause_threshold = 1  # 停頓時間為 1 秒
recognizer.energy_threshold = 1000  # 默認是 3000，可以根據環境調整


# 使用麥克風作為輸入來源
with sr.Microphone() as source:
    print("請開始說話：")
    audio = recognizer.listen(source)

    try:
        # 使用 Google 的語音辨識引擎
        text = recognizer.recognize_google(audio, language="zh-TW")  # 可改為 "en-US" 等語言
        print("你說的是：", text)
    except sr.UnknownValueError:
        print("無法辨識語音")
    except sr.RequestError as e:
        print("無法連接到語音辨識服務；{0}".format(e))
