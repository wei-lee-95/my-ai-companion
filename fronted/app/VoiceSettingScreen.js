import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { API_ENDPOINTS } from '../../fronted/apiConfig';
import * as FileSystem from 'expo-file-system';

export default function VoiceSettingScreen() {
  const route = useRoute();
  const {name} = route.params || {};
  const [pitch, setPitch] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [isUploaded, setIsUploaded] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileUri, setUploadedFileUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sound, setSound] = useState(null);
  const navigation = useNavigation();
  const [generatedBase64, setGeneratedBase64] = useState(null);

  // ✅ 初始化音訊模式（for iOS 靜音）
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      staysActiveInBackground: false,
    });
  }, []);

  // ✅ 確認設定 → 呼叫後端產生音檔
  const handleGenerate = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', {
        uri: uploadedFileUri,
        name: uploadedFileName,
        type: ['audio/mpeg', 'audio/wav', 'audio/x-wav'], // 或依實際檔案格式調整
      });
      formData.append('text', '你好，我想去看電影，你要一起去嗎？');
      formData.append('rate', speed);
      formData.append('pitch', pitch);
      formData.append('model_name', name);

      const response = await fetch(API_ENDPOINTS.TRAIN_VOICE, {
        method: 'POST',
        headers: {},
        body: formData,
      });

      const trainResult = await response.json();
      console.log('訓練結果：', trainResult);

      if (trainResult.success) {
        const generateRes = await fetch(API_ENDPOINTS.GENERATE_VOICE, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: '你好，我想去看電影，你要一起去嗎？',
            rate: speed,
            pitch: pitch,
            model_name: name,
          })
        });
        const generateResult = await generateRes.json();
        console.log('生成語音成功：', generateResult);
        setLoading(false);
        if (generateResult.audio_base64) {
          setGeneratedBase64(generateResult.audio_base64);
          alert('語音生成完成，開始播放...');
          await handlePlay(generateResult.audio_base64);  // 播放生成音檔
        } else {
          alert('生成音檔失敗，無法播放');
        }
      }
    } catch (error) {
      console.error('生成錯誤：', error);
      alert('生成語音失敗');
    }
  };

  const handleConfirm = () => {
    navigation.goBack();
  };

  // ✅ 播放按鈕（從後端取 base64 播放）
  const handlePlay = async (base64Audio) => {
    try {
      const fileUri = FileSystem.cacheDirectory + "generated_audio.wav";
      await FileSystem.writeAsStringAsync(fileUri, base64Audio, { encoding: FileSystem.EncodingType.Base64 });

      const { sound } = await Audio.Sound.createAsync({ uri: fileUri }, { shouldPlay: true });

      sound.setOnPlaybackStatusUpdate(status => {
        if (status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error("播放失敗", error);
    }
  };

  const handlePickAndGo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/mpeg', 'audio/wav'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      console.log('📁 選取結果:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];

        setIsUploaded(true);
        setUploadedFileName(file.name);
        setUploadedFileUri(file.uri);

        console.log('✅ 音檔上傳成功:', file.name);
      } else {
        console.log('⚠️ 使用者取消選取或無檔案');
      }
    } catch (error) {
      console.error('❌ 音檔選取錯誤:', error);
      alert('選擇音檔失敗');
    }
  };


  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <Text style={styles.header}>聲音設定</Text>

      <TouchableOpacity onPress={handlePickAndGo}>
        <View style={styles.cardDashed}>
          <Text style={styles.plus}>＋</Text>
          <Text style={styles.cardText}>上傳清晰音檔 生成AI仿聲</Text>
        </View>
      </TouchableOpacity>

      {isUploaded && (
        <Text style={styles.uploadedFile}>
          ✅ 已上傳檔案：{uploadedFileName}
        </Text>
      )}

      <View style={styles.cardBox}>
        <Text style={styles.cardTitle}>最終聲音確認 & 調整</Text>
        <TouchableOpacity
          onPress={() => {
            if (generatedBase64) {
              handlePlay(generatedBase64);
            } else {
              alert('請先生成語音');
            }
          }}
          style={styles.finalRow}
        >
          <Ionicons name="play" size={24} color="black" />
          <Text style={{ marginLeft: 10 }}>🎵 播放語音</Text>
        </TouchableOpacity>

        <Text style={styles.sliderLabel}>音高 ({pitch})</Text>
        <Slider
          style={styles.slider}
          minimumValue={-10}
          maximumValue={10}
          value={pitch}
          step={1}
          onValueChange={setPitch}
        />

        <Text style={styles.sliderLabel}>語速 ({speed})</Text>
        <Slider
          style={styles.slider}
          minimumValue={-25}
          maximumValue={25}
          value={speed}
          step={1}
          onValueChange={setSpeed}
        />
      </View>

      {/* Loading */}
      {loading && (
        <View style={{ width: '100%', marginVertical: 12, alignItems: 'center', fontSize: 16, }}>
        <Text style={styles.loadingText}>聲音生成中...</Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.generateButton} onPress={handleGenerate}>
          <Text style={styles.confirmText}>開始生成</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmText}>確認設定</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#EFE2D8', flex: 1 },
  inner: { alignItems: 'center', paddingBottom: 40, paddingTop: 50 },
  header: { fontSize: 20, fontWeight: 'bold', marginTop: 30 },
  cardDashed: {
    width: '85%',
    height: 150,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#a97C50',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 10,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 15,
    padding: 8,
  },
  plus: { fontSize: 36, color: '#a97C50' },
  cardText: { fontSize: 16, marginTop: 10, color: '#333' },
  uploadedFile: {
    fontSize: 14,
    color: '#555',
    marginTop: 10,
  },
  cardBox: {
    backgroundColor: '#fCF7EF',
    width: '85%',
    padding: 15,
    marginTop: 20,
    borderRadius: 20,
    borderColor: '#a97C50',
    borderWidth: 1,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  finalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#eee',
    padding: 10,
    borderRadius: 10,
  },
  slider: { width: '100%', height: 40 },
    sliderLabel: { alignSelf: 'flex-start', marginTop: 10, fontSize: 14 },
    buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40, // 👈 加這個
    gap: 20,
  },
  generateButton: {
    backgroundColor: '#888',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  confirmButton: {
    backgroundColor: '#a97C50',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  confirmText: { color: '#fff', fontSize: 16 },
});

