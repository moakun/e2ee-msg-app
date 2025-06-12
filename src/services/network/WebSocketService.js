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
    this.processedMessages = new Set(); // Track processed message IDs
    this.messageBuffer = []; // Buffer for batch processing
    this.bufferTimer = null;
  }


  async connect(serverUrl, userId, username) {
    // Skip connection if no server URL or disabled
    if (!serverUrl || serverUrl.includes('your-server.com') || serverUrl.includes('your-websocket-server.com')) {
      console.log('WebSocket disabled: No server configured');
      this.isEnabled = false;
      return;
    }

    try {
      // Get auth token
      this.authToken = await Storage.getSecure('authToken');
      if (!this.authToken) {
        console.log('WebSocket disabled: No auth token');
        this.isEnabled = false;
        return;
      }

      this.isEnabled = true;
      
      console.log('Connecting to WebSocket server:', serverUrl);
      
      this.socket = io(serverUrl, {
        auth: {
          userId,
          username,
          token: this.authToken
        },
        transports: ['websocket'],
        upgrade: true,
        rememberUpgrade: true,
        timeout: 20000,
        autoConnect: false
      });

      this.setupEventListeners();
      this.networkOptimizer.startOptimization(this.socket);
      
      // Connect manually
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
      
      // Authenticate after connection
      this.socket.emit('authenticate', {
        token: this.authToken
      });
    });

    this.socket.on('authenticated', (data) => {
      if (data.success) {
        console.log('✅ WebSocket authentication successful');
      } else {
        console.error('❌ WebSocket authentication failed');
        this.disconnect();
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from WebSocket server:', reason);
      this.isConnected = false;
      
      // Only attempt reconnection if not manually disconnected
      if (reason !== 'io client disconnect') {
        this.handleReconnection();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
      this.isConnected = false;
      this.handleReconnection();
    });

    // Message events
    this.socket.on('new_message', (data) => {
      console.log('📨 Received new message for chat:', data.chatId);
      this.handleIncomingMessage(data);
    });

    this.socket.on('message_delivered', (data) => {
      console.log('✅ Message delivered:', data.messageId);
      this.handleMessageDelivery(data);
    });

    this.socket.on('user_typing', (data) => {
      this.handleTypingIndicator(data);
    });

    this.socket.on('user_joined', (data) => {
      console.log('👋 User joined chat:', data.username);
    });

    this.socket.on('user_left', (data) => {
      console.log('👋 User left chat:', data.username);
    });

    this.socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
  }

  sendMessage(messageData) {
    if (!this.isEnabled) {
      console.log('WebSocket disabled - message not sent via WebSocket');
      return;
    }

    const messageId = messageData.messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    messageData.messageId = messageId;

    if (this.isConnected && this.socket) {
      console.log('📤 Sending message via WebSocket to chat:', messageData.chatId);
      this.socket.emit('send_message', messageData);
    } else {
      // Queue message for when connection is restored
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
    
    if (this.isConnected && this.socket) {
      console.log('🚪 Joining chat:', chatId);
      this.socket.emit('join_chat', { chatId });
    } else {
      // Queue join request
      this.messageQueue.push({
        type: 'join_chat',
        data: { chatId },
        timestamp: Date.now()
      });
    }
  }

  leaveChat(chatId) {
    if (!this.isEnabled) return;
    
    if (this.isConnected && this.socket) {
      console.log('🚪 Leaving chat:', chatId);
      this.socket.emit('leave_chat', { chatId });
    }
  }

  sendTypingIndicator(chatId, isTyping) {
    if (!this.isEnabled) return;
    
    if (this.isConnected && this.socket) {
      this.socket.emit('typing', { chatId, isTyping });
    }
  }

  processMessageQueue() {
    console.log(`📦 Processing ${this.messageQueue.length} queued messages`);
    
    while (this.messageQueue.length > 0) {
      const queuedMessage = this.messageQueue.shift();
      
      // Check if message is not too old (5 minutes)
      if (Date.now() - queuedMessage.timestamp < 300000) {
        this.socket.emit(queuedMessage.type, queuedMessage.data);
      } else {
        console.log('⚠️ Discarded old queued message');
      }
    }
  }

  handleReconnection() {
    if (!this.isEnabled) return;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000); // Cap at 10 seconds
      
      setTimeout(() => {
        if (this.isEnabled && this.socket && !this.isConnected) {
          console.log(`🔄 WebSocket reconnection attempt ${this.reconnectAttempts}`);
          this.socket.connect();
        }
      }, delay);
    } else {
      console.log('❌ Max WebSocket reconnection attempts reached - giving up');
      this.isEnabled = false;
    }
  }

  handleIncomingMessage(data) {
    const messageId = data.messageId || `${data.timestamp}_${data.senderId}`;
    
    // Skip if already processed
    if (this.processedMessages.has(messageId)) {
      console.log('Duplicate WebSocket message ignored:', messageId);
      return;
    }
    
    // Add to processed set (keep only last 100 to prevent memory issues)
    this.processedMessages.add(messageId);
    if (this.processedMessages.size > 100) {
      const firstId = this.processedMessages.values().next().value;
      this.processedMessages.delete(firstId);
    }
    
    // Emit event for components to listen to
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

  disconnect() {
    console.log('🔌 Disconnecting WebSocket');
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
    
    this.isEnabled = false;
    this.authToken = null;
    this.messageQueue = [];
    this.reconnectAttempts = 0;
    this.processedMessages.clear(); // Clear processed messages
    
    if (this.networkOptimizer) {
      this.networkOptimizer.stopOptimization();
    }
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

  // Development helper methods
  enableWebSocket() {
    this.isEnabled = true;
  }

  disableWebSocket() {
    this.disconnect();
    this.isEnabled = false;
  }

  getConnectionStatus() {
    return {
      enabled: this.isEnabled,
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      hasToken: !!this.authToken,
      processedMessages: this.processedMessages.size
    };
  }

  // Ping for connection testing
  ping() {
    if (this.isConnected && this.socket) {
      const startTime = Date.now();
      this.socket.emit('ping');
      
      this.socket.once('pong', () => {
        const latency = Date.now() - startTime;
        console.log(`🏓 WebSocket ping: ${latency}ms`);
        return latency;
      });
    }
  }

  // Force reconnection
  forceReconnect() {
    if (this.socket) {
      this.socket.disconnect();
      setTimeout(() => {
        if (this.socket) {
          this.socket.connect();
        }
      }, 1000);
    }
  }

  // Get socket info for debugging
  getSocketInfo() {
    if (!this.socket) return null;
    
    return {
      id: this.socket.id,
      connected: this.socket.connected,
      transport: this.socket.io.engine?.transport?.name,
      readyState: this.socket.io.readyState
    };
  }

  // Clear processed messages (for debugging)
  clearProcessedMessages() {
    this.processedMessages.clear();
    console.log('✅ Cleared processed messages cache');
  }
}

// Export a singleton instance
export const WebSocketService = new WebSocketServiceClass();