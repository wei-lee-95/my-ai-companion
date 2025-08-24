import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Alert,
  TextInput,
  Text,
  TouchableOpacity,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { API_ENDPOINTS } from '../../fronted/apiConfig'; 

export default function PhotoUploadScreen() {
  const route = useRoute();
  const {characterId} = route.params || {};
  const [image, setImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const navigation = useNavigation();

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('權限被拒', '請允許存取媒體庫');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
      setResultImage(null);
    }
  };

  const uploadImage = async () => {
    if (!image) return;
    setLoading(true);

  const formData = new FormData();
    formData.append('file', {
      uri: image.uri,
      name: 'user_photo.jpg',
      type: 'image/jpeg',
    });
  formData.append('user_prompt', userPrompt);
  formData.append('characterId', characterId); // 確保 characterId 被包含在 formData 中
  console.log('characterId:', characterId); // 確認 characterId 是否正確傳遞

    try {
      const response = await fetch(API_ENDPOINTS.GENERATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();
      setResultImage(data.result);
    } catch (error) {
      Alert.alert('上傳失敗', '請檢查伺服器是否啟動');
    } finally {
      setLoading(false);
    }
  };

  const saveImage = async () => {
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('請開啟媒體庫權限');
      return;
    }

    try {
      const filename = FileSystem.documentDirectory + 'generated.png';
      await FileSystem.writeAsStringAsync(filename, resultImage, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await MediaLibrary.saveToLibraryAsync(filename);
      Alert.alert('成功', '照片已儲存至相簿');
    } catch (e) {
      Alert.alert('錯誤', '儲存照片失敗');
    }
  };

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: '#f4DDD0' }}
      contentContainerStyle={styles.container}
      enableOnAndroid
      extraScrollHeight={30}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <Text style={styles.title}>照片合成</Text>

      <TouchableOpacity style={styles.imageFrame} onPress={pickImage}>
        {resultImage ? (
          <Image
            source={{ uri: `data:image/png;base64,${resultImage}` }}
            style={styles.result}
          />
        ) : image ? (
          <Image source={{ uri: image.uri }} style={styles.result} />
        ) : (
          <Text style={styles.placeholderText}>點此選擇照片</Text>
        )}
      </TouchableOpacity>

      <TextInput
        placeholder="輸入合成提示詞（可選）"
        value={userPrompt}
        onChangeText={setUserPrompt}
        style={styles.input}
      />

      {loading && <Text style={styles.loadingText}>照片合成中...</Text>}

      {!resultImage && (
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.smallButton} onPress={uploadImage}>
            <Text style={styles.buttonText}>開始合成</Text>
          </TouchableOpacity>
          {image && (
            <TouchableOpacity style={styles.smallButton} onPress={pickImage}>
              <Text style={styles.buttonText}>重新上傳</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {resultImage && (
        <>
          <TouchableOpacity style={styles.hangupButton} onPress={saveImage}>
            <Text style={styles.buttonText}>儲存照片</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.hangupButton} onPress={pickImage}>
            <Text style={styles.buttonText}>再次合成</Text>
          </TouchableOpacity>
        </>
      )}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 25,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 15,
    padding: 8,
  },
  title: {
    paddingTop: 40,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  imageFrame: {
    width: 320,
    height: 427,
    borderWidth: 2,
    borderColor: '#aaa',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  placeholderText: {
    fontSize: 16,
    color: '#aaa',
  },
  result: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    borderRadius: 10,
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginVertical: 15,
    borderRadius: 10,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#555',
    marginTop: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 15,
  },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#a97c50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  hangupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#a97c50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});
