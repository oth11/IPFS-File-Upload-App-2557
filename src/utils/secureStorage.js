/**
 * Secure storage utility for sensitive tokens
 * Uses browser's Web Crypto API for encryption when available
 */

// Generate a secure encryption key or use a stored one
const getEncryptionKey = async () => {
  let storedKey = localStorage.getItem('_encryption_key');
  
  if (!storedKey) {
    // Generate a new encryption key
    const key = await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
    
    // Export the key to store it
    const exportedKey = await window.crypto.subtle.exportKey('raw', key);
    const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
    localStorage.setItem('_encryption_key', keyBase64);
    
    return key;
  } else {
    // Import the stored key
    const keyData = Uint8Array.from(atob(storedKey), c => c.charCodeAt(0));
    return window.crypto.subtle.importKey(
      'raw',
      keyData,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );
  }
};

// Encrypt data
const encrypt = async (data) => {
  if (!data) return null;
  
  try {
    const key = await getEncryptionKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);
    
    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      encodedData
    );
    
    // Combine IV and encrypted data for storage
    const encryptedArray = new Uint8Array(iv.length + encryptedData.byteLength);
    encryptedArray.set(iv, 0);
    encryptedArray.set(new Uint8Array(encryptedData), iv.length);
    
    return btoa(String.fromCharCode(...encryptedArray));
  } catch (error) {
    console.error('Encryption error:', error);
    // Fallback to simple obfuscation if encryption fails
    return btoa(`${data}:${Date.now()}`);
  }
};

// Decrypt data
const decrypt = async (encryptedData) => {
  if (!encryptedData) return null;
  
  try {
    const key = await getEncryptionKey();
    const encryptedArray = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // Extract IV and encrypted content
    const iv = encryptedArray.slice(0, 12);
    const encryptedContent = encryptedArray.slice(12);
    
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      encryptedContent
    );
    
    return new TextDecoder().decode(decryptedData);
  } catch (error) {
    console.error('Decryption error:', error);
    
    // Try fallback simple decoding
    try {
      const decoded = atob(encryptedData);
      if (decoded.includes(':')) {
        return decoded.split(':')[0];
      }
      return null;
    } catch (e) {
      console.error('Fallback decryption failed:', e);
      return null;
    }
  }
};

// Secure storage API
const secureStorage = {
  async setItem(key, value) {
    if (!key || value === undefined) return;
    
    try {
      const encryptedValue = await encrypt(value);
      localStorage.setItem(`secure_${key}`, encryptedValue);
      return true;
    } catch (error) {
      console.error('Error storing secure item:', error);
      return false;
    }
  },
  
  async getItem(key) {
    if (!key) return null;
    
    try {
      const encryptedValue = localStorage.getItem(`secure_${key}`);
      if (!encryptedValue) return null;
      
      return await decrypt(encryptedValue);
    } catch (error) {
      console.error('Error retrieving secure item:', error);
      return null;
    }
  },
  
  removeItem(key) {
    if (!key) return;
    localStorage.removeItem(`secure_${key}`);
  },
  
  // Auto-save a token without user interaction
  async autoSaveToken(token) {
    if (!token) return false;
    
    // Validate JWT format (simple check)
    const jwtPattern = /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/;
    if (!jwtPattern.test(token)) return false;
    
    return await this.setItem('pinata_jwt', token);
  }
};

export default secureStorage;