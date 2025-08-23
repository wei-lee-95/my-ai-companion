import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function SettingsScreen() {
  const navigation = useNavigation();

  const handlePress = (action) => {
    console.log(`${action} pressed`);
    // 目前不做事，之後你可以加上彈窗 / API / 跳頁
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
        <Text style={styles.headerTitle}>設定</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => handlePress('edit-profile')}
        >
          <Text style={styles.optionText}>修改個人資料</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => handlePress('change-password')}
        >
          <Text style={styles.optionText}>修改帳號密碼</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionButton, styles.logoutButton]}
          onPress={() => handlePress('logout')}
        >
          <Text style={[styles.optionText, styles.logoutText]}>登出</Text>
        </TouchableOpacity>
      </View>
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
    fontSize: 23,
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
  content: {
    paddingHorizontal: 40,
    gap: 25,
  },
  optionButton: {
    backgroundColor: '#a97c50',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  optionText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#d9534f',
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
