import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PDFDocument } from 'pdf-lib';

// Create a global variable to store HTML until it can be used
if (typeof window !== 'undefined') {
  (window as any).__EMAIL_HTML_CONTENT__ = null;
}

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

  // Helper function to check if PDF has multiple pages
  const checkPdfPageCount = async (file: File): Promise<number> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      return pdfDoc.getPageCount();
    } catch (error) {
      console.error('Error checking PDF page count:', error);
      return 1; // Default to 1 page on error
    }
  };

  // Handle streaming conversion
  const handleStreamingConversion = async (file: File, formData: FormData): Promise<void> => {
    try {
      console.log('Using streaming conversion for multi-page PDF');
      
      // Update progress for upload
      setUploadProgress(50);
      
      // Send to streaming API endpoint
      const response = await fetch('/api/convertEmail/stream', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to convert file');
      }
      
      setUploadProgress(100);
      
      // Process the streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }
      
      let html = '';
      let conversionId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Read chunks of the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Convert chunk to text
        const chunkText = new TextDecoder().decode(value);
        
        // Each line is a JSON object
        const lines = chunkText.split('\n').filter(Boolean);
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            if (data.status === 'processing') {
              // Initial processing message
              setConversionProgress(10);
            } else if (data.status === 'chunk') {
              // Incremental content
              html += data.data;
              setConversionProgress(Math.min(90, conversionProgress + 5));
            } else if (data.status === 'complete') {
              // Final HTML and metadata
              html = data.html || html;
              setConversionProgress(100);
              
              // Store the HTML and redirect
              await storeHtmlAndRedirect(html, conversionId);
              break;
            } else if (data.status === 'error') {
              // Error in processing
              throw new Error(data.error || 'Error during conversion');
            }
          } catch (parseError) {
            console.error('Error parsing streaming chunk:', parseError);
          }
        }
      }
    } catch (error) {
      console.error('Streaming conversion error:', error);
      setError(error instanceof Error ? error.message : 'Failed to convert file');
      setIsUploading(false);
    }
  };

  // Handle regular conversion
  const handleRegularConversion = async (file: File, formData: FormData): Promise<void> => {
    try {
      console.log('Using regular conversion for single-page PDF');
      
      // Send to regular API endpoint
      const response = await fetch('/api/convertEmail', {
        method: 'POST',
        body: formData,
      });
      
      // Handle API response
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to convert file');
      }
      
      // Update progress
      setUploadProgress(100);
      setConversionProgress(50);
      
      // Process successful response
      const data = await response.json();
      console.log('API Response SUCCESS, html length:', data.html?.length);
      
      setConversionProgress(100);
      
      if (data.html) {
        // Generate a unique ID for this conversion
        const conversionId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        console.log('Generated conversion ID:', conversionId);
        
        await storeHtmlAndRedirect(data.html, conversionId);
      } else {
        throw new Error('No HTML content in the response');
      }
    } catch (error) {
      console.error('Regular conversion error:', error);
      setError(error instanceof Error ? error.message : 'Failed to convert file');
      setIsUploading(false);
    }
  };

  // Helper to store HTML and redirect
  const storeHtmlAndRedirect = async (html: string, conversionId: string): Promise<void> => {
    try {
      // MULTIPLE STORAGE APPROACH - using all available methods for redundancy
      // 1. Store in sessionStorage with the conversion ID
      sessionStorage.setItem(`html_${conversionId}`, html);
      
      // 2. Store in sessionStorage with a fixed key as fallback
      sessionStorage.setItem('emailHtml', html);
      
      // 3. Set a cookie with the conversion ID
      document.cookie = `emailConversionId=${conversionId}; path=/; max-age=300`;
      
      // 4. Store in localStorage through a transport object
      const transport = {
        html: html,
        timestamp: Date.now(),
        id: conversionId
      };
      localStorage.setItem('emailHtmlTransport', JSON.stringify(transport));
      
      // 5. Set global variable
      if (typeof window !== 'undefined') {
        (window as any).__EMAIL_HTML_CONTENT__ = html;
      }
      
      // DELAY 500ms to ensure storage is complete before navigation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Redirect to editor page with the conversion ID
      console.log('Redirecting to editor page with ID:', conversionId);
      router.push(`/editor?id=${conversionId}`);
    } catch (storageError) {
      console.error('Failed to store HTML:', storageError);
      throw storageError;
    }
  };

  const handleFileUpload = async (file: File): Promise<void> => {
    if (!file) {
      setError('Please select a file');
      return;
    }
    
    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(10);
      setConversionProgress(0);
      
      // Create form data for the API request
      const formData = new FormData();
      formData.append('file', file);
      formData.append('makeResponsive', makeResponsive.toString());
      formData.append('optimizeForEmail', optimizeForEmail.toString());
      formData.append('targetPlatform', targetPlatform);
      
      // Log the request
      console.log('Processing file:', file.name, file.type, file.size);
      
      // Check if PDF has multiple pages
      const pageCount = await checkPdfPageCount(file);
      console.log(`PDF has ${pageCount} pages`);
      setUploadProgress(30);
      
      // Use streaming for multi-page PDFs, regular for single page
      if (pageCount > 1) {
        await handleStreamingConversion(file, formData);
      } else {
        await handleRegularConversion(file, formData);
      }
      
    } catch (error) {
      console.error('File upload error:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload file');
      setIsUploading(false);
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
              Supported formats: PDF
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
          accept=".pdf"
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