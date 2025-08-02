// store/characterStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useCharacterStore = create(persist((set) => ({
  name: '',
  personality: '',
  chatHistory: [],
  stats: {},

  setName: (name) => set({ name }),
  setPersonality: (personality) => set({ personality }),
  setChatHistory: (chatHistory) => set({ chatHistory }),
  setStats: (stats) => set({ stats }),

  resetCharacter: () =>
    set({
      name: '',
      personality: '',
      chatHistory: [],
      stats: {},
    }),
}),
    {
        name: 'character-storage', // 存到 localStorage / AsyncStorage 的 key 名
        storage: AsyncStorage,
}));
