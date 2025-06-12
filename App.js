// App.js - Fixed Version without Timeout
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
  const [initProgress, setInitProgress] = useState('Starting...');

  useEffect(() => {
    initializeApp();
    
    // AppState event listener for background/foreground
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'background') {
        console.log('🔒 App moved to background');
      } else if (nextAppState === 'active') {
        console.log('🔓 App became active');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (subscription?.remove) {
        subscription.remove();
      } else {
        AppState.removeEventListener?.('change', handleAppStateChange);
      }
    };
  }, []);

  const initializeApp = async () => {
    try {
      setInitError(null);
      setIsRetrying(false);
      setInitProgress('Starting initialization...');
      
      console.log('🚀 Starting app initialization...');
      
      // Initialize database without timeout - let it take as long as needed
      setInitProgress('Initializing database...');
      await DatabaseService.init();
      
      setInitProgress('Database ready!');
      console.log('🎉 App initialization completed');
      setIsInitialized(true);
      
    } catch (error) {
      console.error('💥 App initialization failed:', error);
      setInitError(error);
      setInitProgress('Initialization failed');
    }
  };

  const retryInitialization = async () => {
    setIsRetrying(true);
    setInitProgress('Retrying...');
    await initializeApp();
    setIsRetrying(false);
  };

  const resetAndRetry = async () => {
    try {
      setIsRetrying(true);
      setInitProgress('Resetting database...');
      console.log('🔄 Resetting database...');
      
      await DatabaseService.resetDatabase();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setInitProgress('Reinitializing...');
      await initializeApp();
      
    } catch (error) {
      console.error('❌ Reset failed:', error);
      setInitError(error);
      setInitProgress('Reset failed');
    } finally {
      setIsRetrying(false);
    }
  };

  // Show loading screen while initializing
  if (!isInitialized && !initError) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LoadingSpinner text={initProgress} />
        <Text style={styles.loadingHint}>
          Setting up your secure database...
        </Text>
        {isRetrying && (
          <Text style={styles.retryText}>
            This may take a moment on first launch
          </Text>
        )}
      </SafeAreaView>
    );
  }

  // Show error screen if initialization failed
  if (initError) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <View style={styles.errorContent}>
          <Text style={styles.errorTitle}>Startup Failed</Text>
          <Text style={styles.errorMessage}>
            {initError.message || 'Failed to initialize the app'}
          </Text>
          
          <Text style={styles.errorDetails}>
            Current status: {initProgress}
          </Text>
          
          <View style={styles.errorActions}>
            <Button
              title={isRetrying ? "Retrying..." : "Try Again"}
              onPress={retryInitialization}
              disabled={isRetrying}
              style={styles.retryButton}
            />
            
            <Button
              title={isRetrying ? "Resetting..." : "Reset Database"}
              onPress={resetAndRetry}
              disabled={isRetrying}
              variant="secondary"
              style={styles.resetButton}
            />
          </View>
          
          <Text style={styles.errorHint}>
            If this keeps happening, try restarting the app completely.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // App successfully initialized
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
  retryText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
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
    marginBottom: 16,
    lineHeight: 22
  },
  errorDetails: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic'
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