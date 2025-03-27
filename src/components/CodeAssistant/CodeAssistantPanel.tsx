'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogHeader,
  DialogFooter,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CodeSuggestion, Message } from '@/backend/services/codeAssistantService';
import { v4 as uuidv4 } from 'uuid';
import { Loader2, Code, MessageSquare, Play, Settings } from 'lucide-react';

interface CodeAssistantPanelProps {
  htmlCode: string;
  onHtmlChange?: (newHtml: string) => void;
}

export function CodeAssistantPanel({ htmlCode, onHtmlChange }: CodeAssistantPanelProps) {
  // State for chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiModel, setAiModel] = useState<'anthropic' | 'gemini'>('anthropic');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // State for code suggestions
  const [suggestions, setSuggestions] = useState<CodeSuggestion[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  
  // State for commands
  const [commandResult, setCommandResult] = useState<string | null>(null);
  const [isCommandLoading, setIsCommandLoading] = useState(false);
  
  // Scroll to bottom of chat on new messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Function to get code suggestions
  const getCodeSuggestions = async () => {
    try {
      setIsSuggestionsLoading(true);
      
      // URL encode the HTML for GET request
      const encodedHtml = encodeURIComponent(htmlCode);
      
      const response = await fetch(`/api/codeAssistant?html=${encodedHtml}&model=${aiModel}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      setSuggestions(data.suggestions);
      
    } catch (error) {
      console.error('Error getting code suggestions:', error);
      setSuggestions([{
        id: 'error',
        title: 'Error loading suggestions',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        type: 'error'
      }]);
    } finally {
      setIsSuggestionsLoading(false);
    }
  };

  // Function to send chat message
  const sendMessage = async () => {
    if (!messageInput.trim() || isLoading) return;
    
    try {
      setIsLoading(true);
      
      // Add user message to chat
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: messageInput,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      setMessageInput('');
      
      // Set up event source for streaming response
      const eventSource = new EventSource(
        `/api/codeAssistant/stream`,
        { withCredentials: true }
      );
      
      // Prepare request payload
      const payload = {
        htmlCode,
        userMessage: userMessage.content,
        chatHistory: messages,
        aiModel
      };
      
      // Send the initial request to start streaming
      const response = await fetch('/api/codeAssistant/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      // Create a placeholder for the streaming response
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Use the reader to process the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('Response body is null');
      }
      
      let done = false;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        
        if (value) {
          const text = decoder.decode(value);
          const lines = text.split('\n\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                done = true;
                break;
              }
              
              try {
                const { text } = JSON.parse(data);
                
                if (text) {
                  // Update the assistant message with new content
                  setMessages(prev => 
                    prev.map(msg => 
                      msg.id === assistantMessage.id 
                        ? { ...msg, content: msg.content + text } 
                        : msg
                    )
                  );
                }
              } catch (e) {
                console.error('Error parsing streaming data:', e);
              }
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message to chat
      setMessages(prev => [
        ...prev,
        {
          id: uuidv4(),
          role: 'error',
          content: `Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to execute a code command
  const executeCommand = async (command: string) => {
    try {
      setIsCommandLoading(true);
      
      const response = await fetch('/api/codeAssistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          htmlCode,
          command,
          aiModel
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      setCommandResult(data.result);
      
      // If we have a result and an onHtmlChange callback, use it
      if (data.result && onHtmlChange && 
          (command === 'format' || command === 'minify' || 
           command === 'add-header' || command === 'add-footer' || 
           command === 'add-button')) {
        onHtmlChange(data.result);
      }
      
    } catch (error) {
      console.error(`Error executing command ${command}:`, error);
      setCommandResult(`Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
    } finally {
      setIsCommandLoading(false);
    }
  };

  // Function to apply a code suggestion
  const applySuggestion = (suggestion: CodeSuggestion) => {
    if (suggestion.code && onHtmlChange) {
      // This is a simplified implementation
      // In a real app, you'd need to properly determine where to insert the code
      // based on the suggestion's lineNumber and context
      onHtmlChange(suggestion.code);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Code size={16} />
          <span>Code Assistant</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Email Code Assistant</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="chat" className="w-full h-full">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare size={16} />
              <span>Chat</span>
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex items-center gap-2" onClick={getCodeSuggestions}>
              <Code size={16} />
              <span>Code Suggestions</span>
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex items-center gap-2">
              <Play size={16} />
              <span>Tools</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Chat Tab */}
          <TabsContent value="chat" className="h-[calc(100%-48px)] flex flex-col">
            <div className="flex items-center justify-end mb-2 gap-2">
              <Select value={aiModel} onValueChange={(value) => setAiModel(value as 'anthropic' | 'gemini')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select AI Model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="anthropic">Claude (Anthropic)</SelectItem>
                    <SelectItem value="gemini">Gemini (Google)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            
            <ScrollArea className="flex-1 border rounded-md p-4" ref={scrollAreaRef}>
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground p-4">
                  <p>Ask questions about your email HTML code.</p>
                  <p className="text-sm">Example: "How can I improve accessibility of this email?"</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] px-4 py-2 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : message.role === 'error'
                            ? 'bg-destructive text-destructive-foreground'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        <pre className="whitespace-pre-wrap break-words">
                          {message.content}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            
            <div className="flex gap-2 mt-4">
              <Textarea 
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Ask about your email code..."
                className="flex-1 resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <Button onClick={sendMessage} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
              </Button>
            </div>
          </TabsContent>
          
          {/* Suggestions Tab */}
          <TabsContent value="suggestions" className="h-[calc(100%-48px)] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <Button 
                variant="outline" 
                onClick={getCodeSuggestions} 
                disabled={isSuggestionsLoading}
                className="flex items-center gap-2"
              >
                {isSuggestionsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Code size={16} />
                )}
                <span>Analyze Code</span>
              </Button>
              
              <Select value={aiModel} onValueChange={(value) => setAiModel(value as 'anthropic' | 'gemini')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select AI Model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="anthropic">Claude (Anthropic)</SelectItem>
                    <SelectItem value="gemini">Gemini (Google)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            
            <ScrollArea className="flex-1 border rounded-md">
              {isSuggestionsLoading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : suggestions.length === 0 ? (
                <div className="text-center text-muted-foreground p-8">
                  <p>No suggestions yet. Click "Analyze Code" to get started.</p>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {suggestions.map((suggestion) => (
                    <Card key={suggestion.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-base">{suggestion.title}</CardTitle>
                          <Badge
                            variant={
                              suggestion.type === 'error'
                                ? 'destructive'
                                : suggestion.type === 'warning'
                                ? 'default'
                                : suggestion.type === 'improvement'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {suggestion.type}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm mb-2">{suggestion.description}</p>
                        {suggestion.code && (
                          <div className="mt-2">
                            <pre className="bg-muted p-2 rounded-md text-xs overflow-x-auto">
                              {suggestion.code}
                            </pre>
                            {onHtmlChange && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => applySuggestion(suggestion)}
                              >
                                Apply Change
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          {/* Tools Tab */}
          <TabsContent value="tools" className="h-[calc(100%-48px)] flex flex-col">
            <div className="grid grid-cols-3 gap-2 mb-4">
              <Button
                variant="outline"
                onClick={() => executeCommand('format')}
                disabled={isCommandLoading}
              >
                Format HTML
              </Button>
              <Button
                variant="outline"
                onClick={() => executeCommand('minify')}
                disabled={isCommandLoading}
              >
                Minify HTML
              </Button>
              <Button
                variant="outline"
                onClick={() => executeCommand('validate')}
                disabled={isCommandLoading}
              >
                Validate Email
              </Button>
              <Button
                variant="outline"
                onClick={() => executeCommand('add-header')}
                disabled={isCommandLoading}
              >
                Add Header
              </Button>
              <Button
                variant="outline"
                onClick={() => executeCommand('add-footer')}
                disabled={isCommandLoading}
              >
                Add Footer
              </Button>
              <Button
                variant="outline"
                onClick={() => executeCommand('add-button')}
                disabled={isCommandLoading}
              >
                Add Button
              </Button>
            </div>
            
            <div className="relative flex-1 border rounded-md">
              {isCommandLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
              
              <ScrollArea className="h-full p-4">
                {commandResult ? (
                  <pre className="whitespace-pre-wrap break-words text-sm">
                    {commandResult}
                  </pre>
                ) : (
                  <div className="text-center text-muted-foreground p-8">
                    <p>Select a command to execute on your email HTML code.</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex items-center">
          <div className="flex items-center gap-2">
            <Settings size={16} />
            <span className="text-xs text-muted-foreground">
              Using {aiModel === 'anthropic' ? 'Claude (Anthropic)' : 'Gemini (Google)'} AI
            </span>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 