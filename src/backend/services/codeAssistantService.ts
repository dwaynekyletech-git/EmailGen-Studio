import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Types for code suggestions
export interface CodeSuggestion {
  id: string;
  title: string;
  description: string;
  code?: string;
  lineNumber?: number;
  type: 'improvement' | 'error' | 'warning' | 'info';
}

// Types for chat messages
export type MessageRole = 'user' | 'assistant' | 'system' | 'error';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

/**
 * Service to analyze HTML code and provide suggestions using AI
 */
export class CodeAssistantService {
  private anthropic: Anthropic;
  private gemini: GoogleGenerativeAI;
  private preferredModel: 'anthropic' | 'gemini';

  constructor(
    anthropicApiKey: string,
    geminiApiKey: string,
    preferredModel: 'anthropic' | 'gemini' = 'anthropic'
  ) {
    this.anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    });
    
    this.gemini = new GoogleGenerativeAI(geminiApiKey);
    this.preferredModel = preferredModel;
  }

  /**
   * Analyzes HTML code and provides suggestions
   * @param htmlCode The HTML code to analyze
   */
  public async analyzeSuggestions(htmlCode: string): Promise<CodeSuggestion[]> {
    try {
      console.log('Analyzing HTML code for suggestions');
      
      const prompt = `
You are an expert email HTML code assistant. Analyze the following HTML code for an email template and identify potential issues, improvements, or suggestions:

${htmlCode}

Please provide a JSON array of suggestions, with each suggestion having the following structure:
{
  "id": "unique-id",
  "title": "Brief title of the suggestion",
  "description": "Detailed explanation of the issue or suggestion",
  "code": "Corrected or example code snippet (if applicable)",
  "lineNumber": line number where the issue occurs (if applicable),
  "type": "one of: improvement, error, warning, info"
}

Focus on email-specific issues such as:
1. Missing DOCTYPE declarations
2. Missing viewport meta tags for responsiveness
3. Problematic CSS that may not work in email clients (like float, position:absolute, etc.)
4. Non-accessibility compliant elements (missing alt text, poor contrast, etc.)
5. Tables layout issues
6. Email client compatibility concerns
7. Missing responsive design elements

Return ONLY a valid JSON array without any explanations, markdown formatting, or code blocks.
`;

      if (this.preferredModel === 'anthropic') {
        return await this.getAnthropicSuggestions(prompt);
      } else {
        return await this.getGeminiSuggestions(prompt);
      }
    } catch (error) {
      console.error('Error analyzing HTML:', error);
      throw new Error(`Failed to analyze HTML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get chat response from AI assistant
   * @param htmlCode Current HTML code 
   * @param userMessage User's message
   * @param chatHistory Previous chat history
   */
  public async getChatResponse(
    htmlCode: string,
    userMessage: string,
    chatHistory: Message[] = []
  ): Promise<string> {
    try {
      console.log('Getting chat response');
      
      // Format chat history for the AI
      const formattedHistory = chatHistory.map(msg => {
        return {
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        };
      });
      
      const systemPrompt = `
You are an expert email HTML code assistant specifically designed to help developers create and improve HTML email templates.
You have expertise in:
- Email HTML best practices
- Cross-client compatibility 
- Responsive email design
- Accessibility standards for email
- HTML email debugging
- Salesforce Marketing Cloud specifics

The user is working on the following HTML code:

${htmlCode}

Provide helpful, concise answers to their questions or assist with code modifications.
When suggesting code changes, explain why they're needed and provide specific snippets that can be applied.
Focus on email-specific concerns rather than general web development advice.
`;

      if (this.preferredModel === 'anthropic') {
        return await this.getAnthropicChatResponse(systemPrompt, userMessage, formattedHistory);
      } else {
        return await this.getGeminiChatResponse(systemPrompt, userMessage, formattedHistory);
      }
    } catch (error) {
      console.error('Error getting chat response:', error);
      throw new Error(`Failed to get chat response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute a specific command on HTML code
   * @param htmlCode Current HTML code
   * @param command Command to execute (format, minify, etc.)
   */
  public async executeCommand(
    htmlCode: string,
    command: string
  ): Promise<{ result: string; message: string }> {
    try {
      console.log(`Executing command: ${command}`);
      
      const prompt = `
You are an expert email HTML code assistant. I need you to ${command} the following HTML code:

${htmlCode}

Please provide only the processed HTML code with no explanations, markdown formatting, or code blocks.
Additional instructions based on the command:
${command === 'format' ? '- Add appropriate indentation and line breaks for readability' : ''}
${command === 'minify' ? '- Remove all unnecessary whitespace, comments, and line breaks' : ''}
${command === 'validate' ? '- Return the SAME code, but create a JSON report of any validation issues' : ''}
${command === 'add-header' ? '- Insert a professional email header component at the appropriate location' : ''}
${command === 'add-footer' ? '- Insert a professional email footer with unsubscribe link at the appropriate location' : ''}
${command === 'add-button' ? '- Insert an email-compatible button component at an appropriate location' : ''}
`;

      let result: string;
      let message: string;

      if (this.preferredModel === 'anthropic') {
        const response = await this.anthropic.messages.create({
          model: "claude-3-haiku-20240307",
          max_tokens: 4000,
          temperature: 0.2,
          system: "You are an expert email developer assistant.",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ]
        });
        
        result = response.content[0].text;
        message = `Command "${command}" executed successfully`;
      } else {
        // Use Gemini model
        const model = this.gemini.getGenerativeModel({
          model: "gemini-1.5-flash",
          safetySettings: [
            {
              category: HarmCategory.HARM_CATEGORY_HARASSMENT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            }
          ],
        });
        
        const genResponse = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        
        result = genResponse.response.text();
        message = `Command "${command}" executed successfully`;
      }
      
      return { result, message };
    } catch (error) {
      console.error(`Error executing command ${command}:`, error);
      throw new Error(`Failed to execute command: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get suggestions using Anthropic's Claude
   */
  private async getAnthropicSuggestions(prompt: string): Promise<CodeSuggestion[]> {
    try {
      const response = await this.anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 4000,
        temperature: 0.2,
        system: "You are an expert email HTML code assistant.",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });
      
      const content = response.content[0].text;
      
      // Parse the JSON array from the response
      try {
        const suggestions = JSON.parse(content) as CodeSuggestion[];
        return suggestions;
      } catch (parseError) {
        console.error('Failed to parse suggestions JSON:', parseError);
        return [];
      }
    } catch (error) {
      console.error('Error getting suggestions from Anthropic:', error);
      return [];
    }
  }
  
  /**
   * Get suggestions using Google's Gemini
   */
  private async getGeminiSuggestions(prompt: string): Promise<CodeSuggestion[]> {
    try {
      const model = this.gemini.getGenerativeModel({
        model: "gemini-1.5-flash",
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          }
        ],
      });
      
      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      
      const content = response.response.text();
      
      // Parse the JSON array from the response
      try {
        const suggestions = JSON.parse(content) as CodeSuggestion[];
        return suggestions;
      } catch (parseError) {
        console.error('Failed to parse suggestions JSON:', parseError);
        return [];
      }
    } catch (error) {
      console.error('Error getting suggestions from Gemini:', error);
      return [];
    }
  }
  
  /**
   * Get chat response using Anthropic's Claude
   */
  private async getAnthropicChatResponse(
    systemPrompt: string, 
    userMessage: string, 
    chatHistory: { role: string; content: string }[]
  ): Promise<string> {
    try {
      // Prepare messages for the API
      const messages = [
        ...chatHistory.map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        })),
        {
          role: "user" as const,
          content: userMessage
        }
      ];
      
      const response = await this.anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 4000,
        temperature: 0.7,
        system: systemPrompt,
        messages
      });
      
      return response.content[0].text;
    } catch (error) {
      console.error('Error getting chat response from Anthropic:', error);
      throw new Error('Failed to get response from Anthropic');
    }
  }
  
  /**
   * Get chat response using Google's Gemini
   */
  private async getGeminiChatResponse(
    systemPrompt: string, 
    userMessage: string, 
    chatHistory: { role: string; content: string }[]
  ): Promise<string> {
    try {
      const model = this.gemini.getGenerativeModel({
        model: "gemini-1.5-flash",
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          }
        ],
      });
      
      // Initialize chat
      const chat = model.startChat();
      
      // Add system prompt first
      await chat.sendMessage(systemPrompt);
      
      // Add chat history
      for (const msg of chatHistory) {
        await chat.sendMessage(msg.content);
      }
      
      // Send the current user message and get response
      const result = await chat.sendMessage(userMessage);
      const response = result.response;
      
      return response.text();
    } catch (error) {
      console.error('Error getting chat response from Gemini:', error);
      throw new Error('Failed to get response from Gemini');
    }
  }
}

/**
 * Factory function to create the Code Assistant service
 */
export function createCodeAssistantService(preferredModel: 'anthropic' | 'gemini' = 'anthropic'): CodeAssistantService {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';
  const geminiApiKey = process.env.GEMINI_API_KEY || '';
  
  if (!anthropicApiKey && !geminiApiKey) {
    console.warn('Neither ANTHROPIC_API_KEY nor GEMINI_API_KEY is set. Code assistant will not work properly.');
  } else if (!anthropicApiKey && preferredModel === 'anthropic') {
    console.warn('ANTHROPIC_API_KEY is not set but preferred model is Anthropic. Falling back to Gemini.');
    return new CodeAssistantService(anthropicApiKey, geminiApiKey, 'gemini');
  } else if (!geminiApiKey && preferredModel === 'gemini') {
    console.warn('GEMINI_API_KEY is not set but preferred model is Gemini. Falling back to Anthropic.');
    return new CodeAssistantService(anthropicApiKey, geminiApiKey, 'anthropic');
  }
  
  return new CodeAssistantService(anthropicApiKey, geminiApiKey, preferredModel);
}

// Default export
export default createCodeAssistantService; 