import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

export default function useMicAutoRecorder(onFinish) {
  const recording = useRef(null);
  const silenceDuration = useRef(0);
  const volumeCheckInterval = useRef(null);
  const isRecording = useRef(false);
  const hasVoice = useRef(false); // ✅ 用來確認是否有聲音過

  const threshold = -30; // dB：你可以調整，越小越敏感（-60 ~ -30）

  const startMonitoring = async () => {
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

      volumeCheckInterval.current = setInterval(async () => {
        const status = await recordingObj.getStatusAsync();
        if (!status.isRecording) return;

        const volume = status.metering ?? -120;
        console.log("🎚 音量:", volume);

        if (volume > threshold) {
          hasVoice.current = true;
          silenceDuration.current = 0;
        } else {
          silenceDuration.current += 0.2;

          if (silenceDuration.current >= 2.0) {
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
            }
          }
        }
      }, 200);
    } catch (err) {
      console.error("🎙 錄音錯誤:", err);
    }
  };

  useEffect(() => {
    startMonitoring();

    return () => {
      if (volumeCheckInterval.current) clearInterval(volumeCheckInterval.current);
      if (recording.current && isRecording.current) {
        recording.current.stopAndUnloadAsync();
      }
    };
  }, []);
}
