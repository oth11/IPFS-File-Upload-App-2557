import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { format } from 'date-fns';

const { FiFile, FiExternalLink, FiCopy, FiCalendar, FiTag, FiInfo, FiUser, FiBriefcase, FiHash } = FiIcons;

const UploadHistory = ({ uploads }) => {
  const [filter, setFilter] = useState({ client: '', project: '' });
  const [sortBy, setSortBy] = useState('date');

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get unique clients and projects for filtering
  const uniqueClients = [...new Set(uploads.map(u => u.client).filter(Boolean))];
  const uniqueProjects = [...new Set(uploads.map(u => u.project).filter(Boolean))];

  // Filter and sort uploads
  const filteredUploads = uploads
    .filter(upload => {
      if (filter.client && upload.client !== filter.client) return false;
      if (filter.project && upload.project !== filter.project) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'client':
          return (a.client || '').localeCompare(b.client || '');
        case 'project':
          return (a.project || '').localeCompare(b.project || '');
        case 'size':
          return b.size - a.size;
        default: // date
          return new Date(b.uploadedAt) - new Date(a.uploadedAt);
      }
    });

  if (uploads.length === 0) {
    return (
      <div className="text-center py-12">
        <SafeIcon icon={FiFile} className="mx-auto text-6xl text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-600 mb-2">No uploads yet</h3>
        <p className="text-gray-500">Upload your first file to see it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Upload History</h3>
        <span className="text-sm text-gray-500">{filteredUploads.length} files</span>
      </div>

      {/* Filters and Sort */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Client
            </label>
            <select
              value={filter.client}
              onChange={(e) => setFilter(prev => ({ ...prev, client: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            >
              <option value="">All Clients</option>
              {uniqueClients.map(client => (
                <option key={client} value={client}>{client}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Project
            </label>
            <select
              value={filter.project}
              onChange={(e) => setFilter(prev => ({ ...prev, project: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            >
              <option value="">All Projects</option>
              {uniqueProjects.map(project => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            >
              <option value="date">Upload Date</option>
              <option value="name">File Name</option>
              <option value="client">Client</option>
              <option value="project">Project</option>
              <option value="size">File Size</option>
            </select>
          </div>
        </div>

        {(filter.client || filter.project) && (
          <button
            onClick={() => setFilter({ client: '', project: '' })}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            Clear all filters
          </button>
        )}
      </div>
      
      {filteredUploads.map((upload, index) => (
        <motion.div
          key={upload.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <SafeIcon icon={FiFile} className="text-2xl text-blue-500 mr-3" />
              <div>
                <h4 className="font-medium text-gray-800">{upload.name}</h4>
                <p className="text-sm text-gray-500">
                  {formatFileSize(upload.size)} • {upload.type}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => copyToClipboard(upload.hash)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                title="Copy IPFS hash"
              >
                <SafeIcon icon={FiCopy} />
              </button>
              <a
                href={upload.pinataUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                title="Open in new tab"
              >
                <SafeIcon icon={FiExternalLink} />
              </a>
            </div>
          </div>

          {/* Client/Project Info */}
          {(upload.client || upload.project) && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                {upload.client && (
                  <div className="flex items-center text-blue-800">
                    <SafeIcon icon={FiUser} className="mr-2" />
                    <span><strong>Client:</strong> {upload.client}</span>
                  </div>
                )}
                {upload.project && (
                  <div className="flex items-center text-blue-800">
                    <SafeIcon icon={FiBriefcase} className="mr-2" />
                    <span><strong>Project:</strong> {upload.project}</span>
                  </div>
                )}
                {upload.projectNumber && (
                  <div className="flex items-center text-blue-800">
                    <SafeIcon icon={FiHash} className="mr-2" />
                    <span><strong>Project #:</strong> {upload.projectNumber}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex items-center text-gray-600">
              <SafeIcon icon={FiCalendar} className="mr-2" />
              <span>Uploaded {format(new Date(upload.uploadedAt), 'MMM d, yyyy at h:mm a')}</span>
            </div>
            
            {upload.description && (
              <div className="flex items-start text-gray-600">
                <SafeIcon icon={FiInfo} className="mr-2 mt-0.5 flex-shrink-0" />
                <span>{upload.description}</span>
              </div>
            )}
            
            {upload.tags && (
              <div className="flex items-center text-gray-600">
                <SafeIcon icon={FiTag} className="mr-2" />
                <span>{upload.tags}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">IPFS Hash:</span>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                {upload.hash}
              </code>
            </div>
          </div>
        </motion.div>
      ))}

      {filteredUploads.length === 0 && uploads.length > 0 && (
        <div className="text-center py-8">
          <SafeIcon icon={FiFile} className="mx-auto text-4xl text-gray-300 mb-2" />
          <p className="text-gray-500">No files match the current filters</p>
        </div>
      )}
    </div>
  );
};

export default UploadHistory;