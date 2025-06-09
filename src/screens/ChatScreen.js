// src/screens/ChatScreen.js - Fixed to prevent duplicate messages
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  Text
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatHeader } from '../components/chat/ChatHeader';
import { MessageBubble } from '../components/chat/MessageBubble';
import { MessageInput } from '../components/chat/MessageInput';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { DatabaseService } from '../services/database/DatabaseService';
import { CryptoService } from '../services/crypto/CryptoService';
import { WebSocketService } from '../services/network/WebSocketService';
import { UI_CONFIG } from '../utils/constants';

export default function ChatScreen({ route, navigation }) {
  const { chatId, chatName, recipientPublicKey } = route.params;
  const { user, getPrivateKey } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [recipientKey, setRecipientKey] = useState(recipientPublicKey);
  const [processedMessageIds] = useState(new Set()); // Track processed messages
  const flatListRef = useRef();

  useEffect(() => {
    loadMessages();
    loadRecipientKey();
    setupWebSocketHandlers();
    WebSocketService.joinChat(chatId);

    return () => {
      WebSocketService.leaveChat(chatId);
    };
  }, [chatId]);

  const loadRecipientKey = async () => {
    try {
      const key = await DatabaseService.getChatRecipientKey(chatId, user.id);
      if (key) {
        setRecipientKey(key);
      }
    } catch (error) {
      console.error('Failed to load recipient key:', error);
    }
  };

const loadMessages = async () => {
  try {
    setLoading(true);
    console.log('🔄 Loading messages for chat:', chatId);
    
    const chatMessages = await DatabaseService.getChatMessages(chatId);
    console.log(`📊 Raw messages from DB:`, chatMessages);
    
    if (chatMessages.length > 0) {
      const decryptedMessages = await decryptMessages(chatMessages);
      console.log(`🔓 Decrypted messages:`, decryptedMessages);
      
      // Add all message IDs to processed set
      decryptedMessages.forEach(msg => {
        processedMessageIds.add(msg.id.toString());
      });
      
      setMessages(decryptedMessages);
    } else {
      console.log('📭 No messages found for this chat');
      setMessages([]);
    }
  } catch (error) {
    console.error('❌ Failed to load messages:', error);
    Alert.alert('Error', 'Failed to load messages');
    setMessages([]);
  } finally {
    setLoading(false);
  }
};

  const decryptMessages = async (encryptedMessages) => {
    const privateKey = await getPrivateKey();
    if (!privateKey) return [];

    const decryptedMessages = [];
    
    for (const message of encryptedMessages) {
      try {
        let decryptedContent;
        
        try {
          const encryptedData = JSON.parse(message.encrypted_content);
          decryptedContent = await CryptoService.decryptMessage(encryptedData, privateKey);
        } catch (decryptError) {
          console.warn('Decryption failed, using plain text:', decryptError);
          decryptedContent = message.encrypted_content;
        }
        
        decryptedMessages.push({
          ...message,
          content: decryptedContent,
          isMine: message.sender_id === user.id
        });
      } catch (error) {
        console.error('Failed to process message:', error);
        decryptedMessages.push({
          ...message,
          content: '[Message could not be decrypted]',
          isMine: message.sender_id === user.id,
          decryptionFailed: true
        });
      }
    }
    
    return decryptedMessages;
  };

  const setupWebSocketHandlers = () => {
    WebSocketService.setMessageHandler(handleNewMessage);
    WebSocketService.setTypingHandler(handleTypingIndicator);
  };

// Update handleNewMessage to log more:
const handleNewMessage = async (data) => {
  console.log('📨 Received WebSocket message:', data);
  
  if (data.chatId !== chatId) {
    console.log('🚫 Message for different chat, ignoring');
    return;
  }
  
  try {
    // Generate consistent message ID
    const messageId = data.messageId || `${data.timestamp}_${data.senderId}`;
    
    // Skip if we already processed this message
    if (processedMessageIds.has(messageId)) {
      console.log('⏭️ Message already processed, skipping:', messageId);
      return;
    }
    
    // Skip if it's our own message (we already have it as optimistic)
    if (data.senderId === user.id) {
      console.log('⏭️ Skipping own message from WebSocket');
      return;
    }
    
    console.log('🔓 Decrypting incoming message...');
    
    // Add to processed set
    processedMessageIds.add(messageId);
    
    const privateKey = await getPrivateKey();
    let decryptedContent;
    
    try {
      decryptedContent = await CryptoService.decryptMessage(
        JSON.parse(data.encryptedContent), 
        privateKey
      );
      console.log('✅ Message decrypted successfully');
    } catch {
      console.warn('⚠️ Decryption failed, using plain text');
      decryptedContent = data.encryptedContent;
    }
    
    const newMessage = {
      id: messageId,
      chat_id: chatId,
      sender_id: data.senderId,
      sender_username: data.senderUsername,
      content: decryptedContent,
      timestamp: data.timestamp,
      isMine: false
    };
    
    console.log('➕ Adding new message to state:', newMessage);
    
    // Add message to state
    setMessages(prev => {
      // Double check it doesn't exist
      const exists = prev.some(msg => msg.id === messageId);
      if (exists) {
        console.log('⚠️ Message already exists in state');
        return prev;
      }
      return [...prev, newMessage];
    });
    
    // Save to local database
    console.log('💾 Saving incoming message to database');
    await DatabaseService.saveMessage({
      chatId,
      senderId: data.senderId,
      encryptedContent: data.encryptedContent,
      messageType: 'text',
      timestamp: data.timestamp
    });
    
    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
  } catch (error) {
    console.error('❌ Failed to handle new message:', error);
  }
};

const debugDatabase = async () => {
  try {
    // Check if chat exists
    const chatCheck = await DatabaseService.db.getFirstAsync(
      'SELECT * FROM chats WHERE id = ?',
      [chatId]
    );
    console.log('📋 Chat exists:', chatCheck);

    // Check participants
    const participants = await DatabaseService.db.getAllAsync(
      'SELECT * FROM chat_participants WHERE chat_id = ?',
      [chatId]
    );
    console.log('👥 Chat participants:', participants);

    // Check raw messages in database
    const rawMessages = await DatabaseService.db.getAllAsync(
      'SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp DESC LIMIT 10',
      [chatId]
    );
    console.log('💬 Raw messages in DB:', rawMessages);

    // Check if current user is in users table
    const currentUser = await DatabaseService.db.getFirstAsync(
      'SELECT * FROM users WHERE id = ?',
      [user.id]
    );
    console.log('👤 Current user in DB:', currentUser);

  } catch (error) {
    console.error('❌ Debug database error:', error);
  }
};

// Call this in useEffect for debugging:
useEffect(() => {
  loadMessages();
  loadRecipientKey();
  setupWebSocketHandlers();
  WebSocketService.joinChat(chatId);
  
  // Debug database
  debugDatabase();

  return () => {
    WebSocketService.leaveChat(chatId);
  };
}, [chatId]);

  const handleTypingIndicator = (data) => {
    if (data.chatId === chatId && data.userId !== user.id) {
      setIsTyping(data.isTyping);
    }
  };

// Update the sendMessage function with more logging:
const sendMessage = async (messageText) => {
  if (!messageText.trim() || sendingMessage) return;

  setSendingMessage(true);
  console.log('📤 Sending message:', messageText);
  
  try {
    const timestamp = Date.now();
    const messageId = `${timestamp}_${user.id}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Create optimistic message
    const optimisticMessage = {
      id: messageId,
      chat_id: chatId,
      sender_id: user.id,
      sender_username: user.username,
      content: messageText.trim(),
      timestamp: timestamp,
      isMine: true,
      pending: true
    };
    
    console.log('➕ Adding optimistic message:', optimisticMessage);
    
    // Add to processed IDs
    processedMessageIds.add(messageId);
    
    // Add to UI immediately
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Prepare encrypted content
    let encryptedContent;
    
    try {
      const encryptedData = await CryptoService.encryptMessage(
        messageText.trim(), 
        recipientKey || user.publicKey
      );
      encryptedContent = JSON.stringify(encryptedData);
      console.log('🔐 Message encrypted successfully');
    } catch (encryptError) {
      console.warn('⚠️ Encryption failed, sending plain text:', encryptError);
      encryptedContent = messageText.trim();
    }
    
    // Save to local database FIRST
    const messageData = {
      chatId,
      senderId: user.id,
      encryptedContent,
      messageType: 'text',
      timestamp: timestamp
    };
    
    console.log('💾 Saving to database:', messageData);
    const savedMessageId = await DatabaseService.saveMessage(messageData);
    console.log('✅ Message saved with ID:', savedMessageId);
    
    // Send via WebSocket with the database ID
    const wsMessageData = {
      messageId: savedMessageId || messageId,
      chatId,
      senderId: user.id,
      senderUsername: user.username,
      encryptedContent,
      messageType: 'text',
      timestamp: timestamp
    };
    
    console.log('🌐 Sending via WebSocket:', wsMessageData);
    WebSocketService.sendMessage(wsMessageData);
    
    // Update message to remove pending status
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, pending: false, id: savedMessageId || messageId }
          : msg
      )
    );
    
  } catch (error) {
    console.error('❌ Failed to send message:', error);
    Alert.alert('Error', 'Failed to send message: ' + error.message);
    
    // Remove the failed message
    setMessages(prev => prev.filter(msg => !msg.pending));
  } finally {
    setSendingMessage(false);
  }
};

  const handleTyping = (isTyping) => {
    WebSocketService.sendTypingIndicator(chatId, isTyping);
  };

  const renderMessage = ({ item }) => (
    <MessageBubble
      message={item}
      isMine={item.isMine}
      showTime={true}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>
        No messages yet. Start the conversation!
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ChatHeader 
          title={chatName}
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <LoadingSpinner text="Loading messages..." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ChatHeader 
        title={chatName}
        isTyping={isTyping}
        onBack={() => navigation.goBack()}
        onInfo={() => Alert.alert('Chat Info', `Chat: ${chatName}\nID: ${chatId}`)}
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          style={styles.messagesList}
          contentContainerStyle={[
            styles.messagesContent,
            messages.length === 0 && styles.emptyMessagesContent
          ]}
          ListEmptyComponent={renderEmptyState}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          onLayout={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          showsVerticalScrollIndicator={false}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10
          }}
        />
        
        <MessageInput
          onSendMessage={sendMessage}
          onTyping={handleTyping}
          disabled={sendingMessage}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_CONFIG.COLORS.BACKGROUND
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  keyboardView: {
    flex: 1
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: UI_CONFIG.SPACING.MD
  },
  messagesContent: {
    paddingVertical: UI_CONFIG.SPACING.MD,
    flexGrow: 1
  },
  emptyMessagesContent: {
    flex: 1,
    justifyContent: 'center'
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: UI_CONFIG.SPACING.XL
  },
  emptyStateText: {
    fontSize: 16,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    fontStyle: 'italic'
  }
});