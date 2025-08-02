//聊天頁面的UI //鍵盤輸入、回覆好像有個text沒有包到<text>
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from 'expo-router';
import { useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '../style/chatscreenstyle';
import characterImage from '../assets/full_body.png';

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef(null);
  const navigation = useNavigation();
  const [longPressedMessageIndex, setLongPressedMessageIndex] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingInstance, setRecordingInstance] = useState(null);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [recordedUri, setRecordedUri] = useState(null);
  const recordingTimer = useRef(null);
  const [sound, setSound] = useState(null);
  const [playingUri, setPlayingUri] = useState(null);

  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [messageToSave, setMessageToSave] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const memoryCategories = [
    { key: 'anniversary', icon: '❤️', title: '紀念日' },
    { key: 'event', icon: '📅', title: '事件' },
    { key: 'emotion', icon: '😄', title: '情緒' },
  ];

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessage = {
      sender: 'user',
      text: input,
      time: Date.now(),
      replyTo: replyingTo ?? undefined,
    };
    setMessages(prev => [...prev, newMessage]);

    fetch('http://192.168.0.131:5000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input }),
    })
      .then(res => res.json())
      .then(data => {
        const reply = {
          sender: 'bot',
          text: data.reply,
          time: Date.now(),
        };
        setMessages(prev => [...prev, reply]);
      })
      .catch(err => console.error('發送訊息失敗:', err));

    setInput('');
    setReplyingTo(null);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('需要相簿權限才能選擇圖片');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: false,
    });

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      const manipulated = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 800 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      const base64WithMime = `data:image/jpeg;base64,${manipulated.base64}`;
      setMessages(prev => [...prev, { sender: 'user', imageUri, time: Date.now() }]);

      try {
        const response = await fetch('http://192.168.0.131:5000/chat_image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: base64WithMime }),
        });
        const data = await response.json();
        if (response.ok) {
          setMessages(prev => [...prev, { sender: 'bot', text: data.reply, time: Date.now() }]);
        } else {
          alert('圖片分析失敗');
        }
      } catch (err) {
        console.error('發送圖片失敗', err);
      }
    }
  };


  // 錄音功能開始
  const startRecording = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      alert('需要麥克風權限');
      return;
    }

    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await recording.startAsync();

      setRecordingInstance(recording);
      setIsRecording(true);
      setRecordingProgress(0);

      recordingTimer.current = setInterval(() => {
        setRecordingProgress(prev => {
          if (prev >= 59) {
            stopRecording();
            alert('錄音最長為1分鐘');
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
  // 印出完整錯誤物件（包含名稱、訊息、stack等）
  console.error('錄音失敗:', error);
  
  // 如果 error 是 Error 物件，也印出 name 和 message
  if (error instanceof Error) {
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  } else {
    // 非 Error 物件，直接 JSON.stringify
    console.error('Error detail:', JSON.stringify(error));
  }
  
  setRecordingInstance(null);
  setIsRecording(false);
}
  };

  // 錄音功能停止
  const stopRecording = async () => {
    if (recordingTimer.current) clearInterval(recordingTimer.current);
    if (!recordingInstance) return;

    try {
      await recordingInstance.stopAndUnloadAsync();
      const uri = recordingInstance.getURI();
      setRecordedUri(uri);
      setRecordingInstance(null);
      setIsRecording(false);
    } catch (error) {
      console.error('停止錄音失敗', error);
    }finally {
    setRecordingInstance(null);
    setIsRecording(false);
  }
  };

  // 點擊麥克風圖示
  const handleMicPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // 傳送語音訊息
  const handleSendAudio = async () => {
    if (!recordedUri) return;
    // 先立即恢復輸入框狀態
    setRecordedUri(null);
    setRecordingProgress(0);
    setIsRecording(false);

    const uriParts = recordedUri.split('.');
    const fileType = uriParts[uriParts.length - 1];

    // 先顯示語音訊息（user），讓 UI 不卡住
    const newAudioMessage = {
      sender: "user",
      text: '[語音訊息]', // 可自定義
      audioUri: recordedUri,
      time: Date.now(),
    };
    setMessages(prev => [...prev, newAudioMessage]);

    const formData = new FormData();
    formData.append('file', {
      uri: recordedUri,
      name: `audio.${fileType}`,
      type: `audio/${fileType}`,
    } );
    try {
      const response = await fetch('http://192.168.0.131:5000/chat_vocal', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {

        const botReply = {
          sender: "bot",
          text: data.reply,
          time: Date.now(),
        };

        setMessages(prev => [...prev, botReply]);
      } else {
        console.error('後端錯誤', data.error);
      }
    } catch (error) {
      console.error('語音訊息發送失敗', error);
    } finally { // 當使用者「失敗時」還可以保留錄音，方便重傳或重新操作
      setRecordedUri(null);
      setRecordingProgress(0);
    }
  };

  //播放錄音的功能
  const playAudio = async (uri) => {
  try {
    // 如果已經有播放，先停掉
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
      setPlayingUri(null);
      if (playingUri === uri) return; // 如果點擊的是正在播放的音，則停止後不重新播放
    }

    const { sound: newSound, status } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true }
    );

    setSound(newSound);
    setPlayingUri(uri);

    // 播放結束事件
    newSound.setOnPlaybackStatusUpdate((playbackStatus) => {
      if (!playbackStatus.isLoaded) {
        setPlayingUri(null);
        setSound(null);
        return;
      }
      if (!playbackStatus.isPlaying && playbackStatus.didJustFinish) {
        setPlayingUri(null);
        setSound(null);
      }
    });
  } catch (error) {
    console.error('播放失敗', error);
  }
  };

  // 功能按鈕行為（你可以改成你要的邏輯）
  const onCopy = (text) => {
    Clipboard.setString(text);
    setLongPressedMessageIndex(null);
  };
  const onOoc = (text) => {
    console.log('OOC', text);
    setLongPressedMessageIndex(null);
  };
  //圖片文字都可以當input
  const onReply = (msg) => {
  setReplyingTo(msg);
  setLongPressedMessageIndex(null);
  };
  const onSave = (msg) => {
    console.log('儲存', msg);
    setMessageToSave(msg);             // 儲存要記錄的訊息
    setSaveModalVisible(true);      
    setLongPressedMessageIndex(null);
  };


  const renderMessage = ({ item, index }) => {
    // 判斷這一則訊息是否要顯示角色頭像
    const showAvatar =
    index === 0 || // 第一則訊息一定顯示
    item.sender !== messages[index - 1]?.sender || // 如果前一則訊息是不同人
    item.time - messages[index - 1].time > 60000; // 如果與前一則相隔超過 1 分鐘

    const isUser = item.sender === 'user'; // 判斷是不是使用者
    const isLongPressed = index === longPressedMessageIndex;

    return (
      <Pressable
      style={[styles.messageRow, isUser ? styles.messageRight : styles.messageLeft]} // 根據發話者決定訊息排版
      onLongPress={() => {
        if (!isUser) setLongPressedMessageIndex(index); 
      }}
      delayLongPress={300} // 長按觸發時間300ms
      >
      {!isUser && (
        <View style={{ width: 34, alignItems: 'flex-end' }}>
        {showAvatar ? (
          <Image
          source={require('../assets/full_body.png')} 
          style={styles.avatar}
          />
        ) : (
          <View style={{ width: 40, height: 40 }} /> // 透明佔位
        )}
        </View>
      )}

      <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
        {/* 如果此訊息有回覆另一則訊息，先顯示回覆摘要 */}
        {item.replyTo && (
          <View style={styles.replyContainer}>          
            <View style={styles.replyLine} /> {/* 左側一條線表示回覆關聯 */}
            {item.replyTo.imageUri ? ( //如果被回覆的訊息是圖片，顯示縮圖 
              <Image
                source={{ uri: item.replyTo.imageUri }}
                style={{ width: 40, height: 40, borderRadius: 5, marginBottom: 4 }}
              />
            ) : (
              <Text style={styles.replyText} numberOfLines={1}> {/* 被回覆的文字訊息，截取前10字，超過加省略號 */}
                {item.replyTo.text
                  ? item.replyTo.text.length > 10
                    ? item.replyTo.text.slice(0, 10) + '...'
                    : item.replyTo.text
                  : ''}
              </Text>
            )}
          </View>
        )}

        {/*主訊息內容：播放錄音or圖片or文字*/}
        {item.audioUri ? (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center' }}
            onPress={() => playAudio(item.audioUri)}
          >
            <Ionicons
              name={playingUri === item.audioUri ? 'pause-circle' : 'play-circle'}
              size={30}
              color="#555"
            />
            <Ionicons name="pulse" size={24} color="#555" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        ) : item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={{ width: 200, height: 200, borderRadius: 10 }} />
        ) : (
          <Text style={styles.messageText}>{item.text}</Text>
        )}

      </View>

      {isLongPressed && ( //判斷哪一個訊息是否處於「長按狀態」
        <View style={styles.floatingButtonContainer}>
          {/* 只對文字訊息顯示複製與 OOC */}
          {item.text && (
            <>
            <TouchableOpacity style={styles.floatingButton} onPress={() => onCopy(item.text)}>
            <Text style={styles.floatingButtonText}>複製</Text>
            </TouchableOpacity>
            <View style={styles.floatingDivider} />
            <TouchableOpacity style={styles.floatingButton} onPress={() => onOoc(item.text)}>
            <Text style={styles.floatingButtonText}>OOC</Text>
            </TouchableOpacity>
            <View style={styles.floatingDivider} />
            </>
          )}
          {/* 所有訊息（圖片、文字）都可以回覆與儲存 */}
          <TouchableOpacity style={styles.floatingButton} onPress={() => onReply(item)}>
          <Text style={styles.floatingButtonText}>回覆</Text>
          </TouchableOpacity>
          <View style={styles.floatingDivider} />
          <TouchableOpacity style={styles.floatingButton} onPress={() => onSave(item)}>
          <Text style={styles.floatingButtonText}>儲存</Text>
          </TouchableOpacity>
        </View>
      )}

      </Pressable>

    );
  };
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: 'height' })}
    >
      <TouchableWithoutFeedback onPress={() => {
        Keyboard.dismiss();
        setLongPressedMessageIndex(null);
      }}>
        <View style={styles.inner}>
          {/* 區塊 1：上方標題區 */}
          <View style={styles.header}>
            <Text style={{ fontSize: 20, fontWeight: '600' }}>金珉奎</Text>
          </View>

          <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          >
            <Text style={styles.backButtonText}>≪</Text>
          </TouchableOpacity>

          {/* 區塊 2：聊天訊息顯示區 */}
          <View style={{ flex: 1}}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(_, index) => index.toString()}
              contentContainerStyle={styles.chatContainer}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
          </View>

          {replyingTo && (
            <View style={styles.replyPreview}>
              <View style={styles.replyPreviewBar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.replyPreviewText} numberOfLines={1}>
                  {replyingTo.text
                    ? replyingTo.text.length > 10
                      ? replyingTo.text.slice(0, 10) + '...'
                      : replyingTo.text
                    : '[圖片]'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)}>
                <Ionicons name='close' size={20} color='#333' />
              </TouchableOpacity>
            </View>
          )}
          
          {/* 區塊 3：輸入欄區域 */}
          <SafeAreaView edges={['bottom']} style={styles.inputWrapper}>
            <View style={styles.inputContainer}>
              {/* 圖片按鈕（未來可接上傳圖片功能） */}
              <TouchableOpacity onPress={handlePickImage}>
                  <Ionicons name="image-outline" size={26} color="#555" />
              </TouchableOpacity>

              {/* 麥克風按鈕（可接語音輸入功能） */}
              <TouchableOpacity onPress={handleMicPress}>
                   <Ionicons name={isRecording ? 'stop' : 'mic-outline'} size={26} color="#555" />
              </TouchableOpacity>

            {/* 錄音中顯示錄音進度條與垃圾桶 */}
            {isRecording || recordedUri ? (
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1, height: 4, backgroundColor: '#ddd' }}>
                    <View style={{ width: `${(recordingProgress / 60) * 100}%`, height: 4, backgroundColor: '#4caf50' }} /></View>
                    <TouchableOpacity
                    onPress={() => recordedUri && setRecordedUri(null)}
                    disabled={!recordedUri || isRecording}
                    style={{ marginHorizontal: 10 }}
                    >
                        <Ionicons name="trash-outline" size={24} color={!recordedUri || isRecording ? '#ccc' : '#000'} />
                    </TouchableOpacity>
                </View>
            ) : (
                // 正常的輸入框 
                <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="輸入訊息"
                returnKeyType="send"
                onSubmitEditing={() => {
                  if (recordedUri) {
                    handleSendAudio();
                  } else {
                    handleSend();
                  }
                  Keyboard.dismiss();
                }}
                />
            )}

            {/* 傳送按鈕 */}
            <TouchableOpacity
            style={[styles.sendButton, !(input.trim() || recordedUri) && styles.sendButtonDisabled]}
            onPress={recordedUri ? handleSendAudio : handleSend}
            disabled={recordedUri ? false : !input.trim()}
            >
                <Ionicons name="send" size={24} color={recordedUri || input.trim() ? "#000" : "#aaa"} />
            </TouchableOpacity>
            
            </View>
          </SafeAreaView>

        </View>
        
      </TouchableWithoutFeedback>

      <Modal visible={saveModalVisible} transparent animationType="fade">
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#00000099' }}>
          <View style={{ margin: 20, backgroundColor: '#fff', padding: 20, borderRadius: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>選擇記憶類別</Text>

      {memoryCategories.map((cat) => (
        <TouchableOpacity
          key={cat.key}
          style={{
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: '#eee',
          }}

        onPress={() => {
          setSelectedCategory(cat.key);
          setSaveModalVisible(false);

          const now = new Date();
          const event = {
            key: Date.now().toString(),
            time: now.getTime(), // 儲存 timestamp
            date: `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`, // 顯示用
            chatContent: messageToSave,
          };
          
          // 找出 focus 的 index（確保是正確那一筆）
          const focusIndex = messages.findIndex(
            m =>
              m.text === messageToSave?.text &&
              m.time === messageToSave?.time &&
              m.sender === messageToSave?.sender
          );

          // 取得前 4 則 context（只取文字訊息）
          const contextMessages = messages.slice(Math.max(0, focusIndex - 4), focusIndex).filter(m => m.text);

          // 傳送給 Flask 後端的 API
          fetch('http://192.168.0.131:5000/generate_memory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              category: cat.title,                // 顯示用類別名稱：紀念日/事件/情緒
              focus: messageToSave.text,         // 長按儲存的那句話
              context: contextMessages.map(m => m.text), // 前四句
              character_name: "金珉奎"
            })
          })
            .then(async (res) => {
              const text = await res.text();
              try {
                const json = JSON.parse(text);
                console.log('✅ 標題產生成功：', json.title);

                const updatedEvent = {
                  ...event,
                  title: json.title,
                  focus: messageToSave.text,
                };

                navigation.navigate('MemoryDetail', {
                  title:
                    cat.key === 'anniversary'
                      ? '紀念日'
                      : cat.key === 'event'
                      ? '事件'
                      : '情緒',
                  icon:
                    cat.key === 'anniversary'
                      ? '❤️'
                      : cat.key === 'event'
                      ? '📅'
                      : '😄',
                  event: updatedEvent,
                  fromChat: true,
                });
              } catch (err) {
                console.error('❌ 回傳非 JSON，實際內容如下：');
                console.log(text);
              }
            })
            .catch(err => {
              console.error('❌ 記憶送出失敗', err);
            });
        }}
      >
            <Text style={{ fontSize: 16 }}>{cat.icon} {cat.title}</Text>
          </TouchableOpacity>
        ))}

            <TouchableOpacity
              style={{ marginTop: 15, alignSelf: 'flex-end' }}
              onPress={() => setSaveModalVisible(false)}
            >
              <Text style={{ color: '#666' }}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
  
    </KeyboardAvoidingView>
    
   
  );

}