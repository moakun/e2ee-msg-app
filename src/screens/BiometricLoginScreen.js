// src/screens/BiometricLoginScreen.js - With Username Input
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { BiometricAuthService } from '../services/auth/BiometricAuthService';
import { useAuth } from '../context/AuthContext';
import { UI_CONFIG } from '../utils/constants';

export default function BiometricLoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [biometricStatus, setBiometricStatus] = useState(null);
  const [authenticating, setAuthenticating] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [registeredUsernames, setRegisteredUsernames] = useState([]);
  const { biometricLoginWithUsername } = useAuth();

  useEffect(() => {
    checkBiometricStatus();
    startPulseAnimation();
  }, []);

  const checkBiometricStatus = async () => {
    const status = await BiometricAuthService.getBiometricStatus();
    setBiometricStatus(status);
    setRegisteredUsernames(status.registeredUsernames || []);
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

  const handleBiometricLogin = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter your username');
      return;
    }

    setAuthenticating(true);
    
    try {
      // Check if this username has biometric registered
      const isRegistered = await BiometricAuthService.isUsernameRegistered(username.trim());
      
      if (!isRegistered) {
        Alert.alert(
          'No Biometric Registered',
          `No biometric authentication found for ${username}. Would you like to register now?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Register',
              onPress: () => navigation.navigate('BiometricRegister')
            }
          ]
        );
        setAuthenticating(false);
        return;
      }

      // Try biometric login with the username
      const result = await biometricLoginWithUsername(username.trim());
      
      if (!result) {
        // Error is already handled by biometricLoginWithUsername
        console.log('Biometric login failed');
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      Alert.alert('Error', 'Biometric login failed. Please try again.');
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
      return 'Biometric';
    }
    
    const types = biometricStatus.supportedTypes;
    if (types.length === 1) {
      return types[0];
    } else {
      return types.join(' or ');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={UI_CONFIG.COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Biometric Login</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>Quick Login</Text>
            <Text style={styles.subtitle}>
              Enter your username and use {getBiometricText().toLowerCase()} to login
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Username"
              placeholder="Enter your username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!authenticating}
              style={styles.usernameInput}
            />

            {registeredUsernames.length > 0 && (
              <View style={styles.registeredUsers}>
                <Text style={styles.registeredUsersTitle}>
                  Users with biometric enabled:
                </Text>
                <View style={styles.usersList}>
                  {registeredUsernames.map((user, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.userChip}
                      onPress={() => setUsername(user)}
                    >
                      <Text style={styles.userChipText}>{user}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          <View style={styles.biometricSection}>
            <Animated.View style={[styles.biometricButton, { transform: [{ scale: pulseAnim }] }]}>
              <TouchableOpacity
                style={[
                  styles.biometricTouchable,
                  !username.trim() && styles.biometricTouchableDisabled
                ]}
                onPress={handleBiometricLogin}
                disabled={authenticating || !username.trim()}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={authenticating ? "hourglass" : getBiometricIcon()}
                  size={60}
                  color={
                    !username.trim() 
                      ? UI_CONFIG.COLORS.TEXT_SECONDARY 
                      : authenticating 
                        ? UI_CONFIG.COLORS.WARNING
                        : UI_CONFIG.COLORS.PRIMARY
                  }
                />
              </TouchableOpacity>
            </Animated.View>

            <Text style={styles.instruction}>
              {!username.trim()
                ? 'Enter username first'
                : authenticating 
                  ? 'Authenticating...' 
                  : `Tap to login with ${getBiometricText().toLowerCase()}`
              }
            </Text>
          </View>

          <View style={styles.actions}>
            <Button
              title={authenticating ? "Authenticating..." : `Login with ${getBiometricText()}`}
              onPress={handleBiometricLogin}
              loading={authenticating}
              disabled={authenticating || !username.trim()}
              style={styles.loginButton}
            />

            <TouchableOpacity 
              style={styles.passwordLink}
              onPress={() => navigation.goBack()}
              disabled={authenticating}
            >
              <Text style={styles.passwordLinkText}>Use Password Instead</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.registerLink}
              onPress={() => navigation.navigate('BiometricRegister')}
              disabled={authenticating}
            >
              <Text style={styles.registerLinkText}>Register New Biometric</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_CONFIG.COLORS.BACKGROUND
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: UI_CONFIG.SPACING.MD,
    paddingVertical: UI_CONFIG.SPACING.SM,
    backgroundColor: UI_CONFIG.COLORS.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: UI_CONFIG.COLORS.TEXT
  },
  keyboardView: {
    flex: 1
  },
  content: {
    flex: 1,
    padding: UI_CONFIG.SPACING.XL
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: UI_CONFIG.SPACING.XL
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: UI_CONFIG.COLORS.TEXT,
    marginBottom: UI_CONFIG.SPACING.SM
  },
  subtitle: {
    fontSize: 16,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center'
  },
  form: {
    marginBottom: UI_CONFIG.SPACING.XL
  },
  usernameInput: {
    marginBottom: UI_CONFIG.SPACING.MD
  },
  registeredUsers: {
    marginTop: UI_CONFIG.SPACING.SM
  },
  registeredUsersTitle: {
    fontSize: 14,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    marginBottom: UI_CONFIG.SPACING.XS
  },
  usersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: UI_CONFIG.SPACING.XS
  },
  userChip: {
    backgroundColor: UI_CONFIG.COLORS.PRIMARY + '20',
    paddingHorizontal: UI_CONFIG.SPACING.SM,
    paddingVertical: UI_CONFIG.SPACING.XS,
    borderRadius: 16,
    marginRight: UI_CONFIG.SPACING.XS,
    marginBottom: UI_CONFIG.SPACING.XS
  },
  userChipText: {
    fontSize: 14,
    color: UI_CONFIG.COLORS.PRIMARY
  },
  biometricSection: {
    alignItems: 'center',
    marginBottom: UI_CONFIG.SPACING.XL
  },
  biometricButton: {
    marginBottom: UI_CONFIG.SPACING.MD
  },
  biometricTouchable: {
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
  biometricTouchableDisabled: {
    borderColor: UI_CONFIG.COLORS.TEXT_SECONDARY,
    shadowOpacity: 0.1
  },
  instruction: {
    fontSize: 16,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center'
  },
  actions: {
    width: '100%'
  },
  loginButton: {
    marginBottom: UI_CONFIG.SPACING.MD
  },
  passwordLink: {
    alignItems: 'center',
    padding: UI_CONFIG.SPACING.SM,
    marginBottom: UI_CONFIG.SPACING.XS
  },
  passwordLinkText: {
    fontSize: 16,
    color: UI_CONFIG.COLORS.PRIMARY
  },
  registerLink: {
    alignItems: 'center',
    padding: UI_CONFIG.SPACING.SM
  },
  registerLinkText: {
    fontSize: 14,
    color: UI_CONFIG.COLORS.SECONDARY
  }
});