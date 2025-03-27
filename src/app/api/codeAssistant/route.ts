import { NextRequest, NextResponse } from 'next/server';
import { createCodeAssistantService } from '@/backend/services/codeAssistantService';
import { getAuth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Handle GET request - Get code suggestions
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get params from request
    const searchParams = request.nextUrl.searchParams;
    const htmlCode = searchParams.get('html');
    const aiModel = searchParams.get('model') as 'anthropic' | 'gemini' || 'anthropic';
    
    if (!htmlCode) {
      return NextResponse.json({ error: 'Missing HTML code parameter' }, { status: 400 });
    }

    // Initialize code assistant service
    const codeAssistant = createCodeAssistantService(aiModel);
    
    // Get suggestions
    const suggestions = await codeAssistant.analyzeSuggestions(htmlCode);
    
    // Save to database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await supabase.from('code_analysis_results').insert({
      id: uuidv4(),
      user_id: userId,
      html_code: htmlCode,
      suggestions: suggestions,
      ai_model: aiModel,
      created_at: new Date().toISOString()
    });
    
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error analyzing code:', error);
    return NextResponse.json(
      { error: `Failed to analyze code: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

/**
 * Handle POST request - Get chat response or execute command
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get data from request
    const body = await request.json();
    const { htmlCode, userMessage, chatHistory, command, aiModel = 'anthropic' } = body;
    
    if (!htmlCode) {
      return NextResponse.json({ error: 'Missing HTML code parameter' }, { status: 400 });
    }

    // Initialize code assistant service
    const codeAssistant = createCodeAssistantService(aiModel);
    
    if (command) {
      // Execute a specific command (format, minify, etc.)
      const result = await codeAssistant.executeCommand(htmlCode, command);
      
      // Save to database
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase.from('code_command_results').insert({
        id: uuidv4(),
        user_id: userId,
        html_code: htmlCode,
        command: command,
        result: result.result,
        ai_model: aiModel,
        created_at: new Date().toISOString()
      });
      
      return NextResponse.json(result);
    } else if (userMessage) {
      // Get chat response
      const response = await codeAssistant.getChatResponse(htmlCode, userMessage, chatHistory || []);
      
      // Create message object
      const message = {
        id: uuidv4(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      
      // Save to database
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase.from('chat_messages').insert({
        id: message.id,
        user_id: userId,
        html_code: htmlCode,
        role: 'assistant',
        content: response,
        ai_model: aiModel,
        created_at: new Date().toISOString()
      });
      
      // Also save user message if provided
      if (userMessage) {
        await supabase.from('chat_messages').insert({
          id: uuidv4(),
          user_id: userId,
          html_code: htmlCode,
          role: 'user',
          content: userMessage,
          ai_model: aiModel,
          created_at: new Date().toISOString()
        });
      }
      
      return NextResponse.json({ message });
    }
    
    return NextResponse.json({ error: 'Missing either userMessage or command parameter' }, { status: 400 });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: `Failed to process request: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 