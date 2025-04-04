"use client";

import React, { useState, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@uiw/react-codemirror";
import Link from "next/link";
import { saveEmailVersion, getEmailVersions } from "@/lib/api-service";
import { useUser } from "@clerk/nextjs";
import { v4 as uuidv4 } from 'uuid';
import { useTheme } from 'next-themes';
import CodeAssistant from "@/components/CodeAssistant";
import CommandPalette from "@/components/CommandPalette";
import CodeTooltip from "@/components/CodeTooltip";
import VersionHistory from "@/components/VersionHistory";

// Default HTML to use if no uploaded HTML is available
const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Template</title>
</head>
<body>
  <p>Your email content goes here.</p>
</body>
</html>`;

export default function EditorPage() {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [code, setCode] = useState(DEFAULT_HTML);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [emailId, setEmailId] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<'loading' | 'success' | 'error' | 'no-data'>('loading');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const [isCodeAssistantVisible, setIsCodeAssistantVisible] = useState(false);
  const [tooltip, setTooltip] = useState<{
    title: string;
    description: string;
    code: string;
    position: { x: number; y: number };
    type: 'info' | 'warning' | 'error' | 'tip';
  } | null>(null);
  const { user } = useUser();
  const { theme, setTheme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [isLoading, setIsLoading] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  // Reference to store the CodeMirror editor instance
  const editorRef = { current: { editor: null as any } };

  // Add keyboard event listener within the useEffect
  useEffect(() => {
    // Function to handle keyboard shortcuts - temporarily disabled
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command palette shortcut (Cmd+K or Ctrl+K) - temporarily disabled
      /*
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
      }
      */
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

  // Add function to load the most recent draft
  const handleLoadDraft = async () => {
    if (!emailId) return;
    
    try {
      setIsLoading(true);
      setSaveError(null);
      
      // Get all versions of this email
      const response = await getEmailVersions(emailId);
      
      if (response && response.versions && response.versions.length > 0) {
        // Sort by version number to get the most recent
        const sortedVersions = response.versions.sort((a: {version: number}, b: {version: number}) => b.version - a.version);
        const latestVersion = sortedVersions[0];
        
        // Update the code editor with the content
        setCode(latestVersion.html_content);
        
        // Show a success message
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      } else {
        setSaveError("No saved drafts found for this email");
      }
    } catch (error) {
      console.error('Load error:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to load draft');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle command execution from command palette
  const handleExecuteCommand = (command: string) => {
    console.log(`Executing command: ${command}`);
    
    switch (command) {
      case 'format':
        // Format HTML implementation
        break;
      case 'add-header':
        // Add header implementation
        break;
      case 'best-practices':
        // Show email best practices implementation
        break;
      default:
        console.log(`Unknown command: ${command}`);
    }
    
    setIsCommandPaletteOpen(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette (Cmd+K or Ctrl+K)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      
      // Save (Cmd+S or Ctrl+S)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSaveDraft();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleDarkMode = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const toggleEditorFullscreen = () => {
    setIsEditorFullscreen(!isEditorFullscreen);
    // Exit preview fullscreen if it's active
    if (isPreviewFullscreen) {
      setIsPreviewFullscreen(false);
    }
  };

  const togglePreviewFullscreen = () => {
    setIsPreviewFullscreen(!isPreviewFullscreen);
    // Exit editor fullscreen if it's active
    if (isEditorFullscreen) {
      setIsEditorFullscreen(false);
    }
  };

  // Add function to open version history
  const openVersionHistory = () => {
    setIsVersionHistoryOpen(true);
  };

  // Add function to handle loading a specific version
  const handleLoadVersionFromHistory = (htmlContent: string) => {
    setCode(htmlContent);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
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
              onClick={() => setIsCommandPaletteOpen(true)}
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
                onClick={openVersionHistory}
                className="px-3 py-1 text-sm border rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Version History
              </button>
              <button
                onClick={handleLoadDraft}
                disabled={isLoading}
                className="px-3 py-1 text-sm border rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Loading..." : "Load Draft"}
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="px-3 py-1 text-sm border rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save Draft"}
              </button>
            </div>
          </div>
          
          {/* Main content area */}
          <div className="space-y-6">
            {/* Editor and Preview Grid */}
            <div className={`grid ${!isEditorFullscreen && !isPreviewFullscreen ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-6`}>
              {/* Show editor if not in preview fullscreen mode */}
              {!isPreviewFullscreen && (
                <div className={`border rounded-lg overflow-hidden ${isEditorFullscreen ? 'col-span-full' : ''}`}>
                  <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 border-b flex justify-between items-center">
            <h2 className="font-medium">HTML Editor</h2>
                    <button
                      onClick={toggleEditorFullscreen}
                      className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      title={isEditorFullscreen ? "Exit fullscreen" : "Fullscreen editor"}
                    >
                      {isEditorFullscreen ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0l5 0m-5 0v5m16-5l-5 5m5-5l0 5m0-5h-5M4 16l5 5m-5-5l5 0m-5 0v5m16-5l-5 5m5-5l0 5m0-5h-5" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      )}
                    </button>
          </div>
          <CodeMirror
            value={code}
                    height={isEditorFullscreen ? "calc(100vh - 200px)" : "500px"}
                    extensions={[html(), EditorView.lineWrapping]}
            onChange={handleCodeChange}
                    theme={isDarkMode ? oneDark : undefined}
            className="text-sm"
            onCreateEditor={(editor: any) => {
              editorRef.current.editor = editor;
            }}
          />
        </div>
              )}
        
              {/* Show preview if not in editor fullscreen mode */}
              {!isEditorFullscreen && (
                <div className={`border rounded-lg overflow-hidden ${isPreviewFullscreen ? 'col-span-full' : ''}`}>
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
                      <button
                        onClick={togglePreviewFullscreen}
                        className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 ml-2"
                        title={isPreviewFullscreen ? "Exit fullscreen" : "Fullscreen preview"}
                      >
                        {isPreviewFullscreen ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0l5 0m-5 0v5m16-5l-5 5m5-5l0 5m0-5h-5M4 16l5 5m-5-5l5 0m-5 0v5m16-5l-5 5m5-5l0 5m0-5h-5" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                        )}
                      </button>
            </div>
          </div>
                  <div 
                    className="bg-white flex justify-center transition-all duration-300 ease-in-out"
                    style={{ 
                      height: isPreviewFullscreen ? "calc(100vh - 200px)" : "500px",
                      overflow: "auto",
                      width: "100%"
                    }}
                  >
                    <div 
                      className="transition-all duration-300 ease-in-out flex items-center justify-center"
                      style={{
                        width: isMobileView ? "375px" : (isPreviewFullscreen ? "1024px" : "100%"),
                        minWidth: !isMobileView ? "640px" : "auto",
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
                        srcDoc={isMobileView ? 
                          code.replace(
                            '</head>',
                            `<style>
                              /* Force mobile view regardless of media queries */
                              .mobile-only-table {
                                display: table !important;
                                max-height: none !important;
                                overflow: visible !important;
                              }
                              .desktop-content {
                                display: none !important;
                              }
                            </style>
                            <script>
                              document.addEventListener('DOMContentLoaded', function() {
                                document.body.addEventListener('click', function(e) {
                                  if (e.target.tagName === 'A' || e.target.closest('a')) {
                                    e.preventDefault();
                                    const link = e.target.tagName === 'A' ? e.target : e.target.closest('a');
                                    const href = link.getAttribute('href');
                                    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                                      window.parent.open(href, '_blank');
                                    }
                                  }
                                }, true);
                              });
                            </script>
                            </head>`
                          ) : 
                          code.replace(
                            '</head>',
                            `<style>
                              /* Force desktop view regardless of media queries */
                              .mobile-only-table {
                                display: none !important;
                                max-height: 0 !important;
                                overflow: hidden !important;
                              }
                              .desktop-content {
                                display: table !important;
                              }
                            </style>
                            <script>
                              document.addEventListener('DOMContentLoaded', function() {
                                document.body.addEventListener('click', function(e) {
                                  if (e.target.tagName === 'A' || e.target.closest('a')) {
                                    e.preventDefault();
                                    const link = e.target.tagName === 'A' ? e.target : e.target.closest('a');
                                    const href = link.getAttribute('href');
                                    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                                      window.parent.open(href, '_blank');
                                    }
                                  }
                                }, true);
                              });
                            </script>
                            </head>`
                          )
                        }
              title="Email Preview"
              className="w-full h-full border-0"
                        sandbox="allow-same-origin allow-scripts allow-popups allow-top-navigation"
                        style={{
                          width: "100%",
                          height: "100%"
                        }}
            />
          </div>
        </div>
      </div>
              )}
              </div>
              
            {/* Error and Success Messages */}
              {saveError && (
              <div className="p-3 bg-red-100 text-red-700 rounded-md dark:bg-red-900/30 dark:text-red-400">
                  {saveError}
                </div>
              )}
              
              {saveSuccess && (
              <div className="p-3 bg-green-100 text-green-700 rounded-md dark:bg-green-900/30 dark:text-green-400">
                  Draft saved successfully!
                </div>
              )}
      
            {/* Show Code Assistant toggle button */}
            <div className="flex justify-center">
              <button
                onClick={() => setIsCodeAssistantVisible(!isCodeAssistantVisible)}
                className="px-4 py-2 border rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center"
              >
                <span className="mr-2">{isCodeAssistantVisible ? "Hide Code Assistant" : "Show Code Assistant"}</span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-5 w-5 transition-transform ${isCodeAssistantVisible ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            
            {/* Show Code Assistant when visible, regardless of fullscreen states */}
            {isCodeAssistantVisible && (
              <div className="border rounded-lg overflow-hidden">
                <CodeAssistant 
                  code={code} 
                  onChange={handleCodeChange}
                  isDarkMode={isDarkMode}
                  editorRef={editorRef}
                />
              </div>
            )}
      </div>
          
          {/* Command Palette (Modal) */}
          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
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

          {/* Navigation Buttons */}
          <div className="mt-8 flex justify-end space-x-4">
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

          {/* Version History Modal */}
          {isVersionHistoryOpen && emailId && (
            <VersionHistory
              emailId={emailId}
              onLoadVersion={handleLoadVersionFromHistory}
              onClose={() => setIsVersionHistoryOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
} 