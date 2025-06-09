import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { UI_CONFIG } from '../../utils/constants';

export function LoginForm({ onSwitchToRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoggingIn, error, fieldErrors, clearError } = useAuth();

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
        title="Sign In"
        onPress={handleLogin}
        loading={isLoggingIn}
        disabled={isLoggingIn || !username.trim() || !password}
        style={styles.loginButton}
      />

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
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: UI_CONFIG.SPACING.LG
  },
  switchText: {
    fontSize: 16,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY
  }
});
