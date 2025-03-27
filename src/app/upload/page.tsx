"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import FileUploader from '@/components/FileUploader';

export default function UploadPage() {
  const router = useRouter();

  const handleConversionComplete = (html: string, metadata: any, conversionId: string) => {
    // Redirect to the editor with the HTML and conversion ID
    router.push(`/editor?html=${encodeURIComponent(html)}&conversionId=${conversionId}`);
  };

  const handleConversionError = (error: string) => {
    console.error('Conversion error:', error);
    // Error is already displayed in the FileUploader component
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Upload Design File</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Convert Your Design to HTML Email</h2>
          <p className="text-gray-600 mb-6">
            Upload your design file and our AI will convert it into a responsive HTML email
            optimized for Salesforce Marketing Cloud.
          </p>
          
          <FileUploader 
            onConversionComplete={handleConversionComplete}
            onConversionError={handleConversionError}
            makeResponsive={true}
            optimizeForEmail={true}
            targetPlatform="sfmc"
          />
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">How It Works</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-700">
            <li>Upload your design file</li>
            <li>Our AI analyzes the design and converts it to responsive HTML</li>
            <li>Review and edit the generated HTML in our live editor</li>
            <li>Validate the email against QA rules and test rendering</li>
            <li>Deploy directly to Salesforce Marketing Cloud</li>
          </ol>
        </div>
      </div>
    </div>
  );
} 