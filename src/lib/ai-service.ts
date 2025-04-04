import Anthropic from '@anthropic-ai/sdk';

// Initialize the Anthropic client
const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Message type
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  id?: string;
}

// Options for text generation
export interface GenerateTextOptions {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  topK?: number;
  topP?: number;
}

// Factory function for Anthropic model strings
export function anthropic(model: string): string {
  return model;
}

/**
 * Generates text using the specified AI model
 */
export async function generateText(options: GenerateTextOptions): Promise<{ text: string; reasoning?: string }> {
  const { model, messages, temperature = 0.5, maxTokens = 1000 } = options;
  
  try {
    // Extract the system message if present
    const systemMessage = messages.find(msg => msg.role === 'system');
    
    // Format messages for Anthropic API (only user and assistant messages)
    const nonSystemMessages = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant', // Type assertion to satisfy Anthropic types
        content: msg.content
      }));
    
    // Call the Anthropic API
    const response = await anthropicClient.messages.create({
      model,
      system: systemMessage?.content || undefined,
      messages: nonSystemMessages,
      max_tokens: maxTokens,
      temperature,
    });
    
    // Return the response text
    return {
      text: response.content.reduce((acc, item) => {
        if (item.type === 'text') {
          return acc + item.text;
        }
        return acc;
      }, ''),
      reasoning: response.usage ? JSON.stringify(response.usage) : undefined
    };
  } catch (error) {
    console.error('Error generating text:', error);
    throw new Error(`Failed to generate text: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 