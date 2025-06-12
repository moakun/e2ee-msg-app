// src/components/auth/BiometricRegistrationPrompt.js - Fixed Version
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../ui/Button';
import { BiometricAuthService } from '../../services/auth/BiometricAuthService';
import { UI_CONFIG } from '../../utils/constants';

export function BiometricRegistrationPrompt({ 
  visible, 
  onSetupBiometric, 
  onSkip, 
  username 
}) {
  const [biometricStatus, setBiometricStatus] = useState(null);
  const [setting, setSetting] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (visible) {
      // Delay to ensure modal renders properly
      setTimeout(() => {
        setIsReady(true);
        checkBiometricAvailability();
        startPulseAnimation();
      }, 100);
    } else {
      setIsReady(false);
    }
  }, [visible]);

  const checkBiometricAvailability = async () => {
    try {
      console.log('Checking biometric availability in prompt...');
      const status = await BiometricAuthService.getBiometricStatus();
      console.log('Biometric status in prompt:', status);
      setBiometricStatus(status);
    } catch (error) {
      console.error('Error checking biometric status:', error);
      setBiometricStatus({ available: false });
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true
        })
      ])
    ).start();
  };

  const handleSetupBiometric = async () => {
    setSetting(true);
    try {
      console.log('Setting up biometric authentication...');
      const success = await BiometricAuthService.enableBiometric();
      
      if (success) {
        console.log('Biometric setup successful');
        // Small delay for UI feedback
        setTimeout(() => {
          onSetupBiometric(true);
        }, 500);
      } else {
        console.log('Biometric setup failed');
        Alert.alert(
          'Setup Failed',
          'Failed to enable biometric authentication. You can set it up later in Settings.',
          [{ text: 'OK', onPress: () => onSkip() }]
        );
      }
    } catch (error) {
      console.error('Biometric setup failed:', error);
      Alert.alert(
        'Setup Error',
        'An error occurred while setting up biometric authentication.',
        [{ text: 'OK', onPress: () => onSkip() }]
      );
    } finally {
      setSetting(false);
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

  const getBiometricText = () => {
    if (!biometricStatus?.supportedTypes?.length) {
      return 'Biometric Authentication';
    }
    
    const types = biometricStatus.supportedTypes;
    if (types.length === 1) {
      return types[0];
    } else {
      return types.join(' or ');
    }
  };

  // Don't render if biometric is not available
  if (!visible || !isReady) {
    return null;
  }

  // If still checking status, show loading
  if (biometricStatus === null) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
        onRequestClose={onSkip}
      >
        <View style={styles.container}>
          <View style={styles.loadingContent}>
            <Ionicons name="finger-print" size={60} color={UI_CONFIG.COLORS.PRIMARY} />
            <Text style={styles.loadingText}>Checking biometric availability...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  // If biometric not available, skip automatically
  if (!biometricStatus?.available) {
    console.log('Biometric not available, skipping prompt');
    // Skip after a short delay to prevent flashing
    setTimeout(() => {
      onSkip();
    }, 100);
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onSkip}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Setup Quick Unlock</Text>
            <Text style={styles.subtitle}>
              Hi {username}! Want to unlock SecureChat quickly next time?
            </Text>
          </View>

          <View style={styles.biometricContainer}>
            <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.iconCircle}>
                <Ionicons
                  name={getBiometricIcon()}
                  size={60}
                  color={UI_CONFIG.COLORS.PRIMARY}
                />
              </View>
            </Animated.View>
            
            <Text style={styles.biometricTitle}>
              Enable {getBiometricText()}
            </Text>
            
            <Text style={styles.description}>
              Next time, just enter your username and use {getBiometricText().toLowerCase()} 
              instead of typing your password every time.
            </Text>
          </View>

          <View style={styles.benefits}>
            <View style={styles.benefit}>
              <Ionicons name="flash" size={20} color={UI_CONFIG.COLORS.SUCCESS} />
              <Text style={styles.benefitText}>Quick & convenient access</Text>
            </View>
            <View style={styles.benefit}>
              <Ionicons name="shield-checkmark" size={20} color={UI_CONFIG.COLORS.SUCCESS} />
              <Text style={styles.benefitText}>Same level of security</Text>
            </View>
            <View style={styles.benefit}>
              <Ionicons name="key" size={20} color={UI_CONFIG.COLORS.SUCCESS} />
              <Text style={styles.benefitText}>Password always works as backup</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              title={setting ? "Setting up..." : `Enable ${getBiometricText()}`}
              onPress={handleSetupBiometric}
              loading={setting}
              disabled={setting}
              style={styles.setupButton}
            />
            
            <TouchableOpacity
              style={styles.skipButton}
              onPress={onSkip}
              disabled={setting}
            >
              <Text style={styles.skipText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.note}>
            You can always enable this later in Settings
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_CONFIG.COLORS.BACKGROUND
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 16,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    marginTop: UI_CONFIG.SPACING.MD,
    textAlign: 'center'
  },
  content: {
    flex: 1,
    padding: UI_CONFIG.SPACING.XL,
    justifyContent: 'space-between'
  },
  header: {
    alignItems: 'center',
    marginTop: UI_CONFIG.SPACING.XL
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: UI_CONFIG.COLORS.TEXT,
    marginBottom: UI_CONFIG.SPACING.SM,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 18,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24
  },
  biometricContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center'
  },
  iconContainer: {
    marginBottom: UI_CONFIG.SPACING.LG
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: UI_CONFIG.COLORS.SURFACE,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: UI_CONFIG.COLORS.PRIMARY,
    shadowColor: UI_CONFIG.COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8
  },
  biometricTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: UI_CONFIG.COLORS.TEXT,
    marginBottom: UI_CONFIG.SPACING.MD,
    textAlign: 'center'
  },
  description: {
    fontSize: 16,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: UI_CONFIG.SPACING.LG,
    paddingHorizontal: UI_CONFIG.SPACING.LG
  },
  benefits: {
    marginBottom: UI_CONFIG.SPACING.XL
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: UI_CONFIG.SPACING.SM,
    paddingHorizontal: UI_CONFIG.SPACING.MD
  },
  benefitText: {
    fontSize: 16,
    color: UI_CONFIG.COLORS.TEXT,
    marginLeft: UI_CONFIG.SPACING.SM,
    flex: 1
  },
  actions: {
    width: '100%'
  },
  setupButton: {
    width: '100%',
    marginBottom: UI_CONFIG.SPACING.MD
  },
  skipButton: {
    padding: UI_CONFIG.SPACING.MD,
    alignItems: 'center'
  },
  skipText: {
    fontSize: 16,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center'
  },
  note: {
    fontSize: 14,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: UI_CONFIG.SPACING.SM
  }
});