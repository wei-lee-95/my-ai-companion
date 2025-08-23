import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { API_ENDPOINTS } from '../../fronted/apiConfig';

export default function AppearanceSettingScreen() {
  const VIDEO_API_URL = "https://0828e917876f.ngrok-free.app";
  const navigation = useNavigation();
  const route = useRoute();
  const {gender} = route.params || {};
  const [imageUploaded, setImageUploaded] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [styleLocked, setStyleLocked] = useState(false);

  const handleUploadImage = async () => {
  try {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert("權限不足", "請允許存取照片才能上傳圖片");
      return;
    }
  
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      quality: 1,
    });

    if (!pickerResult.canceled) {
      setImageUri(pickerResult.assets[0].uri);
      setImageUploaded(true);
    }
  } catch (error) {
    console.error('上傳圖片失敗', error);
    Alert.alert("發生錯誤", "無法開啟圖片庫");
  }
};
  
const handleGenerateResult = async () => {
  const imageBase64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });

  const styleMap = {
    '原圖': 'original',
    '休閒': 'casual',
    '正式': 'formal',
    '舞台': 'idol',
  };

  const endpoint = gender === '男性' 
    ? API_ENDPOINTS.GENERATE_APPEARANCE_BOY
    : API_ENDPOINTS.GENERATE_APPEARANCE_BOY;

  try {
    // 準備要傳送的資料
    const payload = {
      style: styleMap[selectedStyle],
      imageBase64: imageBase64
    };

    //發送 POST 請求到後端
    // const response = await fetch(endpoint, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),      
    // });

    // if (!response.ok) {
    //   throw new Error('生成圖片失敗');
    // }

    // const result = await response.json();
    
    // 再發送一個請求獲取 base64 格式的圖片
    const base64Response = await fetch(API_ENDPOINTS.GET_IMAGE_BASE64);
    if (!base64Response.ok) {
      throw new Error('獲取 base64 圖片失敗');
    }
    
    const base64Result = await base64Response.json();
    
    // 使用 base64 格式顯示圖片
    setImageUri(`data:image/png;base64,${base64Result.image_base64}`);
    setGeneratedResult(true);
    setStyleLocked(true);

        // ✅ 成功生成外觀後，自動呼叫 generate-emotion
    const emotionPayload = {
      userId: "test2",      // 你前端保存的使用者名稱
      character_name: "金珉奎", // 角色名稱
    };

    const emotionResponse = await fetch(API_ENDPOINTS.GENERATE_EMOTION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emotionPayload),
    });

    if (!emotionResponse.ok) {
      throw new Error('生成表情失敗');
    }

    const emotionResult = await emotionResponse.json();
    console.log('生成表情結果:', emotionResult);

    const videoPayload = {
    username: "test2",
    character_name: "金珉奎",
    colab_url: VIDEO_API_URL
  };

  const videoResponse = await fetch(API_ENDPOINTS.GENERATE_VIDEO, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(videoPayload),
  });

  if (!videoResponse.ok) {
    throw new Error('影片生成失敗');
  }

  const videoResult = await videoResponse.json();
  console.log('影片生成結果:', videoResult);


  } catch (error) {
    console.error('生成失敗:', error);
    Alert.alert('生成失敗', error.message);
  }
};

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>
      <Text style={styles.header}>形象設定</Text>

      {/* 圖片上傳／結果區塊 */}
      <View style={styles.imageBox}>
        {!generatedResult ? (
          imageUploaded && imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.generatedImage} />
          ) : (
            <TouchableOpacity style={styles.uploadButton} onPress={handleUploadImage}>
              <Ionicons name="image-outline" size={70} color="#555" />
              <Text style={styles.uploadText}>上傳圖片</Text>
            </TouchableOpacity>
          )
        ) : (
          <>
            <Image
              source={{ uri: imageUri }}
              style={styles.generatedImage}
            />
          </>
        )}
      </View>

      <Text style={styles.label}>請選擇喜歡的服裝風格</Text>
      <View style={styles.styleOptions}>
        {['原圖', '休閒', '正式', '舞台'].map((style) => (
          <TouchableOpacity
            key={style}
            style={[
              styles.styleButton,
              selectedStyle === style && styles.styleButtonSelected,
            ]}
            onPress={() => {
              if (!styleLocked) {
                setSelectedStyle(style);
              }
            }}
          >
            <Text
              style={[
                styles.styleButtonText,
                selectedStyle === style && styles.styleButtonTextSelected,
              ]}
            >
              {style}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 按鈕列 */}
      <View style={styles.buttonRow}>
        {!generatedResult ? (
          <TouchableOpacity
            style={[
              styles.generateButton,
              !(imageUploaded && selectedStyle) && { opacity: 0.4 },
            ]}
            onPress={handleGenerateResult}
            disabled={!(imageUploaded && selectedStyle)}
          >
            <Text style={styles.buttonText}>生成形象</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setGeneratedResult(false);
                setImageUploaded(false);
                setImageUri(null);
                setStyleLocked(false);
              }}
            >
              <Text style={styles.buttonText}>重新生成</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => {
                console.log('確認設定：', { selectedStyle, imageUri });
                navigation.goBack();
              }}
            >
              <Text style={styles.buttonText}>確認設定</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 25,
    backgroundColor: '#efe2d8',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 15,
    padding: 8,
  },
  header: {
    paddingTop: 30,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 25,
    color: '#333',
  },
  imageBox: {
    width: '80%',
    height: 400,
    borderWidth: 2,
    borderColor: '#555',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    backgroundColor: '#fafafa',
    overflow: 'hidden',
  },
  uploadButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 16,
    color: '#555',
    marginTop: 10,
  },
  generatedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    borderRadius: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '80%',
    gap: 20,
  },
  generateButton: {
    backgroundColor: '#555',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 12,
  },
  resetButton: {
    backgroundColor: '#555',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 12,
  },
  confirmButton: {
    backgroundColor: '#555',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#fff',
  },
  label: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#333',
  marginBottom: 20,
  },
  styleOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    gap: 12,
  },
  styleButton: {
    paddingVertical: 11,
    paddingHorizontal: 17,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#555',
    backgroundColor: '#fff',
  },
  styleButtonSelected: {
    backgroundColor: '#555',
  },
  styleButtonText: {
    fontSize: 16,
    color: '#555',
  },
  styleButtonTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },

});