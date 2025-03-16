import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/backend/config/supabaseConfig';

export async function POST(request: NextRequest) {
  try {
    const { html, emailSubject, testProvider = 'litmus' } = await request.json();
    
    if (!html) {
      return NextResponse.json(
        { error: 'No HTML content provided' },
        { status: 400 }
      );
    }
    
    // Check for required environment variables
    const litmusApiKey = process.env.LITMUS_API_KEY;
    const emailOnAcidApiKey = process.env.EMAIL_ON_ACID_API_KEY;
    
    if (testProvider === 'litmus' && !litmusApiKey) {
      return NextResponse.json(
        { error: 'Litmus API key not configured' },
        { status: 500 }
      );
    }
    
    if (testProvider === 'emailonacid' && !emailOnAcidApiKey) {
      return NextResponse.json(
        { error: 'Email on Acid API key not configured' },
        { status: 500 }
      );
    }
    
    // This is a placeholder for the actual render testing API integration
    // In a real implementation, you would:
    // 1. Initialize the appropriate client
    // 2. Submit the HTML for testing
    // 3. Get back test results or a URL to view results
    
    /*
    let testResults;
    if (testProvider === 'litmus') {
      // Litmus API integration would go here
      // const litmusClient = new LitmusClient(litmusApiKey);
      // testResults = await litmusClient.createTest({
      //   html,
      //   subject: emailSubject || 'Email Render Test'
      // });
    } else {
      // Email on Acid implementation would go here
    }
    */
    
    // For now, simulate a successful test submission
    const testId = `test-${Date.now()}`;
    const testUrl = `https://example.com/render-test/${testId}`;
    
    // Store test information in Supabase
    const { error: testError } = await supabase
      .from('render_tests')
      .insert([
        {
          test_id: testId,
          provider: testProvider,
          html_content: html,
          subject: emailSubject || 'Email Render Test',
          test_url: testUrl,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ]);
      
    if (testError) {
      console.error('Test storage error:', testError);
      // Continue anyway, as this is just for logging
    }
    
    return NextResponse.json({
      success: true,
      testId,
      testUrl,
      message: `Render test submitted to ${testProvider}`,
      status: 'pending'
    });
    
  } catch (error) {
    console.error('Render test error:', error);
    return NextResponse.json(
      { error: 'Failed to submit render test' },
      { status: 500 }
    );
  }
}

// GET endpoint to check test status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testId = searchParams.get('testId');
    
    if (!testId) {
      return NextResponse.json(
        { error: 'No test ID provided' },
        { status: 400 }
      );
    }
    
    // Fetch test information from Supabase
    const { data: test, error } = await supabase
      .from('render_tests')
      .select('*')
      .eq('test_id', testId)
      .single();
      
    if (error) {
      console.error('Test fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch test information' },
        { status: 500 }
      );
    }
    
    if (!test) {
      return NextResponse.json(
        { error: 'Test not found' },
        { status: 404 }
      );
    }
    
    // In a real implementation, you would check the actual status from the provider
    // For now, return the stored information
    return NextResponse.json({
      testId: test.test_id,
      provider: test.provider,
      status: test.status,
      testUrl: test.test_url,
      createdAt: test.created_at
    });
    
  } catch (error) {
    console.error('Test status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check test status' },
      { status: 500 }
    );
  }
} 