import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { API_ENDPOINTS } from '../../fronted/apiConfig';

export default function RegisterScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = async () => {
    console.log('📝 handleRegister called', { name, age, account, password: password ? '***' : 'empty' });
    
    if (!name || !age || !account || !password || !confirmPassword) {
      Alert.alert('請填寫所有欄位');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('兩次輸入的密碼不一致');
      return;
    }
    if (isNaN(age) || age < 1 || age > 120) {
      Alert.alert('請輸入有效的年齡 (1-120)');
      return;
    }

    console.log('🌐 Making API call to register...');
    Alert.alert('註冊成功', '請返回登入畫面登入');
    navigation.goBack();
    // try {
    //   const response = await fetch(API_ENDPOINTS.REGISTER, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       name,
    //       age: parseInt(age),
    //       account,
    //       password
    //     })
    //   });

    //   const data = await response.json();
    //   console.log('📥 Register response:', { status: response.status, data });
      
    //   if (response.ok) {
    //     Alert.alert('註冊成功', '請返回登入畫面登入');
    //     navigation.goBack();
    //   } else {
    //     Alert.alert('註冊失敗', data.error || '請稍後再試');
    //   }
    // } catch (error) {
    //   console.error('❌ Register error:', error);
    //   Alert.alert('錯誤', `無法連接伺服器: ${error.message}`);
    // }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.container}>
              <Text style={styles.title}>註冊帳號</Text>
              <View style={styles.titleContainer}></View>

              <Text style={styles.label}>   姓名{'\n'}</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="請輸入姓名"
                placeholderTextColor="#999"
                returnKeyType="next"
              />

              <Text style={styles.label}>   年齡{'\n'}</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                placeholder="請輸入年齡"
                placeholderTextColor="#999"
                keyboardType="numeric"
                returnKeyType="next"
              />

              <Text style={styles.label}>   帳號{'\n'}</Text>
              <TextInput
                style={styles.input}
                value={account}
                onChangeText={setAccount}
                placeholder="請輸入帳號"
                placeholderTextColor="#999"
                autoCapitalize="none"
                returnKeyType="next"
              />

              <Text style={styles.label}>   密碼{'\n'}</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="請輸入密碼"
                placeholderTextColor="#999"
                secureTextEntry
                returnKeyType="next"
              />

              <Text style={styles.label}>   再次輸入密碼{'\n'}</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="請再次輸入密碼"
                placeholderTextColor="#999"
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />

              <TouchableOpacity style={styles.button} onPress={handleRegister}>
                <Text style={styles.buttonText}>完成註冊</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7E3D5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 50, // 額外底部空間
  },
  container: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#F7E3D5',
    minHeight: '100%', // 確保內容至少佔滿整個螢幕
  },
  titleContainer: {
    flexDirection: 'row',
    marginTop: 40, // 減少頂部邊距
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 30, // 減少頂部邊距
    color: '#333',
  },
  label: {
    alignSelf: 'flex-start',
    fontSize: 16,
    marginTop: 10,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    width: '100%',
    height: 45,
    backgroundColor: '#fff', // 改為白色背景
    borderRadius: 30,
    paddingHorizontal: 20,
    marginBottom: 20, // 減少間距
    fontSize: 16,
    color: '#333', // 明確設定文字顏色
    borderWidth: 1,
    borderColor: '#ddd', // 加入邊框讓輸入框更明顯
  },
  button: {
    backgroundColor: '#444',
    paddingVertical: 19,
    paddingHorizontal: 30,
    borderRadius: 40,
    marginTop: 30, // 減少頂部邊距
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});