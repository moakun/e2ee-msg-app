// App.js - Fixed AppState Event Listener
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { LogBox, Alert, View, Text, StyleSheet, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import 'react-native-get-random-values';
import { Buffer } from 'buffer';

global.Buffer = Buffer;

import { AuthProvider } from './src/context/AuthContext';
import { ChatProvider } from './src/context/ChatContext';
import AppNavigator from './src/navigation/AppNavigator';
import { DatabaseService } from './src/services/database/DatabaseService';
import { LoadingSpinner } from './src/components/ui/LoadingSpinner';
import { Button } from './src/components/ui/Button';

LogBox.ignoreLogs([
  'Setting a timer',
  'AsyncStorage has been extracted',
  'Non-serializable values were found in the navigation state',
]);

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    initializeApp();
    
    // Fixed AppState event listener for newer React Native versions
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'background') {
        // Clear sensitive data when app goes to background
        console.log('🔒 App moved to background - sensitive data would be cleared');
        // Note: CryptoService.clearCache() would be called here if available
      }
    };

    // Use the new event listener API
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup function
    return () => {
      if (subscription?.remove) {
        subscription.remove();
      } else {
        // Fallback for older versions
        AppState.removeEventListener?.('change', handleAppStateChange);
      }
    };
  }, []);

  const initializeApp = async () => {
    const timeout = setTimeout(() => {
      console.error('⏰ Database initialization timeout (10 seconds)');
      setInitError(new Error('Initialization timed out. Please try again.'));
    }, 10000); // 10 second timeout

    try {
      setInitError(null);
      setIsRetrying(false);
      
      console.log('🚀 Starting app initialization...');
      
      // Initialize database with timeout protection
      await DatabaseService.init();
      
      clearTimeout(timeout);
      console.log('🎉 App initialization completed');
      setIsInitialized(true);
      
    } catch (error) {
      clearTimeout(timeout);
      console.error('💥 App initialization failed:', error);
      setInitError(error);
    }
  };

  const retryInitialization = async () => {
    setIsRetrying(true);
    await initializeApp();
    setIsRetrying(false);
  };

  const resetAndRetry = async () => {
    try {
      setIsRetrying(true);
      console.log('🔄 Resetting database...');
      
      await DatabaseService.resetDatabase();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      await initializeApp();
      
    } catch (error) {
      console.error('❌ Reset failed:', error);
      setInitError(error);
    } finally {
      setIsRetrying(false);
    }
  };

  if (!isInitialized && !initError) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LoadingSpinner text="Starting SecureChat..." />
        <Text style={styles.loadingHint}>
          This should take only a few seconds
        </Text>
      </SafeAreaView>
    );
  }

  if (initError) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <View style={styles.errorContent}>
          <Text style={styles.errorTitle}>Startup Failed</Text>
          <Text style={styles.errorMessage}>
            {initError.message || 'Failed to initialize the app'}
          </Text>
          
          <View style={styles.errorActions}>
            <Button
              title={isRetrying ? "Retrying..." : "Try Again"}
              onPress={retryInitialization}
              disabled={isRetrying}
              style={styles.retryButton}
            />
            
            <Button
              title={isRetrying ? "Resetting..." : "Reset & Retry"}
              onPress={resetAndRetry}
              disabled={isRetrying}
              variant="secondary"
              style={styles.resetButton}
            />
          </View>
          
          <Text style={styles.errorHint}>
            If this keeps happening, restart the app completely.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer>
      <AuthProvider>
        <ChatProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </ChatProvider>
      </AuthProvider>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20
  },
  loadingHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20
  },
  errorContent: {
    width: '100%',
    maxWidth: 300,
    alignItems: 'center'
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center'
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22
  },
  errorActions: {
    width: '100%',
    gap: 12
  },
  retryButton: {
    marginBottom: 8
  },
  resetButton: {
    marginBottom: 16
  },
  errorHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic'
  }
});