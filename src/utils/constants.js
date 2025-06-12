// src/utils/constants.js
export const API_CONFIG = {
  BASE_URL: 'http://192.168.1.108:3001/api', // Replace XXX with your actual IP
  WS_URL: 'ws://192.168.1.108:3001',
  TIMEOUT: 10000
};

export const CRYPTO_CONFIG = {
  RSA_KEY_SIZE: 2048,
  AES_KEY_SIZE: 256,
  PBKDF2_ITERATIONS: 100000
};

export const UI_CONFIG = {
  COLORS: {
    PRIMARY: '#007AFF',
    SECONDARY: '#5856D6',
    SUCCESS: '#34C759',
    WARNING: '#FF9500',
    ERROR: '#FF3B30',
    BACKGROUND: '#F2F2F7',
    SURFACE: '#FFFFFF',
    TEXT: '#000000',
    TEXT_SECONDARY: '#8E8E93'
  },
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32
  }
};

// Development flags
export const DEV_CONFIG = {
  WEBSOCKET_ENABLED: true, // Now enabled!
  API_ENABLED: true,       // Now enabled!
  MOCK_DATA: false         // Use real backend data
};