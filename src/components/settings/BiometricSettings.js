// src/components/settings/BiometricSettings.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Alert,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BiometricAuthService } from '../../services/auth/BiometricAuthService';
import { UI_CONFIG } from '../../utils/constants';

export function BiometricSettings() {
  const [biometricStatus, setBiometricStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    loadBiometricStatus();
  }, []);

  const loadBiometricStatus = async () => {
    try {
      const status = await BiometricAuthService.getBiometricStatus();
      setBiometricStatus(status);
    } catch (error) {
      console.error('Error loading biometric status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBiometric = async (value) => {
    if (value) {
      // Enable biometric
      setEnabling(true);
      try {
        const success = await BiometricAuthService.enableBiometric();
        if (success) {
          Alert.alert(
            'Biometric Authentication Enabled',
            'You can now use biometric authentication to unlock SecureChat.',
            [{ text: 'OK' }]
          );
          await loadBiometricStatus();
        }
      } catch (error) {
        console.error('Error enabling biometric:', error);
        Alert.alert('Error', 'Failed to enable biometric authentication');
      } finally {
        setEnabling(false);
      }
    } else {
      // Disable biometric
      Alert.alert(
        'Disable Biometric Authentication',
        'Are you sure you want to disable biometric authentication? You will need to use your password to unlock the app.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              try {
                await BiometricAuthService.disableBiometric();
                Alert.alert(
                  'Biometric Authentication Disabled',
                  'Biometric authentication has been disabled. You will need to use your password to unlock the app.',
                  [{ text: 'OK' }]
                );
                await loadBiometricStatus();
              } catch (error) {
                console.error('Error disabling biometric:', error);
                Alert.alert('Error', 'Failed to disable biometric authentication');
              }
            }
          }
        ]
      );
    }
  };

  const handleTestBiometric = async () => {
    try {
      const result = await BiometricAuthService.authenticate('Test biometric authentication');
      if (result.success) {
        Alert.alert('Success', 'Biometric authentication test successful!');
      } else {
        Alert.alert('Failed', result.error || 'Biometric authentication test failed');
      }
    } catch (error) {
      console.error('Error testing biometric:', error);
      Alert.alert('Error', 'Failed to test biometric authentication');
    }
  };

  const getBiometricIcon = () => {
    if (!biometricStatus?.supportedTypes?.length) {
      return 'finger-print';
    }
    
    if (biometricStatus.supportedTypes.includes('Face ID')) {
      return 'scan';
    } else if (biometricStatus.supportedTypes.includes('Fingerprint')) {
      return 'finger-print';
    } else {
      return 'shield-checkmark';
    }
  };

  const getBiometricDescription = () => {
    if (!biometricStatus?.available) {
      if (!biometricStatus?.hasHardware) {
        return 'This device does not support biometric authentication';
      } else if (!biometricStatus?.isEnrolled) {
        return 'No biometric data enrolled on this device';
      }
      return 'Biometric authentication is not available';
    }
    
    const types = biometricStatus.supportedTypes;
    if (types.length === 0) {
      return 'Use biometric authentication to unlock the app';
    } else if (types.length === 1) {
      return `Use ${types[0]} to unlock the app quickly and securely`;
    } else {
      return `Use ${types.join(' or ')} to unlock the app quickly and securely`;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Checking biometric availability...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={getBiometricIcon()}
            size={24}
            color={biometricStatus?.available ? UI_CONFIG.COLORS.PRIMARY : UI_CONFIG.COLORS.TEXT_SECONDARY}
          />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Biometric Authentication</Text>
          <Text style={styles.description}>{getBiometricDescription()}</Text>
          {biometricStatus?.supportedTypes?.length > 0 && (
            <Text style={styles.supportedTypes}>
              Supported: {biometricStatus.supportedTypes.join(', ')}
            </Text>
          )}
        </View>
        <Switch
          value={biometricStatus?.enabled || false}
          onValueChange={handleToggleBiometric}
          disabled={!biometricStatus?.available || enabling}
          trackColor={{ false: '#E0E0E0', true: UI_CONFIG.COLORS.PRIMARY }}
          thumbColor={biometricStatus?.enabled ? '#FFFFFF' : '#F4F3F4'}
        />
      </View>

      {biometricStatus?.available && biometricStatus?.enabled && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.testButton} onPress={handleTestBiometric}>
            <Ionicons name="play-circle-outline" size={20} color={UI_CONFIG.COLORS.PRIMARY} />
            <Text style={styles.testButtonText}>Test Biometric Authentication</Text>
          </TouchableOpacity>
        </View>
      )}

      {!biometricStatus?.available && (
        <View style={styles.helpContainer}>
          <Ionicons name="information-circle-outline" size={20} color={UI_CONFIG.COLORS.WARNING} />
          <Text style={styles.helpText}>
            {!biometricStatus?.hasHardware
              ? 'Your device does not have biometric hardware.'
              : 'To use biometric authentication, please set up fingerprint or face recognition in your device settings.'
            }
          </Text>
        </View>
      )}

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>How it works</Text>
        <Text style={styles.infoText}>
          • When enabled, you can unlock SecureChat using your biometric data instead of entering your password
        </Text>
        <Text style={styles.infoText}>
          • Your biometric data never leaves your device and is not stored by SecureChat
        </Text>
        <Text style={styles.infoText}>
          • You can always use your password as a fallback option
        </Text>
        <Text style={styles.infoText}>
          • Biometric authentication will be disabled if you log out or clear app data
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: UI_CONFIG.COLORS.SURFACE,
    borderRadius: 12,
    margin: UI_CONFIG.SPACING.MD,
    overflow: 'hidden'
  },
  loadingContainer: {
    padding: UI_CONFIG.SPACING.LG,
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 14,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: UI_CONFIG.SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: UI_CONFIG.SPACING.MD
  },
  titleContainer: {
    flex: 1
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: UI_CONFIG.COLORS.TEXT,
    marginBottom: 2
  },
  description: {
    fontSize: 14,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    lineHeight: 18
  },
  supportedTypes: {
    fontSize: 12,
    color: UI_CONFIG.COLORS.PRIMARY,
    marginTop: 2,
    fontWeight: '500'
  },
  actions: {
    paddingHorizontal: UI_CONFIG.SPACING.MD,
    paddingBottom: UI_CONFIG.SPACING.MD
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: UI_CONFIG.SPACING.SM,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI_CONFIG.COLORS.PRIMARY
  },
  testButtonText: {
    fontSize: 14,
    color: UI_CONFIG.COLORS.PRIMARY,
    fontWeight: '500',
    marginLeft: UI_CONFIG.SPACING.XS
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: UI_CONFIG.SPACING.MD,
    backgroundColor: '#FFF8E1',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0'
  },
  helpText: {
    fontSize: 14,
    color: '#E65100',
    marginLeft: UI_CONFIG.SPACING.XS,
    flex: 1,
    lineHeight: 18
  },
  infoContainer: {
    padding: UI_CONFIG.SPACING.MD,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0'
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: UI_CONFIG.COLORS.TEXT,
    marginBottom: UI_CONFIG.SPACING.XS
  },
  infoText: {
    fontSize: 13,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    lineHeight: 18,
    marginBottom: 4
  }
});