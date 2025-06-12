// src/components/debug/WebSocketDebug.js - Add to ProfileScreen
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuth } from '../../context/AuthContext';
import { DatabaseService } from '../../services/database/DatabaseService';
import { UI_CONFIG } from '../../utils/constants';

export function WebSocketDebug() {
  const [debugInfo, setDebugInfo] = useState({});
  const [localChats, setLocalChats] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { 
    isConnected, 
    connectionStatus, 
    getDebugInfo, 
    reconnect, 
    autoJoinUserChats, 
    isInChat,
    rejoinChat 
  } = useWebSocket();
  const { user } = useAuth();

  useEffect(() => {
    refreshDebugInfo();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(refreshDebugInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  const refreshDebugInfo = async () => {
    try {
      const wsDebugInfo = getDebugInfo();
      setDebugInfo(wsDebugInfo);
      
      if (user) {
        const userChats = await DatabaseService.getUserChats(user.id);
        setLocalChats(userChats);
      }
    } catch (error) {
      console.error('Failed to refresh debug info:', error);
    }
  };

  const handleForceReconnect = () => {
    Alert.alert(
      'Force Reconnect',
      'This will disconnect and reconnect the WebSocket. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reconnect',
          onPress: () => {
            reconnect();
            setTimeout(refreshDebugInfo, 2000);
          }
        }
      ]
    );
  };

  const handleForceRejoin = async () => {
    setRefreshing(true);
    try {
      const success = await autoJoinUserChats();
      Alert.alert(
        'Force Rejoin Result',
        success ? 'Successfully rejoined all chats' : 'Failed to rejoin some chats'
      );
      setTimeout(refreshDebugInfo, 1000);
    } catch (error) {
      Alert.alert('Error', 'Failed to rejoin chats: ' + error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRejoinSpecificChat = (chatId) => {
    Alert.alert(
      'Rejoin Chat',
      `Rejoin chat ${chatId}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rejoin',
          onPress: async () => {
            try {
              const success = await rejoinChat(chatId);
              Alert.alert(
                'Rejoin Result',
                success ? 'Successfully rejoined chat' : 'Failed to rejoin chat'
              );
              setTimeout(refreshDebugInfo, 1000);
            } catch (error) {
              Alert.alert('Error', 'Failed to rejoin chat: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return '#34C759';
      case 'connecting': return '#FF9500';
      case 'disabled': return '#8E8E93';
      case 'error': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected': return '✅';
      case 'connecting': return '🔄';
      case 'disabled': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌐 WebSocket Debug</Text>
      
      <View style={styles.statusSection}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status:</Text>
          <View style={styles.statusValue}>
            <Text style={styles.statusIcon}>{getStatusIcon(connectionStatus)}</Text>
            <Text style={[styles.statusText, { color: getStatusColor(connectionStatus) }]}>
              {connectionStatus.toUpperCase()}
            </Text>
          </View>
        </View>
        
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Connected:</Text>
          <Text style={styles.statusText}>{isConnected ? '✅ Yes' : '❌ No'}</Text>
        </View>
        
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Auto-Join Done:</Text>
          <Text style={styles.statusText}>
            {debugInfo.hasAutoJoined ? '✅ Yes' : '❌ No'}
          </Text>
        </View>
        
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>User ID:</Text>
          <Text style={styles.statusText}>{debugInfo.userId || 'N/A'}</Text>
        </View>
        
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Joined Chats:</Text>
          <Text style={styles.statusText}>
            {debugInfo.joinedChats?.length || 0} / {localChats.length}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.chatsSection} nestedScrollEnabled>
        <Text style={styles.sectionTitle}>Chat Status ({localChats.length} total)</Text>
        
        {localChats.map((chat) => {
          const inChat = isInChat(chat.id);
          return (
            <View key={chat.id} style={styles.chatRow}>
              <View style={styles.chatInfo}>
                <Text style={styles.chatName}>{chat.name}</Text>
                <Text style={styles.chatId}>ID: {chat.id}</Text>
              </View>
              <View style={styles.chatStatus}>
                <Text style={[styles.chatStatusText, { color: inChat ? '#34C759' : '#FF3B30' }]}>
                  {inChat ? '✅ Joined' : '❌ Not Joined'}
                </Text>
                {!inChat && (
                  <TouchableOpacity
                    style={styles.rejoinButton}
                    onPress={() => handleRejoinSpecificChat(chat.id)}
                  >
                    <Text style={styles.rejoinButtonText}>Rejoin</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={refreshDebugInfo}
        >
          <Text style={styles.actionButtonText}>🔄 Refresh</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryButton]} 
          onPress={handleForceRejoin}
          disabled={refreshing || !isConnected}
        >
          <Text style={styles.actionButtonText}>
            {refreshing ? '⏳ Rejoining...' : '🚪 Force Rejoin All'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.warningButton]} 
          onPress={handleForceReconnect}
        >
          <Text style={styles.actionButtonText}>🔌 Reconnect</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.debugData}>
        <Text style={styles.debugTitle}>Raw Debug Data:</Text>
        <ScrollView style={styles.debugScroll} nestedScrollEnabled>
          <Text style={styles.debugText}>
            {JSON.stringify(debugInfo, null, 2)}
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    margin: UI_CONFIG.SPACING.MD,
    padding: UI_CONFIG.SPACING.MD,
    borderWidth: 1,
    borderColor: '#2196F3',
    maxHeight: 500
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: UI_CONFIG.SPACING.SM,
    textAlign: 'center'
  },
  statusSection: {
    marginBottom: UI_CONFIG.SPACING.MD,
    paddingBottom: UI_CONFIG.SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: '#BBDEFB'
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565C0'
  },
  statusValue: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusIcon: {
    marginRight: 4,
    fontSize: 14
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'monospace'
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: UI_CONFIG.SPACING.XS
  },
  chatsSection: {
    maxHeight: 150,
    marginBottom: UI_CONFIG.SPACING.MD
  },
  chatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E1F5FE'
  },
  chatInfo: {
    flex: 1
  },
  chatName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0D47A1'
  },
  chatId: {
    fontSize: 10,
    color: '#42A5F5',
    fontFamily: 'monospace'
  },
  chatStatus: {
    alignItems: 'flex-end'
  },
  chatStatusText: {
    fontSize: 10,
    fontWeight: '600'
  },
  rejoinButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2
  },
  rejoinButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600'
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: UI_CONFIG.SPACING.SM,
    paddingTop: UI_CONFIG.SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: '#BBDEFB'
  },
  actionButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: UI_CONFIG.SPACING.SM,
    paddingVertical: UI_CONFIG.SPACING.XS,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center'
  },
  primaryButton: {
    backgroundColor: '#4CAF50'
  },
  warningButton: {
    backgroundColor: '#FF9800'
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12
  },
  debugData: {
    backgroundColor: '#F3E5F5',
    borderRadius: 6,
    padding: UI_CONFIG.SPACING.SM,
    maxHeight: 100
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7B1FA2',
    marginBottom: 4
  },
  debugScroll: {
    maxHeight: 80
  },
  debugText: {
    fontSize: 10,
    color: '#4A148C',
    fontFamily: 'monospace',
    lineHeight: 12
  }
});