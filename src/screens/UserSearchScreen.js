import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { ApiService } from '../services/network/ApiService';
import { DatabaseService } from '../services/database/DatabaseService';
import { UI_CONFIG } from '../utils/constants';

export default function UserSearchScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    loadContacts();
    loadAllUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Function to remove duplicate users
  const removeDuplicateUsers = (users) => {
    const seen = new Set();
    return users.filter(user => {
      const duplicate = seen.has(user.id);
      seen.add(user.id);
      return !duplicate;
    });
  };

  // Sync users to local database
const syncUsersToLocalDatabase = async (users) => {
  for (const user of users) {
    try {
      // Check if user exists locally
      const existingUser = await DatabaseService.getUserById(user.id);
      
      if (!existingUser) {
        // Create user with backend ID
        await DatabaseService.createUser({
          id: user.id,  // Important: use backend ID
          username: user.username,
          publicKey: user.public_key,
          encryptedPrivateKey: '',
          salt: ''
        });
        console.log(`✅ Synced user ${user.username} to local database`);
      }
    } catch (error) {
      console.error(`Failed to sync user ${user.username}:`, error);
    }
  }
};

  const loadContacts = async () => {
    try {
      const userContacts = await DatabaseService.getUserContacts(user.id);
      setContacts(userContacts);
      console.log('Loaded local contacts:', userContacts.length);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      setContacts([]);
    }
  };

  const loadAllUsers = async () => {
    try {
      const response = await ApiService.getAllUsers();
      if (response.success) {
        const uniqueUsers = removeDuplicateUsers(response.users);
        setAllUsers(uniqueUsers);
        console.log('Loaded all users from backend:', uniqueUsers.length);
        
        // Sync users to local database
        await syncUsersToLocalDatabase(uniqueUsers);
      }
    } catch (error) {
      console.error('Failed to load all users:', error);
      // Fallback to local search if backend fails
      try {
        const localUsers = await DatabaseService.searchUsers('', user.id);
        setAllUsers(localUsers);
      } catch (localError) {
        console.error('Local fallback also failed:', localError);
      }
    }
  };

  const searchUsers = async () => {
    try {
      setLoading(true);
      
      // Try backend search first
      try {
        const response = await ApiService.searchUsers(searchQuery.trim());
        if (response.success) {
          const uniqueResults = removeDuplicateUsers(response.users);
          setSearchResults(uniqueResults);
          console.log('Backend search results:', uniqueResults.length);
          
          // Sync search results to local database
          await syncUsersToLocalDatabase(uniqueResults);
          return;
        }
      } catch (backendError) {
        console.log('Backend search failed, trying local:', backendError.message);
      }
      
      // Fallback to local search
      const localResults = await DatabaseService.searchUsers(searchQuery.trim(), user.id);
      setSearchResults(localResults);
      console.log('Local search results:', localResults.length);
      
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
      if (error.message.includes('timeout')) {
        Alert.alert('Connection Error', 'Please check your internet connection');
      }
    } finally {
      setLoading(false);
    }
  };

const addContact = async (contactUser) => {
  try {
    // First, ensure the user exists in local database
    let localUser = await DatabaseService.getUserByUsername(contactUser.username);
    
    if (!localUser) {
      console.log('User not in local DB, adding:', contactUser.username);
      // Add user to local database first
      try {
        await DatabaseService.db.runAsync(
          `INSERT OR REPLACE INTO users (id, username, public_key, encrypted_private_key, salt, is_online, last_seen, created_at) 
           VALUES (?, ?, ?, '', '', ?, ?, ?)`,
          [
            contactUser.id,
            contactUser.username,
            contactUser.public_key || contactUser.publicKey, // Handle both field names
            contactUser.is_online ? 1 : 0,
            contactUser.last_seen || 0,
            Date.now()
          ]
        );
        console.log('User added to local DB successfully');
      } catch (dbError) {
        console.error('Failed to add user to local DB:', dbError);
        throw dbError;
      }
    }
    
    // Now add as contact using the modified addContact that accepts user data
    await DatabaseService.addContact(user.id, contactUser.id, {
      username: contactUser.username,
      public_key: contactUser.public_key || contactUser.publicKey
    });
    
    Alert.alert('Success', `${contactUser.username} added to contacts`);
    loadContacts();
  } catch (error) {
    console.error('Add contact failed:', error);
    Alert.alert('Error', 'Failed to add contact: ' + error.message);
  }
};

