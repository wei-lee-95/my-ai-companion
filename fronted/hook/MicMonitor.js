// MicMonitor.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SoundLevel from 'react-native-sound-level';

export default function MicMonitor() {
  const belowThresholdSeconds = useRef(0);
  const threshold = 20; // 🔉 認為是「太安靜」的音量門檻
  const triggered = useRef(false); // 避免重複觸發

  useEffect(() => {
    SoundLevel.start();
    console.log("🎤 麥克風監聽中...");

    SoundLevel.onNewFrame = data => {
      const volume = Math.abs(data.value); // 保證是正值

      // 調整這裡來 debug 用：看音量變化
      // console.log("🔊 Volume:", volume);

      if (volume < threshold) {
        belowThresholdSeconds.current += 0.2;
      } else {
        belowThresholdSeconds.current = 0;     // 說話了就重置
        triggered.current = false;             // 回復可再觸發
      }

      if (belowThresholdSeconds.current >= 3 && !triggered.current) {
        console.log("✅ ok：連續 3 秒安靜");
        triggered.current = true;
        belowThresholdSeconds.current = 0;

        // 👇你可以改成 fetch('/api/...') 或觸發其他事件
      }
    };

    return () => {
      SoundLevel.stop();
      console.log("🛑 已停止麥克風監聽");
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>🎤 正在監聽語音安靜程度…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#fff3e0',
    borderRadius: 10,
  },
  text: {
    color: '#8d6e63',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
