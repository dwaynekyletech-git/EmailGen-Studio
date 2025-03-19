import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createGeminiConversionService } from '@/backend/services/geminiConversionService';
import { getAuth } from '@clerk/nextjs/server';

// Initialize the conversion service
const conversionService = createGeminiConversionService();

/**
 * POST handler for the /api/convertEmail route
 * Accepts a file upload and converts it to HTML using the GeminiConversionService
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = getAuth({ request });
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to use this feature.' }, 
        { status: 401 }
      );
    }
    
    // Generate a unique conversion ID
    const conversionId = uuidv4();
    
    // Parse the form data from the request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' }, 
        { status: 400 }
      );
    }
    
    // Validate file type
    const validTypes = ['.png', '.jpg', '.jpeg', '.psd', '.xd', '.fig'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(fileExt)) {
      return NextResponse.json(
        { error: `Invalid file type. Supported types: ${validTypes.join(', ')}` }, 
        { status: 400 }
      );
    }
    
    // Upload the file to Supabase (simulated for this example)
    // In a real implementation, this would save to Supabase storage
    const filePath = `temp/${userId}/${conversionId}${fileExt}`;
    
    // Convert the file to an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // For this example, we'll just use the file directly from memory
    // In a real implementation, you would upload to Supabase first
    
    // Convert the design to HTML using the service
    const result = await conversionService.convertDesignToHtml(
      filePath, 
      file.name
    );
    
    // Add user ID to metadata
    result.metadata = {
      ...result.metadata,
      userId,
      conversionId
    };
    
    // Return the HTML and metadata
    return NextResponse.json({
      success: true,
      html: result.html,
      metadata: result.metadata,
      conversionId
    });
    
  } catch (error) {
    console.error('Error converting email:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to convert email' }, 
      { status: 500 }
    );
  }
} 