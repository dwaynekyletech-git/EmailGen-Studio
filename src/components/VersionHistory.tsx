import React, { useState, useEffect } from 'react';
import { getEmailVersions, getEmailVersion } from '@/lib/api-service';
import { format } from 'date-fns';

interface VersionHistoryProps {
  emailId: string;
  onLoadVersion: (htmlContent: string) => void;
  onClose: () => void;
}

interface EmailVersion {
  id: number;
  version: number;
  created_at: string;
  title: string;
  user?: {
    email: string;
  };
}

export default function VersionHistory({ emailId, onLoadVersion, onClose }: VersionHistoryProps) {
  const [versions, setVersions] = useState<EmailVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingVersion, setLoadingVersion] = useState<number | null>(null);

  useEffect(() => {
    async function fetchVersions() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await getEmailVersions(emailId);
        
        if (response && response.versions) {
          const sortedVersions = response.versions.sort((a: EmailVersion, b: EmailVersion) => 
            b.version - a.version
          );
          setVersions(sortedVersions);
        }
      } catch (err) {
        console.error('Error fetching versions:', err);
        setError('Failed to load version history');
      } finally {
        setLoading(false);
      }
    }
    
    fetchVersions();
  }, [emailId]);
  
  const handleLoadVersion = async (versionNumber: number) => {
    try {
      setLoadingVersion(versionNumber);
      const response = await getEmailVersion(emailId, versionNumber);
      
      if (response && response.version) {
        onLoadVersion(response.version.html_content);
        onClose();
      }
    } catch (err) {
      console.error('Error loading version:', err);
      setError('Failed to load version');
    } finally {
      setLoadingVersion(null);
    }
  };
  
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-lg w-full max-h-[80vh] flex flex-col">
        <div className="p-4 border-b dark:border-zinc-700 flex justify-between items-center">
          <h2 className="text-lg font-medium">Email Version History</h2>
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-grow">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zinc-900 dark:border-zinc-100"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 dark:text-red-400 text-center py-4">
              {error}
            </div>
          ) : versions.length === 0 ? (
            <div className="text-zinc-500 dark:text-zinc-400 text-center py-4">
              No saved versions found
            </div>
          ) : (
            <ul className="space-y-2">
              {versions.map((version) => (
                <li 
                  key={version.id}
                  className="border dark:border-zinc-700 rounded-md p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{version.title || `Version ${version.version}`}</h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {formatDate(version.created_at)}
                      </p>
                      {version.user && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          {version.user.email}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleLoadVersion(version.version)}
                      disabled={loadingVersion === version.version}
                      className="text-sm px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50"
                    >
                      {loadingVersion === version.version ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-zinc-600 dark:text-zinc-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Loading
                        </span>
                      ) : (
                        'Load'
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
} 