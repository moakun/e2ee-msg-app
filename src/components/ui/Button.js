// src/components/ui/Button.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { UI_CONFIG } from '../../utils/constants';

export function Button({ 
  title, 
  onPress, 
  variant = 'primary', 
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle 
}) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[variant],
        styles[size],
        disabled && styles.disabled,
        style
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'primary' ? '#FFFFFF' : UI_CONFIG.COLORS.PRIMARY} 
        />
      ) : (
        <Text style={[
          styles.text,
          styles[`${variant}Text`],
          styles[`${size}Text`],
          disabled && styles.disabledText,
          textStyle
        ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row'
  },
  // Variants
  primary: {
    backgroundColor: UI_CONFIG.COLORS.PRIMARY
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: UI_CONFIG.COLORS.PRIMARY
  },
  // Sizes
  small: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36
  },
  medium: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44
  },
  large: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 52
  },
  // States
  disabled: {
    opacity: 0.5
  },
  // Text styles
  text: {
    fontWeight: '600',
    textAlign: 'center'
  },
  primaryText: {
    color: '#FFFFFF'
  },
  secondaryText: {
    color: UI_CONFIG.COLORS.PRIMARY
  },
  smallText: {
    fontSize: 14
  },
  mediumText: {
    fontSize: 16
  },
  largeText: {
    fontSize: 18
  },
  disabledText: {
    opacity: 0.5
  }
});