import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import characterImage from '../assets/character.png';
import Fontisto from '@expo/vector-icons/Fontisto';

export default function MainScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {/* 頂部積分與設定 */}
      <View style={styles.topBar}>
        <Text style={styles.points}>積分：35</Text>
        <TouchableOpacity>
          <Ionicons name="settings-outline" size={30} color="#555" />
        </TouchableOpacity>
      </View>

      {/* 角色圖片 */}
      <Image
        source={characterImage}
        style={styles.character}
      />

      {/* 左側功能按鈕：任務 */}
      <View style={styles.leftButtons}>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="list-outline" size={30} color="#555" />
        </TouchableOpacity>
      </View>

      {/* 右側功能按鈕 */}
      <View style={styles.sideButtons}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('MemoryStoreScreen')}>
          <Ionicons name="heart-outline" size={30} color="#555" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="help-circle-outline" size={30} color="#555" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.iconButton}
          onPress={() => navigation.navigate('Photo Upload')}>
          <Fontisto name="photograph" size={30} color="#555" />
        </TouchableOpacity>
      </View>

      {/* 底部功能列 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={() => navigation.navigate('RoleList')}>
          <View style={styles.circleButton}>
            <Ionicons name="person-circle-outline" size={35} color="#333" />
          </View>
          <Text style={styles.label}>角色</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <View style={styles.circleButton}>
            <Ionicons name="calendar-outline" size={35} color="#333" />
          </View>
          <Text style={styles.label}>行事曆</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ChatScreen')}>
          <View style={styles.circleButton}>
            <MaterialIcons name="chat-bubble-outline" size={35} color="#333" />
          </View>
          <Text style={styles.label}>聊天</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('VideoScreen')}>
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
    width: 300,
    height: 500,
    resizeMode: 'contain',
    marginTop: 40,
  },
  leftButtons: {
    position: 'absolute',
    left: 20,
    top: 150,
  },
  sideButtons: {
    position: 'absolute',
    right: 20,
    top: 150,
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
