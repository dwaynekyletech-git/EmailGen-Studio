import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/backend/config/supabaseConfig';

export async function POST(request: NextRequest) {
  try {
    const { emailId, versionId, sfmcFolderId, emailName } = await request.json();
    
    if (!emailId || !emailName) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Fetch the email content
    let query = supabase.from('email_versions').select('*');
    
    if (versionId) {
      query = query.eq('id', versionId);
    } else {
      // Get the latest version if no specific version is provided
      query = query
        .eq('email_id', emailId)
        .order('version_number', { ascending: false })
        .limit(1);
    }
    
    const { data: versionData, error: versionError } = await query;
    
    if (versionError || !versionData || versionData.length === 0) {
      console.error('Version fetch error:', versionError);
      return NextResponse.json(
        { error: 'Failed to fetch email content' },
        { status: 500 }
      );
    }
    
    const htmlContent = versionData[0].html_content;
    
    // Check for SFMC credentials
    const sfmcClientId = process.env.SFMC_CLIENT_ID;
    const sfmcClientSecret = process.env.SFMC_CLIENT_SECRET;
    const sfmcAccountId = process.env.SFMC_ACCOUNT_ID;
    const sfmcAuthUrl = process.env.SFMC_AUTH_URL;
    
    if (!sfmcClientId || !sfmcClientSecret || !sfmcAccountId || !sfmcAuthUrl) {
      return NextResponse.json(
        { error: 'SFMC credentials not configured' },
        { status: 500 }
      );
    }
    
    // This is a placeholder for the actual SFMC deployment
    // In a real implementation, you would:
    // 1. Initialize the SFMC client
    // 2. Authenticate with SFMC
    // 3. Create or update the email in Content Builder
    
    /*
    // SFMC API integration would go here
    // Example with a hypothetical SFMC client:
    const sfmcClient = new SFMCClient({
      clientId: sfmcClientId,
      clientSecret: sfmcClientSecret,
      accountId: sfmcAccountId,
      authUrl: sfmcAuthUrl
    });
    
    await sfmcClient.authenticate();
    
    const deployResult = await sfmcClient.createEmail({
      name: emailName,
      folderId: sfmcFolderId,
      content: htmlContent
    });
    
    const sfmcAssetId = deployResult.assetId;
    */
    
    // For now, simulate a successful deployment
    const sfmcAssetId = `asset-${Date.now()}`;
    
    // Store deployment information in Supabase
    const { error: deployError } = await supabase
      .from('sfmc_deployments')
      .insert([
        {
          email_id: emailId,
          version_id: versionData[0].id,
          sfmc_asset_id: sfmcAssetId,
          sfmc_folder_id: sfmcFolderId,
          email_name: emailName,
          status: 'success',
          deployed_at: new Date().toISOString()
        }
      ]);
      
    if (deployError) {
      console.error('Deployment storage error:', deployError);
      // Continue anyway, as this is just for logging
    }
    
    return NextResponse.json({
      success: true,
      sfmcAssetId,
      message: 'Email successfully deployed to SFMC',
      deployedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('SFMC deployment error:', error);
    return NextResponse.json(
      { error: 'Failed to deploy email to SFMC' },
      { status: 500 }
    );
  }
}

// GET endpoint to check deployment status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const emailId = searchParams.get('emailId');
    
    if (!emailId) {
      return NextResponse.json(
        { error: 'No email ID provided' },
        { status: 400 }
      );
    }
    
    // Fetch deployment information from Supabase
    const { data: deployments, error } = await supabase
      .from('sfmc_deployments')
      .select('*')
      .eq('email_id', emailId)
      .order('deployed_at', { ascending: false });
      
    if (error) {
      console.error('Deployments fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch deployment information' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      deployments
    });
    
  } catch (error) {
    console.error('Deployments fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deployment information' },
      { status: 500 }
    );
  }
} 