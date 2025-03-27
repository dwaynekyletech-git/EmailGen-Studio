import { NextRequest, NextResponse } from 'next/server';
import { Message, generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { messages, code } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Create a system message that provides context about the assistant's role
    // and includes the current code if provided
    const systemMessage: Message = {
      id: 'system',
      role: 'system',
      content: `You are an expert HTML email developer assistant that helps users write, improve, and debug HTML email templates. 
      
      Provide clear, concise guidance on:
      - Email client compatibility 
      - Responsive design best practices
      - Accessibility improvements
      - Code structure and optimization
      - HTML/CSS techniques specific to email development
      
      ${code ? `Here is the current HTML code the user is working with:
      \`\`\`html
      ${code}
      \`\`\`
      Refer to this code when relevant to the user's questions.` : ''}
      
      Keep your responses professional, helpful, and tailored to email development.
      
      When providing code examples or snippets:
      1. Always wrap HTML code in triple backticks with the 'html' language identifier: \`\`\`html
      2. Always wrap CSS code in triple backticks with the 'css' language identifier: \`\`\`css
      3. Ensure code snippets are properly indented and formatted
      4. Include comments explaining key parts of the code
      5. For complex changes, break down the explanation into steps before showing the code
      
      Example format for code snippets:
      Here's an example of a responsive email container:
      
      \`\`\`html
      <!-- Main container with max-width -->
      <div style="max-width: 600px; margin: 0 auto;">
        <!-- Content here -->
      </div>
      \`\`\`
      `
    };

    // Combine system message with user messages
    const allMessages = [systemMessage, ...messages];

    // Generate the response text using AI SDK
    const { text, reasoning } = await generateText({
      model: anthropic('claude-3-7-sonnet-20250219'),
      messages: allMessages,
      temperature: 0.7,
      maxTokens: 1500,
    });

    return NextResponse.json({
      text,
      reasoning: reasoning || null
    });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
} 