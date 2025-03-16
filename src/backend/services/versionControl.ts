import supabase from '../config/supabaseConfig';

interface VersionMetadata {
  author?: string;
  comment?: string;
  rollback_from?: number;
  userId?: string;
  [key: string]: any;
}

export async function saveVersion(emailId: string, htmlContent: string, metadata: VersionMetadata = {}) {
  try {
    // Ensure we have a userId
    if (!metadata.userId) {
      throw new Error('User ID is required');
    }
    
    // Get the current version number
    const { data: versions, error: versionsError } = await supabase
      .from('email_versions')
      .select('version_number')
      .eq('email_id', emailId)
      .order('version_number', { ascending: false })
      .limit(1);
      
    if (versionsError) {
      console.error('Version fetch error:', versionsError);
      throw new Error('Failed to fetch current version');
    }
    
    const nextVersion = versions && versions.length > 0 ? versions[0].version_number + 1 : 1;
    
    // Save the new version
    const { data, error } = await supabase
      .from('email_versions')
      .insert([
        {
          email_id: emailId,
          user_id: metadata.userId,
          version_number: nextVersion,
          html_content: htmlContent,
          metadata,
          created_at: new Date().toISOString()
        }
      ])
      .select();
      
    if (error) {
      console.error('Version save error:', error);
      throw new Error('Failed to save version');
    }
    
    // Trigger notification
    await triggerVersionNotification(emailId, nextVersion, metadata);
    
    return {
      success: true,
      versionId: data[0].id,
      versionNumber: nextVersion
    };
    
  } catch (error) {
    console.error('Save version error:', error);
    throw error;
  }
}

export async function getVersions(emailId: string) {
  try {
    const { data, error } = await supabase
      .from('email_versions')
      .select('*')
      .eq('email_id', emailId)
      .order('version_number', { ascending: false });
      
    if (error) {
      console.error('Versions fetch error:', error);
      throw new Error('Failed to fetch versions');
    }
    
    return {
      success: true,
      versions: data
    };
    
  } catch (error) {
    console.error('Get versions error:', error);
    throw error;
  }
}

export async function getVersion(emailId: string, versionNumber: number) {
  try {
    const { data, error } = await supabase
      .from('email_versions')
      .select('*')
      .eq('email_id', emailId)
      .eq('version_number', versionNumber)
      .single();
      
    if (error) {
      console.error('Version fetch error:', error);
      throw new Error('Failed to fetch version');
    }
    
    return {
      success: true,
      version: data
    };
    
  } catch (error) {
    console.error('Get version error:', error);
    throw error;
  }
}

export async function rollbackToVersion(emailId: string, versionNumber: number) {
  try {
    // Get the version to roll back to
    const { data: versionData, error: versionError } = await supabase
      .from('email_versions')
      .select('*')
      .eq('email_id', emailId)
      .eq('version_number', versionNumber)
      .single();
      
    if (versionError || !versionData) {
      console.error('Version fetch error:', versionError);
      throw new Error('Failed to fetch version for rollback');
    }
    
    // Create a new version with the content from the old version
    const result = await saveVersion(
      emailId, 
      versionData.html_content, 
      {
        ...versionData.metadata,
        rollback_from: versionNumber,
        comment: `Rollback to version ${versionNumber}`
      }
    );
    
    return {
      success: true,
      message: `Rolled back to version ${versionNumber}`,
      newVersion: result.versionNumber
    };
    
  } catch (error) {
    console.error('Rollback error:', error);
    throw error;
  }
}

async function triggerVersionNotification(emailId: string, versionNumber: number, metadata: VersionMetadata) {
  // This is a placeholder for notification logic
  // In a real implementation, you might:
  // 1. Send an email notification
  // 2. Trigger a webhook
  // 3. Update a notification table in the database
  
  try {
    const { error } = await supabase
      .from('notifications')
      .insert([
        {
          type: 'version_created',
          email_id: emailId,
          user_id: metadata.userId,
          version_number: versionNumber,
          metadata,
          created_at: new Date().toISOString(),
          is_read: false
        }
      ]);
      
    if (error) {
      console.error('Notification error:', error);
      // Don't throw, as this is a non-critical operation
    }
    
  } catch (error) {
    console.error('Notification error:', error);
    // Don't throw, as this is a non-critical operation
  }
} 