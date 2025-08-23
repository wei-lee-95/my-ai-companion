import React, { useState, useEffect } from 'react';
import {
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { API_ENDPOINTS } from '../../fronted/apiConfig';

export default function CreateCharacter() {
  const navigation = useNavigation();
  const route = useRoute();
  const { gender, relationship, name, userId, clothingStyle, pitch, speed } = route.params || {};
  const [audioFileName, setAudioFileName] = useState('');
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [occupation, setOccupation] = useState('');
  const [age, setAge] = useState('');
  const [personality, setPersonality] = useState('');
  const [skills, setSkills] = useState('');
  const [speakingStyle, setSpeakingStyle] = useState('');
  const [meetingContext, setMeetingContext] = useState('');
  const [relationshipProgress, setRelationshipProgress] = useState('');

  useEffect(() => {
    if (clothingStyle) {
      console.log("從 AppearanceSettingScreen 傳來的 clothingStyle:", clothingStyle);
      // 如果要顯示或特別處理，可以在這裡執行
    }
  }, [clothingStyle]);

  useEffect(() => {
    if (pitch !== undefined && speed !== undefined) {
      console.log("從 VoiceSettingScreen 傳來的 pitch:", pitch);
      console.log("從 VoiceSettingScreen 傳來的 speed:", speed);
      // 這裡可以放其他要做的事情，比如更新UI或觸發副作用
    }
  }, [pitch, speed]);

  const isAnyFieldEmpty = () => {
    return (
      !occupation.trim() ||
      !age.trim() ||
      !personality.trim() ||
      !skills.trim() ||
      !speakingStyle.trim() ||
      !meetingContext.trim() ||
      !relationshipProgress.trim()
    );
  };

  const handleCreateCharacter = async () => {
    if (isAnyFieldEmpty()) {
      Alert.alert('請填寫所有欄位');
      return;
    }

    const characterData = {
      gender,
      relationship,
      name,
      age,
      occupation,
      personality,
      skills,
      speaking_style: speakingStyle,
      meeting_context: meetingContext,
      relationship_stage: relationshipProgress, // 注意資料庫欄位名稱
    };

    console.log('🌐createcharacter API call to login...');
    try {
      // 1️⃣ 建立角色
      const response = await fetch(API_ENDPOINTS.CREATE_CHARACTER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 這裡 user_id 你要改成實際的或固定值 // ????
        body: JSON.stringify({ user_id:userId, ...characterData }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('錯誤', data.error || '建立角色失敗');
        return;
      }

      const characterId = data.character_id;
      console.log("✅ 角色建立成功 ID:", characterId);

      // 2️⃣ 更新 clothing_style（如果有）
      if (clothingStyle) {
        console.log("🪡 更新角色服裝風格:", clothingStyle);
        const updateResponse = await fetch(API_ENDPOINTS.UPDATE_CLOTHING_STYLE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            character_id: characterId,
            clothing_style: clothingStyle
          }),
        });

        const updateData = await updateResponse.json();
        if (!updateResponse.ok) {
          console.error("❌ 更新服裝風格失敗:", updateData);
        } else {
          console.log("🎯 服裝風格更新成功:", updateData);
        }
      }

      try {
        console.log("🖼️ 更新外觀路徑...");
        const appearanceResponse = await fetch(API_ENDPOINTS.UPDATE_APPEARANCE_PATH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ character_id: characterId }),
        });

        const appearanceData = await appearanceResponse.json();
        if (!appearanceResponse.ok || !appearanceData.success) {
          console.error("❌ 更新外觀路徑失敗:", appearanceData);
        } else {
          console.log("✅ 外觀路徑更新成功:", appearanceData);
        }
      } catch (err) {
        console.error("❌ 更新外觀路徑出現錯誤:", err);
      }

      // 3️⃣ 更新 pitch 和 speed（如果有）
      if (pitch && speed ) {
        console.log(" 🎵更新角色音高、語速:", speed, "和", pitch);
        const updateVoiceRes = await fetch(API_ENDPOINTS.UPDATE_PITCH_SPEED, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            character_id: characterId,
            pitch,
            speed,
          }),
        });

        const updateVoiceData = await updateVoiceRes.json();
        if (!updateVoiceRes.ok) {
          console.error("❌ 更新音高與語速失敗:", updateVoiceData);
        } else {
          console.log("🎯 更新音高與語速成功:", updateVoiceData);
        }
      }

      try {
        console.log("🔊 更新語音路徑...");
        const voicePathRes = await fetch(API_ENDPOINTS.UPDATE_VOICE_PATH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ character_id: characterId }),
        });
        const voicePathData = await voicePathRes.json();
        if (!voicePathRes.ok || !voicePathData.success)
          console.error("❌ 更新語音路徑失敗:", voicePathData);
        else console.log("✅ 語音路徑更新成功:", voicePathData);
      } catch (err) {
        console.error("❌ 更新語音路徑出現錯誤:", err);
      }

      // 4️⃣ 更新人物情緒圖片路徑進資料庫
      try {
        console.log("🎞️ 更新動畫路徑...");
        const animationRes = await fetch(API_ENDPOINTS.UPDATE_ANIMATION_PATH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ character_id: characterId }),
        });
        const animationData = await animationRes.json();
        if (!animationRes.ok || !animationData.success)
          console.error("❌ 更新動畫路徑失敗:", animationData);
        else console.log("✅ 更新動畫路徑成功:", animationData);
      } catch (err) {
        console.error("❌ 更新動畫路徑出現錯誤:", err);
      }
    

      // 5️⃣ 導回角色列表
      Alert.alert('成功', '角色已建立');
      navigation.navigate('RoleList', { userId });

    } catch (error) {
      Alert.alert('錯誤', '無法連接伺服器');
      console.error(error);
    }
  };
  
  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: '#efe2d8' }} // 這裡設定背景色，避免彈出時是白的
      contentContainerStyle={{...styles.container, alignItems: 'center'}}
      enableOnAndroid={true}
      extraScrollHeight={30} // 推高一點點就好，防止跳太高
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ width: '100%', alignItems: 'center' }}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>創建角色</Text>
        </View>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>≪</Text>
        </TouchableOpacity>

        {/* 基本資訊 Tag */}
        <Text style={{ marginBottom: 5, fontSize: 15, color: '#555' }}>
          性別: {gender || '未選擇'} | 關係: {relationship || '未選擇'} | 名字: {name || '未輸入'}
        </Text>

        {/* 形象設定 */}
        <Text style={styles.sectionTitle}>外觀與聲音</Text>

        <TouchableOpacity
          style={styles.settingButton}
          onPress={() => navigation.navigate('AppearanceSettingScreen', { gender, relationship, name, userId })}
        >
          <Text style={styles.plus}>＋</Text>
          <Text style={styles.buttonText}>形象設定</Text>
        </TouchableOpacity>

        {/* 聲音設定 */}
        <TouchableOpacity
          style={styles.settingButton}
          onPress={() => {
            navigation.navigate('VoiceSettingScreen', { gender, relationship, name, userId, clothingStyle });
            setIsAudioReady(true);
            setAudioFileName('角色名稱.mp3');
          }}
        >
          <Text style={styles.plus}>＋</Text>
          <Text style={styles.buttonText}>聲音設定</Text>
        </TouchableOpacity>

        {/* 音檔顯示 */}
        {isAudioReady && (
          <View style={styles.audioInfo}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => console.log('播放音檔')}
            >
              <Text style={styles.playButtonText}>▶</Text>
            </TouchableOpacity>
            <Text style={styles.audioFileName}>{audioFileName}</Text>
          </View>
        )}

        {/* 輸入職業／年齡 */}
        <Text style={styles.sectionTitle}>基本資料</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.placeholderText}>輸入職業</Text>
          <TextInput
            style={styles.inputField}
            value={occupation}
            onChangeText={setOccupation}
            placeholder="(如：偶像歌手)"
            placeholderTextColor="#d8cbbd"
          />

          <Text style={styles.placeholderText}>輸入年齡</Text>
          <TextInput
            style={styles.inputField}
            value={age}
            onChangeText={setAge}
            placeholder="(如 : 25)"
            keyboardType="numeric"
            placeholderTextColor="#d8cbbd"
          />
        </View>

          {/* 個性與喜好區 */}
        <Text style={styles.sectionTitle}>角色特質</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.placeholderText}>輸入個性</Text>
          <TextInput
            style={styles.inputField}
            value={personality}
            onChangeText={setPersonality}
            placeholder="(如：溫暖、貼心) "
            placeholderTextColor="#d8cbbd"
          />

          <Text style={styles.placeholderText}>輸入喜好或擅長</Text>
          <TextInput
            style={styles.inputField}
            value={skills}
            onChangeText={setSkills}
            placeholder="(如：煮飯、寫程式)"
            placeholderTextColor="#d8cbbd"
          />

          <Text style={styles.placeholderText}>說話風格</Text>
          <TextInput
            style={styles.inputField}
            value={speakingStyle}
            onChangeText={setSpeakingStyle}
            placeholder="(如：直接、幽默) "
            placeholderTextColor="#d8cbbd"
          />
        </View>

        {/* 相遇與關係設定 */}
        <Text style={styles.sectionTitle}>互動背景</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.placeholderText}>開始對話的場景</Text>
          <TextInput
            style={styles.inputField}
            value={meetingContext}
            onChangeText={setMeetingContext}
            placeholder="(如：在烹飪課上認識)"
            placeholderTextColor="#d8cbbd"
          />

          <Text style={styles.placeholderText}>關係目前階段</Text>
          <TextInput
            style={styles.inputField}
            value={relationshipProgress}
            onChangeText={setRelationshipProgress}
            placeholder="(如：曖昧、普通朋友)"
            placeholderTextColor="#d8cbbd"
          />
        </View>

        {/* 確認創建 */}
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleCreateCharacter}
        >
          <Text style={styles.confirmText}>確認創建</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 25,
    paddingBottom: 40,
    paddingHorizontal: 25,
    backgroundColor: '#efe2d8',
    alignItems: 'center',
  },
  titleContainer: {
    marginTop: 25,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
    lineHeight: 40,
    color: '#333',
  },
  backButton: {
    position: 'absolute',
    top: 45,
    left: 3,
    backgroundColor: '#000',
    borderRadius: 15,
    padding: 6,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 18,
    color: '#fcf7ef',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#444',
    marginTop: 20,
    marginBottom: 5,
    alignSelf: 'flex-start',
    paddingLeft: '3%',  
  },
  settingButton: {
    backgroundColor: '#575853',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    width: '80%',
    gap: 10,
  },
  plus: {
    fontSize: 30,
    color: '#fff',
  },
  buttonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  audioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    justifyContent: 'center',
  },
  playButton: {
    backgroundColor: '#555',
    padding: 8,
    borderRadius: 15,
    marginRight: 10,
  },
  playButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  audioFileName: {
    fontSize: 16,
    color: '#333',
  },
  inputGroup: {
    marginTop: 10,
    width: '90%',
    alignItems: 'center',
  },
  inputField: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#d8cbbd',
    borderRadius: 23,
    paddingHorizontal: 16,
    backgroundColor: '#ececec',
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    marginBottom: 13,
  },
  placeholderText: {
    fontSize: 20,
    color: '#555',
    marginBottom: 10,
    letterSpacing: 2,
    lineHeight: 30,
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#555',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    paddingHorizontal: 45,
  },
  confirmText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fff',
  },
});
