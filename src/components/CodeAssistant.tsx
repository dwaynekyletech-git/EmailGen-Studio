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
    contextValidation?: string;
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
    contextValidation?: string;
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
  contextValidation?: string;
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
    
    // Log what we're doing for debugging
    console.log('APPLY - ORIGINAL CODE:', mod.originalCode);
    console.log('APPLY - NEW CODE:', mod.newCode);
    
    // Extract the original and new code lines
    const originalLines = mod.originalCode.split('\n');
    const newLines = mod.newCode.split('\n');
    
    // Get the current code lines
    const currentLines = codeRef.current.split('\n');
    
    // Create a map of trimmed original lines for faster lookups
    const originalLineMap = new Map();
    originalLines.forEach((line, index) => {
      originalLineMap.set(line.trim(), index);
    });
    
    // Find only the new lines (those that don't exist in original code)
    const trulyNewLines = newLines.filter(line => !originalLineMap.has(line.trim()));
    
    // Check if this is a single line change with column info
    if (mod.startCol !== undefined && mod.endCol !== undefined && mod.startLine === mod.endLine) {
      // Handle single line modifications - typically more targeted changes to a specific part of a line
      const lineIndex = mod.startLine - 1;
      
      // Get the current line from the editor
      const currentLine = currentLines[lineIndex]; 
      
      // If the original line in the mod matches (approximately) the current line in the editor
      // Then we can apply the change directly to that line
      // Otherwise, we'll insert the new line as is
      if (currentLine && currentLine.trim() === originalLines[0].trim()) {
        // For single line replacements, the new code is the whole line
        currentLines[lineIndex] = newLines[0];
      } else {
        // If the current line doesn't match the expected original line,
        // just insert the new line right after the current line
        currentLines.splice(lineIndex + 1, 0, ...trulyNewLines);
      }
    } else {
      // This is a multi-line code change
      
      // First, let's find the existing lines in the affected region
      const affectedRegion = currentLines.slice(mod.startLine - 1, mod.endLine);
      
      // Keep track of which original lines are already present in the current code
      const existingOriginalLines = new Set();
      
      for (const line of affectedRegion) {
        if (originalLineMap.has(line.trim())) {
          existingOriginalLines.add(line.trim());
        }
      }
      
      // Prepare combined content for the updated region
      // Start with the original lines that should remain (red lines)
      let updatedRegionLines = originalLines.filter(line => 
        existingOriginalLines.has(line.trim())
      );
      
      // Add the truly new lines (green lines)
      updatedRegionLines = [...updatedRegionLines, ...trulyNewLines];
      
      // Replace the affected region with our new combined content
      if (updatedRegionLines.length > 0) {
        // Replace the existing content in the region with our new combined content
        currentLines.splice(
          mod.startLine - 1, 
          mod.endLine - mod.startLine + 1, 
          ...updatedRegionLines
        );
      }
    }
    
    // Join the lines back together and update the code
    const newCode = currentLines.join('\n');
    onChange(newCode);
    
    // Mark this modification as applied
    setModifications(mods => 
      mods.map(m => m.id === modificationId ? { ...m, applied: true } : m)
    );
    
    // Add a message to the chat about the applied change
    const assistantMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: `I've applied the new code: ${mod.description}`,
      timestamp: new Date(),
      changeDetails: {
        modificationId: modificationId,
        description: mod.description,
        originalCode: mod.originalCode,
        newCode: mod.newCode,
        startLine: mod.startLine,
        endLine: mod.endLine,
        startCol: mod.startCol,
        endCol: mod.endCol,
        contextValidation: mod.contextValidation
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
    
    // Prepare a unified code view with highlighted changes for changeDetails
    const prepareUnifiedCodeView = (originalCode: string, newCode: string) => {
      // These are the code lines before and after the change
      const oldCodeLines = originalCode.split('\n');
      const newCodeLines = newCode.split('\n');
      
      // Create a unified view with proper highlighting
      return newCodeLines.map((line, idx) => {
        if (line.trim() === '') {
          // Handle empty lines
          return line;
        }
        
        // Check if this line exists in the original code
        // First do an exact match check
        if (oldCodeLines.some(oldLine => oldLine === line)) {
          return `<span class="text-red-600 dark:text-red-400">${escapeHtml(line)}</span>`;
        }
        
        // If not an exact match, check for lines that are very similar (e.g. minor attribute changes)
        for (const oldLine of oldCodeLines) {
          // Skip empty lines
          if (oldLine.trim() === '') continue;
          
          // If lines are substantially similar (e.g. same tag structure but different attributes)
          // Check if both lines contain opening tags of the same type
          const oldTagMatch = oldLine.match(/<([a-z0-9]+)[\s>]/i);
          const newTagMatch = line.match(/<([a-z0-9]+)[\s>]/i);
          
          if (oldTagMatch && newTagMatch && oldTagMatch[1] === newTagMatch[1]) {
            // Split the line into segments for more granular highlighting
            // This approach allows us to highlight just the changed parts within a similar line
            const changes = analyzeLineChanges(oldLine, line);
            return changes;
          }
        }
          
        // If no match found, it's truly new content
        return `<span class="text-green-600 dark:text-green-400">${escapeHtml(line)}</span>`;
      }).join('\n');
    };
    
    // Helper to analyze changes between two similar lines
    const analyzeLineChanges = (oldLine: string, newLine: string): string => {
      // A simple approach: Break lines into chunks and compare
      // In a real implementation, you might want a more sophisticated diff algorithm
      
      // If one line is significantly longer than the other, just treat it as modified
      if (Math.abs(oldLine.length - newLine.length) > oldLine.length * 0.5) {
        return `<span class="text-green-600 dark:text-green-400">${escapeHtml(newLine)}</span>`;
      }
      
      // A simple approach for HTML lines: split by attribute boundaries
      const oldParts = oldLine.split(/\s+(?=[a-z\-]+=)/i);
      const newParts = newLine.split(/\s+(?=[a-z\-]+=)/i);
      
      let result = '';
      
      // Handle the tag name part (first segment)
      if (oldParts[0] === newParts[0]) {
        result += `<span class="text-red-600 dark:text-red-400">${escapeHtml(newParts[0])}</span>`;
      } else {
        result += `<span class="text-green-600 dark:text-green-400">${escapeHtml(newParts[0])}</span>`;
      }
      
      // Process the rest (attributes)
      for (let i = 1; i < newParts.length; i++) {
        const newPart = newParts[i];
        
        // Check if this attribute exists in old line
        const exactMatch = oldParts.includes(newPart);
        
        if (exactMatch) {
          // Existing attribute, unchanged
          result += ` <span class="text-red-600 dark:text-red-400">${escapeHtml(newPart)}</span>`;
        } else {
          // New or modified attribute
          result += ` <span class="text-green-600 dark:text-green-400">${escapeHtml(newPart)}</span>`;
        }
      }
      
      return result;
    };
    
    // Helper to escape HTML for safe rendering
    const escapeHtml = (str: string): string => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };
    
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
        // Reapply should behave like apply: add only the new/modified ("green") lines
        const details = message.revertedChangeDetails; // Use reverted details
        console.log('REAPPLY (Apply Green) - ORIGINAL CODE:', details.originalCode);
        console.log('REAPPLY (Apply Green) - NEW CODE:', details.newCode);

        const originalLines = details.originalCode.split('\n');
        const newLines = details.newCode.split('\n');
        const originalLinesSet = new Set(originalLines.map(line => line.trim()));

        // Get the current code lines from the editor
        const currentCode = codeRef.current;
        const currentLines = currentCode.split('\n');
        const startLine = details.startLine;
        
        // Find the lines from newCode that are NOT in originalCode (the "green" lines)
        const trulyNewLines = newLines.filter(line => !originalLinesSet.has(line.trim()));

        // Determine the correct insertion point. 
        // We need to find where the original block (or what's left of it) currently starts.
        // This is simpler if we assume the revert action only removed lines, and didn't shift context.
        // The startLine from details should still be valid for insertion.
        
        // Insert *only* the truly new lines at the original start position
        // Note: This assumes the surrounding context hasn't drastically changed.
        // More robust implementation might involve context searching.
        if (trulyNewLines.length > 0) {
             // Insert the new lines at the specified start line
            currentLines.splice(startLine - 1, 0, ...trulyNewLines);
        }
        
        // Join the lines back together and update the code
        const reappliedCode = currentLines.join('\n');
        onChange(reappliedCode);
        console.log("Reapplied only new code successfully");
        
        // Create the message confirming the reapply action (now like an apply action)
        const reapplyMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: `I've reapplied the new code: ${details.description}`,
          timestamp: new Date(),
          changeDetails: { // Use changeDetails, as it's now effectively an applied change
            modificationId: details.modificationId,
            description: details.description,
            originalCode: details.originalCode,
            newCode: details.newCode,
            startLine: details.startLine,
            endLine: details.endLine,
            startCol: details.startCol,
            endCol: details.endCol
          }
        };
        
        // Replace the current "reverted" message with the new "applied" message
        setMessages((prev: Message[]) => {
          const filteredMessages = prev.filter(m => m.id !== message.id);
          return [...filteredMessages, reapplyMessage];
        });
        
        setIsExpanded(false);
      } catch (error) {
        console.error("Error reapplying new code:", error);
        alert("Failed to reapply the new code. Please check the console for details.");
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
        // For reverting, we want to remove only the added/modified ("green") lines
        console.log('REVERT (Delete Green) - ORIGINAL CODE:', message.changeDetails.originalCode);
        console.log('REVERT (Delete Green) - NEW CODE (contains green):', message.changeDetails.newCode);
        
        const originalCodeLines = message.changeDetails.originalCode.split('\n');
        const newCodeLines = message.changeDetails.newCode.split('\n');
        const originalCodeSet = new Set(originalCodeLines.map(line => line.trim())); // Trim for comparison
        
        const currentCode = codeRef.current;
        const lines = currentCode.split('\n');
        const startLine = message.changeDetails.startLine;
        const numNewLines = newCodeLines.length; // The number of lines in the applied change
        const endLineIndex = startLine - 1 + numNewLines; // Zero-based index for splice end

        // Get the section of current code corresponding to the applied change
        const affectedLines = lines.slice(startLine - 1, endLineIndex);

        // Filter affected lines, keeping only those that were part of the original code
        const linesToKeep = affectedLines.filter(line => originalCodeSet.has(line.trim()));
        
        // Replace the affected section with the filtered lines (removing the green ones)
        lines.splice(startLine - 1, numNewLines, ...linesToKeep);
        
        // Join the lines back into a single string
        const revertedCode = lines.join('\n');
        
        // Apply the change to the editor
        onChange(revertedCode);
        console.log("Removed newly added code successfully");
        
        // Create the revert message
        const revertMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: `I've removed the newly added code from: ${message.changeDetails.description}`,
          timestamp: new Date(),
          // Keep revertedChangeDetails to allow reapply if needed
          revertedChangeDetails: {
            modificationId: message.changeDetails.modificationId,
            description: message.changeDetails.description,
            originalCode: message.changeDetails.originalCode, // Store the original
            newCode: message.changeDetails.newCode, // Store what was applied
            startLine: message.changeDetails.startLine,
            // Adjust end line based on lines kept? No, keep original for context
            endLine: message.changeDetails.endLine, 
            startCol: message.changeDetails.startCol,
            endCol: message.changeDetails.endCol
          }
        };
        
        // Replace the current message with the revert message
        setMessages((prev: Message[]) => {
          const filteredMessages = prev.filter(m => m.id !== message.id);
          return [...filteredMessages, revertMessage];
        });
        
        setIsExpanded(false);
      } catch (error) {
        console.error("Error removing added code:", error);
        alert("Failed to remove the added code. Please check the console for details.");
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
              
              <div className="bg-zinc-50 dark:bg-zinc-900 rounded p-3">
                <div className="text-xs text-zinc-800 dark:text-zinc-300 mb-1">
                  <span>Modified Code (Lines {message.changeDetails.startLine}-{message.changeDetails.endLine}):</span>
                  <div className="flex items-center mt-1 space-x-4 text-2xs">
                    <div className="flex items-center">
                      <span className="inline-block w-3 h-3 mr-1 bg-red-500 rounded-sm"></span>
                      <span>Existing code</span>
                    </div>
                    <div className="flex items-center">
                      <span className="inline-block w-3 h-3 mr-1 bg-green-500 rounded-sm"></span>
                      <span>New or modified code</span>
                    </div>
                  </div>
                </div>
                <pre className="text-sm w-full overflow-x-auto whitespace-pre-wrap">
                  <code 
                    className="block max-w-full" 
                    dangerouslySetInnerHTML={{ 
                      __html: prepareUnifiedCodeView(
                        message.changeDetails.originalCode, 
                        message.changeDetails.newCode
                      ) 
                    }}
                  ></code>
                </pre>
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
              
              <div className="bg-zinc-50 dark:bg-zinc-900 rounded p-3">
                <div className="text-xs text-zinc-800 dark:text-zinc-300 mb-1">
                  <span>Original Code That Could Be Reapplied (Lines {message.revertedChangeDetails.startLine}-{message.revertedChangeDetails.endLine}):</span>
                  <div className="flex items-center mt-1 space-x-4 text-2xs">
                    <div className="flex items-center">
                      <span className="inline-block w-3 h-3 mr-1 bg-red-500 rounded-sm"></span>
                      <span>Existing code</span>
                    </div>
                    <div className="flex items-center">
                      <span className="inline-block w-3 h-3 mr-1 bg-green-500 rounded-sm"></span>
                      <span>New or modified code</span>
                    </div>
                  </div>
                </div>
                <pre className="text-sm w-full overflow-x-auto whitespace-pre-wrap">
                  <code 
                    className="block max-w-full" 
                    dangerouslySetInnerHTML={{ 
                      __html: prepareUnifiedCodeView(
                        message.revertedChangeDetails.originalCode, 
                        message.revertedChangeDetails.newCode
                      ) 
                    }}
                  ></code>
                </pre>
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
    // Prepare a unified code view with highlighted changes
    const prepareUnifiedCodeView = () => {
      // These are the code lines before and after the change
      const oldCodeLines = mod.originalCode.split('\n');
      const newCodeLines = mod.newCode.split('\n');
      
      // Create a unified view with proper highlighting
      return newCodeLines.map((line, idx) => {
        if (line.trim() === '') {
          // Handle empty lines
          return line;
        }
        
        // Check if this line exists in the original code
        // First do an exact match check
        if (oldCodeLines.some(oldLine => oldLine === line)) {
          return `<span class="text-red-600 dark:text-red-400">${escapeHtml(line)}</span>`;
        }
        
        // If not an exact match, check for lines that are very similar (e.g. minor attribute changes)
        for (const oldLine of oldCodeLines) {
          // Skip empty lines
          if (oldLine.trim() === '') continue;
          
          // If lines are substantially similar (e.g. same tag structure but different attributes)
          // Check if both lines contain opening tags of the same type
          const oldTagMatch = oldLine.match(/<([a-z0-9]+)[\s>]/i);
          const newTagMatch = line.match(/<([a-z0-9]+)[\s>]/i);
          
          if (oldTagMatch && newTagMatch && oldTagMatch[1] === newTagMatch[1]) {
            // Split the line into segments for more granular highlighting
            // This approach allows us to highlight just the changed parts within a similar line
            const changes = analyzeLineChanges(oldLine, line);
            return changes;
          }
        }
          
        // If no match found, it's truly new content
        return `<span class="text-green-600 dark:text-green-400">${escapeHtml(line)}</span>`;
      }).join('\n');
    };
    
    // Helper to analyze changes between two similar lines
    const analyzeLineChanges = (oldLine: string, newLine: string): string => {
      // A simple approach: Break lines into chunks and compare
      // In a real implementation, you might want a more sophisticated diff algorithm
      
      // If one line is significantly longer than the other, just treat it as modified
      if (Math.abs(oldLine.length - newLine.length) > oldLine.length * 0.5) {
        return `<span class="text-green-600 dark:text-green-400">${escapeHtml(newLine)}</span>`;
      }
      
      // A simple approach for HTML lines: split by attribute boundaries
      const oldParts = oldLine.split(/\s+(?=[a-z\-]+=)/i);
      const newParts = newLine.split(/\s+(?=[a-z\-]+=)/i);
      
      let result = '';
      
      // Handle the tag name part (first segment)
      if (oldParts[0] === newParts[0]) {
        result += `<span class="text-red-600 dark:text-red-400">${escapeHtml(newParts[0])}</span>`;
      } else {
        result += `<span class="text-green-600 dark:text-green-400">${escapeHtml(newParts[0])}</span>`;
      }
      
      // Process the rest (attributes)
      for (let i = 1; i < newParts.length; i++) {
        const newPart = newParts[i];
        
        // Check if this attribute exists in old line
        const exactMatch = oldParts.includes(newPart);
        
        if (exactMatch) {
          // Existing attribute, unchanged
          result += ` <span class="text-red-600 dark:text-red-400">${escapeHtml(newPart)}</span>`;
        } else {
          // New or modified attribute
          result += ` <span class="text-green-600 dark:text-green-400">${escapeHtml(newPart)}</span>`;
        }
      }
      
      return result;
    };
    
    // Helper to escape HTML for safe rendering
    const escapeHtml = (str: string): string => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

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
                title="Apply only the green highlighted code"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Apply New Code
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
        <div>
          <div className="bg-zinc-50 dark:bg-zinc-900 rounded p-3">
            <div className="text-xs text-zinc-800 dark:text-zinc-300 mb-1">
              <span>Modified Code (Lines {mod.startLine}-{mod.endLine}):</span>
              <div className="flex items-center mt-1 space-x-4 text-2xs">
                <div className="flex items-center">
                  <span className="inline-block w-3 h-3 mr-1 bg-red-500 rounded-sm"></span>
                  <span>Existing code</span>
                </div>
                <div className="flex items-center">
                  <span className="inline-block w-3 h-3 mr-1 bg-green-500 rounded-sm"></span>
                  <span>New code to apply</span>
                </div>
              </div>
            </div>
            <pre className="text-sm w-full overflow-x-auto whitespace-pre-wrap">
              <code className="block max-w-full" dangerouslySetInnerHTML={{ __html: prepareUnifiedCodeView() }}></code>
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