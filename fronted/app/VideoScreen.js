// VideoScreen.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Vibration, SafeAreaView, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Video } from 'expo-av';

import useMicAutoRecorder from '../hook/useMicAutoRecorder';
import { API_ENDPOINTS } from '../../fronted/apiConfig';
import characterImage from '../assets/video-placeholder.png';

export default function VideoScreen() {

  const defaultVideo = require('../assets/no1.mp4'); // 確定影片在 assets 目錄
  const navigation = useNavigation();
  const [seconds, setSeconds] = useState(0);
  const videoRef = useRef(null);
  const [videoUri, setVideoUri] = useState(null); 
  const [videoKey, setVideoKey] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({});

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

  //影片播放結束時呼叫
  const onPlaybackStatusUpdate = async (status) => {
    if (status.didJustFinish) {
      setVideoUri(null);  // 回到圖片
      //start();            // 影片播完後重新開始錄音循環
    }
  };

  // 儲存 base64 影片檔案
  const saveVideoBase64ToFile = async (base64) => {
    const fileUri = FileSystem.cacheDirectory + 'generated_video_${Date.now()}.mp4';
    await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
    return fileUri;
  };

  // --- 錄音循環：沿用原本流程 ---
  const onFinish = async (uri) => {
    if (!uri) { 
      start(); 
      return; 
    }

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

      // 上傳圖片
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

      console.log('uploadImageResult:', uploadImageResult);

      // 取得聊天回覆
      const replyRes = await fetch(API_ENDPOINTS.VIDEO_RESPONSE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice: uploadVoiceResult.corrected_text,
          image: uploadImageResult
        }),
      });
      const replyData = await replyRes.json();
      console.log('回覆內容：', replyData.reply);

      // 產生語音
      const generateRes = await fetch(API_ENDPOINTS.GENERATE_VOICE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: replyData.reply, rate: 0, pitch: 0, model_name: "金珉奎" }),
      });

      const voiceResult = await generateRes.json();
      const base64Audio = voiceResult.audio_base64;

      const imageFile = {
        uri: Image.resolveAssetSource(characterImage).uri,
        name: 'video-placeholder.png',
        type: 'image/png',
      };

      async function saveBase64AudioToFile(base64Audio) {
        const fileUri = FileSystem.cacheDirectory + 'voice.wav';
        await FileSystem.writeAsStringAsync(fileUri, base64Audio, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return fileUri;
      }

      // 產生影片
      // async function generateLipSync(audioFileUri, characterImageFile) {
      //   setLoading(true);
      //   const formData = new FormData();
      //   formData.append('audio', {
      //     uri: audioFileUri,
      //     name: 'voice.wav',
      //     type: 'audio/wav',
      //   });
      //   formData.append('image', {
      //     uri: characterImageFile.uri,
      //     name: characterImageFile.name,
      //     type: characterImageFile.type,
      //   });

      //   try {
      //     const res = await fetch(API_ENDPOINTS.VIDEO_LIP_SYNC, {
      //       method: 'POST',
      //       body: formData,
      //     });

      //     if (!res.ok) {
      //       console.error('影片生成失敗', await res.text());
      //       setLoading(false);
      //       return null;
      //     }
          
      //     const json = await res.json();
      //     const videoBase64 = json.video_base64;
      //     const videoFileUri = await saveVideoBase64ToFile(videoBase64);
      //     console.log('影片生成成功:', videoFileUri);
      //     setLoading(false);
      //     return videoFileUri;
          
      //   } catch (err) {
      //     console.error('generateLipSync 錯誤:', err);
      //     setLoading(false);
      //     return null;
      //   }
      // }

      async function fetchNoLipSyncVideo(replyText) {
        setLoading(true);

        try {
          const res = await fetch(API_ENDPOINTS.VIDEO_NO_LIP_SYNC, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ reply: replyText }),
          });

          if (!res.ok) {
            console.error("取得影片失敗", await res.text());
            setLoading(false);
            return null;
          }

          const json = await res.json();
          const videoBase64 = json.video_base64;
          const mood = json.mood;
          const reply = json.reply;
            
          const videoFileUri = await saveVideoBase64ToFile(videoBase64);

          console.log("影片取得成功:", videoFileUri, "心情:", mood, "回覆:", reply);
          setLoading(false);

          return videoFileUri;
        } catch (err) {
          console.error("fetchNoLipSyncVideo 錯誤:", err);
          setLoading(false);
          return null;
        }
      }
      

    if (base64Audio) {
      const audioFileUri = await saveBase64AudioToFile(base64Audio);

      // 影片一立即顯示
      const videoFileUri1 = await fetchNoLipSyncVideo(replyData.reply);
      if (videoFileUri1) {
        setVideoKey(Date.now()); 
        setVideoUri(videoFileUri1); // Video 元件會根據 key 重新渲染
      } else {
        start();
        return;
      }

      // 播放語音
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioFileUri },
        { shouldPlay: true }
      );

      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.didJustFinish) {
          await sound.unloadAsync();

          // 拿影片二
          const videoFileUri2 = await fetchNoLipSyncVideo(""); // 或依 mood
          if (videoFileUri2) {
            setVideoKey(Date.now());   // 重新生成 key，強制 Video 重渲染
            setVideoUri(videoFileUri2);
          }
          start(); // 開始下一輪錄音
        }
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
    if (!isCameraOn) return;
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
        {/* 上方時間 */}
        <Text style={styles.time}>通話時間：{formatTime(seconds)}</Text>

        {/* 視訊區 */}
        <View style={styles.videoArea}>
          <Video
            key={videoKey}  
            ref={videoRef}
            source={
              videoUri
                ? { uri: videoUri } // 如果有動態網址就播這個
                : require('../assets/no1.mp4') // 沒有的話就播預設本地影片
            }
            style={styles.mainImage}
            resizeMode="cover"
            shouldPlay
            isMuted={true}
            isLooping={true}  
            onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          />

          {/* CameraView */}
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

          {/* 小方格 */}
          <TouchableOpacity style={styles.pipTouch} activeOpacity={0.85} onPress={swapPip}>
            {pipPrimary === 'camera' ? (
              <Image source={characterImage} style={styles.pipImage} />
            ) : null}
          </TouchableOpacity>
        </View>

        {/* 底部三顆按鈕 */}
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
  container: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 40 },

  time: {
    position: 'absolute',
    top: 8,
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

  mainImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  cameraBase: { position: 'absolute', zIndex: 1 },

  cameraMain: { top: 0, left: 0, right: 0, bottom: 0 },

  cameraPip: {
    bottom: 10,
    right: 10,
    width: '30%',
    aspectRatio: 3 / 4,
    borderRadius: 10,
    overflow: 'hidden',
  },

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
