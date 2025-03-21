import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/backend/config/supabaseConfig';
import { getAuth } from '@clerk/nextjs/server';
import { createGeminiConversionService } from '@/backend/services/geminiConversionService';

export async function POST(request: NextRequest) {
  try {
    // Check authentication using getAuth instead of auth
    const { userId: clerkUserId } = getAuth(request);
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('User authenticated:', clerkUserId);
    
    // Get the user ID from the users table
    let userId = null;
    try {
      let { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('clerk_id', clerkUserId)
        .single();
        
      if (userError) {
        console.error('User fetch error:', userError);
        
        // If the user doesn't exist, create a new user
        if (userError.code === 'PGRST116') {
          // Try to get the user's email from Clerk
          let userEmail = 'unknown@example.com';
          try {
            // This is a placeholder - in a real implementation, you would use Clerk's API to get the user's email
            // const clerkUser = await clerkClient.users.getUser(clerkUserId);
            // userEmail = clerkUser.emailAddresses[0].emailAddress;
          } catch (emailError) {
            console.error('Error getting user email:', emailError);
          }
          
          try {
            const { data: newUser, error: createError } = await supabase
              .from('users')
              .insert([
                {
                  clerk_id: clerkUserId,
                  email: userEmail,
                  role: 'Developer', // Default role
                  created_at: new Date().toISOString()
                }
              ])
              .select();
              
            if (createError) {
              console.error('User creation error:', createError);
              // Continue without user, using a fallback ID
              userId = `temp-user-${clerkUserId}`;
            } else {
              userId = newUser[0].id;
            }
          } catch (createUserError) {
            console.error('Error creating user:', createUserError);
            // Continue without user, using a fallback ID
            userId = `temp-user-${clerkUserId}`;
          }
        } else {
          // Continue without user ID in case of database errors
          console.warn('Using temporary user ID due to database error');
          userId = `temp-user-${clerkUserId}`;
        }
      } else if (userData) {
        userId = userData.id;
      } else {
        // Fallback if userData is null
        userId = `temp-user-${clerkUserId}`;
      }
    } catch (userDbError) {
      console.error('Database connection error:', userDbError);
      // Continue with a temporary user ID
      userId = `temp-user-${clerkUserId}`;
    }
    
    if (!userId) {
      console.warn('No user ID available, using temporary ID');
      userId = `temp-user-${clerkUserId}`;
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    console.log('File received:', file.name, 'Size:', file.size);
    
    // Check file type
    const validTypes = ['.png', '.jpg', '.jpeg'];
    const fileType = '.' + file.name.split('.').pop()?.toLowerCase();
    
    console.log('File type:', fileType);
    
    if (!validTypes.includes(fileType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported types: PNG, JPG' },
        { status: 400 }
      );
    }
    
    // Add warning for non-image files
    if (['.psd', '.xd', '.fig'].includes(fileType)) {
      console.warn(`Warning: ${fileType} files may have limited compatibility with Gemini's vision model. Attempting conversion anyway.`);
    }
    
    // Check Supabase configuration
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
    console.log('Supabase Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');
    
    // Upload file to Supabase Storage
    try {
      const buffer = await file.arrayBuffer();
      const fileName = `${Date.now()}_${file.name}`;
      
      console.log('Uploading file to Supabase:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('design-files')
        .upload(fileName, buffer);
        
      if (uploadError) {
        console.error('Upload error details:', JSON.stringify(uploadError));
        return NextResponse.json(
          { error: `Failed to upload file: ${uploadError.message}` },
          { status: 500 }
        );
      }
      
      console.log('File uploaded successfully:', uploadData);
      
      // Initialize the Gemini conversion service
      const geminiConversionService = createGeminiConversionService();
      
      // Get conversion options from the request
      const makeResponsive = formData.get('makeResponsive') !== 'false'; // Default to true
      const optimizeForEmail = formData.get('optimizeForEmail') !== 'false'; // Default to true
      const targetPlatform = (formData.get('targetPlatform') as 'sfmc' | 'generic') || 'sfmc';
      
      // Convert the design file to HTML
      const conversionResult = await geminiConversionService.convertDesignToHtml(
        uploadData.path,
        file.name,
        {
          makeResponsive,
          optimizeForEmail,
          targetPlatform
        }
      );
      
      // Define the response data with the HTML from Gemini - we'll use this if database operations fail
      const responseData = {
        success: true,
        html: conversionResult.html,
        metadata: conversionResult.metadata,
        conversionId: 'temp-' + Date.now()
      };
      
      try {
        console.log('Attempting to store conversion result in Supabase');
        
        // Check if the email_conversions table exists
        const { error: tableCheckError } = await supabase
          .from('email_conversions')
          .select('id')
          .limit(1);
          
        if (tableCheckError) {
          console.warn('Table check error:', tableCheckError.message);
          console.log('The email_conversions table might not exist yet. Skipping database storage.');
          
          // Return success without database storage
          return NextResponse.json({
            ...responseData,
            note: 'Database storage was skipped. Please set up the database tables.'
          });
        }
        
        // Store the conversion result in Supabase
        try {
          const { data: conversionData, error: conversionError } = await supabase
            .from('email_conversions')
            .insert([
              { 
                user_id: userId,
                file_name: file.name,
                storage_path: uploadData.path,
                html_content: conversionResult.html,
                created_at: new Date().toISOString()
              }
            ])
            .select();
            
          if (conversionError) {
            console.error('Conversion storage error details:', JSON.stringify(conversionError));
            
            // Return success even if we couldn't store in the database
            return NextResponse.json({
              ...responseData,
              error: `Failed to store conversion result: ${conversionError.message}`,
              note: 'The HTML was generated but could not be stored in the database.'
            });
          }
          
          console.log('Conversion result stored successfully:', conversionData);
          
          // Update the conversion ID in the response with the actual database ID
          if (conversionData && conversionData.length > 0) {
            responseData.conversionId = conversionData[0].id;
          }
        } catch (insertError) {
          console.error('Error inserting conversion data:', insertError);
          // Continue without database storage
        }
        
        // Return the success response with all data
        return NextResponse.json(responseData);
      } catch (dbError) {
        console.error('Database operation error:', dbError);
        
        // Return success even if we couldn't store in the database
        return NextResponse.json({
          ...responseData,
          error: `Database operation failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`,
          note: 'The HTML was generated but could not be stored in the database.'
        });
      }
    } catch (fileError) {
      console.error('File processing error:', fileError);
      return NextResponse.json(
        { 
          error: `File processing failed: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`,
          details: fileError instanceof Error ? fileError.stack : undefined
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Conversion error:', error);
    return NextResponse.json(
      { 
        error: `Failed to process the file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 