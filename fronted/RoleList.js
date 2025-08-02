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

export default function RoleList() {
  const [characters, setCharacters] = useState([]);
  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    if (route.params?.characterData) {
      const { characterImageName } = route.params.characterData;

      let characterSource;
      switch (characterImageName) {
        case 'character.png':
          characterSource = require('./assets/character.png');
          break;
        // 可擴展其他圖片
        default:
          characterSource = require('./assets/character.png');
      }

      // 把新腳色加入 characters
      setCharacters((prev) => [
        {
          id: Date.now().toString(),
          image: characterSource,
        },
        ...prev,
      ]);
    }
  }, [route.params?.characterData]);

  const handleAddCharacter = () => {
    navigation.navigate('GenderRelationshipPicker');
  };
  
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.addBox}
      onPress={() => navigation.navigate('MainScreen')}
    >
      <Image source={item.image} style={styles.characterImage} />
    </TouchableOpacity>
  );
   
  return (
    <FlatList
      style={styles.container}
      data={characters}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={styles.columnWrapper}
      ListHeaderComponent={(
        <View style={styles.headerContainer}>
          
          <Text style={styles.headerTitle}>人物頁面</Text>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>≪</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleAddCharacter}
            style={styles.addBox}
          >
            <Text style={styles.plus}>＋</Text>
          </TouchableOpacity>
          
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 40,
    paddingVertical: 24,
    paddingHorizontal: 25,
    backgroundColor: '#efe2d8',
  },
  headerContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  characterImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  backButton: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#000',
    borderRadius: 15,
    padding: 6,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 18,
    color: '#fcf7ef',
  },
  addBox: {
    width: 120,
    height: 120,
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
});
