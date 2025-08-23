import React, { useState, useEffect } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import characterImage from '../assets/character.png';
import { BASE_URL, API_ENDPOINTS } from '../../fronted/apiConfig';


export default function RoleList() {
  const [characters, setCharacters] = useState([{ id: 'add-button', isAddButton: true },]);
  const navigation = useNavigation();
  const route = useRoute();
  const [loading, setLoading] = useState(false);
  const isSingleItem = characters.length === 1;
  const { userId } = route.params; //從登入頁面route使用者id來rolelist

    useEffect(() => {
      // 初始化加號按鈕
      setCharacters([
        {
          id: 'add-button',
          isAddButton: true,
        },
      ]);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_ENDPOINTS.ROLELIST}?userId=${userId}`) 
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          const roles = json.roles.map((role) => ({
            id: role.character_id.toString(),
            imageUri: `${BASE_URL}/${role.full_body_image_path}`, // 完整圖片網址
            isAddButton: false,
          }));
          setCharacters((prev) => [prev.find((i) => i.isAddButton), ...roles]);
        } else {
          // 錯誤處理
          alert('取得角色資料失敗');
        }
      })
      .catch(() => alert('無法連接伺服器'))
      .finally(() => setLoading(false));
  }, []);


  const handleAddCharacter = () => {
    navigation.navigate('GenderRelationshipPicker',{ userId });
  };
  
  const handleDeleteCharacter = (id) => {
    Alert.alert(
      "刪除角色",
      "你確定要刪除這個角色嗎？",
      [
        { text: "取消", style: "cancel" },
        {
          text: "刪除",
          style: "destructive",
          onPress: () => {
            setCharacters((prev) => prev.filter((item) => item.id !== id && !item.isAddButton));
            // 保留加號按鈕
            const addButton = prev.find((item) => item.isAddButton);
            return [addButton, ...prev.filter((item) => item.id !== id && !item.isAddButton)];
          },
        },
      ]
    );
  };


  const renderItem = ({ item, index }) => {
    const isLeft = index % 2 === 0;
    const isSingleItem = characters.length === 1;

    const boxStyle = [
      styles.boxBase,
      {
        // 只有是左邊且不是單一項目時才加 marginRight
        marginRight: isLeft && !isSingleItem ? 40 : 0,
      },
    ];
    
    if (item.isAddButton) {
      return (
        <TouchableOpacity onPress={handleAddCharacter} style={boxStyle}>
          <Text style={styles.plus}>＋</Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={boxStyle}
        onPress={() => navigation.navigate('MainScreen', { characterId: item.id, userId })}
        onLongPress={() => handleDeleteCharacter(item.id)}
      >
        <Image source={{ uri: item.imageUri }} style={styles.characterImage} />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#a97c50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>≪</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>人物頁面</Text>
      </View>

      <FlatList
        data={characters}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={[
          styles.listContent,
          isSingleItem && { paddingLeft: 100 }, // 👈 這一行是關鍵
        ]}
      />
      {/* 底部提示字 */}
      <Text style={styles.footerHint}>長按角色卡片可刪除角色</Text>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#efe2d8',
    paddingTop: 65,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  backButton: {
    backgroundColor: '#000',
    borderRadius: 15,
    padding: 6,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 18,
    color: '#fcf7ef',
  },
  listContent: {
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingLeft: 40,
  },
  columnWrapper: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  boxBase: {
    width: 125,
    height: 125,
    borderRadius: 12,
    backgroundColor: '#a97c50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  plus: {
    fontSize: 80,
    lineHeight: 80,
    color: '#ffffff',
    textAlign: 'center',
  },
  characterImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  footerHint: {
    textAlign: 'center',
    fontSize: 15,
    color: '#666',
    marginBottom: 25,
  },

});
