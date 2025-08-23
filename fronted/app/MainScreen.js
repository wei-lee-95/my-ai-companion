import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute} from '@react-navigation/native';
import { useState, useEffect } from 'react';
import characterImage from '../assets/character.png';
import Fontisto from '@expo/vector-icons/Fontisto';
import { BASE_URL, API_ENDPOINTS } from '../../fronted/apiConfig';


export default function MainScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { characterId, userId } = route.params; //從登入頁面route角色id進來
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');

  useEffect(() => {
 
    fetch(`${API_ENDPOINTS.GET_IMAGE}?characterId=${characterId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.roles.length > 0) {
          setImageUri(data.roles[0].full_body_image_path); // 後端回傳的相對路徑
          setName(data.roles[0].character_name);
          console.log('角色名稱:', data.roles[0].character_name);
        } else {
          console.warn(data.error || '沒有圖片');
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [characterId]);

  return (
    <View style={styles.container}>
      {/* 頂部積分與設定 */}
      <View style={styles.topBar}>
        {/* <Text style={styles.points}>積分：35</Text> */}
        <TouchableOpacity onPress={() => navigation.navigate('SettingScreen')} >
          <Ionicons name="settings-outline" size={30} color="#555" />
        </TouchableOpacity>
      </View>

      {/* 角色圖片 */}
      {loading ? (
        <ActivityIndicator size="large" color="#555" />
      ) : (
        imageUri && <Image source={{ uri: `${BASE_URL}/${imageUri}` }} style={styles.character} />
      )}

      {/* 左側功能按鈕：任務 */}

      {/* 右側功能按鈕 */}
      <View style={styles.sideButtons}>
        <TouchableOpacity 
          style={styles.iconButton}
          onPress={() => navigation.navigate('PhotoUploadScreen',{characterId, name} )}>          <Fontisto name="photograph" size={30} color="#555" />
        </TouchableOpacity>
      </View>

      {/* 底部功能列 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={() => navigation.navigate('RoleList', { userId })}>
          <View style={styles.circleButton}>
            <Ionicons name="person-circle-outline" size={35} color="#333" />
          </View>
          <Text style={styles.label}>角色</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('MemoryStoreScreen')}>
          <View style={styles.circleButton}>
            <Ionicons name="calendar-outline" size={35} color="#333" />
          </View>
          <Text style={styles.label}>回憶小舖</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ChatScreen', { characterId, userId, name })}>
          <View style={styles.circleButton}>
            <MaterialIcons name="chat-bubble-outline" size={35} color="#333" />
          </View>
          <Text style={styles.label}>聊天</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('VideoScreen',{ characterId, userId, name })}>
          <View style={styles.circleButton}>
            <Ionicons name="videocam-outline" size={35} color="#333" />
          </View>
          <Text style={styles.label}>視訊</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4DDD0', alignItems: 'center' },
  topBar: {
    marginTop: 65,
    width: '85%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  points: {
    fontSize: 18,
    backgroundColor: '#d6c6b8',
    padding: 8,
    borderRadius: 10,
  },
  character: {
    width: 375,
    height: 500,
    resizeMode: 'contain',
    marginTop: 70,
  },
  leftButtons: {
    position: 'absolute',
    left: 20,
    top: 150,
  },
  sideButtons: {
    position: 'absolute',
    right: 20,
    top: 100,
  },
  iconButton: {
    marginVertical: 10,
    backgroundColor: '#F8F4F0',
    padding: 10,
    borderRadius: 20,
    elevation: 3,
  },
  circleButton: {
    backgroundColor: '#D6C6B8',
    padding: 15,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 50,
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  label: {
    fontSize: 17,
    textAlign: 'center',
    marginTop: 10,
  },
});
