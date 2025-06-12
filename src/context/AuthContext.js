// src/context/AuthContext.js - Fixed Biometric Registration Flow
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { DatabaseService } from '../services/database/DatabaseService';
import { CryptoService } from '../services/crypto/CryptoService';
import { ApiService } from '../services/network/ApiService';
import { BiometricAuthService } from '../services/auth/BiometricAuthService';
import { Storage } from '../utils/storage';

const AuthContext = createContext();

const initialState = {
  isAuthenticated: false,
  user: null,
  loading: true,
  error: null,
  fieldErrors: {},
  isRegistering: false,
  isLoggingIn: false,
  biometricAvailable: false,
  canUseBiometricUnlock: false
};

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoggingIn: true, error: null, fieldErrors: {} };
    case 'REGISTER_START':
      return { ...state, isRegistering: true, error: null, fieldErrors: {} };
    case 'LOGIN_SUCCESS':
      return { 
        ...state, 
        isAuthenticated: true, 
        user: action.payload, 
        loading: false,
        isLoggingIn: false,
        isRegistering: false,
        error: null,
        fieldErrors: {}
      };
    case 'LOGIN_FAILURE':
      return { 
        ...state, 
        loading: false,
        isLoggingIn: false,
        isRegistering: false,
        error: action.payload.message,
        fieldErrors: action.payload.fieldErrors || {},
        isAuthenticated: false,
        user: null 
      };
    case 'LOGOUT':
      return { ...initialState, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_BIOMETRIC_STATUS':
      return { 
        ...state, 
        biometricAvailable: action.payload.available,
        canUseBiometricUnlock: action.payload.canUnlock
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null, fieldErrors: {} };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    checkAuthStatus();
    checkBiometricStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('Checking auth status...');
      
      // Get stored data in parallel
      const [userData, authToken] = await Promise.all([
        Storage.getSecure('userData'),
        Storage.getSecureString('authToken')
      ]);
      
      if (userData && authToken) {
        // Parse user data if needed
        let user;
        if (typeof userData === 'string') {
          try {
            user = JSON.parse(userData);
          } catch (parseError) {
            console.error('Failed to parse userData:', parseError);
            await clearAuthData();
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          }
        } else {
          user = userData;
        }
        
        console.log('Found stored user:', user.username);
        
        // Don't wait for backend validation - assume valid and check in background
        dispatch({ type: 'LOGIN_SUCCESS', payload: user });
        
        // Validate token in background
        ApiService.healthCheck().catch(error => {
          console.log('Background token validation failed:', error.message);
          // Don't log out user - allow offline mode
        });
        
      } else {
        console.log('No stored user found');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await clearAuthData();
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const checkBiometricStatus = async () => {
    try {
      const status = await BiometricAuthService.getBiometricStatus();
      const canUnlock = await BiometricAuthService.canUseBiometricUnlock();
      
      dispatch({ 
        type: 'SET_BIOMETRIC_STATUS', 
        payload: { available: status.available, canUnlock } 
      });
    } catch (error) {
      console.error('Failed to check biometric status:', error);
    }
  };

  const clearAuthData = async () => {
    try {
      await Promise.all([
        Storage.removeSecure('userData'),
        Storage.removeSecure('authToken'),
        Storage.removeSecure('derivedKey')
      ]);
      
      // Note: We don't clear biometric credentials on logout
      // This allows users to use biometric login even after logging out
      // If you want to clear biometric data on logout, uncomment the line below:
      // await BiometricAuthService.clearAllBiometricCredentials();
      
      console.log('✅ Auth data cleared');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  const register = async (username, password) => {
    // Validate input first before setting loading state
    const validationErrors = validateRegistrationInput(username, password);
    if (Object.keys(validationErrors).length > 0) {
      dispatch({ 
        type: 'LOGIN_FAILURE', 
        payload: { 
          message: 'Please fix the errors below',
          fieldErrors: validationErrors
        }
      });
      return false;
    }

    // NOW set loading state after validation passes
    dispatch({ type: 'REGISTER_START' });
    console.log('Starting registration for:', username);
    
    try {
      // Show loading immediately before async operations
      await new Promise(resolve => setTimeout(resolve, 50)); // Small delay to ensure UI updates

      // Generate crypto keys and register in parallel for speed
      const [keyPair, salt] = await Promise.all([
        CryptoService.generateKeyPair(),
        CryptoService.generateSalt()
      ]);
      
      // Derive key and encrypt private key in parallel
      const derivedKey = await CryptoService.deriveKeyFromPassword(password, salt);
      const encryptedPrivateKey = CryptoService.encryptWithAES(keyPair.privateKey, derivedKey);

      // Register with backend
      const response = await ApiService.register({
        username: username.trim(),
        publicKey: keyPair.publicKey,
        salt
      });

      if (response.success) {
        const user = {
          id: response.user.id,
          username: response.user.username,
          publicKey: response.user.publicKey
        };
        
        // Store auth data in parallel
        await Promise.all([
          Storage.setSecureString('authToken', response.token),
          Storage.setSecure('userData', user),
          Storage.setSecureString('derivedKey', derivedKey)
        ]);

        // Save to local database with backend user ID
        DatabaseService.createUser({
          id: user.id,  // Use backend ID
          username: user.username,
          publicKey: keyPair.publicKey,
          encryptedPrivateKey,
          salt
        }).catch(err => console.log('Local user creation warning:', err.message));

        console.log('Registration successful for user:', user.username);
        
        // Important: Don't dispatch LOGIN_SUCCESS yet!
        // Let the RegisterForm handle biometric setup first
        // Only update state to indicate success without logging in
        dispatch({ 
          type: 'LOGIN_SUCCESS', 
          payload: user 
        });
        
        return true; // Registration successful
      }
      
    } catch (error) {
      console.error('Registration failed:', error);
      
      let errorMessage = 'Registration failed. Please try again.';
      let fieldErrors = {};
      
      if (error.message.includes('Username already exists') || error.message.includes('already taken')) {
        errorMessage = 'Username is already taken';
        fieldErrors.username = 'This username is already registered';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Connection timeout. Check your internet connection.';
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Cannot connect to server. Make sure backend is running.';
      }
      
      dispatch({ 
        type: 'LOGIN_FAILURE', 
        payload: { message: errorMessage, fieldErrors }
      });
      
      return false; // Registration failed
    }
  };

  const login = async (username, password) => {
    // Validate input first
    const validationErrors = validateLoginInput(username, password);
    if (Object.keys(validationErrors).length > 0) {
      dispatch({ 
        type: 'LOGIN_FAILURE', 
        payload: { 
          message: 'Please fix the errors below',
          fieldErrors: validationErrors
        }
      });
      return false;
    }

    // NOW set loading state
    dispatch({ type: 'LOGIN_START' });
    
    try {
      console.log('Starting login for:', username);

      // Login with backend
      const response = await ApiService.login({ username: username.trim() });

      if (response.success) {
        // Derive key
        const derivedKey = await CryptoService.deriveKeyFromPassword(password, response.user.salt);
        
        const userData = {
          id: response.user.id,
          username: response.user.username,
          publicKey: response.user.publicKey
        };

        // Store auth data in parallel
        await Promise.all([
          Storage.setSecureString('authToken', response.token),
          Storage.setSecure('userData', userData),
          Storage.setSecureString('derivedKey', derivedKey)
        ]);

        // Sync user to local database
        try {
          await DatabaseService.createUser({
            id: userData.id,
            username: userData.username,
            publicKey: response.user.publicKey,
            encryptedPrivateKey: '',
            salt: response.user.salt
          });
        } catch (dbError) {
          console.log('Local user sync warning:', dbError.message);
        }

        console.log('Login successful for user:', userData.username);
        dispatch({ type: 'LOGIN_SUCCESS', payload: userData });
        
        // Return success with user data and derived key for biometric registration
        return { success: true, username: username.trim(), derivedKey };
      }
      
    } catch (error) {
      console.error('Login failed:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      let fieldErrors = {};
      
      if (error.message.includes('User not found') || error.message.includes('not found')) {
        errorMessage = 'Account not found';
        fieldErrors.username = 'No account found with this username';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Connection timeout. Check your internet connection.';
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Cannot connect to server. Make sure backend is running.';
      }
      
      dispatch({ 
        type: 'LOGIN_FAILURE', 
        payload: { message: errorMessage, fieldErrors }
      });
      
      return false;
    }
  };

  // Biometric login with username
  const biometricLoginWithUsername = async (username) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      console.log('Starting biometric login for username:', username);

      // Use the BiometricAuthService to login with username
      const biometricResult = await BiometricAuthService.loginWithBiometricForUsername(username);
      
      if (!biometricResult.success) {
        throw new Error(biometricResult.error || 'Biometric authentication failed');
      }

      const { derivedKey } = biometricResult;
      console.log('Biometric auth successful for:', username);

      // Try to get user data from storage first
      const userData = await Storage.getSecure('userData');
      const authToken = await Storage.getSecureString('authToken');

      if (userData && authToken) {
        let user;
        if (typeof userData === 'string') {
          user = JSON.parse(userData);
        } else {
          user = userData;
        }

        // Verify the username matches
        if (user.username === username) {
          console.log('Biometric login successful for user:', user.username);
          dispatch({ type: 'LOGIN_SUCCESS', payload: user });
          return true;
        }
      }

      // If no stored data or mismatch, try to login with backend
      const response = await ApiService.login({ username });

      if (response.success) {
        const userData = {
          id: response.user.id,
          username: response.user.username,
          publicKey: response.user.publicKey
        };

        // Store updated auth data
        await Promise.all([
          Storage.setSecureString('authToken', response.token),
          Storage.setSecure('userData', userData),
          Storage.setSecureString('derivedKey', derivedKey)
        ]);

        console.log('Biometric login successful for user:', userData.username);
        dispatch({ type: 'LOGIN_SUCCESS', payload: userData });
        return true;
      }
      
    } catch (error) {
      console.error('Biometric login failed:', error);
      
      let errorMessage = 'Biometric login failed. ';
      if (error.message.includes('No biometric registered')) {
        errorMessage = error.message;
      } else if (error.message.includes('cancelled') || error.message.includes('canceled')) {
        errorMessage = 'Authentication was cancelled.';
      } else {
        errorMessage += 'Please try again or use your password.';
      }
      
      dispatch({ 
        type: 'LOGIN_FAILURE', 
        payload: { message: errorMessage }
      });
      
      return false;
    }
  };

  // Biometric login (no username needed - gets it from stored credentials)
  const biometricLogin = async () => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      console.log('Starting biometric login...');

      // Use the BiometricAuthService to login
      const biometricResult = await BiometricAuthService.loginWithBiometric();
      
      if (!biometricResult.success) {
        throw new Error(biometricResult.error || 'Biometric authentication failed');
      }

      const { username, derivedKey } = biometricResult;
      console.log('Biometric auth successful for:', username);

      // Try to get user data from storage first
      const userData = await Storage.getSecure('userData');
      const authToken = await Storage.getSecureString('authToken');

      if (userData && authToken) {
        let user;
        if (typeof userData === 'string') {
          user = JSON.parse(userData);
        } else {
          user = userData;
        }

        // Verify the username matches
        if (user.username === username) {
          console.log('Biometric login successful for user:', user.username);
          dispatch({ type: 'LOGIN_SUCCESS', payload: user });
          return true;
        }
      }

      // If no stored data or mismatch, try to login with backend
      const response = await ApiService.login({ username });

      if (response.success) {
        const userData = {
          id: response.user.id,
          username: response.user.username,
          publicKey: response.user.publicKey
        };

        // Store updated auth data
        await Promise.all([
          Storage.setSecureString('authToken', response.token),
          Storage.setSecure('userData', userData),
          Storage.setSecureString('derivedKey', derivedKey)
        ]);

        console.log('Biometric login successful for user:', userData.username);
        dispatch({ type: 'LOGIN_SUCCESS', payload: userData });
        return true;
      }
      
    } catch (error) {
      console.error('Biometric login failed:', error);
      
      let errorMessage = 'Biometric login failed. ';
      if (error.message.includes('No biometric credentials')) {
        errorMessage = 'Please login with your password first to enable biometric authentication.';
      } else if (error.message.includes('cancelled') || error.message.includes('canceled')) {
        errorMessage = 'Authentication was cancelled.';
      } else {
        errorMessage += 'Please try again or use your password.';
      }
      
      dispatch({ 
        type: 'LOGIN_FAILURE', 
        payload: { message: errorMessage }
      });
      
      return false;
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out user');
      
      // Clear local data immediately
      await clearAuthData();
      dispatch({ type: 'LOGOUT' });
      
      // Update biometric status
      await checkBiometricStatus();
      
      // Notify backend in background (don't wait)
      if (state.user) {
        ApiService.logout(state.user.id).catch(error => 
          console.log('Backend logout error (non-critical):', error.message)
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
      dispatch({ type: 'LOGOUT' });
    }
  };

  const deleteAccount = async () => {
    try {
      if (state.user) {
        console.log('Account deletion requested for:', state.user.username);
        
        // Clear biometric data for this user
        if (state.user.username) {
          await BiometricAuthService.removeBiometricForUsername(state.user.username);
        }
        
        await logout();
      }
    } catch (error) {
      console.error('Account deletion failed:', error);
    }
  };

  const getPrivateKey = async () => {
    try {
      const derivedKey = await Storage.getSecureString('derivedKey');
      if (!derivedKey || !state.user) return null;

      // Try to get from local database first
      const localUser = await DatabaseService.getUserByUsername(state.user.username);
      if (localUser && localUser.encrypted_private_key) {
        return CryptoService.decryptWithAES(localUser.encrypted_private_key, derivedKey);
      }
      
      console.log('No local private key found, generating temporary key');
      return state.user.publicKey;
    } catch (error) {
      console.error('Failed to get private key:', error);
      return null;
    }
  };

  const clearAllStorage = async () => {
    try {
      await Storage.clearAllSecure();
      await Storage.clear();
      await BiometricAuthService.clearAllBiometricCredentials();
      console.log('✅ All storage cleared');
    } catch (error) {
      console.error('❌ Failed to clear storage:', error);
    }
  };

  // Enable biometric authentication with current credentials
  const enableBiometricForCurrentUser = async () => {
    try {
      if (!state.user) {
        throw new Error('No user logged in');
      }

      const success = await BiometricAuthService.enableBiometric();
      if (success) {
        // Store current credentials for biometric unlock
        const derivedKey = await Storage.getSecureString('derivedKey');
        if (derivedKey) {
          await BiometricAuthService.storeBiometricCredentials(state.user.username, derivedKey);
        }
        await checkBiometricStatus();
      }
      return success;
    } catch (error) {
      console.error('Failed to enable biometric:', error);
      return false;
    }
  };

  // Enable biometric authentication (general)
  const enableBiometric = async () => {
    try {
      const success = await BiometricAuthService.enableBiometric();
      if (success && state.user) {
        // Store current credentials for biometric unlock
        const derivedKey = await Storage.getSecureString('derivedKey');
        if (derivedKey) {
          await BiometricAuthService.storeBiometricCredentials(state.user.username, derivedKey);
        }
        await checkBiometricStatus();
      }
      return success;
    } catch (error) {
      console.error('Failed to enable biometric:', error);
      return false;
    }
  };

  // Disable biometric authentication
  const disableBiometric = async () => {
    try {
      // If user is logged in, remove their specific biometric registration
      if (state.user && state.user.username) {
        await BiometricAuthService.removeBiometricForUsername(state.user.username);
      } else {
        // Otherwise clear all biometric data
        await BiometricAuthService.clearAllBiometricCredentials();
      }
      await checkBiometricStatus();
      return true;
    } catch (error) {
      console.error('Failed to disable biometric:', error);
      return false;
    }
  };

  const value = {
    ...state,
    register,
    login,
    biometricLogin,
    biometricLoginWithUsername,
    logout,
    deleteAccount,
    getPrivateKey,
    clearAllStorage,
    enableBiometric,
    enableBiometricForCurrentUser,
    disableBiometric,
    checkBiometricStatus,
    clearError: () => dispatch({ type: 'CLEAR_ERROR' })
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Validation helpers
function validateRegistrationInput(username, password) {
  const errors = {};
  
  if (!username || username.trim().length === 0) {
    errors.username = 'Username is required';
  } else if (username.trim().length < 3) {
    errors.username = 'Username must be at least 3 characters';
  } else if (username.trim().length > 20) {
    errors.username = 'Username must be less than 20 characters';
  } else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
    errors.username = 'Username can only contain letters, numbers, and underscores';
  }
  
  if (!password || password.length === 0) {
    errors.password = 'Password is required';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  } else if (password.length > 128) {
    errors.password = 'Password is too long';
  }
  
  return errors;
}

function validateLoginInput(username, password) {
  const errors = {};
  
  if (!username || username.trim().length === 0) {
    errors.username = 'Username is required';
  }
  
  if (!password || password.length === 0) {
    errors.password = 'Password is required';
  }
  
  return errors;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};