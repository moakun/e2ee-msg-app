// src/services/crypto/CryptoService.js
import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';
import { Buffer } from 'buffer';

class CryptoServiceClass {
  // Generate a simple key pair (simplified for demo - use proper RSA library in production)
  async generateKeyPair() {
    try {
      // For demo purposes, we'll use a simplified approach
      // In production, use react-native-rsa-native or similar
      const keyId = await Crypto.getRandomBytesAsync(32);
      const publicKey = Buffer.from(keyId).toString('hex') + '_public';
      const privateKey = Buffer.from(keyId).toString('hex') + '_private';
      
      return {
        publicKey,
        privateKey
      };
    } catch (error) {
      console.error('Key generation failed:', error);
      throw error;
    }
  }

  // Encrypt message content using AES (simplified)
  async encryptMessage(message, recipientPublicKey) {
    try {
      // Generate AES key for this message
      const aesKey = await this.generateAESKey();
      
      // Encrypt message with AES
      const encryptedMessage = this.encryptWithAES(message, aesKey);
      
      // For demo, we'll just base64 encode the key (NOT SECURE)
      // In production, encrypt with recipient's RSA public key
      const encryptedAESKey = Buffer.from(aesKey).toString('base64');
      
      return {
        encryptedContent: encryptedMessage,
        encryptedKey: encryptedAESKey
      };
    } catch (error) {
      console.error('Message encryption failed:', error);
      throw error;
    }
  }

  // Decrypt message content
  async decryptMessage(encryptedData, privateKey) {
    try {
      const { encryptedContent, encryptedKey } = encryptedData;
      
      // For demo, decode the key (NOT SECURE)
      // In production, decrypt with user's RSA private key
      const aesKey = Buffer.from(encryptedKey, 'base64').toString();
      
      // Decrypt message with AES key
      const decryptedMessage = this.decryptWithAES(encryptedContent, aesKey);
      
      return decryptedMessage;
    } catch (error) {
      console.error('Message decryption failed:', error);
      throw error;
    }
  }

  // Generate AES key
  async generateAESKey() {
    const key = await Crypto.getRandomBytesAsync(32); // 256-bit key
    return Buffer.from(key).toString('hex');
  }

  // AES encryption using CryptoJS
  encryptWithAES(data, key) {
    try {
      const encrypted = CryptoJS.AES.encrypt(data, key).toString();
      return encrypted;
    } catch (error) {
      console.error('AES encryption failed:', error);
      throw error;
    }
  }

  // AES decryption using CryptoJS
  decryptWithAES(encryptedData, key) {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('AES decryption failed:', error);
      throw error;
    }
  }

  // Simplified RSA operations (for demo - replace with real RSA in production)
  async encryptWithRSA(data, publicKey) {
    // Simplified: just base64 encode (NOT SECURE)
    // In production, use proper RSA encryption
    console.warn('Using simplified RSA - NOT SECURE for production');
    return Buffer.from(data).toString('base64');
  }

  async decryptWithRSA(encryptedData, privateKey) {
    // Simplified: just base64 decode (NOT SECURE)
    // In production, use proper RSA decryption
    console.warn('Using simplified RSA - NOT SECURE for production');
    return Buffer.from(encryptedData, 'base64').toString();
  }

  // Password-based key derivation using CryptoJS
  async deriveKeyFromPassword(password, salt) {
    try {
      const key = CryptoJS.PBKDF2(password, salt, {
        keySize: 256/32,
        iterations: 100000
      });
      return key.toString();
    } catch (error) {
      console.error('Key derivation failed:', error);
      throw error;
    }
  }

  // Generate salt for password hashing
  async generateSalt() {
    const salt = await Crypto.getRandomBytesAsync(32);
    return Buffer.from(salt).toString('hex');
  }

  // Hash password for storage
  hashPassword(password, salt) {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: 256/32,
      iterations: 100000
    }).toString();
  }

  // Verify password
  verifyPassword(password, salt, hash) {
    const computedHash = this.hashPassword(password, salt);
    return computedHash === hash;
  }

  // Generate random string
  async generateRandomString(length = 32) {
    const bytes = await Crypto.getRandomBytesAsync(length);
    return Buffer.from(bytes).toString('hex');
  }

  // Hash data using SHA-256
  hashData(data) {
    return CryptoJS.SHA256(data).toString();
  }

  // Generate HMAC
  generateHMAC(data, key) {
    return CryptoJS.HmacSHA256(data, key).toString();
  }

  // Verify HMAC
  verifyHMAC(data, key, expectedHmac) {
    const computedHmac = this.generateHMAC(data, key);
    return computedHmac === expectedHmac;
  }
}

// Export a singleton instance
export const CryptoService = new CryptoServiceClass();