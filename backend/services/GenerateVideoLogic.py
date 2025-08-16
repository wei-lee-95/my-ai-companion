import os
import requests
import base64
from pathlib import Path

def generate_videos(username, charactername, colab_url):
    """
    username: 使用者名稱
    charactername: 角色名稱
    colab_url: Colab ngrok 公開 URL (不含 /generate-lip-sync)
    """
    # 路徑設定

    BASE_DIR = Path(__file__).resolve().parent.parent  # backend

    mood_dir = BASE_DIR / f"outputs/emotion/{username}_{charactername}"
    print(f"✅ 讀取情緒圖片資料夾: {mood_dir}")

    audio_dir = BASE_DIR / "assets/Video/Input"
    output_base = BASE_DIR / f"outputs/video/{username}_{charactername}"
    output_base.mkdir(parents=True, exist_ok=True)

    # 找圖片與音檔
    moods = sorted([f for f in mood_dir.glob("*.png")])
    audios = sorted([f for f in audio_dir.glob("*") if f.stem.startswith("voice") or f.stem.startswith("no")])

    if len(moods) != 5:
        raise FileNotFoundError(f"❌ 找到 {len(moods)} 張情緒圖（應該是 5 張）")
    if len(audios) != 2:
        raise FileNotFoundError(f"❌ 找到 {len(audios)} 個音檔（應該是 8 個）")

    print(f"✅ 找到圖片 {len(moods)} 張, 音檔 {len(audios)} 個")

    # 逐一生成影片
    for mood_img in moods:
        mood_output_dir = output_base / mood_img.stem
        mood_output_dir.mkdir(parents=True, exist_ok=True)

        for audio_file in audios:
            output_path = mood_output_dir / f"{audio_file.stem}.mp4"

            print(f"🎬 生成影片：{mood_img.stem} + {audio_file.stem}")

            with open(audio_file, "rb") as af, open(mood_img, "rb") as im:
                files = {
                    "audio": (audio_file.name, af, "audio/mpeg"),
                    "image": (mood_img.name, im, "image/png")
                }
                try:
                    res = requests.post(
                        f"{colab_url}/generate-lip-sync",
                        files=files,
                        timeout=300
                    )
                    res.raise_for_status()
                    data = res.json()
                except Exception as e:
                    print(f"❌ API 請求失敗 ({audio_file.name}, {mood_img.name}): {e}")
                    if 'res' in locals():
                        print("伺服器回應:", res.text)
                    continue

            if "video_base64" in data:
                video_data = base64.b64decode(data["video_base64"])
                with open(output_path, "wb") as vf:
                    vf.write(video_data)
                print(f"✅ 影片已儲存：{output_path.resolve()}")
            else:
                print(f"❌ 生成失敗: {data}")
