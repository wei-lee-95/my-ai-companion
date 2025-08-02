import React, { useState, useEffect } from 'react';
import {
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

export default function CreateCharacter() {
  const navigation = useNavigation();
  const route = useRoute();
  const { gender, relationship, name } = route.params || {};
  const [audioFileName, setAudioFileName] = useState('');
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [occupation, setOccupation] = useState('');
  const [age, setAge] = useState('');
  const [personality, setPersonality] = useState('');
  const [skills, setSkills] = useState('');
  const [speakingStyle, setSpeakingStyle] = useState('');
  const [meetingContext, setMeetingContext] = useState('');
  const [relationshipProgress, setRelationshipProgress] = useState('');


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
          onPress={() => navigation.navigate('AppearanceSettingScreen')}
        >
          <Text style={styles.plus}>＋</Text>
          <Text style={styles.buttonText}>形象設定</Text>
        </TouchableOpacity>

        {/* 聲音設定 */}
        <TouchableOpacity
          style={styles.settingButton}
          onPress={() => {
            navigation.navigate('VoiceSettingScreen', {
              name: name,
              gender: gender
            });
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
          onPress={() => {
            if (isAnyFieldEmpty()) {
              alert('請填寫所有欄位');
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
              speakingStyle,
              meetingContext,
              relationshipProgress,
            };
            console.log('確認創建', characterData);
            navigation.navigate('RoleList', { characterData });
          }}
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
