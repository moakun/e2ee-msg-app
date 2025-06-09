import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  Modal,
  Text,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { UI_CONFIG } from '../utils/constants';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const { loading, isLoggingIn, isRegistering } = useAuth();
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (isLoggingIn || isRegistering) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [isLoggingIn, isRegistering]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LoadingSpinner text="Loading..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          {isLogin ? (
            <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Simple Loading Overlay */}
      {(isLoggingIn || isRegistering) && (
        <Animated.View 
          style={[
            styles.loadingOverlay,
            { opacity: fadeAnim }
          ]}
          pointerEvents="auto"
        >
          <View style={styles.loadingContent}>
            <LoadingSpinner size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>
              {isLoggingIn ? 'Signing in...' : 'Creating account...'}
            </Text>
          </View>
        </Animated.View>
      )}
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
  keyboardView: {
    flex: 1
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingContent: {
    alignItems: 'center'
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginTop: 16,
    fontWeight: '500'
  }
});