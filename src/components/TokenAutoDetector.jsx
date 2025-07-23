import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import secureStorage from '../utils/secureStorage';

const { FiKey, FiAlertCircle, FiCheck } = FiIcons;

const TokenAutoDetector = ({ onTokenFound }) => {
  const [status, setStatus] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const [foundTokens, setFoundTokens] = useState([]);

  // Define patterns to detect tokens
  const patterns = {
    jwt: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
  };

  useEffect(() => {
    if (!isActive) return;

    const detectTokens = async () => {
      // 1. Check URL parameters
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('apiKey') || urlParams.get('token') || urlParams.get('jwt');
        
        if (urlToken && isValidToken(urlToken)) {
          handleTokenFound(urlToken, 'URL parameter');
          // Clean the URL to remove the token parameter
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }
      } catch (error) {
        console.error('Error checking URL parameters:', error);
      }

      // 2. Check clipboard
      try {
        const clipboardText = await navigator.clipboard.readText();
        const tokens = extractTokens(clipboardText);
        
        if (tokens.length > 0) {
          tokens.forEach(token => {
            handleTokenFound(token, 'clipboard');
          });
        }
      } catch (error) {
        // Clipboard access might be denied, silently fail
      }
    };

    // Run detection once on mount and then periodically
    detectTokens();
    const interval = setInterval(detectTokens, 5000);
    
    return () => {
      clearInterval(interval);
      setIsActive(false);
    };
  }, [isActive]);

  const extractTokens = (text) => {
    if (!text) return [];
    
    const tokens = [];
    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (isValidToken(match) && !foundTokens.includes(match)) {
            tokens.push(match);
          }
        });
      }
    }
    
    return tokens;
  };

  const isValidToken = (token) => {
    // Basic JWT validation - structure check
    const jwtPattern = /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/;
    return jwtPattern.test(token);
  };

  const handleTokenFound = async (token, source) => {
    // Only handle tokens we haven't seen before
    if (foundTokens.includes(token)) return;
    
    setFoundTokens(prev => [...prev, token]);
    setStatus({ type: 'success', message: `Pinata API key detected from ${source}` });
    
    // Store the token securely
    await secureStorage.autoSaveToken(token);
    
    // Notify parent component
    if (onTokenFound) {
      onTokenFound(token);
    }
    
    // Clear status after a delay
    setTimeout(() => {
      setStatus(null);
    }, 3000);
  };

  // Don't render anything if no status to show
  if (!status) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-xs ${
        status.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
      }`}
    >
      <div className="flex items-start">
        <SafeIcon 
          icon={status.type === 'success' ? FiCheck : FiAlertCircle}
          className={`mr-3 mt-0.5 ${status.type === 'success' ? 'text-green-500' : 'text-yellow-500'}`}
        />
        <div>
          <h4 className={`font-medium ${status.type === 'success' ? 'text-green-800' : 'text-yellow-800'}`}>
            {status.type === 'success' ? 'API Key Detected' : 'Notice'}
          </h4>
          <p className={`text-sm ${status.type === 'success' ? 'text-green-600' : 'text-yellow-600'}`}>
            {status.message}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default TokenAutoDetector;