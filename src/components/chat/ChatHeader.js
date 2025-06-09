import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { UI_CONFIG } from '../../utils/constants';

export function ChatHeader({ title, isTyping, onBack, onInfo }) {
  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {isTyping && <Text style={styles.typing}>typing...</Text>}
        </View>
        
        <TouchableOpacity onPress={onInfo} style={styles.infoButton}>
          <Ionicons name="information-circle-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: UI_CONFIG.COLORS.PRIMARY
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: UI_CONFIG.SPACING.MD,
    paddingVertical: UI_CONFIG.SPACING.SM,
    minHeight: 56
  },
  backButton: {
    padding: UI_CONFIG.SPACING.XS,
    marginRight: UI_CONFIG.SPACING.SM
  },
  titleContainer: {
    flex: 1,
    marginRight: UI_CONFIG.SPACING.SM
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  typing: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic'
  },
  infoButton: {
    padding: UI_CONFIG.SPACING.XS
  }
});