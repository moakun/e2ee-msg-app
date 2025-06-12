// src/services/network/WebSocketService.js - FIXED Message Delivery
import io from 'socket.io-client';
import { NetworkOptimizer } from './NetworkOptimizer';
import { Storage } from '../../utils/storage';

class WebSocketServiceClass {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.messageQueue = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.networkOptimizer = new NetworkOptimizer();
    this.isEnabled = false;
    this.authToken = null;
    this.processedMessages = new Set();
    this.joinedChats = new Set();
    this.userId = null;
    this.username = null;
    this.autoJoinCompleted = false;
    this.autoJoinRetries = 0;
    this.maxAutoJoinRetries = 3;
  }

  async connect(serverUrl, userId, username) {
    this.userId = userId;
    this.username = username;
    this.autoJoinCompleted = false;
    this.autoJoinRetries = 0;

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
        autoConnect: false,
        forceNew: true // Force new connection to avoid stale state
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
        
        // CRITICAL FIX: Auto-join with retry mechanism
        if (!this.autoJoinCompleted) {
          await this.autoJoinUserChatsWithRetry();
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
      this.autoJoinRetries = 0;
      
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

    // NEW: Handle join failures
    this.socket.on('join_chat_error', (data) => {
      console.error(`❌ Failed to join chat ${data.chatId}: ${data.error}`);
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

    // NEW: Handle connection state changes
    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      this.handleReconnection();
    });
  }

  // FIXED: Auto-join with proper retry mechanism
  async autoJoinUserChatsWithRetry() {
    for (let attempt = 0; attempt < this.maxAutoJoinRetries; attempt++) {
      try {
        console.log(`🔄 Auto-join attempt ${attempt + 1}/${this.maxAutoJoinRetries}`);
        
        const success = await this.autoJoinUserChats();
        if (success) {
          this.autoJoinCompleted = true;
          this.autoJoinRetries = 0;
          return;
        }
        
        // Wait before retry
        if (attempt < this.maxAutoJoinRetries - 1) {
          console.log(`⏳ Waiting 2s before retry...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`❌ Auto-join attempt ${attempt + 1} failed:`, error);
      }
    }
    
    console.error('❌ All auto-join attempts failed');
    this.autoJoinCompleted = true; // Stop retrying
  }

  // IMPROVED: Auto-join with better error handling and verification
  async autoJoinUserChats() {
    if (!this.isConnected || !this.userId) {
      console.log('❌ Cannot auto-join: not connected or no user ID');
      return false;
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
        return true;
      }

      // Join each chat with proper verification
      let successCount = 0;
      
      for (const chat of userChats) {
        try {
          const chatIdStr = chat.id.toString();
          
          if (this.joinedChats.has(chatIdStr)) {
            console.log(`⏭️ Already in chat: ${chat.id}`);
            successCount++;
            continue;
          }
          
          console.log(`🚪 Auto-joining chat: "${chat.name}" (ID: ${chat.id})`);
          
          // Join chat and wait for confirmation
          const joinSuccess = await this.joinChatAndWait(chat.id);
          
          if (joinSuccess) {
            successCount++;
            console.log(`✅ Successfully joined: ${chat.name}`);
          } else {
            console.error(`❌ Failed to join: ${chat.name}`);
          }
          
          // Delay between joins to avoid overwhelming server
          await new Promise(resolve => setTimeout(resolve, 300));
          
        } catch (error) {
          console.error(`❌ Error joining chat ${chat.id}:`, error);
        }
      }
      
      console.log(`📊 Auto-join completed: ${successCount}/${userChats.length} chats joined`);
      return successCount === userChats.length;
      
    } catch (error) {
      console.error('❌ Auto-join failed:', error);
      return false;
    }
  }

  // NEW: Join chat with confirmation wait
  async joinChatAndWait(chatId, timeout = 5000) {
    return new Promise((resolve) => {
      const chatIdStr = chatId.toString();
      
      // Set up timeout
      const timeoutId = setTimeout(() => {
        console.warn(`⏰ Timeout waiting for join confirmation for chat ${chatId}`);
        this.socket.off('joined_chat', joinHandler);
        this.socket.off('join_chat_error', errorHandler);
        resolve(false);
      }, timeout);
      
      // Join success handler
      const joinHandler = (data) => {
        if (data.chatId.toString() === chatIdStr) {
          clearTimeout(timeoutId);
          this.socket.off('joined_chat', joinHandler);
          this.socket.off('join_chat_error', errorHandler);
          this.joinedChats.add(chatIdStr);
          resolve(true);
        }
      };
      
      // Join error handler
      const errorHandler = (data) => {
        if (data.chatId.toString() === chatIdStr) {
          clearTimeout(timeoutId);
          this.socket.off('joined_chat', joinHandler);
          this.socket.off('join_chat_error', errorHandler);
          resolve(false);
        }
      };
      
      // Set up listeners
      this.socket.on('joined_chat', joinHandler);
      this.socket.on('join_chat_error', errorHandler);
      
      // Send join request
      this.socket.emit('join_chat', { chatId });
    });
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

  // IMPROVED: Manual join with auto-retry
  async joinChat(chatId) {
    if (!this.isEnabled) return false;
    
    const chatIdStr = chatId.toString();
    
    if (this.joinedChats.has(chatIdStr)) {
      console.log(`⏭️ Already joined chat: ${chatId}`);
      return true;
    }
    
    if (this.isConnected && this.socket) {
      console.log(`🚪 Manually joining chat: ${chatId}`);
      return await this.joinChatAndWait(chatId);
    } else {
      this.messageQueue.push({
        type: 'join_chat',
        data: { chatId },
        timestamp: Date.now()
      });
      return false;
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

  // IMPROVED: Better duplicate message handling
  handleIncomingMessage(data) {
    const messageId = data.messageId || `${data.timestamp}_${data.senderId}`;
    
    if (this.processedMessages.has(messageId)) {
      console.log('⏭️ Duplicate message ignored:', messageId);
      return;
    }
    
    this.processedMessages.add(messageId);
    
    // Clean up old processed messages to prevent memory leak
    if (this.processedMessages.size > 1000) {
      const messagesToRemove = Array.from(this.processedMessages).slice(0, 500);
      messagesToRemove.forEach(id => this.processedMessages.delete(id));
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

  // IMPROVED: Better queue processing
  processMessageQueue() {
    console.log(`📦 Processing ${this.messageQueue.length} queued messages`);
    
    const currentQueue = [...this.messageQueue];
    this.messageQueue = [];
    
    currentQueue.forEach(queuedMessage => {
      // Only process messages that aren't too old (5 minutes)
      if (Date.now() - queuedMessage.timestamp < 300000) {
        if (queuedMessage.type === 'join_chat') {
          // Use the improved join method
          this.joinChat(queuedMessage.data.chatId);
        } else {
          this.socket.emit(queuedMessage.type, queuedMessage.data);
        }
      } else {
        console.log('⏰ Discarded old queued message:', queuedMessage.type);
      }
    });
  }

  // IMPROVED: Better reconnection handling
  handleReconnection() {
    if (!this.isEnabled) return;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 15000);
      
      console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
      
      setTimeout(() => {
        if (this.isEnabled && this.socket && !this.isConnected) {
          console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}`);
          this.autoJoinCompleted = false; // Reset auto-join on reconnect
          this.autoJoinRetries = 0;
          this.socket.connect();
        }
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
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
    this.autoJoinRetries = 0;
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

  // NEW: Method to manually rejoin a specific chat
  async rejoinChat(chatId) {
    const chatIdStr = chatId.toString();
    
    // Remove from joined set to force rejoin
    this.joinedChats.delete(chatIdStr);
    
    // Join again
    return await this.joinChat(chatId);
  }

  // IMPROVED: Debug methods
  getConnectionStatus() {
    return {
      enabled: this.isEnabled,
      connected: this.isConnected,
      autoJoinCompleted: this.autoJoinCompleted,
      joinedChats: Array.from(this.joinedChats),
      joinedChatsCount: this.joinedChats.size,
      userId: this.userId,
      hasToken: !!this.authToken,
      reconnectAttempts: this.reconnectAttempts,
      autoJoinRetries: this.autoJoinRetries
    };
  }

  // Force rejoin all chats (for debugging)
  async forceRejoinChats() {
    console.log('🔄 Force rejoining all chats...');
    this.joinedChats.clear();
    this.autoJoinCompleted = false;
    this.autoJoinRetries = 0;
    await this.autoJoinUserChatsWithRetry();
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
      username: this.username,
      reconnectAttempts: this.reconnectAttempts,
      autoJoinRetries: this.autoJoinRetries
    };
  }

  // NEW: Method to ensure user is in a chat before sending
  async ensureInChat(chatId) {
    if (!this.isInChat(chatId)) {
      console.log(`🔄 User not in chat ${chatId}, joining...`);
      return await this.joinChat(chatId);
    }
    return true;
  }
}

export const WebSocketService = new WebSocketServiceClass();