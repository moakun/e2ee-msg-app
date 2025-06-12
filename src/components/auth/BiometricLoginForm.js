// src/components/auth/BiometricLoginForm.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { BiometricAuthService } from '../../services/auth/BiometricAuthService';
import { useAuth } from '../../context/AuthContext';
import { UI_CONFIG } from '../../utils/constants';

export function BiometricLoginForm({ onSwitchToRegister, onSwitchToPassword }) {
  const [username, setUsername] = useState('');
  const [biometricStatus, setBiometricStatus] = useState(null);
  const [authenticating, setAuthenticating] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const { biometricLoginWithUsername, error, fieldErrors, clearError } = useAuth();

  useEffect(() => {
    checkBiometricStatus();
    startPulseAnimation();
  }, []);

  useEffect(() => {
    if (error || Object.keys(fieldErrors).length > 0) {
      clearError();
    }
  }, [username]);

  const checkBiometricStatus = async () => {
    try {
      const status = await BiometricAuthService.getBiometricStatus();
      setBiometricStatus(status);
    } catch (error) {
      console.error('Error checking biometric status:', error);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true
        })
      ])
    ).start();
  };

  const handleBiometricLogin = async () => {
    if (!username.trim()) {
      return;
    }

    setAuthenticating(true);
    try {
      await biometricLoginWithUsername(username.trim());
    } catch (error) {
      console.error('Biometric login failed:', error);
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
      return types.join('/');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Login</Text>
      <Text style={styles.subtitle}>Enter username and use {getBiometricText().toLowerCase()}</Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Input
        label="Username"
        placeholder="Enter your username"
        value={username}
        onChangeText={setUsername}
        error={fieldErrors.username}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!authenticating}
        style={styles.usernameInput}
      />

      <View style={styles.biometricSection}>
        <Text style={styles.biometricLabel}>Then authenticate with {getBiometricText()}</Text>
        
        <Animated.View style={[styles.biometricContainer, { transform: [{ scale: pulseAnim }] }]}>
          <TouchableOpacity
            style={[
              styles.biometricButton,
              !username.trim() && styles.biometricButtonDisabled,
              authenticating && styles.biometricButtonAuthenticating
            ]}
            onPress={handleBiometricLogin}
            disabled={!username.trim() || authenticating}
            activeOpacity={0.8}
          >
            <Ionicons
              name={authenticating ? "hourglass" : getBiometricIcon()}
              size={48}
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

        <Text style={styles.biometricInstruction}>
          {!username.trim() 
            ? 'Enter username first'
            : authenticating 
              ? 'Authenticating...'
              : `Touch to login with ${getBiometricText().toLowerCase()}`
          }
        </Text>
      </View>

      <Button
        title={authenticating ? "Authenticating..." : `Login with ${getBiometricText()}`}
        onPress={handleBiometricLogin}
        loading={authenticating}
        disabled={authenticating || !username.trim()}
        style={styles.loginButton}
      />

      <View style={styles.alternatives}>
        <TouchableOpacity
          style={styles.alternativeButton}
          onPress={onSwitchToPassword}
          disabled={authenticating}
        >
          <Ionicons name="key-outline" size={16} color={UI_CONFIG.COLORS.PRIMARY} />
          <Text style={styles.alternativeText}>Use Password Instead</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.alternativeButton}
          onPress={onSwitchToRegister}
          disabled={authenticating}
        >
          <Ionicons name="person-add-outline" size={16} color={UI_CONFIG.COLORS.PRIMARY} />
          <Text style={styles.alternativeText}>Create New Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: UI_CONFIG.SPACING.LG
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: UI_CONFIG.COLORS.TEXT,
    textAlign: 'center',
    marginBottom: UI_CONFIG.SPACING.XS
  },
  subtitle: {
    fontSize: 16,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: UI_CONFIG.SPACING.XL
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderColor: UI_CONFIG.COLORS.ERROR,
    borderWidth: 1,
    borderRadius: 8,
    padding: UI_CONFIG.SPACING.MD,
    marginBottom: UI_CONFIG.SPACING.MD
  },
  errorText: {
    color: UI_CONFIG.COLORS.ERROR,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500'
  },
  usernameInput: {
    marginBottom: UI_CONFIG.SPACING.LG
  },
  biometricSection: {
    alignItems: 'center',
    marginBottom: UI_CONFIG.SPACING.XL
  },
  biometricLabel: {
    fontSize: 16,
    color: UI_CONFIG.COLORS.TEXT,
    marginBottom: UI_CONFIG.SPACING.LG,
    textAlign: 'center'
  },
  biometricContainer: {
    marginBottom: UI_CONFIG.SPACING.MD
  },
  biometricButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
  biometricButtonDisabled: {
    borderColor: UI_CONFIG.COLORS.TEXT_SECONDARY,
    shadowOpacity: 0.1
  },
  biometricButtonAuthenticating: {
    borderColor: UI_CONFIG.COLORS.WARNING,
    shadowColor: UI_CONFIG.COLORS.WARNING
  },
  biometricInstruction: {
    fontSize: 14,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center'
  },
  loginButton: {
    marginBottom: UI_CONFIG.SPACING.XL
  },
  alternatives: {
    alignItems: 'center'
  },
  alternativeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: UI_CONFIG.SPACING.MD,
    marginVertical: UI_CONFIG.SPACING.XS
  },
  alternativeText: {
    fontSize: 16,
    color: UI_CONFIG.COLORS.PRIMARY,
    marginLeft: UI_CONFIG.SPACING.XS
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: UI_CONFIG.SPACING.MD,
    width: '80%'
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: UI_CONFIG.COLORS.TEXT_SECONDARY,
    opacity: 0.3
  },
  dividerText: {
    fontSize: 14,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    marginHorizontal: UI_CONFIG.SPACING.MD
  }
});