import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { UI_CONFIG } from '../../utils/constants';

export function RegisterForm({ onSwitchToLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localErrors, setLocalErrors] = useState({});
  const { register, loading, error, fieldErrors, clearError } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clear errors when user starts typing
  useEffect(() => {
    if (error || Object.keys(fieldErrors).length > 0) {
      const timer = setTimeout(clearError, 100);
      return () => clearTimeout(timer);
    }
  }, [username, password, confirmPassword]);

  const validateForm = () => {
    const errors = {};

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setLocalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    
    // Set loading state immediately
    setIsSubmitting(true);
    
    try {
      await register(username.trim(), password);
    } finally {
      // Reset loading state if still on this screen
      setIsSubmitting(false);
    }
  };

  const handleUsernameChange = (text) => {
    setUsername(text);
    if (fieldErrors.username || localErrors.username) {
      clearError();
      setLocalErrors(prev => ({ ...prev, username: undefined }));
    }
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (fieldErrors.password || localErrors.password) {
      clearError();
      setLocalErrors(prev => ({ ...prev, password: undefined }));
    }
    if (confirmPassword && text !== confirmPassword) {
      setLocalErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
    } else {
      setLocalErrors(prev => ({ ...prev, confirmPassword: undefined }));
    }
  };

  const handleConfirmPasswordChange = (text) => {
    setConfirmPassword(text);
    if (password && text !== password) {
      setLocalErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
    } else {
      setLocalErrors(prev => ({ ...prev, confirmPassword: undefined }));
    }
  };

  // Combine server and local errors
  const allErrors = { ...fieldErrors, ...localErrors };
  const canSubmit = username && password && confirmPassword && password === confirmPassword;
  const isProcessing = isSubmitting || loading;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Join SecureChat today</Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Input
        label="Username"
        placeholder="Choose a username"
        value={username}
        onChangeText={handleUsernameChange}
        error={allErrors.username}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        editable={!isProcessing}
      />

      <Input
        label="Password"
        placeholder="Create a password"
        value={password}
        onChangeText={handlePasswordChange}
        error={allErrors.password}
        secureTextEntry
        autoComplete="new-password"
        editable={!isProcessing}
      />

      <Input
        label="Confirm Password"
        placeholder="Confirm your password"
        value={confirmPassword}
        onChangeText={handleConfirmPasswordChange}
        error={allErrors.confirmPassword}
        secureTextEntry
        autoComplete="new-password"
        editable={!isProcessing}
      />

      <Button
        title={isProcessing ? "Creating Account..." : "Create Account"}
        onPress={handleRegister}
        loading={isProcessing}
        disabled={isProcessing || !canSubmit}
        style={styles.registerButton}
      />

      <View style={styles.switchContainer}>
        <Text style={styles.switchText}>Already have an account? </Text>
        <Button
          title="Sign In"
          onPress={onSwitchToLogin}
          variant="secondary"
          size="small"
          disabled={isProcessing}
        />
      </View>

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <Text style={styles.processingText}>
            🔐 Generating encryption keys...
          </Text>
        </View>
      )}
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
  registerButton: {
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
  },
  processingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: UI_CONFIG.COLORS.PRIMARY,
    padding: UI_CONFIG.SPACING.MD,
    alignItems: 'center'
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500'
  }
});