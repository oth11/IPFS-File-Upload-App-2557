import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import FileUploader from './components/FileUploader';
import UploadHistory from './components/UploadHistory';
import ApiKeySetup from './components/ApiKeySetup';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from './common/SafeIcon';
import secureStorage from './utils/secureStorage';

const { FiUploadCloud, FiSettings, FiList } = FiIcons;

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [uploads, setUploads] = useState(() => {
    // Load uploads from localStorage on app start
    const savedUploads = localStorage.getItem('ipfs_uploads');
    return savedUploads ? JSON.parse(savedUploads) : [];
  });
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);

  // Load securely stored API key on mount
  useEffect(() => {
    const loadSecureApiKey = async () => {
      setLoading(true);
      try {
        // Try to load from secure storage first
        const secureKey = await secureStorage.getItem('pinata_jwt');
        if (secureKey) {
          setApiKey(secureKey);
        } else {
          // Fall back to regular localStorage
          const localKey = localStorage.getItem('pinata_api_key');
          if (localKey) {
            setApiKey(localKey);
            // Migrate to secure storage
            await secureStorage.setItem('pinata_jwt', localKey);
          }
        }
      } catch (error) {
        console.error('Error loading API key:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSecureApiKey();
  }, []);

  // Auto-detect API key from URL parameters (for automation purposes)
  useEffect(() => {
    const detectApiKeyFromUrl = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlApiKey = urlParams.get('apiKey');
        
        if (urlApiKey) {
          // Store the API key securely
          await secureStorage.autoSaveToken(urlApiKey);
          setApiKey(urlApiKey);
          
          // Clean the URL to remove the API key parameter
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (error) {
        console.error('Error detecting API key from URL:', error);
      }
    };

    detectApiKeyFromUrl();
  }, []);

  const handleUploadSuccess = (uploadData) => {
    const updatedUploads = [uploadData, ...uploads];
    setUploads(updatedUploads);
    // Save to localStorage
    localStorage.setItem('ipfs_uploads', JSON.stringify(updatedUploads));
  };

  const tabs = [
    { id: 'upload', label: 'Upload', icon: FiUploadCloud },
    { id: 'history', label: 'History', icon: FiList },
    { id: 'settings', label: 'Settings', icon: FiSettings }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            IPFS File Uploader
          </h1>
          <p className="text-gray-600">Upload files to IPFS via Pinata with client and project management</p>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center px-6 py-4 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <SafeIcon icon={tab.icon} className="mr-2" />
                    {tab.label}
                    {tab.id === 'history' && uploads.length > 0 && (
                      <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {uploads.length}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                  <span className="ml-3 text-gray-600">Loading application...</span>
                </div>
              ) : (
                <>
                  {activeTab === 'upload' && (
                    <FileUploader 
                      onUploadSuccess={handleUploadSuccess}
                      apiKey={apiKey}
                    />
                  )}
                  {activeTab === 'history' && (
                    <UploadHistory uploads={uploads} />
                  )}
                  {activeTab === 'settings' && (
                    <ApiKeySetup 
                      apiKey={apiKey}
                      onApiKeyChange={setApiKey}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;