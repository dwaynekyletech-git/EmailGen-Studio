"use client";

import React, { useState, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import { oneDark } from "@codemirror/theme-one-dark";
import Link from "next/link";
import { saveEmailVersion } from "@/lib/api-service";
import { useUser } from "@clerk/nextjs";
import { v4 as uuidv4 } from 'uuid';
import { useTheme } from 'next-themes';
import CodeAssistant from "@/components/CodeAssistant";
import CommandPalette from "@/components/CommandPalette";
import CodeTooltip from "@/components/CodeTooltip";

// Default HTML to use if no uploaded HTML is available
const defaultHtml = `<!DOCTYPE html>
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
      <p>Upload a design image to convert it to HTML.</p>
      <p>Best regards,<br>The Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2024 EmailGen Studio. All rights reserved.</p>
      <p><a href="#">Unsubscribe</a> | <a href="#">View in browser</a></p>
    </div>
  </div>
</body>
</html>`;

export default function EditorPage() {
  const [code, setCode] = useState(defaultHtml);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [emailId, setEmailId] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<'loading' | 'success' | 'error' | 'no-data'>('loading');
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [tooltip, setTooltip] = useState<{
    title: string;
    description: string;
    code?: string;
    position: { x: number; y: number };
    type: 'info' | 'warning' | 'error' | 'tip';
  } | null>(null);
  const { user } = useUser();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Add keyboard event listener within the useEffect
  useEffect(() => {
    // Function to handle keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command palette shortcut (Cmd+K or Ctrl+K)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    // Function to load HTML content
    const loadHtml = () => {
      try {
        setLoadingState('loading');
        
        // Check URL for conversion ID
        const urlParams = new URLSearchParams(window.location.search);
        const conversionId = urlParams.get('id');
        
        // Try multiple methods to get the HTML
        
        // 1. ID-based approach (primary method)
        let idBasedHtml = null;
        if (conversionId) {
          idBasedHtml = sessionStorage.getItem(`html_${conversionId}`);
        } else {
          // Try to get conversion ID from cookie
          const cookies = document.cookie.split(';');
          let cookieId = null;
          for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'emailConversionId') {
              cookieId = value;
              break;
            }
          }
          
          if (cookieId) {
            idBasedHtml = sessionStorage.getItem(`html_${cookieId}`);
          }
        }
        
        // 2. Check for HTML in global variable
        const globalHtml = typeof window !== 'undefined' ? (window as any).__EMAIL_HTML_CONTENT__ : null;
        
        // 3. Check fixed key in sessionStorage
        const fixedKeyHtml = sessionStorage.getItem('emailHtml');
        
        // 4. Check localStorage transport
        let transportHtml = null;
        try {
          const transportData = localStorage.getItem('emailHtmlTransport');
          if (transportData) {
            const parsed = JSON.parse(transportData);
            transportHtml = parsed.html;
          }
        } catch (e) {
          console.error('Failed to parse transport data:', e);
        }
        
        // Select HTML source in order of preference
        let selectedHtml: string | null = null;
        
        if (idBasedHtml) {
          selectedHtml = idBasedHtml;
        } else if (globalHtml) {
          selectedHtml = globalHtml;
          // Clean up
          (window as any).__EMAIL_HTML_CONTENT__ = null;
        } else if (fixedKeyHtml) {
          selectedHtml = fixedKeyHtml;
          // Clean up
          sessionStorage.removeItem('emailHtml');
        } else if (transportHtml) {
          selectedHtml = transportHtml;
          // Clean up
          localStorage.removeItem('emailHtmlTransport');
        }
        
        // Set the HTML
        if (selectedHtml) {
          setCode(selectedHtml);
          setLoadingState('success');
        } else {
          setLoadingState('no-data');
        }
      } catch (error) {
        console.error('Error loading HTML:', error);
        setLoadingState('error');
        setSaveError(error instanceof Error ? error.message : 'Unknown error');
      }
    };
    
    // Load HTML with a small delay to ensure storage is settled
    setTimeout(loadHtml, 100);
    
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

  // Handle command palette execution
  const handleExecuteCommand = (commandId: string) => {
    switch (commandId) {
      case 'format-code':
        // In a real implementation, this would use a proper HTML formatter
        // For now, we'll just simulate formatting with a simple indentation
        try {
          const formattedCode = code
            .replace(/></g, '>\n<')
            .replace(/\n\s+/g, '\n')
            .replace(/\n/g, '\n  ')
            .replace(/\n  <\/([a-zA-Z0-9]+)>/g, '\n</$1>');
          setCode(formattedCode);
          
          // Show tooltip to indicate successful formatting
          setTooltip({
            title: 'Code Formatted',
            description: 'Your HTML has been formatted for better readability.',
            position: { x: 100, y: 100 },
            type: 'info'
          });
          
          // Auto-hide tooltip after 3 seconds
          setTimeout(() => setTooltip(null), 3000);
        } catch (error) {
          console.error('Formatting error:', error);
        }
        break;
        
      case 'add-header':
        // Add a header template to the code
        const headerTemplate = `<div class="header" style="background-color: #f8f9fa; padding: 20px; text-align: center;">
  <img src="https://via.placeholder.com/150x50" alt="Logo" style="max-width: 150px;">
  <h1 style="color: #333333; margin-top: 10px;">Newsletter Title</h1>
</div>`;
        
        // Insert after the body tag if it exists
        if (code.includes('<body>')) {
          const newCode = code.replace('<body>', '<body>\n  ' + headerTemplate);
          setCode(newCode);
        } else {
          // Just prepend if there's no body tag
          setCode(headerTemplate + '\n' + code);
        }
        break;
        
      case 'docs-email-best-practices':
        // Show a tooltip with email best practices
        setTooltip({
          title: 'Email HTML Best Practices',
          description: 'Use tables for layout, inline CSS for styling, and avoid using DIVs as main layout elements. Always include text alternatives for images.',
          position: { x: 100, y: 100 },
          type: 'tip'
        });
        break;
        
      // Add more command handlers as needed
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">HTML Email Editor</h1>
      
      {loadingState === 'loading' && (
        <div className="flex justify-center items-center h-[500px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zinc-900 dark:border-zinc-100"></div>
        </div>
      )}
      
      {loadingState === 'error' && (
        <div className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 p-4 rounded-md mb-6">
          <p className="font-medium">Error loading HTML</p>
          <p className="text-sm">{saveError || 'An unknown error occurred'}</p>
        </div>
      )}
      
      {(loadingState === 'success' || loadingState === 'no-data') && (
        <>
          <div className="mb-4 flex justify-between items-center">
            <button
              onClick={() => setIsPaletteOpen(true)}
              className="flex items-center space-x-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span>Commands</span>
              <span className="text-xs bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded ml-1">⌘+K</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="px-3 py-1 text-sm border rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save Draft"}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
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
                    theme={isDarkMode ? oneDark : undefined}
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
                <Link
                  href="/qa"
                  className="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  onClick={() => localStorage.setItem('qaHtml', code)}
                >
          Proceed to QA
                </Link>
              </div>
            </div>
            
            {/* Code Assistant Panel */}
            <div className="xl:col-span-1">
              <CodeAssistant 
                code={code} 
                onChange={handleCodeChange}
                isDarkMode={isDarkMode}
              />
            </div>
      </div>
          
          {/* Command Palette (Modal) */}
          <CommandPalette
            isOpen={isPaletteOpen}
            onClose={() => setIsPaletteOpen(false)}
            onExecuteCommand={handleExecuteCommand}
          />
          
          {/* Tooltip */}
          {tooltip && (
            <CodeTooltip
              title={tooltip.title}
              description={tooltip.description}
              code={tooltip.code}
              position={tooltip.position}
              type={tooltip.type}
              onClose={() => setTooltip(null)}
              darkMode={isDarkMode}
            />
          )}
        </>
      )}
    </div>
  );
} 