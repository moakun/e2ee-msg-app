// src/services/security/SecurityService.js
import * as LocalAuthentication from 'expo-local-authentication';
import { Storage } from '../../utils/storage';

export class SecurityService {
  static async enableBiometricAuth() {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (hasHardware && isEnrolled) {
        await Storage.setSecure('biometricEnabled', 'true');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to enable biometric auth:', error);
      return false;
    }
  }

  static async authenticateWithBiometric() {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access your messages',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false
      });
      
      return result.success;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }

  static async isBiometricAvailable() {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      console.error('Failed to check biometric availability:', error);
      return false;
    }
  }

  static async getBiometricTypes() {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      return types;
    } catch (error) {
      console.error('Failed to get biometric types:', error);
      return [];
    }
  }

  static async lockApp() {
    try {
      await Storage.setSecure('appLocked', 'true');
      return true;
    } catch (error) {
      console.error('Failed to lock app:', error);
      return false;
    }
  }

  static async unlockApp() {
    try {
      await Storage.removeSecure('appLocked');
      return true;
    } catch (error) {
      console.error('Failed to unlock app:', error);
      return false;
    }
  }

  static async isAppLocked() {
    try {
      const locked = await Storage.getSecure('appLocked');
      return locked === 'true';
    } catch (error) {
      console.error('Failed to check app lock status:', error);
      return false;
    }
  }

  static async isBiometricEnabled() {
    try {
      const enabled = await Storage.getSecure('biometricEnabled');
      return enabled === 'true';
    } catch (error) {
      console.error('Failed to check biometric status:', error);
      return false;
    }
  }

  static async disableBiometricAuth() {
    try {
      await Storage.removeSecure('biometricEnabled');
      return true;
    } catch (error) {
      console.error('Failed to disable biometric auth:', error);
      return false;
    }
  }
}