const renderUserItem = ({ item, isContact = false }) => {
  const isContactInList = contacts.some(c => c.contact_user_id === item.id);
  
  return (
    <TouchableOpacity style={styles.userItem}>
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>
          {item.username.charAt(0).toUpperCase()}
        </Text>
      </View>
      
      <View style={styles.userInfo}>
        <Text style={styles.username}>{item.username}</Text>
        <View style={styles.userStatus}>
          <View style={[
            styles.statusDot, 
            { backgroundColor: item.is_online ? '#34C759' : '#999' }
          ]} />
          <Text style={styles.statusText}>
            {item.is_online ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>
      
      <View style={styles.userActions}>
        {!isContact && !isContactInList && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => addContact(item)}
          >
            <Ionicons name="person-add" size={20} color={UI_CONFIG.COLORS.PRIMARY} />
          </TouchableOpacity>
        )}

        {/* Replaced chat button with invitation button */}
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => sendInvitation(item)}
          disabled={loading}
        >
          <Ionicons 
            name="send" 
            size={20} 
            color={loading ? '#999' : UI_CONFIG.COLORS.PRIMARY} 
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};


  const sendInvitation = async (contactUser) => {
  try {
    // Check if invitation already sent
    const response = await ApiService.sendInvitation(contactUser.id, '');
    
    if (response.success) {
      Alert.alert(
        'Invitation Sent!',
        `Your chat invitation has been sent to ${contactUser.username}. They need to accept it before you can start chatting.`,
        [{ text: 'OK' }]
      );
    }
  } catch (error) {
    if (error.message.includes('already sent')) {
      Alert.alert('Info', 'You have already sent an invitation to this user.');
    } else if (error.message.includes('already exists')) {
      // If chat exists, navigate to it
      const chatId = await DatabaseService.createDirectChat(user.id, contactUser.id);
      navigation.navigate('Chat', {
        chatId,
        chatName: contactUser.username,
        recipientPublicKey: contactUser.public_key || contactUser.publicKey
      });
    } else {
      Alert.alert('Error', 'Failed to send invitation: ' + error.message);
    }
  }
};

  // Prepare FlatList data with unique keys
  const getFlatListData = () => {
    const data = [];
    
    // Search results section
    if (searchQuery.trim().length >= 2 && searchResults.length > 0) {
      data.push({ type: 'header', title: 'Search Results', key: 'header-search' });
      const uniqueSearchResults = removeDuplicateUsers(searchResults);
      uniqueSearchResults.forEach(user => {
        data.push({ type: 'user', ...user, isContact: false, key: `search-${user.id}` });
      });
    }
    
    // All users section
    if (searchQuery.trim().length < 2 && allUsers.length > 0) {
      data.push({ type: 'header', title: 'All Users', key: 'header-all' });
      const uniqueAllUsers = removeDuplicateUsers(allUsers);
      uniqueAllUsers.forEach(user => {
        data.push({ type: 'user', ...user, isContact: false, key: `all-${user.id}` });
      });
    }
    
    // Contacts section
    if (contacts.length > 0) {
      data.push({ type: 'header', title: 'Your Contacts', key: 'header-contacts' });
      contacts.forEach((contact, index) => {
        data.push({ 
          type: 'user',
          id: contact.contact_user_id,
          username: contact.contact_username,
          public_key: contact.contact_public_key,
          is_online: contact.is_online,
          isContact: true,
          key: `contact-${contact.contact_user_id}`
        });
      });
    }
    
    return data;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={UI_CONFIG.COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.title}>Find Users</Text>
        <TouchableOpacity onPress={loadAllUsers}>
          <Ionicons name="refresh" size={24} color={UI_CONFIG.COLORS.PRIMARY} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users by username..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <LoadingSpinner text="Searching..." />
        </View>
      )}

      <FlatList
        style={styles.resultsList}
        data={getFlatListData()}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{item.title}</Text>
              </View>
            );
          }
          return renderUserItem({ item, isContact: item.isContact });
        }}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            {searchQuery.trim().length >= 2 ? (
              <>
                <Text style={styles.emptyText}>No users found matching "{searchQuery}"</Text>
                <Text style={styles.emptySubtext}>Try a different username</Text>
              </>
            ) : (
              <>
                <Ionicons name="people-outline" size={64} color="#C7C7CC" />
                <Text style={styles.emptyText}>Find other users</Text>
                <Text style={styles.emptySubtext}>Search by username to start chatting</Text>
              </>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_CONFIG.COLORS.BACKGROUND
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: UI_CONFIG.SPACING.MD,
    paddingVertical: UI_CONFIG.SPACING.SM,
    backgroundColor: UI_CONFIG.COLORS.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: UI_CONFIG.COLORS.TEXT
  },
  searchContainer: {
    padding: UI_CONFIG.SPACING.MD,
    backgroundColor: UI_CONFIG.COLORS.SURFACE
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F1F6',
    borderRadius: 10,
    paddingHorizontal: UI_CONFIG.SPACING.MD,
    paddingVertical: UI_CONFIG.SPACING.SM
  },
  searchIcon: {
    marginRight: UI_CONFIG.SPACING.SM
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: UI_CONFIG.COLORS.TEXT
  },
  loadingContainer: {
    padding: UI_CONFIG.SPACING.LG
  },
  resultsList: {
    flex: 1
  },
  listContainer: {
    paddingBottom: UI_CONFIG.SPACING.LG
  },
  sectionHeader: {
    paddingHorizontal: UI_CONFIG.SPACING.MD,
    paddingVertical: UI_CONFIG.SPACING.SM,
    backgroundColor: UI_CONFIG.COLORS.BACKGROUND
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: UI_CONFIG.COLORS.TEXT,
    textTransform: 'uppercase'
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: UI_CONFIG.SPACING.MD,
    paddingVertical: UI_CONFIG.SPACING.SM,
    backgroundColor: UI_CONFIG.COLORS.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: UI_CONFIG.COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: UI_CONFIG.SPACING.MD
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  userInfo: {
    flex: 1
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
    color: UI_CONFIG.COLORS.TEXT,
    marginBottom: 2
  },
  userStatus: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4
  },
  statusText: {
    fontSize: 12,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY
  },
  userActions: {
    flexDirection: 'row'
  },
  addButton: {
    padding: UI_CONFIG.SPACING.XS,
    marginRight: UI_CONFIG.SPACING.SM
  },
  chatButton: {
    padding: UI_CONFIG.SPACING.XS
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: UI_CONFIG.SPACING.XL,
    paddingVertical: UI_CONFIG.SPACING.XL * 2
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: UI_CONFIG.COLORS.TEXT,
    textAlign: 'center',
    marginTop: UI_CONFIG.SPACING.MD
  },
  emptySubtext: {
    fontSize: 14,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: UI_CONFIG.SPACING.XS
  }
});