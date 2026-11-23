import AsyncStorage from "@react-native-async-storage/async-storage";

export interface KV {
  get(k: string): Promise<string | null>;
  set(k: string, v: string): Promise<void>;
}

export const asyncStorageKV: KV = {
  get: async (k: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(k);
    } catch (e) {
      console.warn("AsyncStorage get error:", e);
      return null;
    }
  },
  set: async (k: string, v: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(k, v);
    } catch (e) {
      console.warn("AsyncStorage set error:", e);
    }
  },
};
