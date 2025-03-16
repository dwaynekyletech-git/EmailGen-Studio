"use client";

import React, { useState, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import { oneDark } from "@codemirror/theme-one-dark";
import Link from "next/link";
import { saveEmailVersion } from "@/lib/api-service";
import { useUser } from "@clerk/nextjs";
import { v4 as uuidv4 } from 'uuid';

const sampleHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Email Template</title>
  <style type="text/css">
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
    }
    .header {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
    }
    .content {
      padding: 20px;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Our Newsletter</h1>
    </div>
    <div class="content">
      <p>Hello there,</p>
      <p>Thank you for subscribing to our newsletter. We're excited to share the latest updates with you.</p>
      <p>Best regards,<br>The Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2024 Company Name. All rights reserved.</p>
      <p><a href="#">Unsubscribe</a> | <a href="#">View in browser</a></p>
    </div>
  </div>
</body>
</html>`;

export default function EditorPage() {
  const [code, setCode] = useState(sampleHtml);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [emailId, setEmailId] = useState<string | null>(null);
  const { user } = useUser();

  useEffect(() => {
    // Check if there's HTML from the upload page
    const uploadedHtml = localStorage.getItem('emailHtml');
    const conversionId = localStorage.getItem('conversionId');
    
    if (uploadedHtml) {
      setCode(uploadedHtml);
    }
    
    // Generate or retrieve an email ID
    const storedEmailId = localStorage.getItem('emailId');
    if (storedEmailId) {
      setEmailId(storedEmailId);
    } else {
      const newEmailId = uuidv4();
      setEmailId(newEmailId);
      localStorage.setItem('emailId', newEmailId);
    }
  }, []);

  const handleCodeChange = (value: string) => {
    setCode(value);
    // Reset success message when code changes
    setSaveSuccess(false);
  };

  const handleSaveDraft = async () => {
    if (!emailId) return;
    
    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveSuccess(false);
      
      // Save the email version
      const metadata = {
        author: user?.fullName || user?.username || 'Anonymous',
        comment: 'Draft saved from editor',
        timestamp: new Date().toISOString()
      };
      
      await saveEmailVersion(emailId, code, metadata);
      
      setSaveSuccess(true);
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Save error:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full">
      <h1 className="text-3xl font-bold mb-6">Email Editor</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 border-b">
            <h2 className="font-medium">HTML Editor</h2>
          </div>
          <CodeMirror
            value={code}
            height="500px"
            extensions={[html()]}
            onChange={handleCodeChange}
            theme={oneDark}
            className="text-sm"
          />
        </div>
        
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 border-b flex justify-between items-center">
            <h2 className="font-medium">Preview</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMobileView(false)}
                className={`px-2 py-1 text-xs rounded ${
                  !isMobileView 
                    ? "bg-zinc-300 dark:bg-zinc-600 font-medium" 
                    : "bg-zinc-200 dark:bg-zinc-700"
                }`}
              >
                Desktop
              </button>
              <button
                onClick={() => setIsMobileView(true)}
                className={`px-2 py-1 text-xs rounded ${
                  isMobileView 
                    ? "bg-zinc-300 dark:bg-zinc-600 font-medium" 
                    : "bg-zinc-200 dark:bg-zinc-700"
                }`}
              >
                Mobile
              </button>
            </div>
          </div>
          <div 
            className="bg-white flex justify-center transition-all duration-300 ease-in-out"
            style={{ 
              height: isMobileView ? "600px" : "500px",
              overflow: "auto"
            }}
          >
            <div 
              className="transition-all duration-300 ease-in-out"
              style={{
                width: isMobileView ? "375px" : "800px",
                height: "100%",
                border: isMobileView ? "10px solid #333" : "1px solid #e5e7eb",
                borderRadius: isMobileView ? "20px" : "4px",
                overflow: "hidden",
                boxShadow: isMobileView 
                  ? "0 4px 12px rgba(0,0,0,0.15)" 
                  : "0 1px 3px rgba(0,0,0,0.05)"
              }}
            >
              <iframe
                srcDoc={code}
                title="Email Preview"
                className="w-full h-full border-0"
                sandbox="allow-same-origin"
                style={{
                  width: "100%",
                  height: "100%"
                }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {saveError && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md dark:bg-red-900/30 dark:text-red-400">
          {saveError}
        </div>
      )}
      
      {saveSuccess && (
        <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md dark:bg-green-900/30 dark:text-green-400">
          Draft saved successfully!
        </div>
      )}
      
      <div className="mt-6 flex justify-end space-x-4">
        <Link
          href="/dashboard"
          className="px-4 py-2 border rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          Back
        </Link>
        <button 
          onClick={handleSaveDraft}
          disabled={isSaving}
          className="px-4 py-2 border rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Saving..." : "Save Draft"}
        </button>
        <Link
          href="/qa"
          className="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          onClick={() => localStorage.setItem('qaHtml', code)}
        >
          Proceed to QA
        </Link>
      </div>
    </div>
  );
} 