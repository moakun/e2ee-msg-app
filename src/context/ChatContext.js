import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { DatabaseService } from '../services/database/DatabaseService';
import { CryptoService } from '../services/crypto/CryptoService';

const ChatContext = createContext();

const initialState = {
  chats: [],
  currentChat: null,
  messages: {},
  loading: false,
  error: null,
  typingUsers: {}
};

function chatReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_CHATS':
      return { ...state, chats: action.payload, loading: false };
    
    case 'ADD_CHAT':
      return { 
        ...state, 
        chats: [action.payload, ...state.chats] 
      };
    
    case 'SET_CURRENT_CHAT':
      return { ...state, currentChat: action.payload };
    
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.chatId]: action.payload.messages
        }
      };
    
    case 'ADD_MESSAGE':
      const { chatId, message } = action.payload;
      const chatMessages = state.messages[chatId] || [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [chatId]: [...chatMessages, message]
        }
      };
    
    case 'UPDATE_MESSAGE':
      const { chatId: updateChatId, messageId, updates } = action.payload;
      const existingMessages = state.messages[updateChatId] || [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [updateChatId]: existingMessages.map(msg =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          )
        }
      };
    
    case 'SET_TYPING_USERS':
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [action.payload.chatId]: action.payload.users
        }
      };
    
    default:
      return state;
  }
}

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { user, getPrivateKey } = useAuth();
  const { 
    sendMessage: wsSendMessage, 
    joinChat: wsJoinChat,
    leaveChat: wsLeaveChat,
    sendTypingIndicator,
    onMessage,
    onTyping
  } = useWebSocket();

  useEffect(() => {
    if (user) {
      loadUserChats();
    }
  }, [user]);

  useEffect(() => {
    // Subscribe to WebSocket events
    const unsubscribeMessage = onMessage(handleIncomingMessage);
    const unsubscribeTyping = onTyping(handleTypingIndicator);

    return () => {
      unsubscribeMessage();
      unsubscribeTyping();
    };
  }, [onMessage, onTyping]);

  const loadUserChats = async () => {
    if (!user) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const chats = await DatabaseService.getUserChats(user.id);
      dispatch({ type: 'SET_CHATS', payload: chats });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  const loadChatMessages = async (chatId) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const encryptedMessages = await DatabaseService.getChatMessages(chatId);
      const decryptedMessages = await decryptMessages(encryptedMessages);
      
      dispatch({ 
        type: 'SET_MESSAGES', 
        payload: { chatId, messages: decryptedMessages } 
      });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  const decryptMessages = async (encryptedMessages) => {
    const privateKey = await getPrivateKey();
    if (!privateKey) return [];

    const decryptedMessages = [];
    
    for (const message of encryptedMessages) {
      try {
        const encryptedData = JSON.parse(message.encrypted_content);
        const decryptedContent = await CryptoService.decryptMessage(
          encryptedData, 
          privateKey
        );
        
        decryptedMessages.push({
          ...message,
          content: decryptedContent,
          isMine: message.sender_id === user.id
        });
      } catch (error) {
        console.error('Failed to decrypt message:', error);
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

  const sendMessage = async (chatId, messageText, recipientPublicKey) => {
    try {
      // Encrypt message
      const encryptedData = await CryptoService.encryptMessage(
        messageText, 
        recipientPublicKey
      );
      
      const messageData = {
        chatId,
        senderId: user.id,
        senderUsername: user.username,
        encryptedContent: JSON.stringify(encryptedData),
        messageType: 'text',
        timestamp: Date.now()
      };

      // Send via WebSocket
      wsSendMessage(messageData);
      
      // Add optimistic message to state
      const optimisticMessage = {
        id: `temp_${Date.now()}`,
        chat_id: chatId,
        sender_id: user.id,
        sender_username: user.username,
        content: messageText,
        timestamp: messageData.timestamp,
        isMine: true,
        pending: true
      };
      
      dispatch({ 
        type: 'ADD_MESSAGE', 
        payload: { chatId, message: optimisticMessage } 
      });
      
      // Save to local database
      await DatabaseService.saveMessage(messageData);
      
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const createChat = async (chatData) => {
    try {
      const chatId = await DatabaseService.createChat({
        ...chatData,
        createdBy: user.id
      });
      
      const newChat = {
        id: chatId,
        ...chatData,
        created_by: user.id,
        created_at: Date.now(),
        updated_at: Date.now()
      };
      
      dispatch({ type: 'ADD_CHAT', payload: newChat });
      return chatId;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const joinChat = (chatId) => {
    wsJoinChat(chatId);
    dispatch({ type: 'SET_CURRENT_CHAT', payload: chatId });
  };

  const leaveChat = (chatId) => {
    wsLeaveChat(chatId);
    if (state.currentChat === chatId) {
      dispatch({ type: 'SET_CURRENT_CHAT', payload: null });
    }
  };

  const handleIncomingMessage = async (messageData) => {
    try {
      const privateKey = await getPrivateKey();
      const decryptedContent = await CryptoService.decryptMessage(
        JSON.parse(messageData.encryptedContent), 
        privateKey
      );
      
      const newMessage = {
        id: messageData.messageId,
        chat_id: messageData.chatId,
        sender_id: messageData.senderId,
        sender_username: messageData.senderUsername,
        content: decryptedContent,
        timestamp: messageData.timestamp,
        isMine: messageData.senderId === user.id
      };
      
      dispatch({ 
        type: 'ADD_MESSAGE', 
        payload: { chatId: messageData.chatId, message: newMessage } 
      });
      
      // Save to local database
      await DatabaseService.saveMessage({
        chatId: messageData.chatId,
        senderId: messageData.senderId,
        encryptedContent: messageData.encryptedContent,
        messageType: 'text',
        timestamp: messageData.timestamp
      });
      
    } catch (error) {
      console.error('Failed to handle incoming message:', error);
    }
  };

  const handleTypingIndicator = (data) => {
    const { chatId, userId, username, isTyping } = data;
    
    if (userId === user.id) return; // Ignore own typing
    
    const currentTyping = state.typingUsers[chatId] || {};
    let updatedTyping = { ...currentTyping };
    
    if (isTyping) {
      updatedTyping[userId] = { username, timestamp: Date.now() };
    } else {
      delete updatedTyping[userId];
    }
    
    dispatch({
      type: 'SET_TYPING_USERS',
      payload: { chatId, users: updatedTyping }
    });
  };

  const startTyping = (chatId) => {
    sendTypingIndicator(chatId, true);
  };

  const stopTyping = (chatId) => {
    sendTypingIndicator(chatId, false);
  };

  const getTypingUsersForChat = (chatId) => {
    const typingUsers = state.typingUsers[chatId] || {};
    const now = Date.now();
    
    // Filter out stale typing indicators (older than 5 seconds)
    const activeTyping = Object.entries(typingUsers)
      .filter(([_, data]) => now - data.timestamp < 5000)
      .reduce((acc, [userId, data]) => {
        acc[userId] = data;
        return acc;
      }, {});
    
    return Object.values(activeTyping).map(data => data.username);
  };

  const markMessageAsRead = async (messageId, chatId) => {
    try {
      // Mark as read locally
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: {
          chatId,
          messageId,
          updates: { read: true, readAt: Date.now() }
        }
      });
      
      // Mark as read on server (if implemented)
      // await ApiService.markMessageAsRead(messageId, token);
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  const deleteMessage = async (messageId, chatId) => {
    try {
      // Remove from local state
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: {
          chatId,
          messageId,
          updates: { deleted: true, deletedAt: Date.now() }
        }
      });
      
      // Delete from server (if implemented)
      // await ApiService.deleteMessage(messageId, token);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const value = {
    ...state,
    loadUserChats,
    loadChatMessages,
    sendMessage,
    createChat,
    joinChat,
    leaveChat,
    startTyping,
    stopTyping,
    getTypingUsersForChat,
    markMessageAsRead,
    deleteMessage,
    clearError: () => dispatch({ type: 'SET_ERROR', payload: null })
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};