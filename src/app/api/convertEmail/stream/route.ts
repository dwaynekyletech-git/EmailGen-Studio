import { NextRequest } from 'next/server';
import supabase from '@/backend/config/supabaseConfig';
import { getAuth } from '@clerk/nextjs/server';
import { createGeminiConversionService } from '@/backend/services/geminiConversionService';

export const runtime = 'edge';

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
    const validTypes = ['.png', '.jpg', '.jpeg'];
    const fileType = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(fileType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file type. Supported types: PNG, JPG' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Add warning for non-image files
    if (['.psd', '.xd', '.fig'].includes(fileType)) {
      console.warn(`Warning: ${fileType} files may have limited compatibility with Gemini's vision model. Attempting conversion anyway.`);
    }
    
    // Upload file to Supabase Storage
    const buffer = await file.arrayBuffer();
    const fileName = `${Date.now()}_${file.name}`;
    
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