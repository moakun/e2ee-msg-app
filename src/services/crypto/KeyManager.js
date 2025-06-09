import * as SecureStore from 'expo-secure-store';
import { CryptoService } from './CryptoService';
import { Storage } from '../../utils/storage';

export class KeyManager {
  static KEY_PREFIX = 'key_';
  static USER_KEYS = 'user_keys';

  // Store user's key pair securely
  static async storeUserKeys(userId, publicKey, encryptedPrivateKey, derivedKey) {
    try {
      const keyData = {
        userId,
        publicKey,
        encryptedPrivateKey,
        createdAt: Date.now()
      };

      await SecureStore.setItemAsync(
        `${this.KEY_PREFIX}${userId}`,
        JSON.stringify(keyData)
      );

      await SecureStore.setItemAsync(
        `derived_key_${userId}`,
        derivedKey
      );

      return true;
    } catch (error) {
      console.error('Failed to store user keys:', error);
      return false;
    }
  }

  // Retrieve user's key pair
  static async getUserKeys(userId) {
    try {
      const keyData = await SecureStore.getItemAsync(`${this.KEY_PREFIX}${userId}`);
      if (!keyData) return null;

      return JSON.parse(keyData);
    } catch (error) {
      console.error('Failed to retrieve user keys:', error);
      return null;
    }
  }

  // Get derived key for decryption
  static async getDerivedKey(userId) {
    try {
      return await SecureStore.getItemAsync(`derived_key_${userId}`);
    } catch (error) {
      console.error('Failed to retrieve derived key:', error);
      return null;
    }
  }

  // Store contact's public key
  static async storeContactPublicKey(contactId, publicKey) {
    try {
      const contacts = await this.getStoredContacts();
      contacts[contactId] = {
        publicKey,
        storedAt: Date.now()
      };

      await Storage.set('contact_keys', contacts);
      return true;
    } catch (error) {
      console.error('Failed to store contact key:', error);
      return false;
    }
  }

  // Get contact's public key
  static async getContactPublicKey(contactId) {
    try {
      const contacts = await this.getStoredContacts();
      return contacts[contactId]?.publicKey || null;
    } catch (error) {
      console.error('Failed to get contact key:', error);
      return null;
    }
  }

  // Get all stored contacts
  static async getStoredContacts() {
    try {
      const contacts = await Storage.get('contact_keys');
      return contacts || {};
    } catch (error) {
      console.error('Failed to get stored contacts:', error);
      return {};
    }
  }

  // Generate and store new key pair for user
  static async generateAndStoreKeyPair(userId, password) {
    try {
      // Generate new key pair
      const keyPair = await CryptoService.generateKeyPair();
      
      // Generate salt and derive key from password
      const salt = await CryptoService.generateSalt();
      const derivedKey = await CryptoService.deriveKeyFromPassword(password, salt);
      
      // Encrypt private key with derived key
      const encryptedPrivateKey = await CryptoService.encryptWithAES(
        keyPair.privateKey,
        derivedKey
      );

      // Store keys securely
      await this.storeUserKeys(userId, keyPair.publicKey, encryptedPrivateKey, derivedKey);
      
      return {
        publicKey: keyPair.publicKey,
        salt
      };
    } catch (error) {
      console.error('Failed to generate and store key pair:', error);
      throw error;
    }
  }

  // Decrypt user's private key
  static async decryptPrivateKey(userId, password) {
    try {
      const keyData = await this.getUserKeys(userId);
      if (!keyData) throw new Error('User keys not found');

      const derivedKey = await this.getDerivedKey(userId);
      if (!derivedKey) throw new Error('Derived key not found');

      // Decrypt private key
      const privateKey = await CryptoService.decryptWithAES(
        keyData.encryptedPrivateKey,
        derivedKey
      );

      return privateKey;
    } catch (error) {
      console.error('Failed to decrypt private key:', error);
      throw error;
    }
  }

  // Update password (re-encrypt private key)
  static async updatePassword(userId, oldPassword, newPassword) {
    try {
      // Decrypt private key with old password
      const privateKey = await this.decryptPrivateKey(userId, oldPassword);
      
      // Generate new derived key with new password
      const salt = await CryptoService.generateSalt();
      const newDerivedKey = await CryptoService.deriveKeyFromPassword(newPassword, salt);
      
      // Re-encrypt private key with new derived key
      const newEncryptedPrivateKey = await CryptoService.encryptWithAES(
        privateKey,
        newDerivedKey
      );

      // Get existing key data
      const keyData = await this.getUserKeys(userId);
      
      // Update with new encrypted private key
      await this.storeUserKeys(
        userId,
        keyData.publicKey,
        newEncryptedPrivateKey,
        newDerivedKey
      );

      return true;
    } catch (error) {
      console.error('Failed to update password:', error);
      throw error;
    }
  }

  // Clear all user keys (for logout/account deletion)
  static async clearUserKeys(userId) {
    try {
      await SecureStore.deleteItemAsync(`${this.KEY_PREFIX}${userId}`);
      await SecureStore.deleteItemAsync(`derived_key_${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to clear user keys:', error);
      return false;
    }
  }

  // Export keys for backup (encrypted)
  static async exportUserKeys(userId, password) {
    try {
      const keyData = await this.getUserKeys(userId);
      if (!keyData) throw new Error('User keys not found');

      // Create export data
      const exportData = {
        userId,
        publicKey: keyData.publicKey,
        encryptedPrivateKey: keyData.encryptedPrivateKey,
        exportedAt: Date.now(),
        version: '1.0'
      };

      // Encrypt export data with password
      const salt = await CryptoService.generateSalt();
      const exportKey = await CryptoService.deriveKeyFromPassword(password, salt);
      const encryptedExport = await CryptoService.encryptWithAES(
        JSON.stringify(exportData),
        exportKey
      );

      return {
        encryptedData: encryptedExport,
        salt,
        version: '1.0'
      };
    } catch (error) {
      console.error('Failed to export user keys:', error);
      throw error;
    }
  }

  // Import keys from backup
  static async importUserKeys(encryptedBackup, password) {
    try {
      const { encryptedData, salt } = encryptedBackup;
      
      // Derive key from password
      const importKey = await CryptoService.deriveKeyFromPassword(password, salt);
      
      // Decrypt backup data
      const decryptedData = await CryptoService.decryptWithAES(encryptedData, importKey);
      const exportData = JSON.parse(decryptedData);
      
      // Store imported keys
      const derivedKey = await this.getDerivedKey(exportData.userId);
      await this.storeUserKeys(
        exportData.userId,
        exportData.publicKey,
        exportData.encryptedPrivateKey,
        derivedKey
      );

      return exportData.userId;
    } catch (error) {
      console.error('Failed to import user keys:', error);
      throw error;
    }
  }
}