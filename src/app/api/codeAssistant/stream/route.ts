import { NextRequest } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * POST handler for streaming responses
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = getAuth(request);
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Get data from request
    const body = await request.json();
    const { htmlCode, userMessage, chatHistory, aiModel = 'anthropic' } = body;
    
    if (!htmlCode || !userMessage) {
      return new Response('Missing required parameters', { status: 400 });
    }

    // Create readable stream
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Handle message logging to database
    const messageId = uuidv4();
    const timestamp = new Date().toISOString();
    let fullResponse = '';

    // Save user message to database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await supabase.from('chat_messages').insert({
      id: uuidv4(),
      user_id: userId,
      html_code: htmlCode,
      role: 'user',
      content: userMessage,
      ai_model: aiModel,
      created_at: timestamp
    });

    // Process based on preferred AI model
    if (aiModel === 'anthropic') {
      // Stream with Anthropic
      streamWithAnthropic(
        htmlCode, 
        userMessage, 
        chatHistory || [], 
        writer, 
        encoder,
        (chunk) => { fullResponse += chunk; }
      );
    } else {
      // Stream with Gemini
      streamWithGemini(
        htmlCode, 
        userMessage, 
        chatHistory || [], 
        writer, 
        encoder,
        (chunk) => { fullResponse += chunk; }
      );
    }

    // Save the completed response after streaming finishes
    writer.closed.then(async () => {
      try {
        await supabase.from('chat_messages').insert({
          id: messageId,
          user_id: userId,
          html_code: htmlCode,
          role: 'assistant',
          content: fullResponse,
          ai_model: aiModel,
          created_at: timestamp
        });
        console.log('Saved complete message to database');
      } catch (error) {
        console.error('Error saving complete message to database:', error);
      }
    });

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('Error streaming response:', error);
    return new Response(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
}

/**
 * Stream response with Anthropic's Claude
 */
async function streamWithAnthropic(
  htmlCode: string,
  userMessage: string,
  chatHistory: any[],
  writer: WritableStreamDefaultWriter,
  encoder: TextEncoder,
  onChunk: (chunk: string) => void
) {
  try {
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not set');
    }

    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    });

    // Format chat history for Anthropic
    const formattedHistory = chatHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content
    }));

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

    const messages = [
      ...formattedHistory,
      {
        role: 'user' as const,
        content: userMessage
      }
    ];

    const stream = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 4000,
      temperature: 0.7,
      system: systemPrompt,
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.text) {
        const text = chunk.delta.text;
        onChunk(text);
        await writer.write(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
      }
    }

    await writer.write(encoder.encode('data: [DONE]\n\n'));
    await writer.close();
  } catch (error) {
    console.error('Error streaming with Anthropic:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await writer.write(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
    await writer.close();
  }
}

/**
 * Stream response with Google's Gemini
 */
async function streamWithGemini(
  htmlCode: string,
  userMessage: string,
  chatHistory: any[],
  writer: WritableStreamDefaultWriter,
  encoder: TextEncoder,
  onChunk: (chunk: string) => void
) {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY || '';
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not set');
    }

    const gemini = new GoogleGenerativeAI(geminiApiKey);
    const model = gemini.getGenerativeModel({
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
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4000,
      }
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

    // Initialize chat and gather history
    const chat = model.startChat();
    
    // Send system prompt
    await chat.sendMessage(systemPrompt);
    
    // Add chat history
    for (const msg of chatHistory) {
      await chat.sendMessage(msg.content);
    }
    
    // Stream the response using generateContentStream
    const streamResult = await model.generateContentStream(userMessage);
    
    for await (const chunk of streamResult.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        onChunk(chunkText);
        await writer.write(encoder.encode(`data: ${JSON.stringify({ text: chunkText })}\n\n`));
      }
    }

    await writer.write(encoder.encode('data: [DONE]\n\n'));
    await writer.close();
  } catch (error) {
    console.error('Error streaming with Gemini:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await writer.write(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
    await writer.close();
  }
} 