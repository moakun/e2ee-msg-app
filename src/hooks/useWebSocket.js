// src/hooks/useWebSocket.js - Enhanced with Auto-Join
import { useState, useEffect, useRef, useCallback } from 'react';
import { WebSocketService } from '../services/network/WebSocketService';
import { useAuth } from '../context/AuthContext';
import { DatabaseService } from '../services/database/DatabaseService';
import { API_CONFIG } from '../utils/constants';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disabled');
  const [lastMessage, setLastMessage] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const { user } = useAuth();
  const messageHandlersRef = useRef(new Set());
  const typingHandlersRef = useRef(new Set());
  const hasAutoJoinedRef = useRef(false);

  useEffect(() => {
    if (user) {
      connectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [user]);

  // Auto-join all user chats when connected
  useEffect(() => {
    if (isConnected && user && !hasAutoJoinedRef.current) {
      autoJoinUserChats();
      hasAutoJoinedRef.current = true;
    }
  }, [isConnected, user]);

  const autoJoinUserChats = async () => {
    try {
      console.log('🔄 Auto-joining user chats...');
      
      // Get all user's chats from local database
      const userChats = await DatabaseService.getUserChats(user.id);
      
      if (userChats.length === 0) {
        console.log('📭 No chats found to join');
        return;
      }

      // Join each chat room
      for (const chat of userChats) {
        console.log(`🚪 Auto-joining chat: ${chat.name} (ID: ${chat.id})`);
        WebSocketService.joinChat(chat.id);
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`✅ Auto-joined ${userChats.length} chats`);
    } catch (error) {
      console.error('❌ Failed to auto-join chats:', error);
    }
  };

  // Re-join chats when new ones are created
  const joinNewChat = useCallback((chatId) => {
    if (isConnected) {
      console.log(`🆕 Joining new chat: ${chatId}`);
      WebSocketService.joinChat(chatId);
    }
  }, [isConnected]);

  const connectWebSocket = useCallback(async () => {
    if (!user) return;

    try {
      setConnectionStatus('connecting');
      
      const wsUrl = API_CONFIG.WS_URL;
      
      if (!wsUrl || wsUrl.includes('your-server.com') || wsUrl.includes('your-websocket-server.com')) {
        console.log('WebSocket disabled - no server configured');
        setConnectionStatus('disabled');
        setIsConnected(false);
        return;
      }

      if (!wsUrl || wsUrl.includes('192.168.1.108') && wsUrl.includes('3001')) {
        const testResponse = await fetch('http://192.168.1.108:3001/health').catch(() => null);
        if (!testResponse || !testResponse.ok) {
          console.log('WebSocket disabled - backend server not reachable');
          setConnectionStatus('disabled');
          return;
        }
      }

      // Connect to WebSocket server
      WebSocketService.connect(
        wsUrl,
        user.id,
        user.username // Pass username instead of token
      );

      // Set up event handlers
      WebSocketService.setMessageHandler(handleIncomingMessage);
      WebSocketService.setTypingHandler(handleTypingIndicator);
      WebSocketService.setDeliveryHandler(handleMessageDelivery);

      // Check connection status periodically
      const statusInterval = setInterval(() => {
        const status = WebSocketService.getConnectionStatus();
        setIsConnected(status.connected);
        
        if (!status.enabled) {
          setConnectionStatus('disabled');
        } else if (status.connected) {
          setConnectionStatus('connected');
          
          // Auto-join chats when connection is established
          if (!hasAutoJoinedRef.current) {
            autoJoinUserChats();
            hasAutoJoinedRef.current = true;
          }
        } else {
          setConnectionStatus('connecting');
          hasAutoJoinedRef.current = false; // Reset auto-join flag
        }
      }, 1000);

      return () => clearInterval(statusInterval);
      
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      setConnectionStatus('error');
      setIsConnected(false);
    }
  }, [user]);

  const disconnectWebSocket = useCallback(() => {
    WebSocketService.disconnect();
    setIsConnected(false);
    setConnectionStatus('disconnected');
    hasAutoJoinedRef.current = false;
  }, []);

  const handleIncomingMessage = useCallback((messageData) => {
    console.log('📨 Received message for chat:', messageData.chatId);
    setLastMessage(messageData);
    
    // Notify all registered message handlers
    messageHandlersRef.current.forEach(handler => {
      try {
        handler(messageData);
      } catch (error) {
        console.error('Message handler error:', error);
      }
    });
  }, []);

  const handleTypingIndicator = useCallback((data) => {
    const { chatId, userId, username, isTyping } = data;
    
    setTypingUsers(prev => {
      const chatTyping = prev[chatId] || {};
      
      if (isTyping) {
        chatTyping[userId] = { username, timestamp: Date.now() };
      } else {
        delete chatTyping[userId];
      }
      
      return {
        ...prev,
        [chatId]: chatTyping
      };
    });

    // Notify typing handlers
    typingHandlersRef.current.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error('Typing handler error:', error);
      }
    });
  }, []);

  const handleMessageDelivery = useCallback((data) => {
    console.log('✅ Message delivered:', data);
  }, []);

  // Send message (works even if WebSocket is disabled)
  const sendMessage = useCallback((messageData) => {
    if (connectionStatus === 'disabled') {
      console.log('WebSocket disabled - message saved locally only');
      return;
    }
    
    if (!isConnected) {
      console.warn('WebSocket not connected, message queued');
    }
    
    WebSocketService.sendMessage(messageData);
  }, [isConnected, connectionStatus]);

  // Join specific chat room (for when user opens a chat)
  const joinChat = useCallback((chatId) => {
    if (connectionStatus !== 'disabled') {
      WebSocketService.joinChat(chatId);
    }
  }, [connectionStatus]);

  // Leave chat room (for when user closes a chat)
  const leaveChat = useCallback((chatId) => {
    // Note: We don't actually leave the room anymore to ensure message delivery
    // Users stay joined to all their chats for real-time updates
    console.log(`📌 Keeping user in chat ${chatId} for message delivery`);
  }, []);

  // Send typing indicator
  const sendTypingIndicator = useCallback((chatId, isTyping) => {
    if (connectionStatus !== 'disabled') {
      WebSocketService.sendTypingIndicator(chatId, isTyping);
    }
  }, [connectionStatus]);

  // Subscribe to message events
  const onMessage = useCallback((handler) => {
    messageHandlersRef.current.add(handler);
    
    return () => {
      messageHandlersRef.current.delete(handler);
    };
  }, []);

  // Subscribe to typing events
  const onTyping = useCallback((handler) => {
    typingHandlersRef.current.add(handler);
    
    return () => {
      typingHandlersRef.current.delete(handler);
    };
  }, []);

  // Get typing users for a specific chat
  const getTypingUsers = useCallback((chatId) => {
    const chatTyping = typingUsers[chatId] || {};
    const now = Date.now();
    const activeTyping = {};

    Object.entries(chatTyping).forEach(([userId, data]) => {
      if (now - data.timestamp < 5000) {
        activeTyping[userId] = data;
      }
    });

    return activeTyping;
  }, [typingUsers]);

  // Reconnect manually
  const reconnect = useCallback(() => {
    hasAutoJoinedRef.current = false;
    disconnectWebSocket();
    setTimeout(connectWebSocket, 1000);
  }, [connectWebSocket, disconnectWebSocket]);

  return {
    isConnected,
    connectionStatus,
    lastMessage,
    sendMessage,
    joinChat,
    leaveChat,
    sendTypingIndicator,
    onMessage,
    onTyping,
    getTypingUsers,
    reconnect,
    connect: connectWebSocket,
    disconnect: disconnectWebSocket,
    joinNewChat, // Export this for when new chats are created
    autoJoinUserChats // Export for manual triggering if needed
  };
}