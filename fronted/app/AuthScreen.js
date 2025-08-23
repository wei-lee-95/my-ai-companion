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

export default function AuthScreen() {
  const navigation = useNavigation();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    console.log('🔐 handleLogin called', { account, password: password ? '***' : 'empty' });
    
    if (!account || !password) {
      Alert.alert('請輸入帳號與密碼');
      return;
    }

    console.log('🌐 Making API call to login...');
    try {
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account: account,
          password: password
        })
      });

      const data = await response.json();
      console.log('📥 Login response:', { status: response.status, data });
      
      if (response.ok) {
        Alert.alert('登入成功', `歡迎回來，${data.user.username}！`);
        // 可以在這裡儲存用戶 ID 到 AsyncStorage
        // await AsyncStorage.setItem('userId', data.user_id.toString());
        navigation.navigate('RoleList',{ userId: data.user.id });
      } else {
        Alert.alert('登入失敗', data.error || '帳號或密碼錯誤');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      Alert.alert('錯誤', `無法連接伺服器: ${error.message}`);
    }
    navigation.navigate('RoleList');
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            /*showsVerticalScrollIndicator={false}*/
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.container}>
              <Text style={styles.title}>登入帳號</Text>
              <View style={styles.titleContainer}>
              <Text style={styles.subtitle}>歡迎來到最懂你的{'\n'}
                <Text style={styles.bold}>AI </Text>朋友創造平台
              </Text>
              </View>

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
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.button} onPress={handleRegister}>
                  <Text style={styles.buttonText}>註冊</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={handleLogin}>
                  <Text style={styles.buttonText}>登入</Text>
                </TouchableOpacity>
              </View>
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
    paddingBottom: 50,
  },
  container: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#F7E3D5',
    minHeight: '100%',
  },
  titleContainer: {
    flexDirection: 'row',
    marginTop: 40, // 減少頂部邊距
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 30,
    marginBottom: 20,
    color: '#333',
  },
  subtitle: {
    fontSize: 24,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 40,
    color: '#333',
  },
  bold: {
    fontWeight: 'bold',
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
    marginBottom: 15,
    fontSize: 16,
    color: '#333', // 明確設定文字顏色
    borderWidth: 1,
    borderColor: '#ddd', // 加入邊框
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 50, // 減少頂部邊距
    paddingHorizontal: 40,
  },
  button: {
    backgroundColor: '#444',
    paddingVertical: 19,
    paddingHorizontal: 30,
    borderRadius: 40,
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