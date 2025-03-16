import supabase from '../config/supabaseConfig';

interface VersionMetadata {
  author?: string;
  comment?: string;
  rollback_from?: number;
  userId?: string;
  email?: string;
  title?: string;
  [key: string]: any;
}

/**
 * Saves a new version of an email
 * @param emailId The ID of the email
 * @param htmlContent The HTML content of the email
 * @param metadata Additional metadata for the version
 * @returns Object with success status, version ID, and version number
 */
export async function saveVersion(emailId: string, htmlContent: string, metadata: VersionMetadata = {}) {
  try {
    // Ensure we have a userId
    if (!metadata.userId) {
      throw new Error('User ID is required');
    }
    
    // Get the user ID from the users table
    let { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', metadata.userId)
      .single();
      
    if (userError) {
      console.error('User fetch error:', userError);
      
      // If the user doesn't exist, create a new user
      if (userError.code === 'PGRST116') {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([
            {
              clerk_id: metadata.userId,
              email: metadata.email || 'unknown@example.com',
              role: 'Developer', // Default role
              created_at: new Date().toISOString()
            }
          ])
          .select();
          
        if (createError) {
          console.error('User creation error:', createError);
          throw new Error('Failed to create user');
        }
        
        userData = newUser[0];
      } else {
        throw new Error('Failed to fetch user');
      }
    }
    
    if (!userData) {
      throw new Error('User data is null');
    }
    
    const userId = userData.id;
    
    // Get the current version number
    const { data: versions, error: versionsError } = await supabase
      .from('email_versions')
      .select('version')
      .eq('email_id', emailId)
      .order('version', { ascending: false })
      .limit(1);
      
    if (versionsError) {
      console.error('Version fetch error:', versionsError);
      throw new Error('Failed to fetch current version');
    }
    
    const nextVersion = versions && versions.length > 0 ? versions[0].version + 1 : 1;
    
    // Save the new version
    const { data, error } = await supabase
      .from('email_versions')
      .insert([
        {
          email_id: emailId,
          user_id: userId,
          title: metadata.title || `Version ${nextVersion}`,
          html_content: htmlContent,
          version: nextVersion,
          created_at: new Date().toISOString()
        }
      ])
      .select();
      
    if (error) {
      console.error('Version save error:', error);
      throw new Error('Failed to save version');
    }
    
    // Create a change log entry
    await createChangeLog(data[0].id, metadata.comment || `Version ${nextVersion} created`);
    
    // Trigger notification
    await triggerVersionNotification(emailId, nextVersion, userId, metadata);
    
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

/**
 * Gets all versions of an email
 * @param emailId The ID of the email
 * @returns Object with success status and versions array
 */
export async function getVersions(emailId: string) {
  try {
    const { data, error } = await supabase
      .from('email_versions')
      .select('*, users(email)')
      .eq('email_id', emailId)
      .order('version', { ascending: false });
      
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

/**
 * Gets a specific version of an email
 * @param emailId The ID of the email
 * @param versionNumber The version number to get
 * @returns Object with success status and version data
 */
export async function getVersion(emailId: string, versionNumber: number) {
  try {
    const { data, error } = await supabase
      .from('email_versions')
      .select('*, users(email)')
      .eq('email_id', emailId)
      .eq('version', versionNumber)
      .single();
      
    if (error) {
      console.error('Version fetch error:', error);
      throw new Error('Failed to fetch version');
    }
    
    // Get change logs for this version
    const { data: changeLogs, error: logsError } = await supabase
      .from('change_logs')
      .select('*')
      .eq('email_version_id', data.id)
      .order('created_at', { ascending: false });
      
    if (logsError) {
      console.error('Change logs fetch error:', logsError);
      // Continue anyway, as this is non-critical
    }
    
    return {
      success: true,
      version: data,
      changeLogs: changeLogs || []
    };
    
  } catch (error) {
    console.error('Get version error:', error);
    throw error;
  }
}

/**
 * Rolls back to a specific version of an email
 * @param emailId The ID of the email
 * @param versionNumber The version number to roll back to
 * @returns Object with success status, message, and new version number
 */
export async function rollbackToVersion(emailId: string, versionNumber: number) {
  try {
    // Get the version to roll back to
    const { data: versionData, error: versionError } = await supabase
      .from('email_versions')
      .select('*')
      .eq('email_id', emailId)
      .eq('version', versionNumber)
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
        userId: versionData.user_id,
        title: `Rollback to version ${versionNumber}`,
        comment: `Rolled back to version ${versionNumber}`,
        rollback_from: versionNumber
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

/**
 * Creates a change log entry for a version
 * @param emailVersionId The ID of the email version
 * @param changeDescription Description of the change
 */
async function createChangeLog(emailVersionId: number, changeDescription: string) {
  try {
    const { error } = await supabase
      .from('change_logs')
      .insert([
        {
          email_version_id: emailVersionId,
          change_description: changeDescription,
          created_at: new Date().toISOString()
        }
      ]);
      
    if (error) {
      console.error('Change log error:', error);
      // Don't throw, as this is a non-critical operation
    }
    
  } catch (error) {
    console.error('Change log error:', error);
    // Don't throw, as this is a non-critical operation
  }
}

/**
 * Triggers a notification for a version change
 * @param emailId The ID of the email
 * @param versionNumber The version number
 * @param userId The user ID
 * @param metadata Additional metadata
 */
async function triggerVersionNotification(emailId: string, versionNumber: number, userId: number, metadata: VersionMetadata) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert([
        {
          type: 'version_created',
          email_id: emailId,
          user_id: userId,
          version_number: versionNumber,
          metadata,
          is_read: false,
          created_at: new Date().toISOString()
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