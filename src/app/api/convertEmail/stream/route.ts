import { NextRequest } from 'next/server';
import { createGeminiConversionService } from '@/backend/services/geminiConversionService';
import { getAuth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// Explicitly set Edge runtime
export const runtime = 'edge';

// Initialize Supabase client directly in the route handler
const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(supabaseUrl, supabaseKey);
};

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId: clerkUserId } = getAuth(request);
    
    if (!clerkUserId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Check file type
    const validTypes = ['.pdf'];
    const fileType = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(fileType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file type. Only PDF files are supported.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Convert file to array buffer
    const buffer = await file.arrayBuffer();
    const fileName = `${Date.now()}_${file.name}`;
    
    // Create Supabase client
    const supabase = createSupabaseClient();
    
    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('design-files')
      .upload(fileName, buffer);
      
    if (uploadError) {
      return new Response(
        JSON.stringify({ error: `Failed to upload file: ${uploadError.message}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Initialize the Gemini conversion service
    const geminiConversionService = createGeminiConversionService();
    
    // Get conversion options from the request
    const makeResponsive = formData.get('makeResponsive') !== 'false'; // Default to true
    const optimizeForEmail = formData.get('optimizeForEmail') !== 'false'; // Default to true
    const targetPlatform = (formData.get('targetPlatform') as 'sfmc' | 'generic') || 'sfmc';
    
    // Stream the conversion process
    return geminiConversionService.streamConversion(
      uploadData.path,
      file.name,
      {
        makeResponsive,
        optimizeForEmail,
        targetPlatform
      }
    );
  } catch (error) {
    console.error('Streaming conversion error:', error);
    return new Response(
      JSON.stringify({ 
        error: `Failed to process the file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 