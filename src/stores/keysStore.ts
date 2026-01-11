import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import type { MonokeyKey, KeySummary } from '../types/key';

interface KeysStore {
  keys: MonokeyKey[];
  isLoading: boolean;

  loadKeys: () => Promise<void>;
  addKey: (key: Omit<MonokeyKey, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'lastSyncedAt'>) => Promise<MonokeyKey>;
  updateKey: (id: string, updates: Partial<MonokeyKey>) => Promise<void>;
  deleteKey: (id: string) => Promise<void>;
  getKey: (id: string) => MonokeyKey | undefined;
}

const KEYS_STORAGE_KEY = 'monokey_keys';

export const useKeysStore = create<KeysStore>((set, get) => ({
  keys: [],
  isLoading: true,

  loadKeys: async () => {
    try {
      const stored = await AsyncStorage.getItem(KEYS_STORAGE_KEY);
      if (stored) {
        const keys = JSON.parse(stored) as MonokeyKey[];
        set({ keys, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load keys:', error);
      set({ isLoading: false });
    }
  },

  addKey: async (keyData) => {
    const now = new Date().toISOString();
    const newKey: MonokeyKey = {
      ...keyData,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      syncStatus: 'local-only',
      lastSyncedAt: null,
    };

    const updatedKeys = [...get().keys, newKey];
    await AsyncStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(updatedKeys));
    set({ keys: updatedKeys });

    return newKey;
  },

  updateKey: async (id, updates) => {
    const keys = get().keys.map(key =>
      key.id === id
        ? { ...key, ...updates, updatedAt: new Date().toISOString() }
        : key
    );

    await AsyncStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys));
    set({ keys });
  },

  deleteKey: async (id) => {
    const keys = get().keys.filter(key => key.id !== id);
    await AsyncStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys));
    set({ keys });
  },

  getKey: (id) => {
    return get().keys.find(key => key.id === id);
  },
}));
