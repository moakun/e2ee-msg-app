import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Modal,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../services/network/ApiService';
import { DatabaseService } from '../services/database/DatabaseService';
import { useAuth } from '../context/AuthContext';
import { UI_CONFIG } from '../utils/constants';
import { Button } from '../components/ui/Button';

export default function GroupChatScreen({ navigation }) {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadAvailableUsers();
  }, []);

  const loadAvailableUsers = async () => {
    try {
      // Get all users except current user
      const response = await ApiService.getAllUsers();
      if (response.success) {
        setAvailableUsers(response.users);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const toggleMemberSelection = (userId) => {
    setSelectedMembers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (selectedMembers.length === 0) {
      Alert.alert('Error', 'Please select at least one member');
      return;
    }

    setLoading(true);
    try {
      const response = await ApiService.createGroup({
        name: groupName.trim(),
        description: description.trim(),
        memberIds: selectedMembers
      });

      if (response.success) {
        // Create group in local database
        const chatId = await DatabaseService.createChat({
          name: groupName.trim(),
          type: 'group',
          createdBy: user.id
        });

        // Add participants locally
        await DatabaseService.db.runAsync(
          'INSERT INTO chat_participants (chat_id, user_id, joined_at, role) VALUES (?, ?, ?, ?)',
          [chatId, user.id, Date.now(), 'admin']
        );

        for (const memberId of selectedMembers) {
          await DatabaseService.db.runAsync(
            'INSERT INTO chat_participants (chat_id, user_id, joined_at, role) VALUES (?, ?, ?, ?)',
            [chatId, memberId, Date.now(), 'member']
          );
        }

        Alert.alert('Success', 'Group created successfully!', [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('Chat', {
                chatId: response.group.id,
                chatName: response.group.name,
                recipientPublicKey: null, // Group chats don't have single recipient
                isGroup: true
              });
            }
          }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const renderUserItem = ({ item }) => {
    const isSelected = selectedMembers.includes(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.selectedUserItem]}
        onPress={() => toggleMemberSelection(item.id)}
      >
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.username}>{item.username}</Text>
        </View>
        
        <Ionicons
          name={isSelected ? 'checkmark-circle' : 'circle-outline'}
          size={24}
          color={isSelected ? UI_CONFIG.COLORS.PRIMARY : '#999'}
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={UI_CONFIG.COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.title}>Create Group</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.inputSection}>
          <Text style={styles.label}>Group Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter group name"
            value={groupName}
            onChangeText={setGroupName}
            maxLength={50}
          />
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter group description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
        </View>

        <View style={styles.membersSection}>
          <Text style={styles.label}>
            Select Members ({selectedMembers.length} selected)
          </Text>
          
          <FlatList
            data={availableUsers}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id.toString()}
            style={styles.usersList}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Create Group"
          onPress={createGroup}
          loading={loading}
          disabled={loading || !groupName.trim() || selectedMembers.length === 0}
          style={styles.createButton}
        />
      </View>
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
  content: {
    flex: 1
  },
  inputSection: {
    padding: UI_CONFIG.SPACING.MD,
    backgroundColor: UI_CONFIG.COLORS.SURFACE,
    marginBottom: UI_CONFIG.SPACING.XS
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: UI_CONFIG.COLORS.TEXT,
    marginBottom: UI_CONFIG.SPACING.SM
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: UI_CONFIG.SPACING.MD,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F8F8F8'
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
    textAlignVertical: 'top'
  },
  membersSection: {
    flex: 1,
    padding: UI_CONFIG.SPACING.MD,
    backgroundColor: UI_CONFIG.COLORS.SURFACE
  },
  usersList: {
    flex: 1
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: UI_CONFIG.SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  selectedUserItem: {
    backgroundColor: '#F0F8FF'
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: UI_CONFIG.COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: UI_CONFIG.SPACING.SM
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  username: {
    fontSize: 16,
    color: UI_CONFIG.COLORS.TEXT
  },
  footer: {
    padding: UI_CONFIG.SPACING.MD,
    backgroundColor: UI_CONFIG.COLORS.SURFACE,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  createButton: {
    width: '100%'
  }
});