// VideoScreen.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Vibration, SafeAreaView, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { CameraView, useCameraPermissions } from 'expo-camera';

import useMicAutoRecorder from '../hook/useMicAutoRecorder';
import { API_ENDPOINTS } from '../../fronted/apiConfig';
import characterImage from '../assets/video-placeholder.png';

export default function VideoScreen() {
  const navigation = useNavigation();
  const [seconds, setSeconds] = useState(0);

  // --- 相機狀態 ---
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [facing, setFacing] = useState('front'); // 'front' | 'back'
  const [pipPrimary, setPipPrimary] = useState('image'); // 'image' = 大圖是圖片；'camera' = 大圖是相機
  const cameraRef = useRef(null);
  const [camPermission, requestCamPermission] = useCameraPermissions();

  const takeSnapshot = async () => {
  if (cameraRef.current) {
    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.5,
      base64: true
    });
    console.log('拍照成功：');
    return photo;
  }
  return null;
};

  // --- 錄音循環：沿用原本流程 ---
  const onFinish = async (uri) => {
    if (!uri) { start(); return; }

    try {
      const photo = await takeSnapshot();

      // 上傳錄音
      const uploadAudio = async () => {
        const formData = new FormData();
        formData.append('file', {
          uri, 
          name: 'recording.wav', 
          type: 'audio/wav' 
        });

        const res = await fetch(API_ENDPOINTS.VIDEO_VOICE, { 
          method: 'POST', 
          body: formData 
        });
        return await res.json(); // 回傳 corrected_text
      };

      const uploadImage = async () => {
        if (!photo) return;
        const imgData = new FormData();
        imgData.append('file', {
          uri: photo.uri,
          name: 'snapshot.jpg',
          type: 'image/jpeg'
        });

        const res = await fetch(API_ENDPOINTS.VIDEO_PHOTO, {
          method: 'POST',
          body: imgData
        });
        return await res.json(); 
      };

      const [uploadVoiceResult, uploadImageResult] = await Promise.all([
        uploadAudio(),
        uploadImage()
      ]);

      print(uploadImageResult);

      const replyRes = await fetch(API_ENDPOINTS.VIDEO_RESPONSE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice: uploadVoiceResult.corrected_text,
          image: uploadImageResult
        }),
      });
      const replyData = await replyRes.json();
      print('回覆內容：', replyData.reply);

      const generateRes = await fetch(API_ENDPOINTS.GENERATE_VOICE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: replyData.reply, rate: 0, pitch: 0, model_name: "Mingyu" }),
      });

      const voiceResult = await generateRes.json();

      const base64Audio = voiceResult.audio_base64;
      if (base64Audio) {
        const fileUri = FileSystem.cacheDirectory + "generated_audio.wav";
        await FileSystem.writeAsStringAsync(fileUri, base64Audio, { encoding: FileSystem.EncodingType.Base64 });

        const { sound } = await Audio.Sound.createAsync({ uri: fileUri }, { shouldPlay: true });
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) { start(); sound.unloadAsync(); }
        });
      } else {
        start();
      }
    } catch (e) {
      console.error('錄音/回覆流程錯誤：', e);
      start();
    }
  };

  const { start, stop } = useMicAutoRecorder(onFinish);

  // 進入/離開畫面：開始/停止錄音，同時關鏡頭
  useFocusEffect(
    useCallback(() => {
      start();
      return () => { setIsCameraOn(false); setPipPrimary('image'); stop(); };
    }, [])
  );

  // 計時器
  useEffect(() => {
    const t = setInterval(() => setSeconds((p) => p + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // --- 開/關鏡頭（不卸載 CameraView，只改樣式） ---
  const toggleCamera = useCallback(async () => {
    if (!camPermission?.granted) {
      const { granted } = await requestCamPermission();
      if (!granted) { Alert.alert('需要相機權限', '請到系統設定開啟相機權限'); return; }
    }
    setIsCameraOn((prev) => !prev);
    // 若正在顯示相機為大方格，關閉相機時切回圖片為大方格
    setPipPrimary((prev) => (prev === 'camera' ? 'image' : prev));
    Vibration.vibrate(50);
  }, [camPermission, requestCamPermission]);

  // 切換前/後鏡頭
  const switchFacing = useCallback(() => {
    if (!isCameraOn) return;
    setFacing((prev) => (prev === 'front' ? 'back' : 'front'));
    Vibration.vibrate(30);
  }, [isCameraOn]);

  // 右下角小方格點擊互換（相機 ↔ 圖片）
  const swapPip = useCallback(() => {
    if (!isCameraOn) return;  // 相機關閉時不互換
    setPipPrimary((prev) => (prev === 'image' ? 'camera' : 'image'));
    Vibration.vibrate(30);
  }, [isCameraOn]);

  // 掛掉
  const hangUp = () => {
    setIsCameraOn(false);
    setPipPrimary('image');
    Vibration.vibrate(200);
    navigation.navigate('MainScreen');
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* 上方時間（更靠上） */}
        <Text style={styles.time}>通話時間：{formatTime(seconds)}</Text>

        {/* 視訊區：背景是圖片；單一 CameraView 用樣式切換大小格 */}
        <View style={styles.videoArea}>
          {/* 大方格：圖片（背景鋪滿） */}
          <Image source={characterImage} style={styles.mainImage} />

          {/* 單一 CameraView：不要卸載，避免閃爍 */}
          {isCameraOn && (
            <CameraView
              ref={cameraRef}
              facing={facing}
              style={[
                styles.cameraBase,
                pipPrimary === 'camera' ? styles.cameraMain : styles.cameraPip
              ]}
            />
          )}

          {/* 右下角小方格：點擊互換 */}
          <TouchableOpacity style={styles.pipTouch} activeOpacity={0.85} onPress={swapPip}>
            {/* 如果大方格是相機，小方格顯示圖片；反之顯示灰底（因為相機已在小格） */}
            {pipPrimary === 'camera' ? (
              <Image source={characterImage} style={styles.pipImage} />
            ) : null}
          </TouchableOpacity>
        </View>

        {/* 底部三顆按鈕（更靠下，只有圖示） */}
        <TouchableOpacity style={styles.hangupButton} onPress={hangUp}>
          <Ionicons name="call-outline" size={35} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.toggleCamButton} onPress={toggleCamera}>
          <Ionicons name={isCameraOn ? 'videocam-off-outline' : 'camera-outline'} size={24} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.switchButton, !isCameraOn && { opacity: 0.35 }]}
          onPress={switchFacing}
          disabled={!isCameraOn}
        >
          <Ionicons name="camera-reverse-outline" size={24} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4DDD0' },
  container: { flex: 1, alignItems: 'center',   justifyContent: 'flex-start', paddingTop: 40, },              // 👈 自行微調 0~48 },

  time: {
    position: 'absolute',
    top: 8, // 往上
    fontSize: 18,
    fontWeight: 'bold',
  },

  videoArea: {
    width: '90%',
    aspectRatio: 9 / 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#ddd',
  },

  // 背景圖片（大方格）
  mainImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  // 單一 CameraView 的共同樣式：絕對定位在 videoArea
  cameraBase: { position: 'absolute', zIndex: 1 },

  // 當相機是大方格（鋪滿）
  cameraMain: { top: 0, left: 0, right: 0, bottom: 0 },

  // 當相機是小方格（右下角）
  cameraPip: {
    bottom: 10,
    right: 10,
    width: '30%',
    aspectRatio: 3 / 4,
    borderRadius: 10,
    overflow: 'hidden',
  },

  // 小方格的點擊區（固定在右下角）
  pipTouch: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: '30%',
    aspectRatio: 3 / 4,
    borderRadius: 10,
    overflow: 'hidden',
    zIndex: 2,
  },
  pipImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  pipPlaceholder: { flex: 1, backgroundColor: '#888' },

  // 底部三顆按鈕（靠下）
  hangupButton: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: '#a97c50',
    padding: 12,
    borderRadius: 28,
  },
  toggleCamButton: {
    position: 'absolute',
    bottom: 17,
    left: 30,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 30,
    elevation: 3,
  },
  switchButton: {
    position: 'absolute',
    bottom: 17,
    right: 30,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 30,
    elevation: 3,
  },
});
