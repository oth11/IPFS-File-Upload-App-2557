import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import axios from 'axios';

const { FiUpload, FiFile, FiX, FiLoader, FiCheck, FiAlertCircle, FiPlus } = FiIcons;

const FileUploader = ({ onUploadSuccess, apiKey }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [metadata, setMetadata] = useState({
    name: '',
    description: '',
    tags: '',
    client: '',
    project: '',
    projectNumber: ''
  });
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newClient, setNewClient] = useState('');
  const [newProject, setNewProject] = useState('');

  // Load clients and projects from localStorage
  useEffect(() => {
    const savedClients = JSON.parse(localStorage.getItem('ipfs_clients') || '[]');
    const savedProjects = JSON.parse(localStorage.getItem('ipfs_projects') || '[]');
    setClients(savedClients);
    setProjects(savedProjects);
  }, []);

  // Generate project number
  const generateProjectNumber = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;
    
    // Get existing project numbers for today
    const existingNumbers = projects
      .filter(p => p.projectNumber && p.projectNumber.startsWith(datePrefix))
      .map(p => parseInt(p.projectNumber.split('-')[1]) || 0)
      .sort((a, b) => b - a);
    
    const nextNumber = existingNumbers.length > 0 ? existingNumbers[0] + 1 : 1;
    return `${datePrefix}-${String(nextNumber).padStart(4, '0')}`;
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (!metadata.name) {
        setMetadata(prev => ({ ...prev, name: file.name }));
      }
    }
  }, [metadata.name]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (!metadata.name) {
        setMetadata(prev => ({ ...prev, name: file.name }));
      }
    }
  };

  const handleMetadataChange = (field, value) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
  };

  const addNewClient = () => {
    if (newClient.trim()) {
      const updatedClients = [...clients, { id: Date.now(), name: newClient.trim() }];
      setClients(updatedClients);
      localStorage.setItem('ipfs_clients', JSON.stringify(updatedClients));
      setMetadata(prev => ({ ...prev, client: newClient.trim() }));
      setNewClient('');
      setShowNewClientForm(false);
    }
  };

  const addNewProject = () => {
    if (newProject.trim() && metadata.client) {
      const projectNumber = generateProjectNumber();
      const newProjectData = {
        id: Date.now(),
        name: newProject.trim(),
        client: metadata.client,
        projectNumber
      };
      const updatedProjects = [...projects, newProjectData];
      setProjects(updatedProjects);
      localStorage.setItem('ipfs_projects', JSON.stringify(updatedProjects));
      setMetadata(prev => ({ 
        ...prev, 
        project: newProject.trim(),
        projectNumber
      }));
      setNewProject('');
      setShowNewProjectForm(false);
    }
  };

  const handleProjectSelect = (projectName) => {
    const selectedProject = projects.find(p => p.name === projectName && p.client === metadata.client);
    if (selectedProject) {
      setMetadata(prev => ({
        ...prev,
        project: projectName,
        projectNumber: selectedProject.projectNumber
      }));
    }
  };

  const getProjectsForClient = () => {
    return projects.filter(p => p.client === metadata.client);
  };

  const uploadToPinata = async () => {
    if (!selectedFile || !apiKey) {
      setUploadStatus({ type: 'error', message: 'Please select a file and set your Pinata API key' });
      return;
    }

    if (!metadata.client || !metadata.project) {
      setUploadStatus({ type: 'error', message: 'Please select both client and project' });
      return;
    }

    setUploading(true);
    setUploadStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const pinataMetadata = {
        name: metadata.name || selectedFile.name,
        keyvalues: {
          client: metadata.client,
          project: metadata.project,
          projectNumber: metadata.projectNumber,
          description: metadata.description,
          tags: metadata.tags,
          uploadedAt: new Date().toISOString(),
          fileSize: selectedFile.size,
          fileType: selectedFile.type
        }
      };
      
      formData.append('pinataMetadata', JSON.stringify(pinataMetadata));

      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );

      const uploadData = {
        id: Date.now(),
        hash: response.data.IpfsHash,
        name: metadata.name || selectedFile.name,
        client: metadata.client,
        project: metadata.project,
        projectNumber: metadata.projectNumber,
        description: metadata.description,
        tags: metadata.tags,
        size: selectedFile.size,
        type: selectedFile.type,
        uploadedAt: new Date().toISOString(),
        pinataUrl: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`
      };

      onUploadSuccess(uploadData);
      setUploadStatus({ type: 'success', message: 'File uploaded successfully!' });
      
      // Reset form
      setSelectedFile(null);
      setMetadata({ 
        name: '', 
        description: '', 
        tags: '', 
        client: '', 
        project: '', 
        projectNumber: '' 
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus({ 
        type: 'error', 
        message: error.response?.data?.error || 'Upload failed. Please check your API key and try again.' 
      });
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setUploadStatus(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* File Drop Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : selectedFile 
            ? 'border-green-500 bg-green-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept="*/*"
        />
        
        {selectedFile ? (
          <div className="space-y-4">
            <SafeIcon icon={FiCheck} className="mx-auto text-4xl text-green-500" />
            <div>
              <p className="text-lg font-medium text-gray-800">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">
                {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Unknown type'}
              </p>
            </div>
            <button
              onClick={removeFile}
              className="inline-flex items-center px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
            >
              <SafeIcon icon={FiX} className="mr-1" />
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <SafeIcon icon={FiUpload} className="mx-auto text-4xl text-gray-400" />
            <div>
              <p className="text-lg font-medium text-gray-600">
                Drop your file here or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Any file type supported
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Metadata Form */}
      {selectedFile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <h3 className="text-lg font-semibold text-gray-800">File Metadata</h3>
          
          {/* Client Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client *
            </label>
            <div className="flex gap-2">
              <select
                value={metadata.client}
                onChange={(e) => {
                  handleMetadataChange('client', e.target.value);
                  // Reset project when client changes
                  setMetadata(prev => ({ ...prev, project: '', projectNumber: '' }));
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              >
                <option value="">Select a client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.name}>{client.name}</option>
                ))}
              </select>
              <button
                onClick={() => setShowNewClientForm(!showNewClientForm)}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="Add new client"
              >
                <SafeIcon icon={FiPlus} />
              </button>
            </div>
            
            {showNewClientForm && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  placeholder="Enter new client name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  onKeyPress={(e) => e.key === 'Enter' && addNewClient()}
                />
                <button
                  onClick={addNewClient}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowNewClientForm(false);
                    setNewClient('');
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project *
            </label>
            <div className="flex gap-2">
              <select
                value={metadata.project}
                onChange={(e) => handleProjectSelect(e.target.value)}
                disabled={!metadata.client}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors disabled:bg-gray-100"
              >
                <option value="">Select a project</option>
                {getProjectsForClient().map(project => (
                  <option key={project.id} value={project.name}>
                    {project.name} ({project.projectNumber})
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowNewProjectForm(!showNewProjectForm)}
                disabled={!metadata.client}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                title="Add new project"
              >
                <SafeIcon icon={FiPlus} />
              </button>
            </div>
            
            {showNewProjectForm && metadata.client && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newProject}
                  onChange={(e) => setNewProject(e.target.value)}
                  placeholder="Enter new project name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  onKeyPress={(e) => e.key === 'Enter' && addNewProject()}
                />
                <button
                  onClick={addNewProject}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowNewProjectForm(false);
                    setNewProject('');
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
            
            {metadata.projectNumber && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm text-blue-800">
                  Project Number: <strong>{metadata.projectNumber}</strong>
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File Name
            </label>
            <input
              type="text"
              value={metadata.name}
              onChange={(e) => handleMetadataChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              placeholder="Enter file name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={metadata.description}
              onChange={(e) => handleMetadataChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none"
              placeholder="Enter file description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <input
              type="text"
              value={metadata.tags}
              onChange={(e) => handleMetadataChange('tags', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              placeholder="Enter tags separated by commas"
            />
          </div>
        </motion.div>
      )}

      {/* Upload Status */}
      {uploadStatus && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg flex items-center ${
            uploadStatus.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <SafeIcon 
            icon={uploadStatus.type === 'success' ? FiCheck : FiAlertCircle} 
            className="mr-2" 
          />
          {uploadStatus.message}
        </motion.div>
      )}

      {/* Upload Button */}
      {selectedFile && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={uploadToPinata}
          disabled={uploading || !apiKey || !metadata.client || !metadata.project}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {uploading ? (
            <>
              <SafeIcon icon={FiLoader} className="mr-2 animate-spin" />
              Uploading to IPFS...
            </>
          ) : (
            <>
              <SafeIcon icon={FiUpload} className="mr-2" />
              Upload to IPFS
            </>
          )}
        </motion.button>
      )}

      {!apiKey && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            <SafeIcon icon={FiAlertCircle} className="inline mr-1" />
            Please set your Pinata API key in the Settings tab to upload files.
          </p>
        </div>
      )}
    </div>
  );
};

export default FileUploader;