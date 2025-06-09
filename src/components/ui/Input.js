// src/components/ui/Input.js
import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UI_CONFIG } from '../../utils/constants';

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  error,
  style,
  inputStyle,
  ...props
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);
  const [isFocused, setIsFocused] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        error && styles.inputContainerError
      ]}>
        <TextInput
          style={[styles.input, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={togglePasswordVisibility}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off' : 'eye'}
              size={20}
              color="#999"
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: UI_CONFIG.SPACING.MD
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: UI_CONFIG.COLORS.TEXT,
    marginBottom: UI_CONFIG.SPACING.XS
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: UI_CONFIG.COLORS.SURFACE
  },
  inputContainerFocused: {
    borderColor: UI_CONFIG.COLORS.PRIMARY
  },
  inputContainerError: {
    borderColor: UI_CONFIG.COLORS.ERROR
  },
  input: {
    flex: 1,
    paddingHorizontal: UI_CONFIG.SPACING.MD,
    paddingVertical: 12,
    fontSize: 16,
    color: UI_CONFIG.COLORS.TEXT
  },
  passwordToggle: {
    padding: UI_CONFIG.SPACING.MD
  },
  errorText: {
    fontSize: 14,
    color: UI_CONFIG.COLORS.ERROR,
    marginTop: UI_CONFIG.SPACING.XS
  }
});