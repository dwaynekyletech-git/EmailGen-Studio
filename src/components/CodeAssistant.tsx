import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface CodeAssistantProps {
  code: string;
  onChange?: (newCode: string) => void;
  isDarkMode?: boolean;
  editorRef?: { current: { editor: any } };
}

// Types for chat messages
type MessageRole = 'user' | 'assistant' | 'system' | 'error';

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  changeDetails?: {
    modificationId: string;
    description: string;
    originalCode: string;
    newCode: string;
    startLine: number;
    endLine: number;
    startCol?: number;
    endCol?: number;
  };
  revertedChangeDetails?: {
    modificationId: string;
    description: string;
    originalCode: string;
    newCode: string;
    startLine: number;
    endLine: number;
    startCol?: number;
    endCol?: number;
  };
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

interface CodeModification {
  id: string;
  description: string;
  originalCode: string;
  newCode: string;
  startLine: number;
  endLine: number;
  startCol?: number;
  endCol?: number;
  applied: boolean;
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
  
  // Check for example indicators in the text
  const lowerContent = content.toLowerCase();
  const hasExampleIndicator = (text: string): boolean => {
    const examplePhrases = [
      'example',
      'for example',
      'here\'s an example',
      'example of',
      'as an example',
      'just an example',
      'this is an example',
      'not for direct application',
      'for illustration'
    ];
    
    return examplePhrases.some(phrase => text.toLowerCase().includes(phrase));
  };
  
