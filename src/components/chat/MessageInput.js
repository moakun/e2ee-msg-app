// src/components/chat/MessageInput.js - Fixed Layout
import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UI_CONFIG } from '../../utils/constants';

export function MessageInput({ onSendMessage, onTyping, disabled = false }) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef();

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      handleTypingEnd();
    }
  };

  const handleTextChange = (text) => {
    setMessage(text);
    
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      onTyping && onTyping(true);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingEnd();
    }, 2000);
  };

  const handleTypingEnd = () => {
    if (isTyping) {
      setIsTyping(false);
      onTyping && onTyping(false);
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const canSend = message.trim().length > 0 && !disabled;

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={message}
          onChangeText={handleTextChange}
          placeholder={disabled ? "Sending..." : "Type a message..."}
          placeholderTextColor="#999"
          multiline
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          editable={!disabled}
          textAlignVertical="center"
        />
        
        <TouchableOpacity
          style={[
            styles.sendButton,
            canSend ? styles.sendButtonActive : styles.sendButtonInactive
          ]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.7}
        >
          <Ionicons
            name={disabled ? "hourglass-outline" : "send"}
            size={20}
            color={canSend ? '#FFFFFF' : '#999'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: UI_CONFIG.SPACING.MD,
    paddingTop: UI_CONFIG.SPACING.SM,
    paddingBottom: Platform.OS === 'ios' ? UI_CONFIG.SPACING.SM : UI_CONFIG.SPACING.MD,
    backgroundColor: UI_CONFIG.COLORS.SURFACE,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    minHeight: 60
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F1F1F6',
    borderRadius: 20,
    paddingHorizontal: UI_CONFIG.SPACING.MD,
    paddingVertical: UI_CONFIG.SPACING.XS,
    minHeight: 40,
    maxHeight: 120
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    paddingRight: UI_CONFIG.SPACING.SM,
    color: UI_CONFIG.COLORS.TEXT,
    maxHeight: 100
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: UI_CONFIG.SPACING.XS,
    marginBottom: 2
  },
  sendButtonActive: {
    backgroundColor: UI_CONFIG.COLORS.PRIMARY
  },
  sendButtonInactive: {
    backgroundColor: 'transparent'
  }
});