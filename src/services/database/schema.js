// src/services/database/schema.js - Updated Schema
export const TABLES = {
  USERS: `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      public_key TEXT NOT NULL,
      encrypted_private_key TEXT NOT NULL,
      salt TEXT NOT NULL,
      is_online INTEGER DEFAULT 0,
      last_seen INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `,
  
  CHATS: `
    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'direct',
      created_by INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER DEFAULT 0,
      FOREIGN KEY (created_by) REFERENCES users (id)
    )
  `,
  
  MESSAGES: `
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
    )
  `,
  
  KEY_PAIRS: `
    CREATE TABLE IF NOT EXISTS key_pairs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      public_key TEXT NOT NULL,
      encrypted_private_key TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `,
  
  CHAT_PARTICIPANTS: `
    CREATE TABLE IF NOT EXISTS chat_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at INTEGER NOT NULL,
      role TEXT DEFAULT 'member',
      FOREIGN KEY (chat_id) REFERENCES chats (id),
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(chat_id, user_id)
    )
  `,

  CONTACTS: `
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
    )
  `,

  CHAT_INVITATIONS: `
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
    )
  `
};