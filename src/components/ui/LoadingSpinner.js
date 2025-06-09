import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { UI_CONFIG } from '../../utils/constants';

export function LoadingSpinner({ 
  size = 'large', 
  color = UI_CONFIG.COLORS.PRIMARY, 
  text,
  style 
}) {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: UI_CONFIG.SPACING.LG
  },
  text: {
    marginTop: UI_CONFIG.SPACING.SM,
    fontSize: 16,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center'
  }
});