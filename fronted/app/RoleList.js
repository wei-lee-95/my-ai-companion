import React, { useState, useEffect } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import characterImage from '../assets/character.png';

export default function RoleList() {
  const isSingleItem = (characters || []).length === 1;
  const [characters, setCharacters] = useState([]);
  const navigation = useNavigation();
  const route = useRoute();

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
    if (route.params?.characterData) {
      const { characterImageName } = route.params.characterData;

      let characterSource;
      switch (characterImageName) {
        case 'character.png':
          characterSource = characterImage;
          break;
        // 可擴展其他圖片
        default:
          characterSource = characterImage;
      }

      // 加在加號之後（右上）
      setCharacters((prev) => {
        const addButton = prev.find((item) => item.isAddButton);
        const others = prev.filter((item) => !item.isAddButton);
        const newCharacter = {
          id: Date.now().toString(),
          image: characterSource,
          isAddButton: false,
        };
        return [addButton, newCharacter, ...others];
      });
    }
  }, [route.params?.characterData]);

  const handleAddCharacter = () => {
    navigation.navigate('GenderRelationshipPicker');
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
      onPress={() => navigation.navigate('MainScreen')}
    >
      <Image source={item.image} style={styles.characterImage} />
    </TouchableOpacity>
  );
};

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
        ]}      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#efe2d8',
    paddingTop: 60,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    flex: 1,
    fontSize: 25,
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
});
