// src/services/database/DatabaseService.js - Optimized Version
import * as SQLite from 'expo-sqlite';
import { TABLES } from './schema';

class DatabaseServiceClass {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.initPromise = null;
    this.currentVersion = 2;
  }

  async init() {
    // Return early if already initialized
    if (this.isInitialized && this.db) {
      console.log('✅ Database already initialized');
      return Promise.resolve();
    }

    // Prevent multiple simultaneous initializations
    if (this.initPromise) {
      console.log('⏳ Waiting for existing initialization...');
      return this.initPromise;
    }

    this.initPromise = this._doInit();
    return this.initPromise;
  }

  async _doInit() {
    const startTime = Date.now();
    
    try {
      console.log('🔄 Initializing database...');
      
      // Open database connection
      this.db = await SQLite.openDatabaseAsync('SecureChat.db');
      console.log('✅ Database connection opened');

      // Quick connection test
      await this.db.execAsync('SELECT 1');
      console.log('✅ Database connection verified');

      // Create all tables in one batch
      await this.createAllTablesOptimized();
      
      // Set version
      await this.setDatabaseVersion(this.currentVersion);
      
      this.isInitialized = true;
      this.initPromise = null;
      
      const duration = Date.now() - startTime;
      console.log(`🎉 Database initialized successfully in ${duration}ms`);
      
      return true;
      
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      this.isInitialized = false;
      this.initPromise = null;
      this.db = null;
      throw error;
    }
  }

  async createAllTablesOptimized() {
    try {
      // Create all tables in a single transaction for speed
      const allQueries = `
        -- Version table
        CREATE TABLE IF NOT EXISTS database_version (
          version INTEGER PRIMARY KEY
        );

        -- Users table  
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          public_key TEXT NOT NULL,
          encrypted_private_key TEXT NOT NULL,
          salt TEXT NOT NULL,
          is_online INTEGER DEFAULT 0,
          last_seen INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL
        );

        -- Chats table
        CREATE TABLE IF NOT EXISTS chats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT DEFAULT 'direct',
          created_by INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER DEFAULT 0,
          FOREIGN KEY (created_by) REFERENCES users (id)
        );

        -- Messages table
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chat_id INTEGER NOT NULL,
          sender_id INTEGER NOT NULL,
          encrypted_content TEXT NOT NULL,
          message_type TEXT DEFAULT 'text',
          timestamp INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (chat_id) REFERENCES chats (id),
          FOREIGN KEY (sender_id) REFERENCES users (id)
        );

        -- Key pairs table
        CREATE TABLE IF NOT EXISTS key_pairs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER UNIQUE NOT NULL,
          public_key TEXT NOT NULL,
          encrypted_private_key TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users (id)
        );

        -- Chat participants table
        CREATE TABLE IF NOT EXISTS chat_participants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chat_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          joined_at INTEGER NOT NULL,
          role TEXT DEFAULT 'member',
          FOREIGN KEY (chat_id) REFERENCES chats (id),
          FOREIGN KEY (user_id) REFERENCES users (id),
          UNIQUE(chat_id, user_id)
        );

        -- Contacts table
        CREATE TABLE IF NOT EXISTS contacts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          contact_user_id INTEGER NOT NULL,
          contact_username TEXT NOT NULL,
          contact_public_key TEXT NOT NULL,
          added_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (contact_user_id) REFERENCES users (id),
          UNIQUE(user_id, contact_user_id)
        );

        -- Chat invitations table
        CREATE TABLE IF NOT EXISTS chat_invitations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chat_id INTEGER NOT NULL,
          from_user_id INTEGER NOT NULL,
          to_user_id INTEGER NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at INTEGER NOT NULL,
          responded_at INTEGER DEFAULT 0,
          FOREIGN KEY (chat_id) REFERENCES chats (id),
          FOREIGN KEY (from_user_id) REFERENCES users (id),
          FOREIGN KEY (to_user_id) REFERENCES users (id)
        );
      `;

      await this.db.execAsync(allQueries);
      console.log('✅ All tables created successfully');
      
    } catch (error) {
      console.error('❌ Failed to create tables:', error);
      throw error;
    }
  }

  async ensureInitialized() {
    if (!this.isInitialized || !this.db) {
      await this.init();
    }
    
    if (!this.db) {
      throw new Error('Database connection failed');
    }
  }

  async setDatabaseVersion(version) {
    try {
      await this.db.runAsync('INSERT OR REPLACE INTO database_version (version) VALUES (?)', [version]);
    } catch (error) {
      console.error('Failed to set database version:', error);
    }
  }

  // SIMPLIFIED SAFE OPERATIONS

  async safeRun(query, params = []) {
    await this.ensureInitialized();
    return await this.db.runAsync(query, params);
  }

  async safeGet(query, params = []) {
    await this.ensureInitialized();
    return await this.db.getFirstAsync(query, params);
  }

  async safeGetAll(query, params = []) {
    await this.ensureInitialized();
    return await this.db.getAllAsync(query, params);
  }

  // USER OPERATIONS

  async createUser(userData) {
    const { username, publicKey, encryptedPrivateKey, salt } = userData;
    
    try {
      const result = await this.safeRun(
        'INSERT INTO users (username, public_key, encrypted_private_key, salt, created_at, is_online, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [username, publicKey, encryptedPrivateKey, salt, Date.now(), 0, 0]
      );
      
      console.log(`✅ User created: ${username}`);
      return result.lastInsertRowId;
    } catch (error) {
      console.error('❌ Create user failed:', error);
      throw error;
    }
  }

  async getUserByUsername(username) {
    try {
      const result = await this.safeGet(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );
      
      return result;
    } catch (error) {
      console.error('❌ Get user failed:', error);
      throw error;
    }
  }

  // CHAT OPERATIONS

  async createChat(chatData) {
    const { name, type, createdBy } = chatData;
    
    try {
      const result = await this.safeRun(
        'INSERT INTO chats (name, type, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [name, type, createdBy, Date.now(), Date.now()]
      );
      
      return result.lastInsertRowId;
    } catch (error) {
      console.error('❌ Create chat failed:', error);
      throw error;
    }
  }

  async getUserChats(userId) {
    try {
      const result = await this.safeGetAll(
        `SELECT c.*, cp.joined_at 
         FROM chats c 
         JOIN chat_participants cp ON c.id = cp.chat_id 
         WHERE cp.user_id = ? 
         ORDER BY c.updated_at DESC`,
        [userId]
      );
      
      return result;
    } catch (error) {
      console.error('❌ Get user chats failed:', error);
      return [];
    }
  }

  // MESSAGE OPERATIONS

