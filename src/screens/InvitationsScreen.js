import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../services/network/ApiService';
import { useAuth } from '../context/AuthContext';
import { UI_CONFIG } from '../utils/constants';
import { formatTimestamp } from '../utils/helpers';

export default function InvitationsScreen({ navigation }) {
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [sentInvitations, setSentInvitations] = useState([]);
  const [activeTab, setActiveTab] = useState('received'); // 'received' or 'sent'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      // Load both pending and sent invitations
      const [pendingResponse, sentResponse] = await Promise.all([
        ApiService.getPendingInvitations(),
        ApiService.getSentInvitations()
      ]);

      if (pendingResponse.success) {
        setPendingInvitations(pendingResponse.invitations);
      }

      if (sentResponse.success) {
        setSentInvitations(sentResponse.invitations);
      }
    } catch (error) {
      console.error('Failed to load invitations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAccept = async (invitation) => {
    try {
      const response = await ApiService.acceptInvitation(invitation.id);
      
      if (response.success) {
        Alert.alert('Success', 'Invitation accepted!');
        
        // Navigate to the new chat
        navigation.navigate('Chat', {
          chatId: response.chatId,
          chatName: invitation.from_username,
          recipientPublicKey: invitation.from_public_key
        });
        
        // Reload invitations
        loadInvitations();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to accept invitation');
    }
  };

  const handleReject = async (invitation) => {
    Alert.alert(
      'Reject Invitation',
      `Are you sure you want to reject the invitation from ${invitation.from_username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await ApiService.rejectInvitation(invitation.id);
              if (response.success) {
                Alert.alert('Success', 'Invitation rejected');
                loadInvitations();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to reject invitation');
            }
          }
        }
      ]
    );
  };

  const handleCancel = async (invitation) => {
    try {
      const response = await ApiService.cancelInvitation(invitation.id);
      if (response.success) {
        Alert.alert('Success', 'Invitation cancelled');
        loadInvitations();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel invitation');
    }
  };

  const renderPendingInvitation = ({ item }) => (
    <View style={styles.invitationCard}>
      <View style={styles.invitationHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.from_username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.username}>{item.from_username}</Text>
            <Text style={styles.timestamp}>{formatTimestamp(item.created_at)}</Text>
          </View>
        </View>
      </View>
      
      {item.message && (
        <Text style={styles.message}>{item.message}</Text>
      )}
      
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleReject(item)}
        >
          <Ionicons name="close" size={20} color="#FFFFFF" />
          <Text style={styles.actionText}>Reject</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleAccept(item)}
        >
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          <Text style={styles.actionText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSentInvitation = ({ item }) => (
    <View style={styles.invitationCard}>
      <View style={styles.invitationHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.to_username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.username}>{item.to_username}</Text>
            <Text style={styles.timestamp}>{formatTimestamp(item.created_at)}</Text>
          </View>
        </View>
        
        <View style={[styles.statusBadge, styles[`status_${item.status}`]]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      {item.status === 'pending' && (
        <TouchableOpacity
          style={[styles.actionButton, styles.cancelButton]}
          onPress={() => handleCancel(item)}
        >
          <Text style={styles.actionText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={UI_CONFIG.COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.title}>Chat Invitations</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pendingInvitations.length}</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.activeTab]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
            Received ({pendingInvitations.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
            Sent ({sentInvitations.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTab === 'received' ? pendingInvitations : sentInvitations}
        renderItem={activeTab === 'received' ? renderPendingInvitation : renderSentInvitation}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadInvitations} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons 
              name={activeTab === 'received' ? 'mail-outline' : 'send-outline'} 
              size={64} 
              color="#C7C7CC" 
            />
            <Text style={styles.emptyText}>
              {activeTab === 'received' 
                ? 'No pending invitations' 
                : 'No sent invitations'}
            </Text>
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
    paddingHorizontal: UI_CONFIG.SPACING.MD,
    paddingVertical: UI_CONFIG.SPACING.SM,
    backgroundColor: UI_CONFIG.COLORS.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: UI_CONFIG.COLORS.TEXT,
    flex: 1,
    marginLeft: UI_CONFIG.SPACING.MD
  },
  badge: {
    backgroundColor: UI_CONFIG.COLORS.ERROR,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold'
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: UI_CONFIG.COLORS.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  tab: {
    flex: 1,
    paddingVertical: UI_CONFIG.SPACING.MD,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  activeTab: {
    borderBottomColor: UI_CONFIG.COLORS.PRIMARY
  },
  tabText: {
    fontSize: 16,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY
  },
  activeTabText: {
    color: UI_CONFIG.COLORS.PRIMARY,
    fontWeight: '600'
  },
  listContainer: {
    paddingVertical: UI_CONFIG.SPACING.SM
  },
  invitationCard: {
    backgroundColor: UI_CONFIG.COLORS.SURFACE,
    marginHorizontal: UI_CONFIG.SPACING.MD,
    marginVertical: UI_CONFIG.SPACING.XS,
    padding: UI_CONFIG.SPACING.MD,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  invitationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: UI_CONFIG.SPACING.SM
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
    fontWeight: '600',
    color: UI_CONFIG.COLORS.TEXT
  },
  timestamp: {
    fontSize: 12,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    marginTop: 2
  },
  message: {
    fontSize: 14,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    marginBottom: UI_CONFIG.SPACING.MD,
    fontStyle: 'italic'
  },
  actions: {
    flexDirection: 'row',
    gap: UI_CONFIG.SPACING.SM
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: UI_CONFIG.SPACING.SM,
    borderRadius: 8,
    gap: UI_CONFIG.SPACING.XS
  },
  acceptButton: {
    backgroundColor: UI_CONFIG.COLORS.SUCCESS
  },
  rejectButton: {
    backgroundColor: UI_CONFIG.COLORS.ERROR
  },
  cancelButton: {
    backgroundColor: UI_CONFIG.COLORS.TEXT_SECONDARY,
    marginTop: UI_CONFIG.SPACING.SM
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  status_pending: {
    backgroundColor: '#FFF3CD'
  },
  status_accepted: {
    backgroundColor: '#D4EDDA'
  },
  status_rejected: {
    backgroundColor: '#F8D7DA'
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: UI_CONFIG.SPACING.XL * 2
  },
  emptyText: {
    fontSize: 16,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    marginTop: UI_CONFIG.SPACING.MD
  }
});