  // Updated regex to capture the language identifier
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block if any
    if (match.index > lastIndex) {
      const textBeforeBlock = content.slice(lastIndex, match.index);
      parts.push({
        type: 'text',
        content: textBeforeBlock
      });
      
      // Check if this code block is likely an example
      const isExample = hasExampleIndicator(textBeforeBlock) || 
                        (match.index > 50 && hasExampleIndicator(content.slice(Math.max(0, match.index - 50), match.index)));
      
      // Add code block with language if specified
      parts.push({
        type: 'code',
        content: match[2].trim(),
        language: isExample ? 'example' : (match[1] || undefined)
      });
    } else {
      // Just add the code block
      parts.push({
        type: 'code',
        content: match[2].trim(),
        language: match[1] || undefined
      });
    }

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

// Helper function to detect if the message appears to be asking a question
const containsQuestion = (content: string): boolean => {
  // Check for question marks
  if (content.includes('?')) return true;
  
  // Check for common question phrases
  const questionPhrases = [
    'could you',
    'can you',
    'would you',
    'please clarify',
    'please provide',
    'please explain',
    'can I ask',
    'tell me',
    'I need to know',
    'I need more information',
    'I need clarification'
  ];
  
  const lowerContent = content.toLowerCase();
  return questionPhrases.some(phrase => lowerContent.includes(phrase));
};

interface CodeBlockProps {
  code: string;
  language?: string;
  onChange?: (newCode: string) => void;
  isExample?: boolean; // Flag to identify example code that shouldn't be applied
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, onChange, isExample = false }) => {
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
    <div className={`relative group rounded-md ${isExample ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-zinc-50 dark:bg-zinc-900'} p-4 my-2`}>
      {isExample && (
        <div className="text-xs text-amber-600 dark:text-amber-400 mb-2 font-medium">
          Example Code (Not for direct application)
        </div>
      )}
      <pre className="w-full overflow-x-auto whitespace-pre-wrap">
        <code className={`block max-w-full ${language ? `language-${language}` : ''}`}>
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
        {onChange && !isExample && (
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
  isDarkMode = false,
  editorRef
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
  const [modifications, setModifications] = useState<CodeModification[]>([]);
  const [loading, setLoading] = useState(false);
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

  // Function to analyze code and make specific changes
  const analyzeCodeAndMakeChanges = async (userRequest: string) => {
    if (!code) return;
    
    setLoading(true);
    
    try {
      // Call the API endpoint with the current code and user request
      const response = await fetch('/api/code-assistant/analyze-and-modify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code,
          request: userRequest
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.modifications && Array.isArray(data.modifications)) {
        // Update the modifications state with unique IDs
        setModifications(data.modifications.map((mod: any) => ({
          ...mod,
          id: uuidv4(),
          applied: false
        })));
        
        // Add assistant message to chat explaining the changes
        const assistantMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: data.response || "I've analyzed your code and found areas to modify. Would you like me to apply these changes?",
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // If no modifications, just respond with the analysis
        const assistantMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: data.response || "I've analyzed your code but couldn't determine specific changes to make. Could you be more specific about what you'd like to modify?",
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Failed to analyze and modify code:', error);
      
      // Add error message to chat
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'error',
        content: 'Sorry, I encountered an error analyzing your code. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Apply a specific modification to the code
  const applyModification = (modificationId: string) => {
    const mod = modifications.find(m => m.id === modificationId);
    if (!mod || !onChange) return;
    
    // Get the current code lines
    const currentLines = codeRef.current.split('\n');
    
    // Make the modification
    const updatedLines = [...currentLines];
    
    // Replace the content between start and end lines
    const oldContent = updatedLines.slice(mod.startLine - 1, mod.endLine).join('\n');
    
    // If the modification has column info, use that for more precise replacement
    if (mod.startCol !== undefined && mod.endCol !== undefined && mod.startLine === mod.endLine) {
      // This is a single line modification with column info
      const line = updatedLines[mod.startLine - 1];
      const newLine = line.substring(0, mod.startCol) + mod.newCode + line.substring(mod.endCol);
      updatedLines[mod.startLine - 1] = newLine;
    } else {
      // Replace whole lines
      updatedLines.splice(mod.startLine - 1, mod.endLine - mod.startLine + 1, ...mod.newCode.split('\n'));
    }
    
    // Join the lines back together and update the code
    const newCode = updatedLines.join('\n');
    onChange(newCode);
    
    // Mark this modification as applied
    setModifications(mods => 
      mods.map(m => m.id === modificationId ? { ...m, applied: true } : m)
    );
    
    // Add a message to the chat about the applied change
    const assistantMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: `I've applied the change: ${mod.description}`,
      timestamp: new Date(),
      changeDetails: {
        modificationId: modificationId,
        description: mod.description,
        originalCode: mod.originalCode,
        newCode: mod.newCode,
        startLine: mod.startLine,
        endLine: mod.endLine,
        startCol: mod.startCol,
        endCol: mod.endCol
      }
    };
    
    setMessages(prev => [...prev, assistantMessage]);
  };

  // Reject a modification
  const rejectModification = (modificationId: string) => {
    // Remove the modification from the list
    setModifications(mods => mods.filter(m => m.id !== modificationId));
    
    // Add a message to the chat about rejecting the change
    const assistantMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: "I've discarded that change. Is there anything else you'd like me to help with?",
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, assistantMessage]);
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
    
    const userRequest = newMessage.trim();
    setNewMessage('');
    setLoading(true);
    
    // Check if the message is asking to change the code
    const changeCodeRegex = /change|modify|update|replace|add|remove|delete|fix|implement|create|generate|edit|adjust|insert|set|convert|transform/i;
    
    // Also check for assistant responses suggesting changes
    const responseHasChangeIntent = messages.length > 0 && 
                                   messages[messages.length - 1].role === 'assistant' &&
                                   (messages[messages.length - 1].content.includes("Would you like me to make this change") ||
                                    messages[messages.length - 1].content.includes("I can modify the code") ||
                                    messages[messages.length - 1].content.includes("I can implement this")) &&
                                   /yes|yeah|sure|okay|ok|please|go ahead/i.test(userRequest);
    
    if (changeCodeRegex.test(userRequest) || responseHasChangeIntent) {
      // This looks like a code modification request
      await analyzeCodeAndMakeChanges(userRequest);
    } else {
      // Proceed with regular chat
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
    }
  };

  // Render message based on its role
  const MessageComponent: React.FC<{
    message: Message;
    onChange?: (newCode: string) => void;
    modifications: CodeModification[];
    codeRef: { current: string };
    setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  }> = ({ message, onChange, modifications, codeRef, setMessages }) => {
    const parts = formatMessageContent(message.content);
    const [isExpanded, setIsExpanded] = useState(false);
    const hasChangeDetails = message.changeDetails !== undefined;
    const hasRevertedChangeDetails = message.revertedChangeDetails !== undefined;
    const isAskingQuestion = message.role === 'assistant' && containsQuestion(message.content);
    
    const toggleExpand = () => {
      if (hasChangeDetails || hasRevertedChangeDetails) {
        setIsExpanded(!isExpanded);
      }
    };
    
    const reapplyChange = (e: any) => {
      e.stopPropagation(); // Prevent the toggle from happening
      if (!message.revertedChangeDetails || !onChange) {
        console.error("Missing required data to reapply:", { 
          hasRevertedChangeDetails: !!message.revertedChangeDetails, 
          hasOnChange: !!onChange 
        });
        return;
      }
      
      if (!codeRef.current) {
        console.error("Current code reference is empty");
        return;
      }
      
      try {
        // Get the current code lines
        const currentCode = codeRef.current;
        const startLine = message.revertedChangeDetails.startLine - 1; // Convert to 0-based index
        
        // Get the lines of code
        const lines = currentCode.split('\n');
        
        // Calculate how many lines the original code takes up
        const originalLinesCount = message.revertedChangeDetails.originalCode.split('\n').length;
        
        // Create a new array of lines with the new code replacing the original
        const newLines = [
          ...lines.slice(0, startLine),                   // Lines before the change
          ...message.revertedChangeDetails.newCode.split('\n'), // The new code to reapply
          ...lines.slice(startLine + originalLinesCount)  // Lines after the change
        ];
        
        // Join the lines back into a single string
        const reappliedCode = newLines.join('\n');
        
        // Apply the change to the editor
        onChange(reappliedCode);
        console.log("Reapplied change successfully");
        
        // Create the reapply message
        const reapplyMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: `I've reapplied the change: ${message.revertedChangeDetails.description}`,
          timestamp: new Date(),
          changeDetails: {
            modificationId: message.revertedChangeDetails.modificationId,
            description: message.revertedChangeDetails.description,
            originalCode: message.revertedChangeDetails.originalCode,
            newCode: message.revertedChangeDetails.newCode,
            startLine: message.revertedChangeDetails.startLine,
            endLine: message.revertedChangeDetails.endLine,
            startCol: message.revertedChangeDetails.startCol,
            endCol: message.revertedChangeDetails.endCol
          }
        };
        
        // Replace the current message with the reapply message
        setMessages((prev: Message[]) => {
          // Filter out this "reverted" message
          const filteredMessages = prev.filter(m => m.id !== message.id);
          // Add the new reapply message
          return [...filteredMessages, reapplyMessage];
        });
        
        // Close the expanded view since we're removing this message
        setIsExpanded(false);
      } catch (error) {
        console.error("Error reapplying change:", error);
        alert("Failed to reapply the change. Please check the console for details.");
      }
    };
    
    const revertChange = (e: any) => {
      e.stopPropagation(); // Prevent the toggle from happening
      if (!message.changeDetails || !onChange) {
        console.error("Missing required data to revert:", { 
          hasChangeDetails: !!message.changeDetails, 
          hasOnChange: !!onChange 
        });
        return;
      }
      
      if (!codeRef.current) {
        console.error("Current code reference is empty");
        return;
      }
      
      try {
        // We've confirmed onChange works, so now let's implement the actual revert
        const currentCode = codeRef.current;
        const startLine = message.changeDetails.startLine - 1; // Convert to 0-based index
        
        // Get the lines of code
        const lines = currentCode.split('\n');
        
        // For this simple implementation, we'll replace the lines directly
        // Calculate how many lines the modified code takes up
        const modifiedLinesCount = message.changeDetails.newCode.split('\n').length;
        
        // Remove the modified lines and insert the original code lines
        const originalLines = message.changeDetails.originalCode.split('\n');
        
        // Create a new array of lines with the original code replaced
        const newLines = [
          ...lines.slice(0, startLine),                  // Lines before the change
          ...originalLines,                              // The original code
          ...lines.slice(startLine + modifiedLinesCount) // Lines after the change
        ];
        
        // Join the lines back into a single string
        const revertedCode = newLines.join('\n');
        
        // Apply the change to the editor
        onChange(revertedCode);
        console.log("Reverted code applied successfully");
        
        // Create the revert message
        const revertMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: `I've reverted the change: ${message.changeDetails.description}`,
          timestamp: new Date(),
          revertedChangeDetails: {
            modificationId: message.changeDetails.modificationId,
            description: message.changeDetails.description,
            originalCode: message.changeDetails.originalCode,
            newCode: message.changeDetails.newCode,
            startLine: message.changeDetails.startLine,
            endLine: message.changeDetails.endLine,
            startCol: message.changeDetails.startCol,
            endCol: message.changeDetails.endCol
          }
        };
        
        // Replace the current message with the revert message
        setMessages((prev: Message[]) => {
          // Filter out this "applied" message (the one being reverted)
          const filteredMessages = prev.filter(m => m.id !== message.id);
          // Add the new revert message
          return [...filteredMessages, revertMessage];
        });
        
        // Close the expanded view since we're removing this message
        setIsExpanded(false);
      } catch (error) {
        console.error("Error reverting change:", error);
        alert("Failed to revert the change. Please check the console for details.");
      }
    };
    
    return (
      <div 
        className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} mb-4`}
      >
        <div 
          className={`max-w-[80%] rounded-lg p-4 ${
            message.role === 'user'
              ? 'bg-blue-500 text-white'
              : hasChangeDetails 
                ? 'bg-zinc-100 dark:bg-zinc-800 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors border-l-4 border-blue-400'
                : hasRevertedChangeDetails
                  ? 'bg-zinc-100 dark:bg-zinc-800 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors border-l-4 border-orange-400'
                  : isAskingQuestion
                    ? 'bg-zinc-100 dark:bg-zinc-800 border-l-4 border-purple-400'
                    : 'bg-zinc-100 dark:bg-zinc-800'
          }`}
          onClick={toggleExpand}
        >
          {hasChangeDetails && !isExpanded && (
            <div className="flex items-center text-blue-600 text-xs font-medium mb-2">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Click to view change details
            </div>
          )}
          
          {hasRevertedChangeDetails && !isExpanded && (
            <div className="flex items-center text-orange-600 text-xs font-medium mb-2">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Click to view reverted change details
            </div>
          )}
          
          {isAskingQuestion && message.role === 'assistant' && !hasChangeDetails && !hasRevertedChangeDetails && (
            <div className="flex items-center text-purple-600 text-xs font-medium mb-2">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Assistant is asking a question
            </div>
          )}
          
          {parts.map((part, index) => {
            if (part.type === 'code') {
              return (
                <CodeBlock
                  key={index}
                  code={part.content}
                  language={part.language === 'example' ? undefined : part.language}
                  onChange={onChange}
                  isExample={part.language === 'example'}
                />
              );
            }
            return <span key={index}>{part.content}</span>;
          })}
          
          {/* Render change details if this message has them and is expanded */}
          {hasChangeDetails && isExpanded && message.changeDetails && (
            <div className="mt-4 border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs font-medium text-blue-600">Change Details</div>
                <button
                  onClick={(e) => revertChange(e)}
                  className="flex items-center px-2 py-1 rounded text-xs bg-orange-100 text-orange-800 hover:bg-orange-200"
                  title="Revert this change"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Revert Change
                </button>
              </div>
              <div className="flex flex-col space-y-2">
                <div className="bg-red-50 dark:bg-red-900/20 rounded p-3">
                  <div className="text-xs text-red-800 dark:text-red-300 mb-1">
                    Original Code (Lines {message.changeDetails.startLine}-{message.changeDetails.endLine}):
                  </div>
                  <pre className="text-sm w-full overflow-x-auto whitespace-pre-wrap">
                    <code className="block max-w-full">
                      {message.changeDetails.originalCode}
                    </code>
                  </pre>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded p-3">
                  <div className="text-xs text-green-800 dark:text-green-300 mb-1">New Code:</div>
                  <pre className="text-sm w-full overflow-x-auto whitespace-pre-wrap">
                    <code className="block max-w-full">
                      {message.changeDetails.newCode}
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          )}
          
          {/* Render reverted change details if this message has them and is expanded */}
          {hasRevertedChangeDetails && isExpanded && message.revertedChangeDetails && (
            <div className="mt-4 border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs font-medium text-orange-600">Reverted Change Details</div>
                <button
                  onClick={(e) => reapplyChange(e)}
                  className="flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 hover:bg-blue-200"
                  title="Reapply this change"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reapply Change
                </button>
              </div>
              <div className="flex flex-col space-y-2">
                <div className="bg-green-50 dark:bg-green-900/20 rounded p-3">
                  <div className="text-xs text-green-800 dark:text-green-300 mb-1">
                    Original Code (Lines {message.revertedChangeDetails.startLine}-{message.revertedChangeDetails.endLine}):
                  </div>
                  <pre className="text-sm w-full overflow-x-auto whitespace-pre-wrap">
                    <code className="block max-w-full">
                      {message.revertedChangeDetails.originalCode}
                    </code>
                  </pre>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3">
                  <div className="text-xs text-blue-800 dark:text-blue-300 mb-1">Code That Could Be Reapplied:</div>
                  <pre className="text-sm w-full overflow-x-auto whitespace-pre-wrap">
                    <code className="block max-w-full">
                      {message.revertedChangeDetails.newCode}
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="text-xs text-zinc-500 mt-1 px-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    );
  };

  // Render a code modification with accept/reject options
  const renderModification = (mod: CodeModification) => {
    return (
      <div key={mod.id} className="border-l-4 border-blue-500 pl-2 my-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-blue-600 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            {mod.applied ? 'Applied Change' : 'Suggested Change'}
          </div>
          {!mod.applied && (
            <div className="flex space-x-2">
              <button
                onClick={() => applyModification(mod.id)}
                className="flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800 hover:bg-green-200"
                title="Apply this change"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Apply
              </button>
              <button
                onClick={() => rejectModification(mod.id)}
                className="flex items-center px-2 py-1 rounded text-xs bg-red-100 text-red-800 hover:bg-red-200"
                title="Reject this change"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reject
              </button>
            </div>
          )}
        </div>
        <div className="text-sm mb-2">{mod.description}</div>
        <div className="flex flex-col space-y-2">
          <div className="bg-red-50 dark:bg-red-900/20 rounded p-3">
            <div className="text-xs text-red-800 dark:text-red-300 mb-1">Original Code (Lines {mod.startLine}-{mod.endLine}):</div>
            <pre className="text-sm w-full overflow-x-auto whitespace-pre-wrap">
              <code className="block max-w-full">
                {mod.originalCode}
              </code>
            </pre>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded p-3">
            <div className="text-xs text-green-800 dark:text-green-300 mb-1">New Code:</div>
            <pre className="text-sm w-full overflow-x-auto whitespace-pre-wrap">
              <code className="block max-w-full">
                {mod.newCode}
              </code>
            </pre>
          </div>
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
        </div>
      </div>
      
      <div className="h-[400px] flex flex-col">
        <div className="flex-grow overflow-y-auto p-4">
          {messages.map(message => (
            <MessageComponent
              key={message.id}
              message={message}
              onChange={onChange}
              modifications={modifications}
              codeRef={codeRef}
              setMessages={setMessages}
            />
          ))}
          
          {/* Render any pending modifications */}
          {modifications.filter(mod => !mod.applied).length > 0 && (
            <div className="my-4">
              <div className="text-sm font-medium mb-2">Suggested Code Changes:</div>
              {modifications.filter(mod => !mod.applied).map(renderModification)}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-2 border-t">
          <div className="flex items-center">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask for help or suggest changes..."
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
      </div>
    </div>
  );
};

export default CodeAssistant; 