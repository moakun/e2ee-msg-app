// src/components/chat/MessageBubble.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function MessageBubble({ message, isMine, showTime }) {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[
      styles.container,
      isMine ? styles.myMessage : styles.otherMessage
    ]}>
      <View style={[
        styles.bubble,
        isMine ? styles.myBubble : styles.otherBubble,
        message.decryptionFailed && styles.errorBubble
      ]}>
        {!isMine && (
          <Text style={styles.senderName}>{message.sender_username}</Text>
        )}
        
        <Text style={[
          styles.messageText,
          isMine ? styles.myText : styles.otherText,
          message.decryptionFailed && styles.errorText
        ]}>
          {message.content}
        </Text>
        
        {showTime && (
          <Text style={[
            styles.timestamp,
            isMine ? styles.myTimestamp : styles.otherTimestamp
          ]}>
            {formatTime(message.timestamp)}
            {message.pending && ' •'}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    maxWidth: '80%'
  },
  myMessage: {
    alignSelf: 'flex-end'
  },
  otherMessage: {
    alignSelf: 'flex-start'
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  myBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 6
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 6
  },
  errorBubble: {
    backgroundColor: '#FFE6E6',
    borderColor: '#FF6B6B',
    borderWidth: 1
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20
  },
  myText: {
    color: '#FFFFFF'
  },
  otherText: {
    color: '#000000'
  },
  errorText: {
    color: '#FF6B6B',
    fontStyle: 'italic'
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4
  },
  myTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right'
  },
  otherTimestamp: {
    color: '#999',
    textAlign: 'left'
  }
});