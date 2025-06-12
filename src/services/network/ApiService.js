// src/services/network/ApiService.js - Fixed with better error handling
import { API_CONFIG } from '../../utils/constants';
import { Storage } from '../../utils/storage';

export class ApiService {
  static baseURL = API_CONFIG.BASE_URL;
  static timeout = API_CONFIG.TIMEOUT;
  static requestCache = new Map();
  static cacheExpiry = 5 * 60 * 1000; // 5 minutes

  static async cachedRequest(endpoint, options = {}) {
    const cacheKey = `${endpoint}_${JSON.stringify(options)}`;
    const cached = this.requestCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      console.log('🚀 Using cached request');
      return cached.data;
    }
    
    const data = await this.request(endpoint, options);
    this.requestCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  }

  // Generic request method with auth token and better error handling
  static async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    // Get auth token
    const token = await Storage.getSecureString('authToken');
    
    const config = {
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Get response text first
      const responseText = await response.text();

      // Check if response is HTML (error page)
      if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html')) {
        console.error('Received HTML instead of JSON:', responseText.substring(0, 200));
        
        if (response.status === 404) {
          throw new Error('API endpoint not found. Is the backend server running?');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please check the backend logs.');
        } else {
          throw new Error('Invalid API response. Expected JSON but received HTML.');
        }
      }

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response:', responseText);
        throw new Error('Invalid JSON response from server');
      }

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401) {
          // Token expired or invalid
          console.log('Authentication failed, clearing token');
          await Storage.removeSecure('authToken');
          throw new Error(data.error || 'Authentication failed');
        }
        
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Please check your connection.');
      }
      
      // Network errors
      if (error.message === 'Network request failed') {
        throw new Error('Cannot connect to server. Please check if the backend is running.');
      }
      
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Health check with custom error handling
  static async healthCheck() {
    try {
      // Try the root health endpoint first (not under /api)
      const response = await fetch(`${this.baseURL.replace('/api', '')}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Health check failed with status ${response.status}`);
      }

      const data = await response.json();
      return { success: true, ...data };
    } catch (error) {
      console.log('Health check failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Authentication endpoints
  static async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  static async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  static async logout(userId) {
    try {
      return await this.request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ userId })
      });
    } catch (error) {
      // Logout errors are non-critical
      console.log('Logout API error (non-critical):', error.message);
      return { success: true };
    }
  }

  // User endpoints with fallback
  static async searchUsers(query) {
    try {
      return await this.request(`/users/search?q=${encodeURIComponent(query)}`);
    } catch (error) {
      console.log('User search API error:', error.message);
      return { success: false, users: [], error: error.message };
    }
  }

  static async getAllUsers() {
    try {
      return await this.request('/users/all');
    } catch (error) {
      console.log('Get all users API error:', error.message);
      return { success: false, users: [], error: error.message };
    }
  }

  // Chat endpoints with fallback
  static async getUserChats() {
    try {
      return await this.request('/chats');
    } catch (error) {
      console.log('Get chats API error:', error.message);
      return { success: false, chats: [], error: error.message };
    }
  }

  static async createDirectChat(userId) {
    return this.request('/chats/direct', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  }

  static async createGroupChat(name, participants = []) {
    return this.request('/chats', {
      method: 'POST',
      body: JSON.stringify({ name, type: 'group', participants })
    });
  }

  static async getChatMessages(chatId, limit = 50, offset = 0) {
    try {
      return await this.request(`/messages/chat/${chatId}?limit=${limit}&offset=${offset}`);
    } catch (error) {
      console.log('Get messages API error:', error.message);
      return { success: false, messages: [], error: error.message };
    }
  }

  static async sendMessage(messageData) {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData)
    });
  }

  // Invitation endpoints
  static async sendInvitation(toUserId, message = '') {
    return this.request('/invitations/send', {
      method: 'POST',
      body: JSON.stringify({ toUserId, message })
    });
  }

  static async getPendingInvitations() {
    try {
      return await this.request('/invitations/pending');
    } catch (error) {
      console.log('Get pending invitations error:', error.message);
      return { success: false, invitations: [], error: error.message };
    }
  }

  static async getSentInvitations() {
    try {
      return await this.request('/invitations/sent');
    } catch (error) {
      console.log('Get sent invitations error:', error.message);
      return { success: false, invitations: [], error: error.message };
    }
  }

  static async acceptInvitation(invitationId) {
    return this.request(`/invitations/${invitationId}/accept`, {
      method: 'POST'
    });
  }

  static async rejectInvitation(invitationId) {
    return this.request(`/invitations/${invitationId}/reject`, {
      method: 'POST'
    });
  }

  static async cancelInvitation(invitationId) {
    return this.request(`/invitations/${invitationId}`, {
      method: 'DELETE'
    });
  }

  static async createGroup(groupData) {
  return this.request('/groups/create', {
    method: 'POST',
    body: JSON.stringify(groupData)
  });
}

static async getGroupDetails(groupId) {
  return this.request(`/groups/${groupId}`);
}

static async addGroupMembers(groupId, memberIds) {
  return this.request(`/groups/${groupId}/members`, {
    method: 'POST',
    body: JSON.stringify({ memberIds })
  });
}

static async removeGroupMember(groupId, memberId) {
  return this.request(`/groups/${groupId}/members/${memberId}`, {
    method: 'DELETE'
  });
}

static async leaveGroup(groupId) {
  return this.request(`/groups/${groupId}/leave`, {
    method: 'POST'
  });
}

static async updateGroupInfo(groupId, updates) {
  return this.request(`/groups/${groupId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

static async promoteToAdmin(groupId, memberId) {
  return this.request(`/groups/${groupId}/promote/${memberId}`, {
    method: 'POST'
  });
}

  static async testConnection() {
    try {
      console.log('Testing connection to:', this.baseURL);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      // Try the base URL first
      const baseUrl = this.baseURL.replace('/api', '');
      console.log('Checking base URL:', baseUrl);

      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      console.log('Response status:', response.status);

      if (!response.ok) {
        return { connected: false, error: `Server returned ${response.status}` };
      }

      const text = await response.text();
      
      // Check if response is JSON
      try {
        JSON.parse(text);
        return { connected: true };
      } catch {
        return { connected: false, error: 'Server returned non-JSON response' };
      }

    } catch (error) {
      console.error('Connection test error:', error);
      if (error.name === 'AbortError') {
        return { connected: false, error: 'Connection timeout' };
      }
      return { connected: false, error: error.message };
    }
  }
}