// src/screens/ChatListScreen.js - Fixed to show all chats
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  TextInput,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { DatabaseService } from '../services/database/DatabaseService';
import { ApiService } from '../services/network/ApiService';
import { formatTimestamp } from '../utils/helpers';
import { UI_CONFIG } from '../utils/constants';

export default function ChatListScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateChat, setShowCreateChat] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const { user, logout, deleteAccount } = useAuth();
  const { createChat } = useChat();

  useEffect(() => {
    loadChats();
  }, []);

  // Refresh chats when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadChats();
    });

    return unsubscribe;
  }, [navigation]);

  const loadChats = async () => {
    try {
      console.log('Loading chats for user:', user.id);
      
      // Try to load from backend first
      let backendChats = [];
      try {
        const response = await ApiService.getUserChats();
        if (response.success) {
          backendChats = response.chats;
          console.log('Loaded chats from backend:', backendChats.length);
        }
      } catch (error) {
        console.log('Backend chat loading failed:', error.message);
      }
      
      // Load from local database
      const localChats = await DatabaseService.getUserChats(user.id);
      console.log('Loaded chats from local:', localChats.length);
      
      // Merge chats (remove duplicates based on chat ID)
      const chatMap = new Map();
      
      // Add backend chats first
      backendChats.forEach(chat => {
        chatMap.set(chat.id, {
          ...chat,
          source: 'backend'
        });
      });
      
      // Add local chats (will override if same ID exists)
      localChats.forEach(chat => {
        if (!chatMap.has(chat.id)) {
          chatMap.set(chat.id, {
            ...chat,
            source: 'local'
          });
        }
      });
      
      // Convert map to array and sort by updated_at
      const mergedChats = Array.from(chatMap.values()).sort((a, b) => {
        const timeA = a.updated_at || a.created_at || 0;
        const timeB = b.updated_at || b.created_at || 0;
        return timeB - timeA; // Most recent first
      });
      
      // Get last message for each chat
      const chatsWithLastMessage = await Promise.all(
        mergedChats.map(async (chat) => {
          try {
            const messages = await DatabaseService.getChatMessages(chat.id, 1);
            const lastMessage = messages[0];
            return {
              ...chat,
              lastMessage: lastMessage ? lastMessage.encrypted_content : null,
              lastMessageTime: lastMessage ? lastMessage.timestamp : null
            };
          } catch (error) {
            console.error('Failed to get last message for chat:', chat.id);
            return chat;
          }
        })
      );
      
      setChats(chatsWithLastMessage);
      console.log('Total chats loaded:', chatsWithLastMessage.length);
      
    } catch (error) {
      console.error('Failed to load chats:', error);
      setChats([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadChats();
  };

  const openChat = async (chat) => {
    try {
      // Get recipient info for direct chats
      let recipientPublicKey = user.publicKey; // Default
      
      if (chat.type === 'direct') {
        const participants = await DatabaseService.getChatParticipants(chat.id);
        const recipient = participants.find(p => p.id !== user.id);
        if (recipient) {
          recipientPublicKey = recipient.public_key;
        }
      }
      
      navigation.navigate('Chat', {
        chatId: chat.id,
        chatName: chat.name,
        recipientPublicKey
      });
    } catch (error) {
      console.error('Failed to open chat:', error);
      navigation.navigate('Chat', {
        chatId: chat.id,
        chatName: chat.name,
        recipientPublicKey: user.publicKey
      });
    }
  };

  const handleCreateChat = async () => {
    if (!newChatName.trim()) return;

    try {
      const chatId = await createChat({
        name: newChatName.trim(),
        type: 'group'
      });

      // Add user as participant
      await DatabaseService.db.runAsync(
        'INSERT INTO chat_participants (chat_id, user_id, joined_at, role) VALUES (?, ?, ?, ?)',
        [chatId, user.id, Date.now(), 'admin']
      );

      setNewChatName('');
      setShowCreateChat(false);
      loadChats();
    } catch (error) {
      console.error('Create chat failed:', error);
      Alert.alert('Error', 'Failed to create chat');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: deleteAccount
        }
      ]
    );
  };

  const navigateToUserSearch = () => {
    navigation.navigate('UserSearch');
  };

  const getLastMessagePreview = (chat) => {
    if (chat.lastMessage) {
      try {
        // Try to parse as encrypted message
        const parsed = JSON.parse(chat.lastMessage);
        if (parsed.encryptedContent) {
          return '🔒 Encrypted message';
        }
      } catch {
        // If not JSON, might be plain text
        if (chat.lastMessage.length > 50) {
          return chat.lastMessage.substring(0, 50) + '...';
        }
        return chat.lastMessage;
      }
    }
    return 'Tap to start messaging...';
  };

  const renderChatItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => openChat(item)}
    >
      <View style={styles.chatAvatar}>
        <Text style={styles.chatAvatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.chatTime}>
            {formatTimestamp(item.lastMessageTime || item.updated_at || item.created_at)}
          </Text>
        </View>
        
        <View style={styles.lastMessageContainer}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {getLastMessagePreview(item)}
          </Text>
          {item.source === 'local' && (
            <Text style={styles.localBadge}>Local</Text>
          )}
        </View>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LoadingSpinner text="Loading chats..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            onPress={navigateToUserSearch} 
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <Ionicons name="people" size={24} color={UI_CONFIG.COLORS.PRIMARY} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setShowCreateChat(true)} 
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={24} color={UI_CONFIG.COLORS.PRIMARY} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleDeleteAccount} 
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={24} color={UI_CONFIG.COLORS.ERROR} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={logout} 
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={24} color={UI_CONFIG.COLORS.ERROR} />
          </TouchableOpacity>
        </View>
      </View>

      {chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>
            Find users to start chatting or create a group chat
          </Text>
          <View style={styles.emptyActions}>
            <Button
              title="Find Users"
              onPress={navigateToUserSearch}
              style={styles.findUsersButton}
            />
            <Button
              title="Create Group Chat"
              onPress={() => setShowCreateChat(true)}
              variant="secondary"
              style={styles.createChatButton}
            />
          </View>
        </View>
      ) : (
        <FlatList
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Create Chat Modal */}
      <Modal
        visible={showCreateChat}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateChat(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateChat(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Group Chat</Text>
            <TouchableOpacity 
              onPress={handleCreateChat}
              disabled={!newChatName.trim()}
            >
              <Text style={[
                styles.createButton,
                !newChatName.trim() && styles.createButtonDisabled
              ]}>Create</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={styles.modalLabel}>Group Name</Text>
            <TextInput
              style={styles.chatNameInput}
              placeholder="Enter group name"
              value={newChatName}
              onChangeText={setNewChatName}
              autoFocus
              maxLength={50}
            />
            <Text style={styles.modalHint}>
              You can invite users to this group after creating it
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_CONFIG.COLORS.BACKGROUND
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: UI_CONFIG.COLORS.BACKGROUND
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: UI_CONFIG.SPACING.MD,
    paddingVertical: UI_CONFIG.SPACING.SM,
    backgroundColor: UI_CONFIG.COLORS.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: UI_CONFIG.COLORS.TEXT
  },
  headerButtons: {
    flexDirection: 'row'
  },
  headerButton: {
    padding: UI_CONFIG.SPACING.XS,
    marginLeft: UI_CONFIG.SPACING.SM
  },
  listContainer: {
    paddingVertical: UI_CONFIG.SPACING.SM
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: UI_CONFIG.SPACING.MD,
    paddingVertical: UI_CONFIG.SPACING.SM,
    backgroundColor: UI_CONFIG.COLORS.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: UI_CONFIG.COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: UI_CONFIG.SPACING.MD
  },
  chatAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  chatInfo: {
    flex: 1
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: UI_CONFIG.COLORS.TEXT,
    flex: 1
  },
  chatTime: {
    fontSize: 12,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY
  },
  lastMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  lastMessage: {
    fontSize: 14,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    flex: 1
  },
  localBadge: {
    fontSize: 10,
    color: UI_CONFIG.COLORS.WARNING,
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: UI_CONFIG.SPACING.XL
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: UI_CONFIG.COLORS.TEXT,
    marginTop: UI_CONFIG.SPACING.MD,
    marginBottom: UI_CONFIG.SPACING.XS
  },
  emptySubtitle: {
    fontSize: 16,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: UI_CONFIG.SPACING.LG
  },
  emptyActions: {
    width: '100%',
    gap: UI_CONFIG.SPACING.MD
  },
  findUsersButton: {
    marginBottom: UI_CONFIG.SPACING.SM
  },
  createChatButton: {
    // marginTop: UI_CONFIG.SPACING.SM
  },
  modalContainer: {
    flex: 1,
    backgroundColor: UI_CONFIG.COLORS.BACKGROUND
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: UI_CONFIG.SPACING.MD,
    paddingVertical: UI_CONFIG.SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: UI_CONFIG.COLORS.SURFACE
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: UI_CONFIG.COLORS.TEXT
  },
  cancelButton: {
    fontSize: 16,
    color: UI_CONFIG.COLORS.ERROR
  },
  createButton: {
    fontSize: 16,
    color: UI_CONFIG.COLORS.PRIMARY,
    fontWeight: '600'
  },
  createButtonDisabled: {
    color: UI_CONFIG.COLORS.TEXT_SECONDARY
  },
  modalContent: {
    padding: UI_CONFIG.SPACING.MD
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: UI_CONFIG.COLORS.TEXT,
    marginBottom: UI_CONFIG.SPACING.SM
  },
  chatNameInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: UI_CONFIG.SPACING.MD,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: UI_CONFIG.COLORS.SURFACE,
    marginBottom: UI_CONFIG.SPACING.SM
  },
  modalHint: {
    fontSize: 14,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    fontStyle: 'italic'
  }
});