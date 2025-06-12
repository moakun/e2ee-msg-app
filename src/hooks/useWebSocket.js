// src/hooks/useWebSocket.js - Enhanced with Better Chat Management
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
  const connectionCheckInterval = useRef(null);
  const joinedChatsRef = useRef(new Set());

  useEffect(() => {
    if (user) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
      if (connectionCheckInterval.current) {
        clearInterval(connectionCheckInterval.current);
      }
    };
  }, [user]);

  // Monitor connection and auto-join status
  useEffect(() => {
    if (connectionCheckInterval.current) {
      clearInterval(connectionCheckInterval.current);
    }

    connectionCheckInterval.current = setInterval(() => {
      checkConnectionStatus();
    }, 2000); // Check every 2 seconds

    return () => {
      if (connectionCheckInterval.current) {
        clearInterval(connectionCheckInterval.current);
      }
    };
  }, [user]);

  const checkConnectionStatus = useCallback(() => {
    if (!user) {
      setConnectionStatus('disabled');
      setIsConnected(false);
      return;
    }

    const status = WebSocketService.getConnectionStatus();
    
    setIsConnected(status.connected);
    
    if (!status.enabled) {
      setConnectionStatus('disabled');
    } else if (status.connected) {
      setConnectionStatus('connected');
      
      // Update joined chats reference
      joinedChatsRef.current = new Set(status.joinedChats);
      
      // Check if auto-join completed
      if (!hasAutoJoinedRef.current && status.autoJoinCompleted) {
        hasAutoJoinedRef.current = true;
        console.log('✅ Auto-join completed via status check');
      }
    } else {
      setConnectionStatus('connecting');
      hasAutoJoinedRef.current = false;
    }
  }, [user]);

  const connectWebSocket = useCallback(async () => {
    if (!user) return;

    try {
      setConnectionStatus('connecting');
      hasAutoJoinedRef.current = false;
      
      const wsUrl = API_CONFIG.WS_URL;
      
      if (!wsUrl || wsUrl.includes('your-server.com') || wsUrl.includes('your-websocket-server.com')) {
        console.log('WebSocket disabled - no server configured');
        setConnectionStatus('disabled');
        setIsConnected(false);
        return;
      }

      // Test backend connectivity first
      if (wsUrl.includes('192.168.1.108') && wsUrl.includes('3001')) {
        try {
          const testResponse = await fetch('http://192.168.1.108:3001/health', {
            timeout: 5000
          });
          if (!testResponse || !testResponse.ok) {
            console.log('WebSocket disabled - backend server not reachable');
            setConnectionStatus('disabled');
            return;
          }
        } catch (error) {
          console.log('WebSocket disabled - backend connectivity test failed');
          setConnectionStatus('disabled');
          return;
        }
      }

      // Connect to WebSocket server
      await WebSocketService.connect(
        wsUrl,
        user.id,
        user.username
      );

      // Set up event handlers
      WebSocketService.setMessageHandler(handleIncomingMessage);
      WebSocketService.setTypingHandler(handleTypingIndicator);
      WebSocketService.setDeliveryHandler(handleMessageDelivery);
      
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
    joinedChatsRef.current.clear();
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

  // IMPROVED: Send message with chat join verification
  const sendMessage = useCallback(async (messageData) => {
    if (connectionStatus === 'disabled') {
      console.log('WebSocket disabled - message saved locally only');
      return;
    }
    
    // Ensure user is in the chat before sending
    const chatId = messageData.chatId;
    if (!joinedChatsRef.current.has(chatId.toString())) {
      console.log(`🔄 User not in chat ${chatId}, joining before sending...`);
      const joined = await WebSocketService.ensureInChat(chatId);
      if (joined) {
        joinedChatsRef.current.add(chatId.toString());
      } else {
        console.warn(`❌ Failed to join chat ${chatId}, sending anyway`);
      }
    }
    
    WebSocketService.sendMessage(messageData);
  }, [connectionStatus]);

  // IMPROVED: Join specific chat room with verification
  const joinChat = useCallback(async (chatId) => {
    if (connectionStatus === 'disabled') return false;
    
    const chatIdStr = chatId.toString();
    
    if (joinedChatsRef.current.has(chatIdStr)) {
      console.log(`⏭️ Already in chat: ${chatId}`);
      return true;
    }
    
    console.log(`🚪 Joining chat: ${chatId}`);
    const success = await WebSocketService.joinChat(chatId);
    
    if (success) {
      joinedChatsRef.current.add(chatIdStr);
      console.log(`✅ Successfully joined chat: ${chatId}`);
    } else {
      console.error(`❌ Failed to join chat: ${chatId}`);
    }
    
    return success;
  }, [connectionStatus]);

  // Leave chat room
  const leaveChat = useCallback((chatId) => {
    // Note: We keep users in chats for message delivery
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
    joinedChatsRef.current.clear();
    disconnectWebSocket();
    setTimeout(connectWebSocket, 1000);
  }, [connectWebSocket, disconnectWebSocket]);

  // NEW: Manually trigger auto-join for user's chats
  const autoJoinUserChats = useCallback(async () => {
    if (!isConnected || !user) {
      console.log('❌ Cannot auto-join: not connected or no user');
      return false;
    }
    
    try {
      console.log('🔄 Manually triggering auto-join...');
      const success = await WebSocketService.forceRejoinChats();
      
      if (success) {
        // Update our local reference
        const status = WebSocketService.getConnectionStatus();
        joinedChatsRef.current = new Set(status.joinedChats);
        hasAutoJoinedRef.current = true;
      }
      
      return success;
    } catch (error) {
      console.error('Manual auto-join failed:', error);
      return false;
    }
  }, [isConnected, user]);

  // NEW: Check if user is in a specific chat
  const isInChat = useCallback((chatId) => {
    return joinedChatsRef.current.has(chatId.toString());
  }, []);

  // NEW: Force rejoin a specific chat
  const rejoinChat = useCallback(async (chatId) => {
    const chatIdStr = chatId.toString();
    joinedChatsRef.current.delete(chatIdStr);
    
    const success = await joinChat(chatId);
    return success;
  }, [joinChat]);

  // NEW: Get connection debug info
  const getDebugInfo = useCallback(() => {
    const wsStatus = WebSocketService.getDebugInfo();
    return {
      ...wsStatus,
      localJoinedChats: Array.from(joinedChatsRef.current),
      hasAutoJoined: hasAutoJoinedRef.current,
      connectionStatus
    };
  }, [connectionStatus]);

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
    autoJoinUserChats,
    isInChat,
    rejoinChat,
    getDebugInfo
  };
}