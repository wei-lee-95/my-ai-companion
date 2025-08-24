//聊天頁面的UI //鍵盤輸入、回覆好像有個text沒有包到<text> //created_at的時間很怪
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { useRef, useState, useEffect } from 'react';
import { useNavigation, useRoute} from '@react-navigation/native';
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
import { BASE_URL, API_ENDPOINTS } from '../../fronted/apiConfig';

export default function ChatScreen() {
  const route = useRoute();
  const { characterId, userId, name } = route.params; //從mainscreen來的

  const [messages, setMessages] = useState([]);
  const [avatarUri, setAvatarUri] = useState(null);
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
  //const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [memoryCategories, setMemoryCategories] = useState([]);

  const [oocModalVisible, setOocModalVisible] = useState(false);
  const [oocInput, setOocInput] = useState('');  // 用來存 OOC 輸入內容


  useEffect(() => {
    async function fetchAvatar() {
      try {
        const res = await fetch(`${API_ENDPOINTS.GET_IMAGE}?characterId=${characterId}`);
        const data = await res.json();
        if (data.success && data.roles && data.roles.length > 0) {
          setAvatarUri(data.roles[0].avatar_image_path);
          console.log('大頭貼路徑:', data.roles[0].avatar_image_path);
        } else {
          console.warn('找不到 avatar 圖片或後端錯誤', data);
        }
      } catch (error) {
        console.error('抓 avatar 圖片失敗', error);
      }
    }
    fetchAvatar();
  }, [characterId]);

  useEffect(() => {
    if (!characterId) return;

    setLoading(true);
    fetch(`${API_ENDPOINTS.GET_MEMORY_CATEGORIES}?character_id=${characterId}`)
      .then(res => res.json())
      .then(json => {
        const cats = json.categories.map(item => ({
          key: item.id,  // key 直接用 category 名稱
          title: item.category,
          icon: item.icon || '', // icon 直接用資料庫的 icon
        }));
        setMemoryCategories(cats);
      })
      .catch(err => {
        console.error('取得分類失敗', err);
      })
  }, [characterId]);

  
  const handleSend = () => {
    if (!input.trim()) return;

    // 1. 先建立使用者訊息物件 (尚無 id)
    const newMessage = {
      sender: 'user',
      text: input,
      time: Date.now(),
      replyTo: replyingTo ?? undefined,
    };

    // 2. 先在前端顯示使用者訊息 (尚無 id)
    setMessages(prev => [...prev, newMessage]);

    setInput('');
    setReplyingTo(null);

    // 3. 發送到後端
    fetch(API_ENDPOINTS.CHAT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: input,
        character_id: characterId,
        user_id: userId,
        name: name,
      }),
    })
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`伺服器錯誤：${res.status} ${text}`);
        } 
        return res.json();
      })
      .then(data => {
        if (!data.reply || !data.saved_messages) {
          throw new Error('回應格式錯誤，缺少 reply 或 saved_messages');
        }


        // 後端回傳的 saved_messages 中會有剛剛 user 跟 assistant 的訊息和各自的 id
        // 先找出 user 訊息與 assistant 回覆
        const savedUserMsg = data.saved_messages.find(m => m.role === 'user' && m.content === input);
        const savedBotMsg = data.saved_messages.find(m => m.role === 'assistant' && m.content === data.reply);

        // 4. 更新 messages 狀態，把對應訊息加上 id
        setMessages(prev => {
          // 把原本的訊息陣列中，替換最後兩筆訊息（剛剛推進的 user 與 bot）
          const newMsgs = [...prev];

          // user 訊息一般在倒數第二筆 (你剛加入)
          const userIndex = newMsgs.findIndex(m => m.sender === 'user' && m.text === input);
          if (userIndex !== -1 && savedUserMsg) {
            newMsgs[userIndex] = { ...newMsgs[userIndex], id: savedUserMsg.id };
          }

          // 加入 assistant 訊息
          newMsgs.push({
            sender: 'bot',
            text: data.reply,
            time: Date.now(),
            id: savedBotMsg ? savedBotMsg.id : undefined,
          });

          return newMsgs;
        });
      })
      .catch(err => {
        console.error('發送訊息失敗:', err);
      });
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
        const response = await fetch(API_ENDPOINTS.CHAT_IMAGE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            image_base64: base64WithMime,
            character_id: characterId,
            user_id: userId,
            name: name,
          }),
        });
        const data = await response.json();

        if (response.ok && data.saved_messages) {
          setMessages(prev => {
            const newMsgs = [...prev];

            // 找剛剛 user 圖片訊息 index（用 imageUri 辨識）
            const idx = newMsgs.findIndex(m => m.sender === 'user' && m.imageUri === imageUri);

            if (idx !== -1) {
              // 找 user 圖片訊息的 saved_message id (這裡假設 content 是 '[圖片訊息]' 或其他可辨識字串)
              const userMsgId = data.saved_messages.find(
                m => m.role === 'user' && m.content === '[圖片訊息]'
              )?.id;

              if (userMsgId) {
                newMsgs[idx] = { ...newMsgs[idx], id: userMsgId };
              }
            }
            // 加入 bot 回覆，也帶 id
            const botMsg = data.saved_messages.find(m => m.role === 'assistant');
            newMsgs.push({
              sender: 'bot',
              text: data.reply,
              time: Date.now(),
              id: botMsg ? botMsg.id : undefined,
            });

            return newMsgs;
          });
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

    // **這裡新增你要傳給後端的欄位**
    formData.append('character_id', characterId);   // 你要確保這些變數有定義
    formData.append('user_id', userId);
    formData.append('name', name);

    try {
      const response = await fetch(API_ENDPOINTS.CHAT_VOCAL, {
        method: 'POST',
        body: formData,
        headers:{}
      });

      const data = await response.json();

      if (response.ok && data.saved_messages) {
        setMessages(prev => {
          
          const newMsgs = [...prev];

          // 找 user 語音訊息 index（用 audioUri 辨識）
          const idx = newMsgs.findIndex(m => m.sender === 'user' && m.audioUri === recordedUri);
          
          if (idx !== -1) {
            // 找 user 語音訊息的 saved_message id
            const userMsgId = data.saved_messages.find(
              m => m.role === 'user' && m.content === '[語音訊息]'
            )?.id;
            if (userMsgId) {
              newMsgs[idx] = { ...newMsgs[idx], id: userMsgId };
            }
          }
          // 加入 bot 回覆，也帶 id
          const botMsg = data.saved_messages.find(m => m.role === 'assistant');
          newMsgs.push({
            sender: 'bot',
            text: data.reply,
            time: Date.now(),
            id: botMsg ? botMsg.id : undefined,
          });
          
          return newMsgs;
        });
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

  const handleSelectMemoryCategory = (cat) => {
    setSelectedCategory(cat.key);
    setSaveModalVisible(false);
    
    // 用 id 找出 focus 的 index
    const focusIndex = messages.findIndex(m => m.id === messageToSave.id);

    // 取得前 4 則 context（只取文字訊息）
    const contextMessages = messages
      .slice(Math.max(0, focusIndex - 4), focusIndex)
      .filter(m => m.text);

    // 傳送給 Flask 後端的 API
    fetch(API_ENDPOINTS.GENERATE_MEMORY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category_id: cat.key,                        
        focus: messageToSave.text,                  
        context: contextMessages.map(m => m.text),  
        character_id: characterId,                  
        name: name,                                 
        category: cat.title,                        
        focus_message_id: messageToSave.id,         
        user_id: userId
      })
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText);
        }
        const json = await res.json();
        console.log('✅ 標題產生成功：', json.title);

        navigation.navigate('MemoryDetail', {
          category_title: cat.title,
          icon: cat.icon,
          fromChat: true,
          memory_id: json.memory_id,
          pre_mood: json.mood,
          pre_location: json.location,
          pre_time_of_day: json.time_of_day,
          chatContent: messageToSave,
          memory_title: json.title,
          date: json.date,
        });
      })
      .catch(err => {
        console.error('❌ 記憶送出失敗', err);
      });
  };

  const handleSendOoc = async () => {
    if (!messageToSave || !oocInput.trim()) {
      Alert.alert("提醒", "請輸入修改內容");
      return;
    }

    // 關閉 modal
    setOocModalVisible(false);

    try {
      const res = await fetch(API_ENDPOINTS.OOC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_id: messageToSave.id,  // 使用者長按的訊息 ID
          ooc_text: oocInput,            // 使用者輸入的文字
          character_id: characterId,
          user_id: userId
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }

      const json = await res.json();
      console.log("✅ OOC 校正送出成功:", json);

      // 可選：將修改的文字直接更新到前端訊息列表
      setMessages(prev => prev.map(m => 
        m.id === messageToSave.id ? { ...m, text: oocInput } : m
      ));

      setOocInput(""); // 清空輸入框

    } catch (err) {
      console.error("❌ OOC 校正失敗", err);
      Alert.alert("錯誤", "OOC 校正送出失敗");
    }
  };
  
  // 功能按鈕行為（你可以改成你要的邏輯）
  const onCopy = (text) => {
    Clipboard.setString(text);
    setLongPressedMessageIndex(null);
  };
  const onOoc = (msg) => {
    console.log('OOC', msg);
    setLongPressedMessageIndex(null);
    setOocModalVisible(true);  // 顯示 modal
    setOocInput('');           // 清空輸入框
    setMessageToSave(msg);
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
          avatarUri ? (
            <Image source={{ uri: `${BASE_URL}/${avatarUri}` }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: '#ccc' }]} />
          )
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
            <TouchableOpacity style={styles.floatingButton} onPress={() => onOoc(item)}>
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
            <Text style={{ fontSize: 20, fontWeight: '600' }}>{name}</Text>
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
        <View style={styles.modalbackground}>
          <View style={styles.modalinfo}>
            <Text style={styles.modaltitle}>選擇記憶類別</Text>

      {memoryCategories.map((cat) => (
        <TouchableOpacity
          key={cat.title}
          style={{
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: '#eee',
          }}
          onPress={() => handleSelectMemoryCategory(cat)}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {cat.iconComponent && <cat.iconComponent />}
              <Text style={{ fontSize: 16, marginLeft: 4 }}>{cat.title}</Text>
            </View>
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

      <Modal visible={oocModalVisible} transparent animationType="fade">
        <View style={styles.modalbackground}>
          <View style={styles.modalinfo}>
            <Text style={styles.modaltitle}> 修正回覆 </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 8,
                padding: 10,
                fontSize: 16,
                color: '#333',
              }}
              placeholder="我希望的回覆內容是..."
              placeholderTextColor="#aaa"  // 淺灰色
              value={oocInput}
              onChangeText={setOocInput}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15 }}>
              <TouchableOpacity onPress={() => setOocModalVisible(false)} style={{ marginRight: 15 }}>
                <Text style={{ color: '#c28261ff', fontSize: 16 }}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSendOoc} >
                <Text style={{ color: '#4f3723ff', fontSize: 16 }}>送出</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
  
    </KeyboardAvoidingView>
    
   
  );

}