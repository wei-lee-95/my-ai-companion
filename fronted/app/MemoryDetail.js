// 細項detail的UI
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  ScrollView,
  Platform,
  Alert, 
  Image,
  BackHandler,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { BASE_URL, API_ENDPOINTS } from '../../fronted/apiConfig';

export default function MemoryDetail() {
  
  const navigation = useNavigation();
  const route = useRoute();
  const params = route?.params ?? {};
  const { 
    category_title, 
    icon, 
    fromChat,
    memory_id, 
    pre_mood, 
    pre_location, 
    pre_time_of_day ,
    chatContent,
    memory_title,
    date,
  } = params;

  const [memoryTitle, setMemoryTitle] = useState(memory_title);
  const [editedMemoryTitle, setEditedMemoryTitle] = useState(memory_title);

  const [timePeriod, setTimePeriod] = useState('上午');
  const [editedTimePeriod, setEditedTimePeriod] = useState('中午');

  const [hour, setHour] = useState('12');
  const [editedHour, setEditedHour] = useState('12');

  const [place, setPlace] = useState(pre_location);
  const [editedPlace, setEditedPlace] = useState(pre_location);

  const [mood, setMood] = useState(pre_mood);
  const [editedMood, setEditedMood] = useState(pre_mood);

  const [content, setContent] = useState(chatContent);

  const [showTimePeriodMenu, setShowTimePeriodMenu] = useState(false);
  const [showHourMenu, setShowHourMenu] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [sound, setSound] = useState(null);
  const [playing, setPlaying] = useState(false);

  const fullTime = `${timePeriod} ${hour}點`;
  
  console.log(category_title, icon, fromChat, memory_id, pre_mood, pre_location, pre_time_of_day, chatContent, memory_title,)

  // --- 撈資料用的 useEffect ---
  useEffect(() => {
    // 只有不是 fromChat，且有 memory_id 才呼叫 API 取得完整資料
    if (fromChat) {
      // 從聊天頁來的，直接用 route 參數的資料
      // 但如果有 pre_time_of_day，轉上午下午時間
      if (pre_time_of_day) {
        const { period, h } = convertTimeOfDay(pre_time_of_day);
        setTimePeriod(period);
        setEditedTimePeriod(period);
        setHour(h.toString());
        setEditedHour(h.toString());
      }
      return;
    }

    if (!memory_id) {
      console.warn('MemoryDetail: 缺少 memory_id，無法取得詳細資料');
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_ENDPOINTS.GET_SINGLE_MEMORY}?memory_id=${memory_id}`);
        if (!res.ok) {
          console.error('後端回傳錯誤', res.status);
          return;
        }
        const json = await res.json();
        if (json.error) {
          console.error('後端錯誤訊息', json.error);
          return;
        }
        const mem = json.memory;
        if (!mem) {
          console.warn('找不到回憶資料');
          return;
        }

        // 設定狀態
        setMemoryTitle(mem.title || '');
        setEditedMemoryTitle(mem.title || '');

        setPlace(mem.location || '');
        setEditedPlace(mem.location || '');

        setMood(mem.mood || '');
        setEditedMood(mem.mood || '');

        setContent(mem.content || '');
        console.log("將",mem.content,"存入")

        if (mem.time_of_day) {
          const { period, h } = convertTimeOfDay(mem.time_of_day);
          setTimePeriod(period);
          setEditedTimePeriod(period);
          setHour(h.toString());
          setEditedHour(h.toString());
        }
      } catch (err) {
        console.error('讀取單項回憶失敗:', err);
      }
    })();
  }, [fromChat, memory_id]);

  // time_of_day (24小時字串) 轉 上午/下午 與 12小時制小時數
  function convertTimeOfDay(timeStr) {
    let h = parseInt(timeStr, 10);
    const period = h >= 12 ? '下午' : '上午';
    h = h % 12;
    if (h === 0) h = 12;
    return { period, h };
  }


  const handleDelete = async () => {
    setConfirmDeleteVisible(false);

    try {
      const res = await fetch(`${API_ENDPOINTS.DELETE_MEMORY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memory_id: memory_id }), // 你有帶 memory_id
      });

      const json = await res.json();

      if (res.ok && json.status === 'success') {
        alert('成功', '刪除成功', [
          {
            text: '確定',
            onPress: () => {
              if (fromChat) {
                navigation.goBack();
              } else {
                navigation.goBack();
              }
            },
          },
        ]);
      } else {
        alert('刪除失敗，請稍後再試');
      }
    } catch (error) {
      console.error('刪除錯誤:', error);
      alert('刪除失敗，請檢查網路');
    }
  };

  const playAudio = async (uri) => {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setPlaying(false);
        return;
      }

      const { sound: newSound } = await Audio.Sound.createAsync({ uri });
      setSound(newSound);
      setPlaying(true);
      await newSound.playAsync();

      newSound.han((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          setPlaying(false);
          newSound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('語音播放失敗', error);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`${API_ENDPOINTS.UPDATE_MEMORY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memory_id: memory_id, // 從 params 傳來的記憶 ID
          new_title: editedMemoryTitle,
          new_location: editedPlace,
          new_time: editedTimePeriod === '上午' ? editedHour : (parseInt(editedHour) + 12).toString(),  // 簡單把下午換成24小時制
          new_mood: editedMood,
        }),
      });

      const json = await res.json();

      if (res.ok && json.status === 'success') {
        // API 更新成功後，更新本地狀態
        setMemoryTitle(editedMemoryTitle);
        setTimePeriod(editedTimePeriod);
        setHour(editedHour);
        setPlace(editedPlace);
        setMood(editedMood);
        setModalVisible(false);
        alert('記憶更新成功');
      } else {
        alert('更新失敗，請稍後再試');
      }
    } catch (error) {
      console.error('更新錯誤:', error);
      alert('更新失敗，請檢查網路連線');
    }
  };

  const handleBack = () => {
    if (fromChat) {
      navigation.navigate('ChatScreen', { characterId, userId, name });
    } else {
      navigation.goBack();
    }
  };

  function renderDetailRow(label, value) {
    const isEmpty = !value;
    const valueStyle = isEmpty ? styles.placeholder : styles.value;
    return (
      <>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{label}</Text>
          <Text style={valueStyle}>{value || '未填寫'}</Text>
        </View>
        <View style={styles.divider} />
      </>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>≪</Text>
        </TouchableOpacity>

        <View style={styles.backButtonPlaceholder} />
      </View>
      
      <Text style={styles.date}>{category_title}</Text>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.date}>{date}</Text>
      <Text style={styles.event}>{memoryTitle}</Text>


    <View style={styles.chatContainer}>
      {content?.imageUri ? (
        <Image source={{ uri: content.imageUri }} style={{ width: 200, height: 200, borderRadius: 10 }} />
      ) : content?.audioUri ? (
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center' }}
          onPress={() => playAudio(chatContent.audioUri)}
        >
          <Ionicons
            name={playing ? 'pause-circle' : 'play-circle'}
            size={30}
            color="#555"
          />
          <Ionicons name="pulse" size={24} color="#555" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      ) : (
        <Text>{content?.text || content || '（無內容）'}</Text>
      )}
      <View style={styles.triangleShadow} />
      <View style={styles.triangle} />
    </View>

      <View style={styles.detailContainer}>
        {renderDetailRow('🕛 時刻', fullTime)}
        {renderDetailRow('📍 地點', place)}
        {renderDetailRow('😊 心情', mood)}
      </View>

      <TouchableOpacity style={styles.editButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.editButtonText}>編輯</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => setConfirmDeleteVisible(true)}
      >
        <Text style={styles.deleteButtonText}>刪除</Text>
      </TouchableOpacity>

      <Modal visible={confirmDeleteVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>確定要刪除這個事件嗎？</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setConfirmDeleteVisible(false)}
              >
                <Text>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleDelete}>
                <Text style={{ color: '#fff' }}>刪除</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>修改內容</Text>

            <TextInput
              style={styles.input}
              placeholder="事件"
              value={editedMemoryTitle}
              onChangeText={setEditedMemoryTitle}
            />

            <View style={styles.dropdownRow}>
              <TouchableOpacity
                style={styles.dropdownBox}
                onPress={() => {
                  setShowTimePeriodMenu(!showTimePeriodMenu);
                  setShowHourMenu(false);
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text>{editedTimePeriod}</Text>
                  <Ionicons name="chevron-down-outline" size={18} color="#555" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownBox}
                onPress={() => {
                  setShowHourMenu(!showHourMenu);
                  setShowTimePeriodMenu(false);
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text>{editedHour}點</Text>
                  <Ionicons name="chevron-down-outline" size={18} color="#555" />
                </View>
              </TouchableOpacity>
            </View>

            {/* ✅ 放在這裡：時段選單 */}
            {showTimePeriodMenu && (
              <View style={styles.menuBox}>
                {['上午', '下午'].map((item) => (
                  <TouchableOpacity
                    key={item}
                    onPress={() => {
                      setEditedTimePeriod(item);
                      setShowTimePeriodMenu(false);
                    }}
                    style={styles.menuItem}
                  >
                    <Text>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ✅ 放在這裡：小時選單 */}
            {showHourMenu && (
              <View style={styles.menuBox}>
                {Array.from({ length: 12 }, (_, i) => (i + 1).toString()).map((item) => (
                  <TouchableOpacity
                    key={item}
                    onPress={() => {
                      setEditedHour(item);
                      setShowHourMenu(false);
                    }}
                    style={styles.menuItem}
                  >
                    <Text>{item}點</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TextInput
              style={styles.input}
              placeholder="地點"
              value={editedPlace}
              onChangeText={setEditedPlace}
            />

            <TextInput
              style={styles.input}
              placeholder="心情"
              value={editedMood}
              onChangeText={setEditedMood}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                <Text>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSave}>
                <Text style={{ color: '#fff' }}>儲存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#efe2d8' },
  icon: { fontSize: 40, textAlign: 'center', marginTop: 5 },
  date: { fontSize: 16, textAlign: 'center', marginTop: 5 },
  event: { 
    fontSize: 20, 
    textAlign: 'center', 
    marginTop: 10, 
    marginBottom: 20,
    fontWeight: 'bold',
  },
  chatContainer: {
    backgroundColor: '#eee',
    borderRadius: 8,
    padding: 8,
    marginBottom: 20,
    position: 'relative',
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: 'rgba(0,0,0,0.1)',
  },
    deleteButton: {
    backgroundColor: '#c44',
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 20,
    marginBottom: 40,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  triangleShadow: {
    position: 'absolute',
    bottom: -24,
    left: 35,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 15,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(0,0,0,0.1)',
    zIndex: -1,
  },
  triangle: {
    position: 'absolute',
    bottom: -23,
    left: 30,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 15,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#eee',
  },
  detailContainer: {
    marginHorizontal: 10,
    marginBottom: 20,
    borderTopWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  detailLabel: { fontSize: 16, color: '#333' },
  value: { fontSize: 16, color: '#000' },
  placeholder: { fontSize: 14, color: '#999', fontStyle: 'italic' },
  divider: { height: 1, backgroundColor: '#ccc', marginVertical: 5 },
  editButton: {
    backgroundColor: '#555',
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 20,
    marginBottom: 20,
  },
  editButtonText: { color: '#fff', fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#00000099',
    padding: 20,
  },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 15,
  },
  row: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  picker: { flex: 1, height: 60, marginHorizontal: 5 },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalCancel: {
    padding: 10,
    backgroundColor: '#eee',
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginRight: 5,
  },
  modalSave: {
    padding: 10,
    backgroundColor: '#76584a',
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginLeft: 5,
  },
  backButton: {
    backgroundColor: '#000',
    borderRadius: 15,
    padding: 6,
    elevation: 3,
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 18,
    color: '#fcf7ef',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 50,
    marginBottom: 5,
    paddingHorizontal: 10,
  },
  titleWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  dropdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dropdownBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 5,
    backgroundColor: '#fff',
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999, // 提高層級
  },
  menuBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 200,
    paddingVertical: 10,
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
    generatedTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  focusSentence: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
    color: '#666',
  },

});
