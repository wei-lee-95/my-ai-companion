import React, { useState } from 'react';
import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation } from '@react-navigation/native';

export default function GenderRelationshipPicker() {
  const [gender, setGender] = useState('');
  const [relationship, setRelationship] = useState('');
  const [name, setName] = useState('');
  const navigation = useNavigation();
  const handleNext = () => {
    if (!gender || !relationship || !name) {
      Alert.alert('提醒', '請先完整選擇性別、關係及輸入名字');
      return;
    }

    const genderLabel = gender === 'female' ? '女性' : gender === 'male' ? '男性' : '非二元';
    const relationshipLabel = relationship === 'friend' ? '朋友' : '伴侶';

    navigation.navigate('CreateCharacter', {
      gender: genderLabel,
      relationship: relationshipLabel,
      name,
    }); 
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={{ alignItems: 'center' }}
        enableOnAndroid={true}
        extraScrollHeight={60}
        keyboardOpeningTime={Number.MAX_VALUE}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            今天想要創建什麼樣{'\n'}的角色呢？
          </Text>
        </View>

        {/* 性別選擇 */}
        <View style={styles.selectGroup}>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={gender}
              onValueChange={(itemValue) => setGender(itemValue)}
            >
              <Picker.Item label="請選擇性別" value="" />
              <Picker.Item label="女性" value="female" />
              <Picker.Item label="男性" value="male" />
              <Picker.Item label="非二元" value="nonbinary" />
            </Picker>
          </View>
        </View>

        {/* 關係選擇 */}
        <View style={styles.selectGroup}>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={relationship}
              onValueChange={(itemValue) => setRelationship(itemValue)}
            >
              <Picker.Item label="請選擇關係" value="" />
              <Picker.Item label="朋友" value="friend" />
              <Picker.Item label="伴侶" value="partner" />
            </Picker>
          </View>
        </View>

        {/* 名字輸入 */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.inputField}
            value={name}
            onChangeText={setName}
            placeholder="輸入名字"
            placeholderTextColor="#505050"
          />
        </View>

        {/* 按鈕列 */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleNext}>
            <Text style={styles.buttonText}>下一步</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => {
              setGender('');
              setRelationship('');
              setName('');
              navigation.goBack();
            }}
          >
            <Text style={styles.buttonText}>取消</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 0,
    paddingVertical: 24,
    paddingHorizontal: 25,
    backgroundColor: '#efe2d8',
  },
  titleContainer: {
    flexDirection: 'row',
    marginTop: 15,
    marginBottom: 40,
    backgroundColor: '#efe2d8',
  },
  title: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 2,
    lineHeight: 40,
    color: '#333',
  },
  selectGroup: {
    width: '80%',
    marginBottom: 40,
    alignItems: 'center',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#b8b8b8',
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 25,
    overflow: 'hidden',
  },
  picker: {
    backgroundColor: '#ececec',
  },
  inputRow: {
    height: 55,
    width: 205,
    marginBottom: 20,
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#b8b8b8',
    flex: 1,
    height: 48,
    marginHorizontal: 4,
    paddingHorizontal: 12,
    borderRadius: 23,
    backgroundColor: '#ececec',
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '70%',
    marginTop: 20,
    marginBottom: 30,
    gap: 30,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#aaa',
    marginRight: 16,
  },
  button: {
    width: 120,
    height: 50,
    backgroundColor: '#575853',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});