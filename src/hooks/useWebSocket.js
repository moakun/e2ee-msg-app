// src/hooks/useWebSocket.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { WebSocketService } from '../services/network/WebSocketService';
import { useAuth } from '../context/AuthContext';
import { API_CONFIG } from '../utils/constants';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disabled');
  const [lastMessage, setLastMessage] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const { user } = useAuth();
  const messageHandlersRef = useRef(new Set());
  const typingHandlersRef = useRef(new Set());

  useEffect(() => {
    if (user) {
      connectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [user]);

  const connectWebSocket = useCallback(async () => {
    if (!user) return;

    try {
      setConnectionStatus('connecting');
      
      // Only connect if WebSocket URL is properly configured
      const wsUrl = API_CONFIG.WS_URL;
      
      if (!wsUrl || wsUrl.includes('your-server.com') || wsUrl.includes('your-websocket-server.com')) {
        console.log('WebSocket disabled - no server configured');
        setConnectionStatus('disabled');
        setIsConnected(false);
        return;
      }

      if (!wsUrl || wsUrl.includes('192.168.1.108') && wsUrl.includes('3001')) {
      // Check if server is actually running
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
        'demo-token' // Replace with actual auth token
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
        } else {
          setConnectionStatus('connecting');
        }
      }, 1000);

      // Clean up interval
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
  }, []);

  const handleIncomingMessage = useCallback((messageData) => {
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
    // Handle message delivery confirmation
    console.log('Message delivered:', data);
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

  // Join chat room
  const joinChat = useCallback((chatId) => {
    if (connectionStatus !== 'disabled') {
      WebSocketService.joinChat(chatId);
    }
  }, [connectionStatus]);

  // Leave chat room
  const leaveChat = useCallback((chatId) => {
    if (connectionStatus !== 'disabled') {
      WebSocketService.leaveChat(chatId);
    }
  }, [connectionStatus]);

  // Send typing indicator
  const sendTypingIndicator = useCallback((chatId, isTyping) => {
    if (connectionStatus !== 'disabled') {
      WebSocketService.sendTypingIndicator(chatId, isTyping);
    }
  }, [connectionStatus]);

  // Subscribe to message events
  const onMessage = useCallback((handler) => {
    messageHandlersRef.current.add(handler);
    
    // Return unsubscribe function
    return () => {
      messageHandlersRef.current.delete(handler);
    };
  }, []);

  // Subscribe to typing events
  const onTyping = useCallback((handler) => {
    typingHandlersRef.current.add(handler);
    
    // Return unsubscribe function
    return () => {
      typingHandlersRef.current.delete(handler);
    };
  }, []);

  // Get typing users for a specific chat
  const getTypingUsers = useCallback((chatId) => {
    const chatTyping = typingUsers[chatId] || {};
    const now = Date.now();
    const activeTyping = {};

    // Filter out old typing indicators (older than 5 seconds)
    Object.entries(chatTyping).forEach(([userId, data]) => {
      if (now - data.timestamp < 5000) {
        activeTyping[userId] = data;
      }
    });

    return activeTyping;
  }, [typingUsers]);

  // Reconnect manually
  const reconnect = useCallback(() => {
    disconnectWebSocket();
    setTimeout(connectWebSocket, 1000);
  }, [connectWebSocket, disconnectWebSocket]);

  // Enable WebSocket for development
  const enableWebSocket = useCallback(() => {
    WebSocketService.enableWebSocket();
    connectWebSocket();
  }, [connectWebSocket]);

  // Disable WebSocket for development
  const disableWebSocket = useCallback(() => {
    WebSocketService.disableWebSocket();
    setConnectionStatus('disabled');
    setIsConnected(false);
  }, []);

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
    enableWebSocket,
    disableWebSocket
  };
}