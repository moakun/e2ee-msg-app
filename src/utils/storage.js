// src/utils/storage.js - Fixed Version with Better Error Handling
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class Storage {
  // Secure storage for sensitive data with better error handling
  static async setSecure(key, value) {
    try {
      // Always store as string, but handle different value types
      let stringValue;
      if (typeof value === 'string') {
        stringValue = value;
      } else {
        stringValue = JSON.stringify(value);
      }
      
      await SecureStore.setItemAsync(key, stringValue);
      console.log(`✅ Secure storage set: ${key}`);
    } catch (error) {
      console.error(`❌ Secure storage set error for key "${key}":`, error);
      throw error;
    }
  }

  static async getSecure(key) {
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value === null || value === undefined) {
        return null;
      }

      // Try to parse as JSON first, if it fails, return as string
      try {
        return JSON.parse(value);
      } catch (parseError) {
        // If JSON parsing fails, return the raw string
        console.log(`ℹ️ Key "${key}" is not JSON, returning as string`);
        return value;
      }
    } catch (error) {
      console.error(`❌ Secure storage get error for key "${key}":`, error);
      return null;
    }
  }

  static async removeSecure(key) {
    try {
      await SecureStore.deleteItemAsync(key);
      console.log(`✅ Secure storage removed: ${key}`);
    } catch (error) {
      console.error(`❌ Secure storage remove error for key "${key}":`, error);
    }
  }

  // Get raw string from secure storage (no JSON parsing)
  static async getSecureString(key) {
    try {
      const value = await SecureStore.getItemAsync(key);
      return value; // Return as-is, no parsing
    } catch (error) {
      console.error(`❌ Secure storage get string error for key "${key}":`, error);
      return null;
    }
  }

  // Set raw string to secure storage
  static async setSecureString(key, value) {
    try {
      await SecureStore.setItemAsync(key, String(value));
      console.log(`✅ Secure storage set string: ${key}`);
    } catch (error) {
      console.error(`❌ Secure storage set string error for key "${key}":`, error);
      throw error;
    }
  }

  // Clear all secure storage (for debugging)
  static async clearAllSecure() {
    try {
      const keys = ['userData', 'authToken', 'derivedKey', 'biometricEnabled', 'appLocked'];
      for (const key of keys) {
        await SecureStore.deleteItemAsync(key);
      }
      console.log('✅ All secure storage cleared');
    } catch (error) {
      console.error('❌ Clear all secure storage error:', error);
    }
  }

  // Regular storage for non-sensitive data
  static async set(key, value) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`❌ Storage set error for key "${key}":`, error);
      throw error;
    }
  }

  static async get(key) {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`❌ Storage get error for key "${key}":`, error);
      return null;
    }
  }

  static async remove(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`❌ Storage remove error for key "${key}":`, error);
    }
  }

  static async clear() {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('❌ Storage clear error:', error);
    }
  }
}