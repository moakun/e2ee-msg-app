import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { SecurityService } from '../services/security/SecurityService';
import { Storage } from '../utils/storage';
import { UI_CONFIG } from '../utils/constants';
import { StorageDebug } from '../components/debug/StorageDebug';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleBiometricToggle = async (value) => {
    if (value) {
      const enabled = await SecurityService.enableBiometricAuth();
      if (enabled) {
        setBiometricEnabled(true);
        Alert.alert('Success', 'Biometric authentication enabled');
      } else {
        Alert.alert('Error', 'Failed to enable biometric authentication');
      }
    } else {
      await Storage.removeSecure('biometricEnabled');
      setBiometricEnabled(false);
    }
  };

  const handleNotificationsToggle = async (value) => {
    setNotificationsEnabled(value);
    await Storage.set('notificationsEnabled', value);
  };

  const exportData = () => {
    Alert.alert(
      'Export Data',
      'This feature would export your encrypted data for backup purposes.',
      [{ text: 'OK' }]
    );
  };

  const deleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Implement account deletion
            logout();
          }
        }
      ]
    );
  };

  const resetDatabase = async () => {
  Alert.alert(
    'Reset Database',
    'This will delete all data. Are you sure?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await DatabaseService.resetDatabase();
          await DatabaseService.init();
          Alert.alert('Success', 'Database reset. Please restart the app.');
        }
      }
    ]
  );
};

  const SettingItem = ({ title, subtitle, icon, onPress, rightComponent }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Ionicons name={icon} size={20} color={UI_CONFIG.COLORS.PRIMARY} />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightComponent || (
        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.username?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.userId}>ID: {user?.id}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          <SettingItem
            title="Biometric Authentication"
            subtitle="Use fingerprint or face recognition"
            icon="finger-print"
            rightComponent={
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: '#E0E0E0', true: UI_CONFIG.COLORS.PRIMARY }}
                thumbColor={biometricEnabled ? '#FFFFFF' : '#F4F3F4'}
              />
            }
          />
          
          <SettingItem
            title="Change Password"
            subtitle="Update your account password"
            icon="key"
            onPress={() => Alert.alert('Change Password', 'This feature will be implemented')}
          />
          
          <SettingItem
            title="Export Keys"
            subtitle="Backup your encryption keys"
            icon="download"
            onPress={exportData}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <SettingItem
            title="Push Notifications"
            subtitle="Receive notifications for new messages"
            icon="notifications"
            rightComponent={
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationsToggle}
                trackColor={{ false: '#E0E0E0', true: UI_CONFIG.COLORS.PRIMARY }}
                thumbColor={notificationsEnabled ? '#FFFFFF' : '#F4F3F4'}
              />
            }
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          
          <SettingItem
            title="Export Data"
            subtitle="Download your chat history"
            icon="archive"
            onPress={exportData}
          />
          
          <SettingItem
            title="Clear Chat History"
            subtitle="Delete all local messages"
            icon="trash"
            onPress={() => Alert.alert('Clear History', 'This feature will be implemented')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <SettingItem
            title="Privacy Policy"
            icon="shield-checkmark"
            onPress={() => Alert.alert('Privacy Policy', 'Privacy policy content')}
          />
          
          <SettingItem
            title="Terms of Service"
            icon="document-text"
            onPress={() => Alert.alert('Terms of Service', 'Terms of service content')}
          />
          
          <SettingItem
            title="Version"
            subtitle="1.0.0"
            icon="information-circle"
          />
        </View>

        <View style={styles.dangerSection}>
          <Button
            title="Sign Out"
            onPress={logout}
            variant="secondary"
            style={styles.signOutButton}
          />
          
          <Button
            title="Delete Account"
            onPress={deleteAccount}
            style={[styles.deleteButton, { backgroundColor: UI_CONFIG.COLORS.ERROR }]}
          />

          <Button
            title="Reset Database"
            onPress={resetDatabase}
          />
        </View>
        <StorageDebug />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_CONFIG.COLORS.BACKGROUND
  },
  scrollView: {
    flex: 1
  },
  header: {
    alignItems: 'center',
    paddingVertical: UI_CONFIG.SPACING.XL,
    backgroundColor: UI_CONFIG.COLORS.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: UI_CONFIG.COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: UI_CONFIG.SPACING.MD
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  username: {
    fontSize: 20,
    fontWeight: '600',
    color: UI_CONFIG.COLORS.TEXT,
    marginBottom: UI_CONFIG.SPACING.XS
  },
  userId: {
    fontSize: 14,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY
  },
  section: {
    marginTop: UI_CONFIG.SPACING.LG
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: UI_CONFIG.COLORS.TEXT,
    paddingHorizontal: UI_CONFIG.SPACING.MD,
    paddingBottom: UI_CONFIG.SPACING.SM,
    textTransform: 'uppercase'
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: UI_CONFIG.SPACING.MD,
    paddingVertical: UI_CONFIG.SPACING.MD,
    backgroundColor: UI_CONFIG.COLORS.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: UI_CONFIG.SPACING.MD
  },
  settingText: {
    flex: 1
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: UI_CONFIG.COLORS.TEXT
  },
  settingSubtitle: {
    fontSize: 14,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    marginTop: 2
  },
  dangerSection: {
    paddingHorizontal: UI_CONFIG.SPACING.MD,
    paddingVertical: UI_CONFIG.SPACING.XL
  },
  signOutButton: {
    marginBottom: UI_CONFIG.SPACING.MD
  },
  deleteButton: {
    backgroundColor: UI_CONFIG.COLORS.ERROR
  }
});