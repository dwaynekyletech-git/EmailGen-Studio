import React, { useState, useEffect } from 'react';

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
  const [activeTool, setActiveTool] = useState<'chat' | 'suggestions'>('chat');
  const messagesEndRef = { current: null as HTMLDivElement | null };

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Mock function to analyze code and generate suggestions
  // In a real implementation, this would call the AI service
  useEffect(() => {
    if (code) {
      // Generate demo suggestions based on the code
      const demoSuggestions: CodeSuggestion[] = [];
      
      // Check for common HTML email issues
      if (!code.includes('doctype') && !code.includes('DOCTYPE')) {
        demoSuggestions.push({
          id: '1',
          title: 'Missing DOCTYPE declaration',
          description: 'Add a DOCTYPE declaration to ensure proper rendering across email clients.',
          code: '<!DOCTYPE html>',
          lineNumber: 1,
          type: 'error'
        });
      }
      
      if (!code.includes('meta') || !code.includes('viewport')) {
        demoSuggestions.push({
          id: '2',
          title: 'Missing viewport meta tag',
          description: 'Add a viewport meta tag for better responsive behavior.',
          code: '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
          type: 'warning'
        });
      }
      
      if (code.includes('float')) {
        demoSuggestions.push({
          id: '3',
          title: 'Avoid using float in email templates',
          description: 'Float properties are not consistently supported across email clients. Consider using tables for layout instead.',
          type: 'warning'
        });
      }
      
      setSuggestions(demoSuggestions);
    }
  }, [code]);

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: newMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setLoading(true);
    
    try {
      // In a real implementation, this would call the AI service via API
      // For now, we'll simulate a response
      setTimeout(() => {
        const demoResponses: Record<string, string> = {
          'default': "I've analyzed your code. Would you like me to help you with HTML email best practices, responsive design, or something else?",
          'help': "I can help you with HTML email development, including responsive design, inline CSS, and client compatibility. What would you like assistance with?",
          'fix': "I've identified some improvements for your email template. Would you like me to implement them for you?",
          'responsive': "To make your email responsive, we should add a viewport meta tag and use media queries. Would you like me to add these to your code?"
        };
        
        // Determine which response to use based on the message content
        let responseText = demoResponses.default;
        const lowerCaseMessage = newMessage.toLowerCase();
        
        if (lowerCaseMessage.includes('help')) {
          responseText = demoResponses.help;
        } else if (lowerCaseMessage.includes('fix') || lowerCaseMessage.includes('improve')) {
          responseText = demoResponses.fix;
        } else if (lowerCaseMessage.includes('responsive')) {
          responseText = demoResponses.responsive;
        }
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseText,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        setLoading(false);
      }, 1500);
    } catch (error) {
      // Handle errors
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'error',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setLoading(false);
    }
  };

  // Apply a suggestion to the code
  const applySuggestion = (suggestion: CodeSuggestion) => {
    if (suggestion.code && onChange) {
      // In a real implementation, this would intelligently modify the code
      // For now, we'll just append the suggestion to the top of the code for demo purposes
      const newCode = suggestion.code + '\n' + code;
      onChange(newCode);
      
      // Remove the suggestion from the list
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      
      // Add a message to the chat about the applied suggestion
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I've applied the suggestion: ${suggestion.title}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    }
  };

  // Render message based on its role
  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    const isError = message.role === 'error';
    
    return (
      <div 
        key={message.id} 
        className={`mb-4 ${isUser ? 'text-right' : 'text-left'}`}
      >
        <div 
          className={`inline-block rounded-lg px-4 py-2 max-w-[80%] ${
            isUser 
              ? 'bg-blue-600 text-white' 
              : isError 
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
          }`}
        >
          {message.content}
        </div>
        <div className="text-xs text-zinc-500 mt-1">
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
            onClick={() => setActiveTool('suggestions')}
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">No suggestions at the moment</p>
                <p className="text-xs text-zinc-500">Your code looks good! The assistant will provide suggestions when it detects potential improvements.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeAssistant; 