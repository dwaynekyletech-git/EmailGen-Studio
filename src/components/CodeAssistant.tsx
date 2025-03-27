import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface CodeAssistantProps {
  code: string;
  onChange?: (newCode: string) => void;
  isDarkMode?: boolean;
}

// Types for chat messages
type MessageRole = 'user' | 'assistant' | 'system' | 'error';

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

// Types for code suggestions
interface CodeSuggestion {
  id: string;
  title: string;
  description: string;
  code?: string;
  lineNumber?: number;
  type: 'improvement' | 'error' | 'warning' | 'info';
}

interface MessagePart {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

// Helper function to detect and format code blocks
const formatMessageContent = (content: string): MessagePart[] => {
  const parts: MessagePart[] = [];
  let lastIndex = 0;
  
  // Updated regex to capture the language identifier
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block if any
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex, match.index)
      });
    }

    // Add code block with language if specified
    parts.push({
      type: 'code',
      content: match[2].trim(),
      language: match[1] || undefined
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text if any
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.slice(lastIndex)
    });
  }

  return parts;
};

interface CodeBlockProps {
  code: string;
  language?: string;
  onChange?: (newCode: string) => void;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, onChange }) => {
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const applyCode = () => {
    if (onChange) {
      onChange(code);
      setApplied(true);
      setTimeout(() => setApplied(false), 2000);
    }
  };

  return (
    <div className="relative group rounded-md bg-zinc-50 dark:bg-zinc-900 p-4 my-2">
      <pre className="overflow-x-auto">
        <code className={language ? `language-${language}` : ''}>
          {code}
        </code>
      </pre>
      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={copyToClipboard}
          className="p-2 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
          title="Copy code"
        >
          {copied ? (
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
        {onChange && (
          <button
            onClick={applyCode}
            className="p-2 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
            title="Apply code to editor"
          >
            {applied ? (
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

const CodeAssistant: React.FC<CodeAssistantProps> = ({ 
  code, 
  onChange,
  isDarkMode = false 
}) => {
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your email code assistant. How can I help you improve your HTML email template?',
      timestamp: new Date()
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [suggestions, setSuggestions] = useState<CodeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzingCode, setAnalyzingCode] = useState(false);
  const [activeTool, setActiveTool] = useState<'chat' | 'suggestions'>('chat');
  const messagesEndRef = { current: null as HTMLDivElement | null };
  const codeRef = { current: code };
  const [messagesInitialized, setMessagesInitialized] = useState(false);

  // Scroll to bottom of chat only when new messages are added after initialization
  useEffect(() => {
    // Skip the initial render to prevent scrolling on page load
    if (!messagesInitialized) {
      setMessagesInitialized(true);
      return;
    }
    
    // Only scroll when messages actually change after the initial load
    if (messagesEndRef.current && messages.length > 1) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, messagesInitialized]);

  // Update codeRef when code changes
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  // Analyze code function - now only called when user clicks on Suggestions
  const analyzeCode = async () => {
    if (!code || analyzingCode) return;
    
    setAnalyzingCode(true);
    
    try {
      const response = await fetch('/api/code-assistant/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Failed to analyze code:', error);
    } finally {
      setAnalyzingCode(false);
    }
  };

  // Handle clicking on the Suggestions button
  const handleSuggestionsClick = () => {
    setActiveTool('suggestions');
    // Only analyze code if we haven't already and aren't currently analyzing
    if (suggestions.length === 0 && !analyzingCode) {
      analyzeCode();
    }
  };

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    // Add user message to chat
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: newMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setLoading(true);
    
    try {
      // Call the chat API endpoint
      const apiMessages = messages
        .filter(m => m.role !== 'system' && m.role !== 'error')
        .map(m => ({
          id: m.id,
          role: m.role,
          content: m.content
        }));
      
      // Add the new user message
      apiMessages.push({
        id: userMessage.id,
        role: userMessage.role,
        content: userMessage.content
      });
      
      const response = await fetch('/api/code-assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          code: codeRef.current, // Use the current code value from ref
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Add assistant message to chat
        const assistantMessage: Message = {
        id: uuidv4(),
          role: 'assistant',
        content: data.text,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message to chat
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'error',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Apply a suggestion to the code
  const applySuggestion = (suggestion: CodeSuggestion) => {
    if (suggestion.code && onChange) {
      // Get the current code lines
      const currentLines = codeRef.current.split('\n');
      
      if (suggestion.lineNumber && suggestion.lineNumber > 0) {
        // If we have a specific line number, we'll try to intelligently modify that section
        const lineIndex = suggestion.lineNumber - 1;
        
        // Check if this is a tag replacement or addition
        if (suggestion.type === 'error' || suggestion.type === 'warning') {
          // For errors/warnings, we might be replacing problematic code
          // Look for matching opening/closing tags or similar patterns
          const targetLine = currentLines[lineIndex];
          const tagMatch = targetLine.match(/<(\w+)[^>]*>/);
          
          if (tagMatch) {
            // If we found a tag, look for its closing tag
            const openTag = tagMatch[1];
            const closeTagRegex = new RegExp(`</\s*${openTag}\s*>`);
            let endLineIndex = lineIndex;
            
            // Look for the closing tag in subsequent lines
            for (let i = lineIndex + 1; i < currentLines.length; i++) {
              if (closeTagRegex.test(currentLines[i])) {
                endLineIndex = i;
                break;
              }
            }
            
            // Replace the entire section with the new code
            currentLines.splice(lineIndex, endLineIndex - lineIndex + 1, ...suggestion.code.split('\n'));
          } else {
            // If no tag found, just replace the single line
            currentLines[lineIndex] = suggestion.code;
          }
        } else {
          // For improvements or info, insert the code at the specified line
          currentLines.splice(lineIndex, 0, ...suggestion.code.split('\n'));
        }
      } else {
        // If no line number specified, try to find the appropriate section to modify
        const suggestionLines = suggestion.code.split('\n');
        const firstSuggestionLine = suggestionLines[0].trim();
        
        // Try to find a matching section in the code
        let insertIndex = -1;
        
        if (firstSuggestionLine.startsWith('<!DOCTYPE')) {
          // DOCTYPE should always be at the start
          insertIndex = 0;
        } else if (firstSuggestionLine.startsWith('<meta')) {
          // Meta tags go in the head
          const headStartIndex = currentLines.findIndex(line => line.includes('<head'));
          if (headStartIndex !== -1) {
            insertIndex = headStartIndex + 1;
          }
        } else if (firstSuggestionLine.startsWith('<style')) {
          // Style tags typically go at the end of head
          const headEndIndex = currentLines.findIndex(line => line.includes('</head'));
          if (headEndIndex !== -1) {
            insertIndex = headEndIndex;
          }
        } else if (firstSuggestionLine.startsWith('<body') || firstSuggestionLine.includes('</body>')) {
          // Body tag modifications
          const bodyIndex = currentLines.findIndex(line => line.includes('<body'));
          if (bodyIndex !== -1) {
            insertIndex = bodyIndex;
          }
        }
        
        if (insertIndex !== -1) {
          // Insert or replace at the found position
          currentLines.splice(insertIndex, 0, ...suggestionLines);
        } else {
          // If we couldn't find a good spot, append to the end of the body
          const bodyEndIndex = currentLines.findIndex(line => line.includes('</body>'));
          if (bodyEndIndex !== -1) {
            currentLines.splice(bodyEndIndex, 0, ...suggestionLines);
          } else {
            // If no body tag found, just append to the end
            currentLines.push(...suggestionLines);
          }
        }
      }
      
      // Join the lines back together and update the code
      const newCode = currentLines.join('\n');
      onChange(newCode);
      
      // Remove the suggestion from the list
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      
      // Add a message to the chat about the applied suggestion
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `I've applied the suggestion: ${suggestion.title}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    }
  };

  // Render message based on its role
  const renderMessage = (message: Message) => {
    const parts = formatMessageContent(message.content);
    
    return (
      <div 
        key={message.id} 
        className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} mb-4`}
      >
        <div 
          className={`max-w-[80%] rounded-lg p-4 ${
            message.role === 'user'
              ? 'bg-blue-500 text-white'
              : 'bg-zinc-100 dark:bg-zinc-800'
          }`}
        >
          {parts.map((part, index) => {
            if (part.type === 'code') {
              return (
                <CodeBlock
                  key={index}
                  code={part.content}
                  language={part.language}
                  onChange={onChange}
                />
              );
            }
            return <span key={index}>{part.content}</span>;
          })}
        </div>
        <div className="text-xs text-zinc-500 mt-1 px-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    );
  };

  return (
    <div className={`border rounded-lg overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
      <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 border-b flex justify-between items-center">
        <h2 className="font-medium">Code Assistant</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTool('chat')}
            className={`px-2 py-1 text-xs rounded ${
              activeTool === 'chat' 
                ? "bg-zinc-300 dark:bg-zinc-600 font-medium" 
                : "bg-zinc-200 dark:bg-zinc-700"
            }`}
          >
            Chat
          </button>
          <button
            onClick={handleSuggestionsClick}
            className={`px-2 py-1 text-xs rounded ${
              activeTool === 'suggestions' 
                ? "bg-zinc-300 dark:bg-zinc-600 font-medium" 
                : "bg-zinc-200 dark:bg-zinc-700"
            }`}
          >
            Suggestions {suggestions.length > 0 && `(${suggestions.length})`}
          </button>
        </div>
      </div>
      
      <div className="h-[400px] flex flex-col">
        {activeTool === 'chat' ? (
          <>
            <div className="flex-grow overflow-y-auto p-4">
              {messages.map(message => renderMessage(message))}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="p-2 border-t">
              <div className="flex items-center">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask for help or suggestions..."
                  className="flex-grow px-3 py-2 border rounded-l-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-zinc-800 dark:border-zinc-700"
                  disabled={loading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={loading || !newMessage.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : 'Send'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-grow overflow-y-auto p-4">
            {suggestions.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-end mb-2">
                  <button 
                    onClick={analyzeCode}
                    disabled={analyzingCode}
                    className="flex items-center px-2 py-1 text-xs bg-zinc-200 dark:bg-zinc-700 rounded hover:bg-zinc-300 dark:hover:bg-zinc-600"
                  >
                    {analyzingCode ? (
                      <>
                        <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh Suggestions
                      </>
                    )}
                  </button>
                </div>
                {suggestions.map(suggestion => (
                  <div 
                    key={suggestion.id} 
                    className="border p-3 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-start">
                      <div 
                        className={`mr-3 p-1 rounded-full ${
                          suggestion.type === 'error' 
                            ? 'bg-red-100 text-red-600' 
                            : suggestion.type === 'warning' 
                              ? 'bg-yellow-100 text-yellow-600' 
                              : suggestion.type === 'improvement' 
                                ? 'bg-green-100 text-green-600' 
                                : 'bg-blue-100 text-blue-600'
                        }`}
                      >
                        {suggestion.type === 'error' && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        )}
                        {suggestion.type === 'warning' && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        )}
                        {suggestion.type === 'improvement' && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        )}
                        {suggestion.type === 'info' && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-medium text-sm">{suggestion.title}</h3>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{suggestion.description}</p>
                        {suggestion.code && (
                          <pre className="mt-2 text-xs bg-zinc-100 dark:bg-zinc-900 p-2 rounded overflow-x-auto">
                            <code>{suggestion.code}</code>
                          </pre>
                        )}
                        {suggestion.lineNumber && (
                          <p className="text-xs text-zinc-500 mt-1">Line: {suggestion.lineNumber}</p>
                        )}
                      </div>
                    </div>
                    {suggestion.code && onChange && (
                      <button 
                        onClick={() => applySuggestion(suggestion)}
                        className="mt-2 px-2 py-1 text-xs bg-zinc-200 dark:bg-zinc-700 rounded hover:bg-zinc-300 dark:hover:bg-zinc-600 float-right"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                {analyzingCode ? (
                  <>
                    <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-zinc-600 dark:text-zinc-400">Analyzing your code...</p>
                  </>
                ) : (
                  <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                    <p className="mt-2 text-zinc-600 dark:text-zinc-400">No suggestions available</p>
                    <p className="text-xs text-zinc-500 mb-4">Click the button below to analyze your code for potential improvements.</p>
                    <button 
                      onClick={analyzeCode}
                      disabled={analyzingCode}
                      className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {analyzingCode ? 'Analyzing...' : 'Analyze Code'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeAssistant; 