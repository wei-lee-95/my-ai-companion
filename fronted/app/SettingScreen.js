import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  ScrollView,
  Platform,
  Alert, 
  Image,
  BackHandler,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BASE_URL, API_ENDPOINTS } from '../../fronted/apiConfig';
import { useState, useEffect } from 'react';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId } = route.params;

  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (showEditModal) {
      fetch(`${API_ENDPOINTS.GET_PROFILE}?userId=${userId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setName(data.profile.username);
            setEmail(data.profile.email);
            setAge(data.profile.age.toString());
          } else {
            console.error(data.error);
          }
        })
        .catch(err => console.error(err));
    }
  }, [showEditModal]);

  const handleSaveProfile = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert("錯誤", "新密碼與確認密碼不一致");
      return; // ❌ 不要送 request
    }
    try {
      const response = await fetch(API_ENDPOINTS.SETTING_PROFILE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          age,
          email,
          password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("更新失敗", data.error || "發生錯誤");
        return;
      }

      Alert.alert("成功", "個人資料已更新");
      setShowEditModal(false);

    } catch (error) {
      console.log(error);
      Alert.alert("錯誤", "無法連接伺服器");
    }
  };

  const handleLogout = () => {
    console.log('使用者登出');
    setShowLogoutModal(false);
    navigation.replace('AuthScreen'); // 假設你有一個 Login 頁面
  };

  return (
    <View style={styles.container}>
      {/* Header */} 
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>≪</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>設定</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => setShowEditModal(true)}
        >
          <Text style={styles.optionText}>修改個人資料</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionButton, styles.logoutButton]}
          onPress={() => setShowLogoutModal(true)}
        >
          <Text style={[styles.optionText, styles.logoutText]}>登出</Text>
        </TouchableOpacity>
      </View>

      {/* 修改個人資料 Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>修改個人資料</Text>

            <TextInput style={styles.readonlyInput} placeholder="名字" value={name} editable={false} selectTextOnFocus={false}/>
            <TextInput style={styles.input} placeholder="年紀" value={age} onChangeText={setAge} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
            <TextInput style={styles.input} placeholder="新密碼" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
            <TextInput style={styles.input} placeholder="輸入第二次新密碼" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setShowEditModal(false)} style={[styles.modalButton, { backgroundColor: '#aaa' }]}>
                <Text style={styles.modalButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveProfile} style={[styles.modalButton, { backgroundColor: '#28a745' }]}>
                <Text style={styles.modalButtonText}>儲存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* 登出確認 Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>確認登出？</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setShowLogoutModal(false)} style={[styles.modalButton, { backgroundColor: '#aaa' }]}>
                <Text style={styles.modalButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout} style={[styles.modalButton, { backgroundColor: '#765958ff' }]}>
                <Text style={styles.modalButtonText}>確定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    zIndex: 10,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  readonlyInput: {
    color: '#848484ff', // 灰色文字
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    backgroundColor:'#edebebff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 8,
    padding: 12,
  },
  modalButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#755955ff',
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
