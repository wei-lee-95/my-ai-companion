import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

export default function useMicAutoRecorder(onFinish) {
  const recording = useRef(null);
  const silenceDuration = useRef(0);
  const volumeCheckInterval = useRef(null);
  const isRecording = useRef(false);
  const hasVoice = useRef(false); // ✅ 用來確認是否有聲音過
  const minRecordTime = 2.0;  // 最短錄音秒數
  let recordTime = 0;

  const threshold = -8; // dB：你可以調整，越小越敏感（-60 ~ -30）

  const cleanup = async () => {
  if (volumeCheckInterval.current) {
    clearInterval(volumeCheckInterval.current);
    volumeCheckInterval.current = null;
  }
  if (recording.current && isRecording.current) {
    try {
      await recording.current.stopAndUnloadAsync();
    } catch (e) {
      console.warn("⚠️ 清理錄音時錯誤:", e);
    }
  }
  isRecording.current = false;
  recording.current = null;
  };

  const start = async () => {
    await cleanup();
    silenceDuration.current = 0;
    hasVoice.current = false;
    console.warn("🎤 useMicAutoRecorder 啟動");

    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn("❌ 沒有麥克風權限");
      return;
    }
    console.warn("✅ 已取得麥克風權限");

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recordingObj = new Audio.Recording();
      await recordingObj.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });

      await recordingObj.startAsync();
      console.warn("🎙 開始預錄音（用來分析音量）");

      recording.current = recordingObj;
      isRecording.current = true;
      recordTime = 0;  // 每次開始錄音，重置時間

      volumeCheckInterval.current = setInterval(async () => {
        const status = await recordingObj.getStatusAsync();
        if (!status.isRecording) return;

        const volume = status.metering ?? -120;
        console.log("🎚 音量:", volume);

        recordTime += 0.2;

        if (volume > threshold) {
          hasVoice.current = true;
          silenceDuration.current = 0;
        } else {
          silenceDuration.current += 0.2;

          if (recordTime >= minRecordTime && silenceDuration.current >= 2.0) {
            console.warn("🤫 偵測到連續靜音，停止錄音");
            clearInterval(volumeCheckInterval.current);
            await recordingObj.stopAndUnloadAsync();
            isRecording.current = false;

            const uri = recordingObj.getURI();
            if (hasVoice.current && uri) {
              console.warn("✅ 有聲音，送出錄音檔", uri);
              onFinish(uri);
            } else {
              console.warn("❌ 無有效聲音，捨棄錄音檔");
              hasVoice.current = false;
              silenceDuration.current = 0;
              onFinish(null);
            }
          }
        }
      }, 200);
    } catch (err) {
      console.error("🎙 錄音錯誤:", err);
    }
  };

  const stop = async () => {
    console.warn("🛑 手動停止錄音");
    if (volumeCheckInterval.current) clearInterval(volumeCheckInterval.current);
    if (recording.current && isRecording.current) {
      await recording.current.stopAndUnloadAsync();
      recording.current = null;
    }
    isRecording.current = false;
    hasVoice.current = false;
    silenceDuration.current = 0;
  };

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return { start, stop };
}
