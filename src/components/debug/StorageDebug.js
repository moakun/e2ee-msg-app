// src/components/debug/StorageDebug.js - Add to ProfileScreen temporarily
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Storage } from '../../utils/storage';
import { UI_CONFIG } from '../../utils/constants';

export function StorageDebug() {
  const { clearAllStorage } = useAuth();

  const checkStorage = async () => {
    try {
      const userData = await Storage.getSecure('userData');
      const authToken = await Storage.getSecureString('authToken');
      const derivedKey = await Storage.getSecureString('derivedKey');

      Alert.alert('Storage Status', 
        `UserData: ${userData ? 'Found' : 'Not found'}\n` +
        `AuthToken: ${authToken ? 'Found' : 'Not found'}\n` +
        `DerivedKey: ${derivedKey ? 'Found' : 'Not found'}`
      );
    } catch (error) {
      Alert.alert('Storage Error', error.message);
    }
  };

  const clearStorage = () => {
    Alert.alert(
      'Clear Storage',
      'This will clear all stored data and log you out. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: clearAllStorage
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Storage Debug</Text>
      
      <TouchableOpacity style={styles.button} onPress={checkStorage}>
        <Text style={styles.buttonText}>Check Storage</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={clearStorage}>
        <Text style={styles.buttonText}>Clear All Storage</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: UI_CONFIG.SPACING.MD,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    margin: UI_CONFIG.SPACING.MD
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: UI_CONFIG.SPACING.SM,
    color: '#856404'
  },
  button: {
    backgroundColor: UI_CONFIG.COLORS.PRIMARY,
    padding: UI_CONFIG.SPACING.SM,
    borderRadius: 6,
    marginVertical: 4
  },
  dangerButton: {
    backgroundColor: UI_CONFIG.COLORS.ERROR
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '500'
  }
});