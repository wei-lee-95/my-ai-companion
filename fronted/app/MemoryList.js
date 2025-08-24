import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { API_ENDPOINTS } from '../../fronted/apiConfig';  // 請確認路徑


export default function MemoryList() {
  const route = useRoute();
  const navigation = useNavigation();

  const { category_title, category_icon, character_id, category_id} = route.params || {};
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);

  //const [originalData] = useState([...data]); 
  //const [localData, setLocalData] = useState([...data].sort((a, b) => (b.time || 0) - (a.time || 0)));

  /*
  useFocusEffect(
    useCallback(() => {
      const deleteKey = route.params?.deleteKey;
      if (deleteKey) {
        const updated = originalData.filter(item => item.key !== deleteKey);
        setLocalData(updated);
        navigation.setParams({ deleteKey: null }); // ✅ 清掉以免重複刪除
      }
    }, [route.params?.deleteKey])
  );*/

  useEffect(() => {
    if (!character_id || !category_id) return;

    setLoading(true);
    fetch(`${API_ENDPOINTS.GET_MEMORY_DETAIL}?character_id=${character_id}&category_id=${category_id}`)
      .then(res => res.json())
      .then(json => {
        if (json.memories && Array.isArray(json.memories)) {
          // 從回傳記憶中擷取 memory_title 和 date 方便顯示
          // 這裡你也可以做排序或篩選
          setMemories(json.memories);
        } else {
          setMemories([]);
        }
      })
      .catch(err => {
        console.error('取得記憶詳情失敗', err);
        setMemories([]);
      })
      .finally(() => setLoading(false));
  }, [character_id, category_id]);

  return (
    <View style={styles.container}>
      {/* 🔸標題與返回鍵 */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>≪</Text>
        </TouchableOpacity>

        <View style={styles.titleWrapper}>
          <Text style={styles.pageTitle}>{category_icon} {category_title}</Text>
        </View>

        <View style={styles.backButtonPlaceholder} />
      </View>

      {/* 🔸列表 */}
      <View style={styles.listContainer}>
        <FlatList
          data={memories}
          keyExtractor={(item) => item.memory_id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                navigation.navigate('MemoryDetail', {
                  category_title:category_title,
                  icon:category_icon,
                  date: item.date,
                  memory_id: item.memory_id,
                });
              }}
            >
              <View style={styles.itemRow}>
                <Text style={styles.eventText}>{item.memory_title}</Text>
                <Text style={styles.dateText}>{item.date}</Text>
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#efe2d8',
    paddingTop: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 40,
  },
  titleWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  backButton: {
    backgroundColor: '#000',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 6,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 18,
    color: '#fcf7ef',
  },
  backButtonPlaceholder: {
    width: 40, // 確保標題置中對齊
  },

  listContainer: {
    marginTop: 40,
    paddingHorizontal: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  eventText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
    width: 120,
  },
  dateText: {
    marginLeft: 75,
    fontSize: 16,
    color: '#666',
  },
  separator: {
    height: 2,
    backgroundColor: '#faf2eb',
    marginHorizontal: 5,
  },
});
