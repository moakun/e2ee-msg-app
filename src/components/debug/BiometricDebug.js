import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { BiometricAuthService } from '../../services/auth/BiometricAuthService';
import { UI_CONFIG } from '../../utils/constants';

export function BiometricDebug() {
  const [debugInfo, setDebugInfo] = useState({
    hasHardware: null,
    isEnrolled: null,
    supportedTypes: [],
    biometricEnabled: null,
    hasCredentials: null,
    canUnlock: null,
    deviceInfo: null
  });

  useEffect(() => {
    checkBiometricDebugInfo();
  }, []);

  const checkBiometricDebugInfo = async () => {
    try {
      // Basic hardware checks
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      // Convert types to readable names
      const typeNames = supportedTypes.map(type => {
        switch(type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return 'Fingerprint';
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return 'Face ID';
          case LocalAuthentication.AuthenticationType.IRIS:
            return 'Iris';
          default:
            return `Unknown (${type})`;
        }
      });

      // App-specific checks
      const biometricEnabled = await BiometricAuthService.isBiometricEnabled();
      const registeredUsernames = await BiometricAuthService.getRegisteredUsernames();
      const canUnlock = await BiometricAuthService.canUseBiometricUnlock();
      
      // Get security level
      const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();
      
      setDebugInfo({
        hasHardware,
        isEnrolled,
        supportedTypes: typeNames,
        biometricEnabled,
        registeredUsernames,
        canUnlock,
        securityLevel,
        deviceInfo: {
          typeCount: supportedTypes.length,
          rawTypes: supportedTypes
        }
      });
    } catch (error) {
      console.error('Debug info error:', error);
      Alert.alert('Debug Error', error.message);
    }
  };

  const testAuthentication = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Test Biometric Authentication',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel'
      });
      
      Alert.alert('Test Result', JSON.stringify(result, null, 2));
    } catch (error) {
      Alert.alert('Test Error', error.message);
    }
  };

  const resetBiometric = async () => {
    try {
      await BiometricAuthService.clearAllBiometricCredentials();
      Alert.alert('Success', 'All biometric registrations have been cleared');
      checkBiometricDebugInfo();
    } catch (error) {
      Alert.alert('Reset Error', error.message);
    }
  };

  const formatValue = (value) => {
    if (value === null) return 'null';
    if (value === true) return '✅ Yes';
    if (value === false) return '❌ No';
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'None';
    return String(value);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 Biometric Debug Info</Text>
      
      <ScrollView style={styles.infoContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hardware Status</Text>
          <Text style={styles.infoRow}>Has Hardware: {formatValue(debugInfo.hasHardware)}</Text>
          <Text style={styles.infoRow}>Is Enrolled: {formatValue(debugInfo.isEnrolled)}</Text>
          <Text style={styles.infoRow}>Supported Types: {formatValue(debugInfo.supportedTypes)}</Text>
          <Text style={styles.infoRow}>Security Level: {formatValue(debugInfo.securityLevel)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Status</Text>
          <Text style={styles.infoRow}>Biometric Enabled: {formatValue(debugInfo.biometricEnabled)}</Text>
          <Text style={styles.infoRow}>Registered Users: {formatValue(debugInfo.registeredUsernames)}</Text>
          <Text style={styles.infoRow}>Can Unlock: {formatValue(debugInfo.canUnlock)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Info</Text>
          <Text style={styles.infoRow}>Type Count: {debugInfo.deviceInfo?.typeCount || 0}</Text>
          <Text style={styles.infoRow}>Raw Types: {JSON.stringify(debugInfo.deviceInfo?.rawTypes || [])}</Text>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.button} onPress={checkBiometricDebugInfo}>
          <Text style={styles.buttonText}>🔄 Refresh</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testAuthentication}>
          <Text style={styles.buttonText}>🧪 Test Auth</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={resetBiometric}>
          <Text style={styles.buttonText}>🗑️ Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    margin: UI_CONFIG.SPACING.MD,
    padding: UI_CONFIG.SPACING.MD,
    borderWidth: 1,
    borderColor: '#4CAF50'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: UI_CONFIG.SPACING.SM,
    textAlign: 'center'
  },
  infoContainer: {
    maxHeight: 300
  },
  section: {
    marginBottom: UI_CONFIG.SPACING.MD,
    paddingBottom: UI_CONFIG.SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: '#C8E6C9'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#388E3C',
    marginBottom: UI_CONFIG.SPACING.XS
  },
  infoRow: {
    fontSize: 14,
    color: '#1B5E20',
    marginVertical: 2,
    fontFamily: 'monospace'
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: UI_CONFIG.SPACING.MD,
    paddingTop: UI_CONFIG.SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: '#C8E6C9'
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: UI_CONFIG.SPACING.MD,
    paddingVertical: UI_CONFIG.SPACING.SM,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center'
  },
  dangerButton: {
    backgroundColor: '#F44336'
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14
  }
});