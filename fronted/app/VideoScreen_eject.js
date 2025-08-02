// VideoScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Vibration, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import characterImage from '../assets/video-placeholder.png';
import { Audio } from 'expo-av';
import MicMonitor from './MicMonitor'; 

export default function VideoScreen() {
  const navigation = useNavigation();
  const [seconds, setSeconds] = useState(0);

  // 計時器每秒 +1
  useEffect(() => {
    const startMicrophone = async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          alert('請授權麥克風使用權限');
          return;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          allowsRecordingAndroid: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          staysActiveInBackground: false,
        });

        console.log('麥克風啟動完成');

        // 👉 如果你要開始錄音，可繼續寫錄音邏輯
      } catch (error) {
        console.error('啟動麥克風失敗', error);
      }
    };

    startMicrophone();

    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 格式化為 mm:ss
  const formatTime = (s) => {
    const mins = Math.floor(s / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>
      {/* 通話時間顯示 */}
      <Text style={styles.time}>通話時間：{formatTime(seconds)}</Text>
      {/* 模擬視訊畫面 */}

      <MicMonitor />

      {/* 掛掉按鈕 */}
      <TouchableOpacity
        style={styles.hangupButton}
        onPress={() => {
          Vibration.vibrate(200);
          navigation.navigate('MainScreen');
        }}
      >

        <Ionicons name="call-outline" size={25} color="#fff" />
        <Text style={styles.hangupText}>掛掉</Text>
      </TouchableOpacity>

      {/* 切換鏡頭（模擬） */}
      <TouchableOpacity
        style={styles.switchButton}
        onPress={() => alert('未來可切換鏡頭')}
      >
        <Ionicons name="camera-reverse-outline" size={30} color="#333" />
      </TouchableOpacity>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    safeArea: {
    flex: 1,
    backgroundColor: '#f4DDD0',
  },
  container: { flex: 1, backgroundColor: '#f4DDD0', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, marginBottom: 30 },
  videoImage: {
    width: 450,
    height: 750,
    resizeMode: 'contain',
  },

  hangupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#a97c50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    position: 'absolute',   // ✅ 讓它浮動定位
    bottom: 60,            // ✅ 距離畫面底部 140px（調大會更上面）
  },

  hangupText: {
    color: '#333',
    fontSize: 16,
    marginLeft: 10,
  },

  time: {
    position: 'absolute',
    top: 40,
    fontSize: 18,
    fontWeight: 'bold',
    },

    switchButton: {
    position: 'absolute',
    bottom: 40,
    right: 40,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 30,
    elevation: 3,
    },
});