// src/screens/BiometricRegisterScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { BiometricAuthService } from '../services/auth/BiometricAuthService';
import { useAuth } from '../context/AuthContext';
import { UI_CONFIG } from '../utils/constants';

export default function BiometricRegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [biometricStatus, setBiometricStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const { login } = useAuth();

  useEffect(() => {
    checkBiometricStatus();
    startPulseAnimation();
  }, []);

  const checkBiometricStatus = async () => {
    const status = await BiometricAuthService.getBiometricStatus();
    setBiometricStatus(status);
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true
        })
      ])
    ).start();
  };

  const handleRegisterBiometric = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setLoading(true);

    try {
      // First, verify credentials by logging in
      const loginResult = await login(username.trim(), password);
      
      if (loginResult && loginResult.success) {
        // Now register biometric
        const registered = await BiometricAuthService.registerBiometricCredentials(
          loginResult.username,
          loginResult.derivedKey
        );
        
        if (registered) {
          Alert.alert(
            'Success',
            'Biometric authentication has been registered successfully! You can now login with your fingerprint/Face ID.',
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('Main')
              }
            ]
          );
        } else {
          Alert.alert('Error', 'Failed to register biometric authentication');
        }
      } else {
        Alert.alert('Error', 'Invalid username or password');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to register biometric');
    } finally {
      setLoading(false);
    }
  };

  const getBiometricIcon = () => {
    if (!biometricStatus?.supportedTypes?.length) {
      return 'finger-print';
    }
    
    if (biometricStatus.supportedTypes.includes('Face ID')) {
      return 'scan';
    } else if (biometricStatus.supportedTypes.includes('Fingerprint')) {
      return 'finger-print';
    } else {
      return 'shield-checkmark';
    }
  };

  const getBiometricText = () => {
    if (!biometricStatus?.supportedTypes?.length) {
      return 'Biometric';
    }
    
    const types = biometricStatus.supportedTypes;
    if (types.length === 1) {
      return types[0];
    } else {
      return types.join(' or ');
    }
  };

  if (!biometricStatus?.available) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={UI_CONFIG.COLORS.PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Biometric Setup</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.unavailableContainer}>
          <Ionicons name="warning" size={64} color={UI_CONFIG.COLORS.WARNING} />
          <Text style={styles.unavailableTitle}>Biometric Not Available</Text>
          <Text style={styles.unavailableText}>
            {!biometricStatus?.hasHardware 
              ? 'This device does not support biometric authentication.'
              : 'No biometric data is enrolled on this device. Please set up fingerprint/Face ID in your device settings first.'
            }
          </Text>
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            style={styles.goBackButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={UI_CONFIG.COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Register Biometric</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconSection}>
          <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
            <Ionicons
              name={getBiometricIcon()}
              size={80}
              color={UI_CONFIG.COLORS.PRIMARY}
            />
          </Animated.View>
          
          <Text style={styles.title}>Register {getBiometricText()}</Text>
          <Text style={styles.subtitle}>
            Enter your credentials to register {getBiometricText().toLowerCase()} for quick login
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Username"
            placeholder="Enter your username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={UI_CONFIG.COLORS.PRIMARY} />
            <Text style={styles.infoText}>
              Your password will be used to verify your identity and securely store your credentials for biometric login.
            </Text>
          </View>

          <Button
            title={loading ? "Registering..." : `Register ${getBiometricText()}`}
            onPress={handleRegisterBiometric}
            loading={loading}
            disabled={loading || !username.trim() || !password}
            style={styles.registerButton}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Once registered, you can login using just your {getBiometricText().toLowerCase()} without entering your password.
          </Text>
        </View>
      </ScrollView>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: UI_CONFIG.COLORS.TEXT
  },
  content: {
    flexGrow: 1,
    padding: UI_CONFIG.SPACING.LG
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: UI_CONFIG.SPACING.XL
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: UI_CONFIG.COLORS.SURFACE,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: UI_CONFIG.COLORS.PRIMARY,
    marginBottom: UI_CONFIG.SPACING.LG
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: UI_CONFIG.COLORS.TEXT,
    marginBottom: UI_CONFIG.SPACING.SM
  },
  subtitle: {
    fontSize: 16,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    paddingHorizontal: UI_CONFIG.SPACING.XL
  },
  form: {
    marginBottom: UI_CONFIG.SPACING.XL
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: UI_CONFIG.SPACING.MD,
    borderRadius: 8,
    marginTop: UI_CONFIG.SPACING.MD,
    marginBottom: UI_CONFIG.SPACING.LG
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: UI_CONFIG.COLORS.PRIMARY,
    marginLeft: UI_CONFIG.SPACING.SM,
    lineHeight: 18
  },
  registerButton: {
    marginTop: UI_CONFIG.SPACING.MD
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: UI_CONFIG.SPACING.XL
  },
  footerText: {
    fontSize: 14,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    fontStyle: 'italic'
  },
  unavailableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: UI_CONFIG.SPACING.XL
  },
  unavailableTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.COLORS.TEXT,
    marginTop: UI_CONFIG.SPACING.MD,
    marginBottom: UI_CONFIG.SPACING.SM
  },
  unavailableText: {
    fontSize: 16,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: UI_CONFIG.SPACING.XL,
    lineHeight: 22
  },
  goBackButton: {
    width: 200
  }
});