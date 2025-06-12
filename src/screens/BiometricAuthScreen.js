// src/screens/BiometricAuthScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BiometricAuthService } from '../services/auth/BiometricAuthService';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { UI_CONFIG } from '../utils/constants';

export default function BiometricAuthScreen({ navigation }) {
  const [biometricStatus, setBiometricStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const { biometricLogin } = useAuth();
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    checkBiometricStatus();
    startPulseAnimation();
  }, []);

  const checkBiometricStatus = async () => {
    try {
      const status = await BiometricAuthService.getBiometricStatus();
      setBiometricStatus(status);
    } catch (error) {
      console.error('Error checking biometric status:', error);
    } finally {
      setLoading(false);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    ).start();
  };

  const handleBiometricAuth = async () => {
    try {
      setAuthenticating(true);
      
      const credentials = await BiometricAuthService.getBiometricCredentials();
      if (credentials) {
        // Use biometric login from auth context
        await biometricLogin(credentials.username, credentials.derivedKey);
      } else {
        Alert.alert(
          'Biometric Login Failed',
          'No stored credentials found. Please log in with your password.',
          [
            {
              text: 'Use Password',
              onPress: () => navigation.replace('Auth')
            }
          ]
        );
      }
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      Alert.alert(
        'Authentication Failed',
        'Biometric authentication failed. Please try again or use your password.',
        [
          { text: 'Try Again', onPress: handleBiometricAuth },
          {
            text: 'Use Password',
            onPress: () => navigation.replace('Auth')
          }
        ]
      );
    } finally {
      setAuthenticating(false);
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
      return `${types[0]} Authentication`;
    } else {
      return `${types.join(' or ')} Authentication`;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="finger-print" size={64} color={UI_CONFIG.COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Checking biometric availability...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!biometricStatus?.available) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.unavailableContainer}>
          <Ionicons name="warning" size={64} color={UI_CONFIG.COLORS.WARNING} />
          <Text style={styles.unavailableTitle}>Biometric Authentication Unavailable</Text>
          <Text style={styles.unavailableText}>
            {!biometricStatus?.hasHardware 
              ? 'This device does not support biometric authentication.'
              : 'No biometric data is enrolled on this device. Please set up biometric authentication in your device settings.'
            }
          </Text>
          <Button
            title="Use Password Instead"
            onPress={() => navigation.replace('Auth')}
            style={styles.passwordButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>SecureChat</Text>
          <Text style={styles.subtitle}>Unlock with {getBiometricText()}</Text>
        </View>

        <View style={styles.biometricContainer}>
          <Animated.View style={[styles.biometricIconContainer, { transform: [{ scale: pulseAnim }] }]}>
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometricAuth}
              disabled={authenticating}
              activeOpacity={0.8}
            >
              <Ionicons
                name={getBiometricIcon()}
                size={80}
                color={authenticating ? UI_CONFIG.COLORS.TEXT_SECONDARY : UI_CONFIG.COLORS.PRIMARY}
              />
            </TouchableOpacity>
          </Animated.View>
          
          <Text style={styles.instruction}>
            {authenticating 
              ? 'Authenticating...' 
              : `Touch the ${getBiometricIcon() === 'scan' ? 'scanner' : 'sensor'} to unlock`
            }
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            title="Unlock with Biometrics"
            onPress={handleBiometricAuth}
            loading={authenticating}
            disabled={authenticating}
            style={styles.unlockButton}
          />
          
          <TouchableOpacity
            style={styles.passwordLink}
            onPress={() => navigation.replace('Auth')}
            disabled={authenticating}
          >
            <Text style={styles.passwordLinkText}>Use Password Instead</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_CONFIG.COLORS.BACKGROUND
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: UI_CONFIG.SPACING.XL
  },
  loadingText: {
    fontSize: 16,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    marginTop: UI_CONFIG.SPACING.MD,
    textAlign: 'center'
  },
  unavailableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: UI_CONFIG.SPACING.XL
  },
  unavailableTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.COLORS.TEXT,
    marginTop: UI_CONFIG.SPACING.MD,
    marginBottom: UI_CONFIG.SPACING.SM,
    textAlign: 'center'
  },
  unavailableText: {
    fontSize: 16,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: UI_CONFIG.SPACING.XL,
    lineHeight: 24
  },
  passwordButton: {
    width: '100%',
    maxWidth: 280
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: UI_CONFIG.SPACING.XL
  },
  header: {
    alignItems: 'center',
    marginTop: UI_CONFIG.SPACING.XL * 2
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: UI_CONFIG.COLORS.PRIMARY,
    marginBottom: UI_CONFIG.SPACING.SM
  },
  subtitle: {
    fontSize: 18,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center'
  },
  biometricContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center'
  },
  biometricIconContainer: {
    marginBottom: UI_CONFIG.SPACING.XL
  },
  biometricButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: UI_CONFIG.COLORS.SURFACE,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: UI_CONFIG.COLORS.PRIMARY,
    shadowColor: UI_CONFIG.COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  instruction: {
    fontSize: 16,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: UI_CONFIG.SPACING.MD
  },
  actions: {
    width: '100%',
    alignItems: 'center'
  },
  unlockButton: {
    width: '100%',
    marginBottom: UI_CONFIG.SPACING.LG
  },
  passwordLink: {
    padding: UI_CONFIG.SPACING.MD
  },
  passwordLinkText: {
    fontSize: 16,
    color: UI_CONFIG.COLORS.PRIMARY,
    textAlign: 'center'
  }
});