// src/services/auth/BiometricAuthService.js - Fixed with Username-based Storage
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';
import { Storage } from '../../utils/storage';

export class BiometricAuthService {
  // Check if biometric authentication is available on the device
  static async isAvailable() {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      return {
        hasHardware,
        isEnrolled,
        supportedTypes,
        available: hasHardware && isEnrolled
      };
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return {
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
        available: false
      };
    }
  }

  // Get supported biometric types as human readable names
  static async getSupportedBiometricTypes() {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const typeNames = [];
      
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        typeNames.push('Fingerprint');
      }
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        typeNames.push('Face ID');
      }
      if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        typeNames.push('Iris');
      }
      
      return typeNames;
    } catch (error) {
      console.error('Error getting biometric types:', error);
      return [];
    }
  }

  // Register biometric credentials for a specific username
  static async registerBiometricCredentials(username, derivedKey) {
    try {
      const availability = await this.isAvailable();
      
      if (!availability.available) {
        console.log('Biometric not available for registration');
        return false;
      }

      // First authenticate to ensure it's the right user
      const authResult = await this.authenticate(
        `Register your biometric for ${username}`
      );
      
      if (!authResult.success) {
        console.log('Biometric authentication failed during registration');
        return false;
      }

      // Get existing biometric users or create new object
      const biometricUsers = await Storage.getSecure('biometricUsers') || {};
      
      // Store credentials for this specific username
      biometricUsers[username] = {
        derivedKey,
        registeredAt: Date.now(),
        biometricType: authResult.biometricType
      };

      // Save the updated biometric users
      await Storage.setSecure('biometricUsers', biometricUsers);
      
      console.log(`✅ Biometric credentials registered for: ${username}`);
      return true;
    } catch (error) {
      console.error('Error registering biometric credentials:', error);
      return false;
    }
  }

  // Authenticate user with biometrics
  static async authenticate(promptMessage = 'Authenticate to access SecureChat') {
    try {
      const availability = await this.isAvailable();
      
      if (!availability.available) {
        return {
          success: false,
          error: 'Biometric authentication not available'
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: 'Use Password',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel'
      });

      if (result.success) {
        console.log('✅ Biometric authentication successful');
        return {
          success: true,
          biometricType: result.authenticationType
        };
      } else {
        console.log('❌ Biometric authentication failed:', result.error);
        return {
          success: false,
          error: result.error,
          errorCode: result.errorCode
        };
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }

  // Check if a specific username has biometric registered
  static async isUsernameRegistered(username) {
    try {
      const biometricUsers = await Storage.getSecure('biometricUsers') || {};
      return !!biometricUsers[username];
    } catch (error) {
      console.error('Error checking username registration:', error);
      return false;
    }
  }

  // Get biometric credentials for a specific username (requires authentication)
  static async getBiometricCredentialsForUsername(username) {
    try {
      const biometricUsers = await Storage.getSecure('biometricUsers') || {};
      const userCredentials = biometricUsers[username];
      
      if (!userCredentials) {
        console.log(`No biometric credentials found for username: ${username}`);
        return null;
      }

      // Check if credentials are not too old (optional security measure)
      const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
      if (Date.now() - userCredentials.registeredAt > maxAge) {
        console.log('Biometric credentials expired');
        await this.removeBiometricForUsername(username);
        return null;
      }

      return {
        username,
        derivedKey: userCredentials.derivedKey,
        registeredAt: userCredentials.registeredAt
      };
    } catch (error) {
      console.error('Error retrieving biometric credentials:', error);
      return null;
    }
  }

  // Login with biometric authentication for a specific username
  static async loginWithBiometricForUsername(username) {
    try {
      // First check if this username has biometric registered
      const isRegistered = await this.isUsernameRegistered(username);
      
      if (!isRegistered) {
        return {
          success: false,
          error: `No biometric registered for ${username}. Please register first.`
        };
      }

      // Authenticate with biometric
      const authResult = await this.authenticate(
        `Login to SecureChat as ${username}`
      );
      
      if (!authResult.success) {
        return {
          success: false,
          error: authResult.error || 'Biometric authentication failed'
        };
      }

      // Get stored credentials for this username
      const credentials = await this.getBiometricCredentialsForUsername(username);
      
      if (!credentials) {
        return {
          success: false,
          error: 'Failed to retrieve credentials'
        };
      }

      // Return the stored credentials
      return {
        success: true,
        username: credentials.username,
        derivedKey: credentials.derivedKey
      };
    } catch (error) {
      console.error('Biometric login error:', error);
      return {
        success: false,
        error: 'Biometric login failed'
      };
    }
  }

  // Remove biometric for a specific username
  static async removeBiometricForUsername(username) {
    try {
      const biometricUsers = await Storage.getSecure('biometricUsers') || {};
      delete biometricUsers[username];
      await Storage.setSecure('biometricUsers', biometricUsers);
      console.log(`✅ Biometric credentials removed for: ${username}`);
      return true;
    } catch (error) {
      console.error('Error removing biometric credentials:', error);
      return false;
    }
  }

  // Get list of all usernames with biometric registered
  static async getRegisteredUsernames() {
    try {
      const biometricUsers = await Storage.getSecure('biometricUsers') || {};
      return Object.keys(biometricUsers);
    } catch (error) {
      console.error('Error getting registered usernames:', error);
      return [];
    }
  }

  // Clear all biometric credentials
  static async clearAllBiometricCredentials() {
    try {
      await Storage.removeSecure('biometricUsers');
      console.log('✅ All biometric credentials cleared');
      return true;
    } catch (error) {
      console.error('Error clearing biometric credentials:', error);
      return false;
    }
  }

  // Legacy methods for backward compatibility
  static async isBiometricEnabled() {
    try {
      const biometricUsers = await Storage.getSecure('biometricUsers') || {};
      return Object.keys(biometricUsers).length > 0;
    } catch (error) {
      console.error('Error checking biometric enabled status:', error);
      return false;
    }
  }

  static async canUseBiometricUnlock() {
    try {
      const availability = await this.isAvailable();
      const hasRegisteredUsers = await this.isBiometricEnabled();
      return availability.available && hasRegisteredUsers;
    } catch (error) {
      console.error('Error checking biometric unlock availability:', error);
      return false;
    }
  }

  static async getBiometricStatus() {
    try {
      const availability = await this.isAvailable();
      const registeredUsernames = await this.getRegisteredUsernames();
      const supportedTypes = await this.getSupportedBiometricTypes();

      return {
        available: availability.available,
        hasHardware: availability.hasHardware,
        isEnrolled: availability.isEnrolled,
        supportedTypes,
        enabled: registeredUsernames.length > 0,
        registeredUsernames,
        canUnlock: availability.available && registeredUsernames.length > 0
      };
    } catch (error) {
      console.error('Error getting biometric status:', error);
      return {
        available: false,
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
        enabled: false,
        registeredUsernames: [],
        canUnlock: false
      };
    }
  }

  // Disable biometric (removes all registered users)
  static async disableBiometric() {
    return this.clearAllBiometricCredentials();
  }
}