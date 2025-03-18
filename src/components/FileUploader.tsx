import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface FileUploaderProps {
  onConversionComplete?: (html: string, metadata: any, conversionId: string) => void;
  onConversionError?: (error: string) => void;
  makeResponsive?: boolean;
  optimizeForEmail?: boolean;
  targetPlatform?: 'sfmc' | 'generic';
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onConversionComplete,
  onConversionError,
  makeResponsive = true,
  optimizeForEmail = true,
  targetPlatform = 'sfmc'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = { current: null as HTMLInputElement | null };
  const router = useRouter();

  const handleDragOver = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const handleFileChange = async (e: any) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Check file type
    const validTypes = ['.png', '.jpg', '.jpeg'];
    const fileType = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(fileType)) {
      setError(`Invalid file type. Supported types: PNG, JPG`);
      if (onConversionError) {
        onConversionError(`Invalid file type. Supported types: PNG, JPG`);
      }
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);
    setConversionProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('makeResponsive', makeResponsive.toString());
      formData.append('optimizeForEmail', optimizeForEmail.toString());
      formData.append('targetPlatform', targetPlatform);

      // Simulate upload progress
      const uploadInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(uploadInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      const response = await fetch('/api/convertEmail', {
        method: 'POST',
        body: formData,
      });

      clearInterval(uploadInterval);
      setUploadProgress(100);

      // Simulate conversion progress
      const conversionInterval = setInterval(() => {
        setConversionProgress((prev) => {
          if (prev >= 90) {
            clearInterval(conversionInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 500);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to convert file');
      }

      const data = await response.json();
      clearInterval(conversionInterval);
      setConversionProgress(100);

      if (data.success) {
        if (onConversionComplete) {
          onConversionComplete(data.html, data.metadata, data.conversionId);
        } else {
          // If no callback is provided, redirect to the editor with the HTML
          router.push(`/editor?html=${encodeURIComponent(data.html)}&conversionId=${data.conversionId}`);
        }
      } else {
        throw new Error(data.error || 'Conversion failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      if (onConversionError) {
        onConversionError(errorMessage);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setConversionProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleButtonClick}
      >
        {isUploading ? (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Processing your design...</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
            {uploadProgress === 100 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>AI Conversion</span>
                  <span>{conversionProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-green-600 h-2.5 rounded-full"
                    style={{ width: `${conversionProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">
              Drag & drop your design file
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Supported formats: PNG, JPG
            </p>
            <p className="mt-2 text-xs text-gray-400">
              or click to select a file
            </p>
          </>
        )}
        <input
          ref={(el) => { fileInputRef.current = el; }}
          type="file"
          className="hidden"
          accept=".png,.jpg,.jpeg"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Options</h4>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={makeResponsive}
              onChange={() => {}}
              className="rounded text-blue-600"
            />
            <span className="ml-2 text-sm text-gray-700">Make responsive</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={optimizeForEmail}
              onChange={() => {}}
              className="rounded text-blue-600"
            />
            <span className="ml-2 text-sm text-gray-700">
              Optimize for email clients
            </span>
          </label>
          <div className="flex items-center">
            <span className="text-sm text-gray-700 mr-2">Target platform:</span>
            <select
              value={targetPlatform}
              onChange={() => {}}
              className="text-sm border rounded p-1"
            >
              <option value="sfmc">Salesforce Marketing Cloud</option>
              <option value="generic">Generic Email</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploader; 