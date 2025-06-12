// src/services/network/WebSocketService.js - FIXED Auto-Join
import io from 'socket.io-client';
import { NetworkOptimizer } from './NetworkOptimizer';
import { Storage } from '../../utils/storage';

class WebSocketServiceClass {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.messageQueue = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.networkOptimizer = new NetworkOptimizer();
    this.isEnabled = false;
    this.authToken = null;
    this.processedMessages = new Set();
    this.joinedChats = new Set();
    this.userId = null;
    this.username = null;
    this.autoJoinCompleted = false;
  }

  async connect(serverUrl, userId, username) {
    this.userId = userId;
    this.username = username;
    this.autoJoinCompleted = false;

    if (!serverUrl || serverUrl.includes('your-server.com')) {
      console.log('WebSocket disabled: No server configured');
      this.isEnabled = false;
      return;
    }

    try {
      this.authToken = await Storage.getSecureString('authToken');
      if (!this.authToken) {
        console.log('WebSocket disabled: No auth token');
        this.isEnabled = false;
        return;
      }

      this.isEnabled = true;
      console.log('🔌 Connecting to WebSocket server:', serverUrl);
      
      this.socket = io(serverUrl, {
        auth: {
          userId,
          username,
          token: this.authToken
        },
        transports: ['websocket'],
        timeout: 20000,
        autoConnect: false
      });

      this.setupEventListeners();
      this.socket.connect();
      
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.isEnabled = false;
    }
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.processMessageQueue();
      
      // Authenticate immediately
      this.socket.emit('authenticate', {
        userId: this.userId,
        username: this.username,
        token: this.authToken
      });
    });

    this.socket.on('authenticated', async (data) => {
      if (data.success) {
        console.log('✅ WebSocket authentication successful');
        
        // IMPORTANT: Auto-join ALL user chats immediately after authentication
        if (!this.autoJoinCompleted) {
          await this.autoJoinUserChats();
          this.autoJoinCompleted = true;
        }
      } else {
        console.error('❌ WebSocket authentication failed');
        this.disconnect();
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from WebSocket server:', reason);
      this.isConnected = false;
      this.joinedChats.clear();
      this.autoJoinCompleted = false;
      
      if (reason !== 'io client disconnect') {
        this.handleReconnection();
      }
    });

    // CRITICAL: Listen for new messages on ALL joined chats
    this.socket.on('new_message', (data) => {
      console.log(`📨 Received message for chat ${data.chatId} from ${data.senderUsername}`);
      this.handleIncomingMessage(data);
    });

    this.socket.on('joined_chat', (data) => {
      console.log(`✅ Successfully joined chat: ${data.chatId}`);
      this.joinedChats.add(data.chatId.toString());
    });

    this.socket.on('message_delivered', (data) => {
      this.handleMessageDelivery(data);
    });

    this.socket.on('user_typing', (data) => {
      this.handleTypingIndicator(data);
    });

    this.socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
  }

  // FIXED: Auto-join all user chats with proper error handling
  async autoJoinUserChats() {
    if (!this.isConnected || !this.userId) {
      console.log('❌ Cannot auto-join: not connected or no user ID');
      return;
    }

    try {
      console.log('🔄 Starting auto-join process...');
      
      // Dynamic import to avoid circular dependency
      const { DatabaseService } = await import('../database/DatabaseService');
      
      // Get user's chats
      const userChats = await DatabaseService.getUserChats(this.userId);
      console.log(`📋 Found ${userChats.length} chats to join`);
      
      if (userChats.length === 0) {
        console.log('📭 No chats found for auto-join');
        this.autoJoinCompleted = true;
        return;
      }

      // Join each chat with delay to avoid overwhelming server
      for (const chat of userChats) {
        const chatIdStr = chat.id.toString();
        
        if (!this.joinedChats.has(chatIdStr)) {
          console.log(`🚪 Auto-joining chat: "${chat.name}" (ID: ${chat.id})`);
          
          // Emit join_chat event
          this.socket.emit('join_chat', { chatId: chat.id });
          
          // Optimistically add to joined set
          this.joinedChats.add(chatIdStr);
          
          // Small delay between joins
          await new Promise(resolve => setTimeout(resolve, 200));
        } else {
          console.log(`⏭️ Already in chat: ${chat.id}`);
        }
      }
      
      console.log(`✅ Auto-join completed! Joined ${userChats.length} chats`);
      console.log(`📊 Total joined chats: ${this.joinedChats.size}`);
      this.autoJoinCompleted = true;
      
    } catch (error) {
      console.error('❌ Auto-join failed:', error);
      this.autoJoinCompleted = true; // Prevent infinite retries
    }
  }

  sendMessage(messageData) {
    if (!this.isEnabled) {
      console.log('WebSocket disabled - message not sent');
      return;
    }

    const messageId = messageData.messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    messageData.messageId = messageId;

    if (this.isConnected && this.socket) {
      console.log(`📤 Sending message to chat ${messageData.chatId}`);
      this.socket.emit('send_message', messageData);
    } else {
      this.messageQueue.push({
        type: 'send_message',
        data: messageData,
        timestamp: Date.now()
      });
      console.log('📦 Message queued - WebSocket not connected');
    }
  }

  joinChat(chatId) {
    if (!this.isEnabled) return;
    
    const chatIdStr = chatId.toString();
    
    if (this.joinedChats.has(chatIdStr)) {
      console.log(`⏭️ Already joined chat: ${chatId}`);
      return;
    }
    
    if (this.isConnected && this.socket) {
      console.log(`🚪 Manually joining chat: ${chatId}`);
      this.socket.emit('join_chat', { chatId });
      this.joinedChats.add(chatIdStr);
    } else {
      this.messageQueue.push({
        type: 'join_chat',
        data: { chatId },
        timestamp: Date.now()
      });
    }
  }

  // DON'T leave chats when users navigate away - keep them joined for message delivery
  leaveChat(chatId) {
    console.log(`📌 Keeping user in chat ${chatId} for message delivery`);
    // We don't actually leave - users stay in all their chats
  }

  sendTypingIndicator(chatId, isTyping) {
    if (!this.isEnabled || !this.isConnected || !this.socket) return;
    this.socket.emit('typing', { chatId, isTyping });
  }

  handleIncomingMessage(data) {
    const messageId = data.messageId || `${data.timestamp}_${data.senderId}`;
    
    if (this.processedMessages.has(messageId)) {
      console.log('⏭️ Duplicate message ignored:', messageId);
      return;
    }
    
    this.processedMessages.add(messageId);
    if (this.processedMessages.size > 100) {
      const firstId = this.processedMessages.values().next().value;
      this.processedMessages.delete(firstId);
    }
    
    console.log(`📨 Processing new message from ${data.senderUsername} in chat ${data.chatId}`);
    
    if (this.onMessageReceived) {
      this.onMessageReceived(data);
    }
  }

  handleMessageDelivery(data) {
    if (this.onMessageDelivered) {
      this.onMessageDelivered(data);
    }
  }

  handleTypingIndicator(data) {
    if (this.onTypingIndicator) {
      this.onTypingIndicator(data);
    }
  }

  processMessageQueue() {
    console.log(`📦 Processing ${this.messageQueue.length} queued messages`);
    
    while (this.messageQueue.length > 0) {
      const queuedMessage = this.messageQueue.shift();
      
      if (Date.now() - queuedMessage.timestamp < 300000) {
        this.socket.emit(queuedMessage.type, queuedMessage.data);
        
        if (queuedMessage.type === 'join_chat') {
          this.joinedChats.add(queuedMessage.data.chatId.toString());
        }
      }
    }
  }

  handleReconnection() {
    if (!this.isEnabled) return;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
      
      setTimeout(() => {
        if (this.isEnabled && this.socket && !this.isConnected) {
          console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}`);
          this.autoJoinCompleted = false; // Reset auto-join on reconnect
          this.socket.connect();
        }
      }, delay);
    }
  }

  disconnect() {
    console.log('🔌 Disconnecting WebSocket');
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.isEnabled = false;
    this.authToken = null;
    this.messageQueue = [];
    this.reconnectAttempts = 0;
    this.processedMessages.clear();
    this.joinedChats.clear();
    this.autoJoinCompleted = false;
    this.userId = null;
    this.username = null;
  }

  // Event handler setters
  setMessageHandler(handler) {
    this.onMessageReceived = handler;
  }

  setDeliveryHandler(handler) {
    this.onMessageDelivered = handler;
  }

  setTypingHandler(handler) {
    this.onTypingIndicator = handler;
  }

  // Debug methods
  getConnectionStatus() {
    return {
      enabled: this.isEnabled,
      connected: this.isConnected,
      autoJoinCompleted: this.autoJoinCompleted,
      joinedChats: Array.from(this.joinedChats),
      joinedChatsCount: this.joinedChats.size,
      userId: this.userId,
      hasToken: !!this.authToken
    };
  }

  // Force rejoin all chats (for debugging)
  async forceRejoinChats() {
    console.log('🔄 Force rejoining all chats...');
    this.joinedChats.clear();
    this.autoJoinCompleted = false;
    await this.autoJoinUserChats();
  }

  // Check if in specific chat
  isInChat(chatId) {
    return this.joinedChats.has(chatId.toString());
  }

  // Get debug info
  getDebugInfo() {
    return {
      isConnected: this.isConnected,
      isEnabled: this.isEnabled,
      autoJoinCompleted: this.autoJoinCompleted,
      joinedChats: Array.from(this.joinedChats),
      queuedMessages: this.messageQueue.length,
      processedMessages: this.processedMessages.size,
      userId: this.userId,
      username: this.username
    };
  }
}

export const WebSocketService = new WebSocketServiceClass();