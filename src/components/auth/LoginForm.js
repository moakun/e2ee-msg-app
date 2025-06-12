// src/components/auth/LoginForm.js - With Login Options
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { UI_CONFIG } from '../../utils/constants';

export function LoginForm({ onSwitchToRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoggingIn, error, fieldErrors, clearError } = useAuth();
  const navigation = useNavigation();

  // Clear errors when user starts typing
  useEffect(() => {
    if (error || Object.keys(fieldErrors).length > 0) {
      clearError();
    }
  }, [username, password]);

  const handleLogin = async () => {
    if (!username.trim() || !password) return;
    await login(username.trim(), password);
  };

  const handleBiometricLogin = () => {
    navigation.navigate('BiometricLogin');
  };

  const handleRegisterBiometric = () => {
    navigation.navigate('BiometricRegister');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Sign in to your account</Text>

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
        editable={!isLoggingIn}
      />

      <Input
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        secureTextEntry
        editable={!isLoggingIn}
      />

      <Button
        title="Sign In with Password"
        onPress={handleLogin}
        loading={isLoggingIn}
        disabled={isLoggingIn || !username.trim() || !password}
        style={styles.loginButton}
      />

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={styles.biometricButton}
        onPress={handleBiometricLogin}
        disabled={isLoggingIn}
      >
        <Ionicons name="finger-print" size={24} color={UI_CONFIG.COLORS.PRIMARY} />
        <Text style={styles.biometricButtonText}>Login with Biometric</Text>
      </TouchableOpacity>

      <View style={styles.switchContainer}>
        <Text style={styles.switchText}>Don't have an account? </Text>
        <Button
          title="Sign Up"
          onPress={onSwitchToRegister}
          variant="secondary"
          size="small"
          disabled={isLoggingIn}
        />
      </View>

      <TouchableOpacity
        style={styles.registerBiometricLink}
        onPress={handleRegisterBiometric}
        disabled={isLoggingIn}
      >
        <Ionicons name="add-circle-outline" size={16} color={UI_CONFIG.COLORS.SECONDARY} />
        <Text style={styles.registerBiometricText}>Register Biometric</Text>
      </TouchableOpacity>
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
  loginButton: {
    marginTop: UI_CONFIG.SPACING.LG
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: UI_CONFIG.SPACING.LG
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0'
  },
  dividerText: {
    fontSize: 14,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    marginHorizontal: UI_CONFIG.SPACING.MD
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: UI_CONFIG.SPACING.MD,
    borderWidth: 1,
    borderColor: UI_CONFIG.COLORS.PRIMARY,
    borderRadius: 8,
    backgroundColor: 'transparent'
  },
  biometricButtonText: {
    fontSize: 16,
    color: UI_CONFIG.COLORS.PRIMARY,
    fontWeight: '600',
    marginLeft: UI_CONFIG.SPACING.SM
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: UI_CONFIG.SPACING.LG
  },
  switchText: {
    fontSize: 16,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY
  },
  registerBiometricLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: UI_CONFIG.SPACING.MD,
    padding: UI_CONFIG.SPACING.SM
  },
  registerBiometricText: {
    fontSize: 14,
    color: UI_CONFIG.COLORS.SECONDARY,
    marginLeft: UI_CONFIG.SPACING.XS
  }
});