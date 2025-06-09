import { useState, useEffect, useCallback } from 'react';
import { DatabaseService } from '../services/database/DatabaseService';

export function useDatabase() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      await DatabaseService.init();
      setIsReady(true);
    } catch (err) {
      setError(err);
      console.error('Database initialization failed:', err);
    }
  };

  // User operations
  const createUser = useCallback(async (userData) => {
    try {
      const userId = await DatabaseService.createUser(userData);
      return userId;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const getUserByUsername = useCallback(async (username) => {
    try {
      const user = await DatabaseService.getUserByUsername(username);
      return user;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  // Chat operations
  const createChat = useCallback(async (chatData) => {
    try {
      const chatId = await DatabaseService.createChat(chatData);
      return chatId;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const getUserChats = useCallback(async (userId) => {
    try {
      const chats = await DatabaseService.getUserChats(userId);
      return chats;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  // Message operations
  const saveMessage = useCallback(async (messageData) => {
    try {
      const messageId = await DatabaseService.saveMessage(messageData);
      return messageId;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const getChatMessages = useCallback(async (chatId, limit = 50, offset = 0) => {
    try {
      const messages = await DatabaseService.getChatMessages(chatId, limit, offset);
      return messages;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  // Key operations
  const saveKeyPair = useCallback(async (userId, publicKey, encryptedPrivateKey) => {
    try {
      await DatabaseService.saveKeyPair(userId, publicKey, encryptedPrivateKey);
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const getUserKeyPair = useCallback(async (userId) => {
    try {
      const keyPair = await DatabaseService.getUserKeyPair(userId);
      return keyPair;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  return {
    isReady,
    error,
    createUser,
    getUserByUsername,
    createChat,
    getUserChats,
    saveMessage,
    getChatMessages,
    saveKeyPair,
    getUserKeyPair
  };
}