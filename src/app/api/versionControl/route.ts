import { NextRequest, NextResponse } from 'next/server';
import * as versionControlService from '@/backend/services/versionControl';
import { getAuth } from '@clerk/nextjs/server';

// Save a new version
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
    
    const { emailId, htmlContent, metadata = {} } = await request.json();
    
    if (!emailId || !htmlContent) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Add user ID to metadata
    const metadataWithUser = {
      ...metadata,
      userId: clerkUserId,
    };
    
    const result = await versionControlService.saveVersion(emailId, htmlContent, metadataWithUser);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Save version error:', error);
    return NextResponse.json(
      { error: 'Failed to save version' },
      { status: 500 }
    );
  }
}

// Get versions or a specific version
export async function GET(request: NextRequest) {
  try {
    // Check authentication using getAuth instead of auth
    const { userId: clerkUserId } = getAuth(request);
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const emailId = searchParams.get('emailId');
    const versionNumber = searchParams.get('versionNumber');
    
    if (!emailId) {
      return NextResponse.json(
        { error: 'Missing emailId parameter' },
        { status: 400 }
      );
    }
    
    if (versionNumber) {
      // Get a specific version
      const result = await versionControlService.getVersion(emailId, parseInt(versionNumber));
      return NextResponse.json(result);
    } else {
      // Get all versions
      const result = await versionControlService.getVersions(emailId);
      return NextResponse.json(result);
    }
    
  } catch (error) {
    console.error('Get versions error:', error);
    return NextResponse.json(
      { error: 'Failed to get versions' },
      { status: 500 }
    );
  }
}

// Rollback to a specific version
export async function PUT(request: NextRequest) {
  try {
    // Check authentication using getAuth instead of auth
    const { userId: clerkUserId } = getAuth(request);
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { emailId, versionNumber } = await request.json();
    
    if (!emailId || !versionNumber) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Add user ID to the request
    const result = await versionControlService.rollbackToVersion(emailId, versionNumber);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Rollback error:', error);
    return NextResponse.json(
      { error: 'Failed to rollback to version' },
      { status: 500 }
    );
  }
} 