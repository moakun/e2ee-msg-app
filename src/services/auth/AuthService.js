import { ApiService } from '../network/ApiService';
import { KeyManager } from '../crypto/KeyManager';
import { Storage } from '../../utils/storage';
import { DatabaseService } from '../database/DatabaseService';

export class AuthService {
  static TOKEN_KEY = 'auth_token';
  static REFRESH_TOKEN_KEY = 'refresh_token';
  static USER_DATA_KEY = 'user_data';

  // Register new user
  static async register(username, password) {
    try {
      // Generate key pair locally
      const keyData = await KeyManager.generateAndStoreKeyPair(username, password);
      
      // Prepare registration data
      const registrationData = {
        username,
        publicKey: keyData.publicKey,
        salt: keyData.salt
      };

      // Register with server
      const response = await ApiService.register(registrationData);
      
      // Store tokens and user data
      await this.storeAuthData(response);
      
      // Create local user record
      const userId = await DatabaseService.createUser({
        username,
        publicKey: keyData.publicKey,
        encryptedPrivateKey: '', // Handled by KeyManager
        salt: keyData.salt
      });

      return {
        user: {
          id: userId,
          username,
          publicKey: keyData.publicKey
        },
        token: response.token
      };
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  // Login user
  static async login(username, password) {
    try {
      // Attempt login with server
      const response = await ApiService.login({ username, password });
      
      // Store tokens and user data
      await this.storeAuthData(response);
      
      // Verify we can decrypt user's private key
      const user = await DatabaseService.getUserByUsername(username);
      if (user) {
        try {
          await KeyManager.decryptPrivateKey(user.id, password);
        } catch (decryptError) {
          throw new Error('Invalid password');
        }
      }

      return {
        user: response.user,
        token: response.token
      };
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  // Logout user
  static async logout() {
    try {
      // Clear stored auth data
      await Storage.removeSecure(this.TOKEN_KEY);
      await Storage.removeSecure(this.REFRESH_TOKEN_KEY);
      await Storage.removeSecure(this.USER_DATA_KEY);
      
      return true;
    } catch (error) {
      console.error('Logout failed:', error);
      return false;
    }
  }

  // Get current auth token
  static async getToken() {
    try {
      return await Storage.getSecure(this.TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  }

  // Get current user data
  static async getCurrentUser() {
    try {
      return await Storage.getSecure(this.USER_DATA_KEY);
    } catch (error) {
      console.error('Failed to get user data:', error);
      return null;
    }
  }

  // Refresh auth token
  static async refreshToken() {
    try {
      const refreshToken = await Storage.getSecure(this.REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await ApiService.refreshToken(refreshToken);
      await this.storeAuthData(response);
      
      return response.token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // If refresh fails, user needs to login again
      await this.logout();
      throw error;
    }
  }

  // Check if user is authenticated
  static async isAuthenticated() {
    try {
      const token = await this.getToken();
      const user = await this.getCurrentUser();
      return !!(token && user);
    } catch (error) {
      return false;
    }
  }

  // Store authentication data securely
  static async storeAuthData(authResponse) {
    try {
      await Storage.setSecure(this.TOKEN_KEY, authResponse.token);
      
      if (authResponse.refreshToken) {
        await Storage.setSecure(this.REFRESH_TOKEN_KEY, authResponse.refreshToken);
      }
      
      if (authResponse.user) {
        await Storage.setSecure(this.USER_DATA_KEY, authResponse.user);
      }
    } catch (error) {
      console.error('Failed to store auth data:', error);
      throw error;
    }
  }

  // Validate token with server
  static async validateToken(token) {
    try {
      // Make a simple authenticated request to validate token
      await ApiService.getUserProfile('me', token);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Change password
  static async changePassword(currentPassword, newPassword) {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Update password with KeyManager
      await KeyManager.updatePassword(user.id, currentPassword, newPassword);
      
      // Optionally update password on server
      // await ApiService.updatePassword({ currentPassword, newPassword }, await this.getToken());
      
      return true;
    } catch (error) {
      console.error('Password change failed:', error);
      throw error;
    }
  }

  // Delete account
  static async deleteAccount(password) {
    try {
      const user = await this.getCurrentUser();
      const token = await this.getToken();
      
      if (!user || !token) {
        throw new Error('User not authenticated');
      }

      // Verify password before deletion
      await KeyManager.decryptPrivateKey(user.id, password);
      
      // Delete account on server
      // await ApiService.deleteAccount({ password }, token);
      
      // Clear local data
      await KeyManager.clearUserKeys(user.id);
      await this.logout();
      
      return true;
    } catch (error) {
      console.error('Account deletion failed:', error);
      throw error;
    }
  }
}