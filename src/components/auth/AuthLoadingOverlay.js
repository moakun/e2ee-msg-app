// src/components/auth/AuthLoadingOverlay.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Animated } from 'react-native';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { UI_CONFIG } from '../../utils/constants';

export function AuthLoadingOverlay({ visible, mode = 'login' }) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [progressAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }).start();

      // Animate progress bar
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: false
      }).start();
    } else {
      // Reset animations
      fadeAnim.setValue(0);
      progressAnim.setValue(0);
    }
  }, [visible]);

  const messages = {
    login: {
      title: 'Signing In',
      steps: [
        'Verifying credentials...',
        'Loading your data...',
        'Almost there...'
      ]
    },
    register: {
      title: 'Creating Account',
      steps: [
        'Generating encryption keys...',
        'Securing your account...',
        'Almost ready...'
      ]
    }
  };

  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (visible) {
      const interval = setInterval(() => {
        setCurrentStep(prev => (prev + 1) % 3);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [visible]);

  const config = messages[mode] || messages.login;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.content}>
          <LoadingSpinner size="large" color="#FFFFFF" />
          
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.subtitle}>{config.steps[currentStep]}</Text>
          
          <View style={styles.progressContainer}>
            <Animated.View 
              style={[
                styles.progressBar, 
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  })
                }
              ]} 
            />
          </View>
          
          <Text style={styles.hint}>This will only take a moment</Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  content: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 280,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    marginBottom: 24
  },
  progressContainer: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 20
  },
  progressBar: {
    height: '100%',
    backgroundColor: UI_CONFIG.COLORS.PRIMARY,
    borderRadius: 2
  },
  hint: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontStyle: 'italic'
  }
});