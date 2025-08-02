import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RoleList from './RoleList';
import GenderRelationshipPicker from './GenderRelationshipPicker';
import CreateCharacter from './CreateCharacter';
import MainScreen from './MainScreen';
import VideoScreen from './VideoScreen';
import VoiceSettingScreen from './VoiceSettingScreen';
import appearanceSettingScreen from './appearanceSettingScreen';
import ChatScreen from './ChatScreen';
import { useEffect } from 'react';

const Stack = createNativeStackNavigator();

export default function App() {
  
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="RoleList">
        <Stack.Screen name="RoleList" component={RoleList} />
        <Stack.Screen name="GenderRelationshipPicker" component={GenderRelationshipPicker} />
        <Stack.Screen name="CreateCharacter" component={CreateCharacter} />
        <Stack.Screen name="VoiceSettingScreen" component={VoiceSettingScreen} />
        <Stack.Screen name="appearanceSettingScreen" component={appearanceSettingScreen} />

        <Stack.Screen name="MainScreen" component={MainScreen} />
        <Stack.Screen name="ChatScreen" component={ChatScreen} />
        <Stack.Screen name="VideoScreen" component={VideoScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}