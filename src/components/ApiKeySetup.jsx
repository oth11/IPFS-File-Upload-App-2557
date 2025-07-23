import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import secureStorage from '../utils/secureStorage';

const { FiKey, FiEye, FiEyeOff, FiSave, FiExternalLink, FiInfo, FiClipboard, FiCheck } = FiIcons;

const ApiKeySetup = ({ apiKey, onApiKeyChange }) => {
  const [showKey, setShowKey] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);
  const [autoDetect, setAutoDetect] = useState(false);
  const [clipboardSuccess, setClipboardSuccess] = useState(false);
  const [loadingKey, setLoadingKey] = useState(true);

  // Load securely stored key on component mount
  useEffect(() => {
    const loadSecureKey = async () => {
      setLoadingKey(true);
      try {
        const storedKey = await secureStorage.getItem('pinata_jwt');
        if (storedKey && storedKey !== apiKey) {
          setTempKey(storedKey);
          onApiKeyChange(storedKey);
        }
      } catch (error) {
        console.error('Error loading secure key:', error);
      } finally {
        setLoadingKey(false);
      }
    };
    
    loadSecureKey();
  }, [apiKey, onApiKeyChange]);

  // Monitor clipboard for potential JWT tokens
  useEffect(() => {
    if (!autoDetect) return;
    
    const checkClipboard = async () => {
      try {
        const text = await navigator.clipboard.readText();
        
        // Check for JWT format (xxx.yyy.zzz)
        const jwtPattern = /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/;
        if (jwtPattern.test(text) && text !== tempKey) {
          setTempKey(text);
          handleSave(text);
          setClipboardSuccess(true);
          setTimeout(() => setClipboardSuccess(false), 3000);
        }
      } catch (err) {
        // Clipboard access might be denied
        console.error('Clipboard access error:', err);
        setAutoDetect(false);
      }
    };
    
    // Check immediately and then periodically
    checkClipboard();
    const interval = setInterval(checkClipboard, 2000);
    
    return () => clearInterval(interval);
  }, [autoDetect, tempKey]);

  const handleSave = async (key = tempKey) => {
    // Save to secure storage first
    await secureStorage.setItem('pinata_jwt', key);
    
    // Also update the regular localStorage for compatibility
    localStorage.setItem('pinata_api_key', key);
    
    onApiKeyChange(key);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setTempKey(text);
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Pinata API Configuration</h3>
        <p className="text-gray-600 text-sm">
          Configure your Pinata API key to upload files to IPFS
        </p>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <SafeIcon icon={FiInfo} className="text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How to get your Pinata API Key:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>Sign up for a free account at Pinata.cloud</li>
              <li>Go to your account settings</li>
              <li>Navigate to API Keys section</li>
              <li>Create a new API key with pinning permissions</li>
              <li>Copy the JWT token and paste it below</li>
            </ol>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Pinata JWT Token
          </label>
          <div className="flex items-center">
            <label className="inline-flex items-center mr-2">
              <input
                type="checkbox"
                checked={autoDetect}
                onChange={(e) => setAutoDetect(e.target.checked)}
                className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-600">Auto-detect from clipboard</span>
            </label>
          </div>
        </div>
        
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={tempKey}
            onChange={(e) => setTempKey(e.target.value)}
            className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex">
            <button
              type="button"
              onClick={handlePaste}
              className="p-2 text-gray-500 hover:text-gray-700"
              title="Paste from clipboard"
            >
              <SafeIcon icon={FiClipboard} />
            </button>
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="p-2 text-gray-500 hover:text-gray-700"
              title={showKey ? "Hide token" : "Show token"}
            >
              <SafeIcon icon={showKey ? FiEyeOff : FiEye} />
            </button>
          </div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleSave()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
        >
          <SafeIcon icon={FiSave} className="mr-2" />
          Save API Key
        </motion.button>
      </div>

      {clipboardSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 rounded-lg p-4"
        >
          <div className="flex items-center text-green-800">
            <SafeIcon icon={FiCheck} className="mr-2" />
            <span>JWT token detected from clipboard and saved!</span>
          </div>
        </motion.div>
      )}
      
      {loadingKey ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center text-gray-600">
            <div className="animate-spin mr-2 h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span>Loading saved API key...</span>
          </div>
        </div>
      ) : apiKey && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center text-green-800">
            <SafeIcon icon={FiKey} className="mr-2" />
            <span className="font-medium">API Key configured successfully!</span>
          </div>
        </div>
      )}

      <div className="border-t border-gray-200 pt-6">
        <h4 className="font-medium text-gray-800 mb-3">Useful Links</h4>
        <div className="space-y-2">
          <a
            href="https://pinata.cloud"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-blue-600 hover:text-blue-800 text-sm transition-colors"
          >
            <SafeIcon icon={FiExternalLink} className="mr-2" />
            Pinata.cloud - Sign up for free
          </a>
          <a
            href="https://docs.pinata.cloud/account-management/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-blue-600 hover:text-blue-800 text-sm transition-colors"
          >
            <SafeIcon icon={FiExternalLink} className="mr-2" />
            API Key Documentation
          </a>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySetup;