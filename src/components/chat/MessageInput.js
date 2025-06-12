// src/components/chat/MessageInput.js - Enhanced with Smart Replies
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Text
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SmartReplyService } from '../../services/ai/SmartReplyService';
import { UI_CONFIG } from '../../utils/constants';

export function MessageInput({ 
  onSendMessage, 
  onTyping, 
  disabled = false, 
  lastMessage = null,
  conversationContext = [] 
}) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [smartReplies, setSmartReplies] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const typingTimeoutRef = useRef();

  useEffect(() => {
    // Generate smart replies when a new message is received
    if (lastMessage && lastMessage.content && !lastMessage.isMine) {
      generateSmartReplies(lastMessage.content);
    }
  }, [lastMessage]);

  const generateSmartReplies = async (lastMessageText) => {
    try {
      const suggestions = await SmartReplyService.suggestReplies(
        lastMessageText, 
        conversationContext
      );
      setSmartReplies(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error('Failed to generate smart replies:', error);
    }
  };

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      setShowSuggestions(false);
      handleTypingEnd();
    }
  };

  const handleSmartReply = (reply) => {
    onSendMessage(reply);
    setShowSuggestions(false);
    setMessage('');
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

    // Hide smart replies when user starts typing
    if (text.length > 0) {
      setShowSuggestions(false);
    } else if (smartReplies.length > 0) {
      setShowSuggestions(true);
    }
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
      {/* Smart Reply Suggestions */}
      {showSuggestions && smartReplies.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.suggestionsContainer}
          contentContainerStyle={styles.suggestionsContent}
        >
          {smartReplies.map((reply, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionButton}
              onPress={() => handleSmartReply(reply)}
              activeOpacity={0.7}
            >
              <Text style={styles.suggestionText}>{reply}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Message Input */}
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
  suggestionsContainer: {
    marginBottom: UI_CONFIG.SPACING.SM,
    maxHeight: 40
  },
  suggestionsContent: {
    paddingHorizontal: UI_CONFIG.SPACING.SM,
    alignItems: 'center'
  },
  suggestionButton: {
    backgroundColor: '#F0F8FF',
    borderRadius: 20,
    paddingHorizontal: UI_CONFIG.SPACING.MD,
    paddingVertical: UI_CONFIG.SPACING.SM,
    marginRight: UI_CONFIG.SPACING.SM,
    borderWidth: 1,
    borderColor: UI_CONFIG.COLORS.PRIMARY,
    minHeight: 36,
    justifyContent: 'center'
  },
  suggestionText: {
    color: UI_CONFIG.COLORS.PRIMARY,
    fontSize: 14,
    fontWeight: '500'
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