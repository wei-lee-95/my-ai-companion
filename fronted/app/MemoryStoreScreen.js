import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, Dimensions,
  StyleSheet, TextInput, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BASE_URL, API_ENDPOINTS } from '../../fronted/apiConfig';

function formatDate(dateStr) {
  // 如果原本就長得像 '2025年7月29日'，直接回傳
  if (/^\d{4}年\d{1,2}月\d{1,2}日$/.test(dateStr)) return dateStr;

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '尚無紀錄';
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}年${month}月${day}日`;
}


export default function MemoryStoreScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { characterId, userId, name } = route.params; //from mainscreen
  const [dataByCategory, setDataByCategory] = useState({});
  const [latestMemoriesByCategory, setLatestMemoriesByCategory] = useState({});
  const [categories, setCategories] = useState([])
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. 拿分類
  useEffect(() => {
    if (!characterId) return;
    setLoading(true);

    fetch(`${API_ENDPOINTS.GET_MEMORY_CATEGORIES}?character_id=${characterId}`)
      .then(res => res.json())
      .then(json => {
        if (!json.categories) throw new Error("無法取得 categories");
        const cats = json.categories.map(item => ({
          key: item.id.toString(),
          id: item.id,
          title: item.category,
          icon: item.icon || '', // icon 直接用資料庫的 icon
        }));
        setCategories(cats);
      })
      .catch(err => {
        console.error('取得分類失敗', err);
      })
  }, [characterId]);


  // 拿每個分類的記憶詳情並找最大 memory_id
  useEffect(() => {
    if (categories.length === 0) return;

    setLoading(true);
    const fetchDetailsForCategories = async () => {
      const results = {};

      for (const cat of categories) {
        try {
          const res = await fetch(`${API_ENDPOINTS.GET_MEMORY_DETAIL}?character_id=${characterId}&category_id=${cat.id}`);
          const json = await res.json();
          if (json.memories && json.memories.length > 0) {
            // 找最大 memory_id
            const latestMemory = json.memories.reduce((maxMem, mem) =>
              mem.memory_id > maxMem.memory_id ? mem : maxMem
            );
            results[cat.id] = {
              memory_title: latestMemory.memory_title,
              date: latestMemory.date,
            };
          } else {
            results[cat.id] = null;
          }
        } catch (e) {
          console.error(`取得分類 ${cat.title} 記憶失敗`, e);
          results[cat.id] = null;
        }
      }
      setLatestMemoriesByCategory(results);
      setLoading(false);
    };

    fetchDetailsForCategories();
  }, [categories, characterId]);

 
  const handleNewCategory = async () => {
    if (!newTitle.trim() || !newIcon.trim()) return;
 
    try {
      const res = await fetch(`${API_ENDPOINTS.ADD_MEMORY_CATEGORY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: characterId,
          category: newTitle.trim(),
          icon: newIcon.trim(),
        }),
      });
      const data = await res.json();

      if (data.status === 'success') {
        const newId = data.category_id; // 後端回傳的數字 ID
        setCategories(prev => [...prev, {
          key: newId.toString(),
          id: newId, 
          title: newTitle.trim(),
          icon: newIcon.trim(),
        }]);
        setModalVisible(false);
        setNewTitle('');
        setNewIcon('');
      } else {
        alert('新增分類失敗: ' + (data.error || '未知錯誤'));
      }
    } catch (error) {
      console.error('新增分類錯誤', error);
      alert('新增分類發生錯誤，請稍後再試');
    }
  };

  const renderItem = ({ item }) => {
  const latestItem = latestMemoriesByCategory[item.id];

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate('MemoryList', {
            character_id: characterId,
            category_id: item.id,
            category_title: item.title,
            category_icon: item.icon,
          })
        }
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>{item.icon}</Text>
          <Text style={styles.cardTitle}>{item.title}</Text>
        </View>
        <Text style={styles.cardDate}>
          {latestItem
            ? `${latestItem.memory_title}｜${formatDate(latestItem.date)}`
            : '尚無紀錄'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>≪</Text>
        </TouchableOpacity>

        <View style={styles.titleWrapper}>
          <Text style={styles.title}>回憶小舖</Text>
        </View>

        <View style={styles.backButtonPlaceholder} />
      </View>

      <FlatList
        data={categories}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        numColumns={1}
        contentContainerStyle={styles.listContainer}
      />

      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.addButtonText}>+ 新增分類</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>新增分類</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="類別名稱"
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Emoji️❣️"
              value={newIcon}
              onChangeText={setNewIcon}
              maxLength={2}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setModalVisible(false);
                  setNewTitle('');
                  setNewIcon('');
                }}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSave}
                onPress={handleNewCategory}
              >
                <Text style={styles.modalSaveText}>儲存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#efe2d8', paddingTop: 30 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  listContainer: { paddingHorizontal: 16, paddingBottom: 20 },

  card: {
    backgroundColor: '#fcf7ef',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardIcon: {
    fontSize: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardDate: {
    fontSize: 14,
    color: '#666',
    marginLeft: 2,
  },

  addButton: {
    backgroundColor: '#8b6d5c',
    paddingVertical: 12,
    marginHorizontal: 20,
    borderRadius: 24,
    alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    width: '80%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    width: '90%',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalCancel: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    marginRight: 5,
    backgroundColor: '#ccc',
    borderRadius: 8,
  },
  modalSave: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    marginLeft: 5,
    backgroundColor: '#76584a',
    borderRadius: 8,
  },
  modalCancelText: { color: '#333', fontWeight: '600' },
  modalSaveText: { color: '#fff', fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 18,
    color: '#fcf7ef',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },

  titleWrapper: {
    flex: 1,
    alignItems: 'center',
  },

  backButton: {
    backgroundColor: '#000',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 6,
    elevation: 3,
    marginTop: -20, // ⭐️ 往上移動（你可以試 -5、-8、-10 看看效果）
  },

  backButtonPlaceholder: {
    width: 40, // 要跟返回按鈕寬度一致
  },

});
