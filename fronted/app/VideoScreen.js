// VideoScreen.js
import React, { useEffect, useState,  useCallback  } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Vibration, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import characterImage from '../assets/video-placeholder.png';
import { Audio } from 'expo-av';
import useMicAutoRecorder from '../hook/useMicAutoRecorder';
import { API_ENDPOINTS } from '../../fronted/apiConfig'; 
import * as FileSystem from 'expo-file-system';


export default function VideoScreen() {
  const navigation = useNavigation();
  const [seconds, setSeconds] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);  // 控制是否已經開始循環

  const onFinish = async (uri) => {
    if (!uri) {
      console.log("❌ 無有效錄音檔，跳過上傳");
      start();
      return;
    }

    const formData = new FormData();
    formData.append('file', {
      uri,
      name: 'recording.wav',
      type: 'audio/wav',
    });

    try {
      const res = await fetch(API_ENDPOINTS.VIDEO_VOICE, {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      const corrected = result.corrected_text;
      console.log("上傳成功", result);

      const replyRes = await fetch(API_ENDPOINTS.VIDEO_RESPONSE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',  // 一定要加！
        },
        body: JSON.stringify({
          text: corrected,
        }),
      });

      const replyData = await replyRes.json();
      console.log("Mingyu 回覆:", replyData.reply);

      const generateRes = await fetch(API_ENDPOINTS.GENERATE_VOICE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: replyData.reply,
          rate: 0,
          pitch: 0,
          model_name: "Mingyu",
        })
      });

      const voiceResult = await generateRes.json();
      
      console.log("語音已生成:", voiceResult.voice_url);

      const base64Audio = voiceResult.audio_base64;

      if (base64Audio) {
        const fileUri = FileSystem.cacheDirectory + "generated_audio.wav";
        await FileSystem.writeAsStringAsync(fileUri, base64Audio, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri: fileUri },
          { shouldPlay: true }
        );

        console.log("✅ 播放中:", fileUri);
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            console.log("✅ 播放結束，開始錄音");
            start();  // 這裡放錄音開始
            sound.unloadAsync(); // 釋放音訊資源
          }
        });
      } else {
        console.warn("⚠️ 沒有取得 audio_base64");
      }


    } catch (error) {
      console.error("上傳失敗", error);
      start();
      
    }
    
  };

  const { start, stop } = useMicAutoRecorder(onFinish);

  // 👇 畫面進出時控制錄音啟動與停止
  useFocusEffect(
    useCallback(() => {
      start(); // 畫面進來時開始錄音
      return () => {
        console.log("頁面離開，嘗試停止錄音...");
        stop().then(() => console.log("錄音停止完成"));
      };
    }, [])
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 計時器每秒 +1
  useEffect(() => {


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