async saveMessage(messageData) {
  const { chatId, senderId, encryptedContent, messageType, timestamp } = messageData;
  
  try {
    console.log('💾 Saving message to database...');
    
    const result = await this.safeRun(
      'INSERT INTO messages (chat_id, sender_id, encrypted_content, message_type, timestamp, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [chatId, senderId, encryptedContent, messageType || 'text', timestamp, Date.now()]
    );
    
    // Update chat timestamp
    await this.safeRun(
      'UPDATE chats SET updated_at = ? WHERE id = ?',
      [Date.now(), chatId]
    );
    
    console.log('✅ Message saved with ID:', result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('❌ Save message failed:', error);
    throw error;
  }
}

async getChatMessages(chatId, limit = 50, offset = 0) {
  try {
    console.log(`🔍 Getting messages for chat ${chatId}, limit: ${limit}, offset: ${offset}`);
    
    const result = await this.safeGetAll(
      `SELECT m.*, u.username as sender_username 
       FROM messages m 
       LEFT JOIN users u ON m.sender_id = u.id 
       WHERE m.chat_id = ? 
       ORDER BY m.timestamp ASC 
       LIMIT ? OFFSET ?`,
      [chatId, limit, offset]
    );
    
    console.log(`✅ Found ${result.length} messages`);
    return result;
  } catch (error) {
    console.error('❌ Get messages failed:', error);
    return [];
  }
}

  // KEY OPERATIONS

  async saveKeyPair(userId, publicKey, encryptedPrivateKey) {
    try {
      await this.safeRun(
        'INSERT OR REPLACE INTO key_pairs (user_id, public_key, encrypted_private_key, created_at) VALUES (?, ?, ?, ?)',
        [userId, publicKey, encryptedPrivateKey, Date.now()]
      );
    } catch (error) {
      console.error('❌ Save key pair failed:', error);
      throw error;
    }
  }

  async getUserKeyPair(userId) {
    try {
      return await this.safeGet(
        'SELECT * FROM key_pairs WHERE user_id = ?',
        [userId]
      );
    } catch (error) {
      console.error('❌ Get key pair failed:', error);
      return null;
    }
  }

  // MULTI-USER OPERATIONS

  async searchUsers(query, currentUserId) {
    try {
      const result = await this.safeGetAll(
        `SELECT id, username, public_key, 
                COALESCE(is_online, 0) as is_online, 
                COALESCE(last_seen, 0) as last_seen 
         FROM users 
         WHERE username LIKE ? AND id != ? 
         LIMIT 20`,
        [`%${query}%`, currentUserId]
      );
      
      return result;
    } catch (error) {
      console.error('❌ Search users failed:', error);
      return [];
    }
  }

  async getUserContacts(userId) {
    try {
      const result = await this.safeGetAll(
        `SELECT c.*, 
                COALESCE(u.is_online, 0) as is_online, 
                COALESCE(u.last_seen, 0) as last_seen 
         FROM contacts c
         LEFT JOIN users u ON c.contact_user_id = u.id
         WHERE c.user_id = ?
         ORDER BY u.is_online DESC, c.contact_username ASC`,
        [userId]
      );
      
      return result;
    } catch (error) {
      console.error('❌ Get contacts failed:', error);
      return [];
    }
  }

  async addContact(userId, contactUserId) {
    try {
      const contactUser = await this.safeGet(
        'SELECT username, public_key FROM users WHERE id = ?',
        [contactUserId]
      );
      
      if (!contactUser) {
        throw new Error('User not found');
      }

      await this.safeRun(
        `INSERT OR REPLACE INTO contacts 
         (user_id, contact_user_id, contact_username, contact_public_key, added_at) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, contactUserId, contactUser.username, contactUser.public_key, Date.now()]
      );
      
      return true;
    } catch (error) {
      console.error('❌ Add contact failed:', error);
      throw error;
    }
  }

  async createDirectChat(userId1, userId2) {
    try {
      // Check existing chat
      const existingChat = await this.safeGet(
        `SELECT c.id FROM chats c
         JOIN chat_participants cp1 ON c.id = cp1.chat_id AND cp1.user_id = ?
         JOIN chat_participants cp2 ON c.id = cp2.chat_id AND cp2.user_id = ?
         WHERE c.type = 'direct'`,
        [userId1, userId2]
      );

      if (existingChat) {
        return existingChat.id;
      }

      // Get usernames
      const user1 = await this.safeGet('SELECT username FROM users WHERE id = ?', [userId1]);
      const user2 = await this.safeGet('SELECT username FROM users WHERE id = ?', [userId2]);
      
      const chatName = `${user1.username}, ${user2.username}`;
      
      // Create chat
      const chatResult = await this.safeRun(
        'INSERT INTO chats (name, type, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [chatName, 'direct', userId1, Date.now(), Date.now()]
      );

      const chatId = chatResult.lastInsertRowId;

      // Add participants
      await this.safeRun(
        'INSERT INTO chat_participants (chat_id, user_id, joined_at, role) VALUES (?, ?, ?, ?)',
        [chatId, userId1, Date.now(), 'member']
      );
      
      await this.safeRun(
        'INSERT INTO chat_participants (chat_id, user_id, joined_at, role) VALUES (?, ?, ?, ?)',
        [chatId, userId2, Date.now(), 'member']
      );

      return chatId;
    } catch (error) {
      console.error('❌ Create direct chat failed:', error);
      throw error;
    }
  }

  async getChatParticipants(chatId) {
    try {
      return await this.safeGetAll(
        `SELECT u.id, u.username, u.public_key, 
                COALESCE(cp.role, 'member') as role, 
                cp.joined_at
         FROM chat_participants cp
         JOIN users u ON cp.user_id = u.id
         WHERE cp.chat_id = ?`,
        [chatId]
      );
    } catch (error) {
      console.error('❌ Get participants failed:', error);
      return [];
    }
  }

  async getChatRecipientKey(chatId, currentUserId) {
    try {
      const participants = await this.getChatParticipants(chatId);
      const recipient = participants.find(p => p.id !== currentUserId);
      return recipient ? recipient.public_key : null;
    } catch (error) {
      console.error('❌ Get recipient key failed:', error);
      return null;
    }
  }
async addContact(userId, contactUserId, contactData = null) {
  try {
    let contactUser;
    
    // If contact data is provided, use it directly
    if (contactData && contactData.username && contactData.public_key) {
      contactUser = contactData;
    } else {
      // Otherwise try to fetch from local database
      contactUser = await this.safeGet(
        'SELECT username, public_key FROM users WHERE id = ?',
        [contactUserId]
      );
      
      if (!contactUser) {
        throw new Error('User not found in local database');
      }
    }

    // Insert into contacts table
    await this.safeRun(
      `INSERT OR REPLACE INTO contacts 
       (user_id, contact_user_id, contact_username, contact_public_key, added_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, contactUserId, contactUser.username, contactUser.public_key, Date.now()]
    );
    
    console.log(`✅ Contact added: ${contactUser.username}`);
    return true;
  } catch (error) {
    console.error('❌ Add contact failed:', error);
    throw error;
  }
}

  // DEBUG METHODS (simplified)

  async checkTablesExist() {
    try {
      await this.ensureInitialized();
      
      const tables = await this.safeGetAll(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );
      
      console.log('📋 Existing tables:', tables.map(t => t.name));
      return tables;
    } catch (error) {
      console.error('❌ Failed to check tables:', error);
      return [];
    }
  }

  async resetDatabase() {
    try {
      const tables = ['users', 'chats', 'messages', 'key_pairs', 'chat_participants', 'contacts', 'chat_invitations', 'database_version'];
      
      for (const table of tables) {
        await this.db.execAsync(`DROP TABLE IF EXISTS ${table}`);
      }
      
      this.isInitialized = false;
      this.initPromise = null;
      
      console.log('✅ Database reset completed');
      return true;
    } catch (error) {
      console.error('❌ Reset failed:', error);
      return false;
    }
  }

  // ADDITIONAL MISSING METHODS

  async updateUserOnlineStatus(userId, isOnline) {
    try {
      await this.safeRun(
        'UPDATE users SET is_online = ?, last_seen = ? WHERE id = ?',
        [isOnline ? 1 : 0, Date.now(), userId]
      );
    } catch (error) {
      console.error('❌ Update online status failed:', error);
    }
  }

  async getAllUsers() {
    try {
      return await this.safeGetAll(
        'SELECT id, username, public_key, is_online, last_seen FROM users ORDER BY username'
      );
    } catch (error) {
      console.error('❌ Get all users failed:', error);
      return [];
    }
  }
}

// Export singleton
export const DatabaseService = new DatabaseServiceClass();