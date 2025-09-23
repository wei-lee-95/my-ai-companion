import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthScreen from './app/AuthScreen';
import RegisterScreen from './app/RegisterScreen';
import RoleList from './app/RoleList';
import GenderRelationshipPicker from './app/GenderRelationshipPicker';
import CreateCharacter from './app/CreateCharacter';
import MainScreen from './app/MainScreen';
import VideoScreen from './app/VideoScreen';
import VoiceSettingScreen from './app/VoiceSettingScreen';
import AppearanceSettingScreen from './app/AppearanceSettingScreen';
import ChatScreen from './app/ChatScreen';
import MemoryStoreScreen from './app/MemoryStoreScreen';
import MemoryList from './app/MemoryList';
import MemoryDetail from './app/MemoryDetail';
import { useEffect } from 'react';
import PhotoUploadScreen from './app/PhotoUploadScreen';
import SettingScreen from './app/SettingScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="AuthScreen">
        <Stack.Screen name="AuthScreen" component={AuthScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="RoleList" component={RoleList} options={{ headerShown: false }}/>
        <Stack.Screen name="GenderRelationshipPicker" component={GenderRelationshipPicker} options={{ headerShown: false }}/>
        <Stack.Screen name="CreateCharacter" component={CreateCharacter} options={{ headerShown: false }}/>
        <Stack.Screen name="VoiceSettingScreen" component={VoiceSettingScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="AppearanceSettingScreen" component={AppearanceSettingScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="MemoryStoreScreen" component={MemoryStoreScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="MainScreen" component={MainScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="ChatScreen" component={ChatScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="VideoScreen" component={VideoScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="PhotoUploadScreen" component={PhotoUploadScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="MemoryList" component={MemoryList} options={{ headerShown: false }}/>
        <Stack.Screen name="MemoryDetail" component={MemoryDetail} options={{ headerShown: false }}/>
        <Stack.Screen name="SettingScreen" component={SettingScreen} options={{ headerShown: false }}/>

      </Stack.Navigator>
    </NavigationContainer>
  );
}