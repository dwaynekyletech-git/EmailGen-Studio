/**
 * API Service for EmailGen Studio
 * Provides methods to interact with the backend API endpoints
 */

// No need to import Clerk in this file since we're not using it directly

// Helper function to get auth headers
const getAuthHeaders = (): Record<string, string> => {
  // Default headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // We can't use Clerk's auth hooks outside of React components
  // The API routes will handle authentication on the server side
  return headers;
};

// File conversion API
export async function convertDesignFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/convertEmail', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to convert design file');
  }
  
  return response.json();
}

// QA Validation API
export async function validateEmail(html: string, ruleIds?: string[]) {
  const headers = getAuthHeaders();
  
  const response = await fetch('/api/qaValidation', {
    method: 'POST',
    headers,
    body: JSON.stringify({ html, ruleIds }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to validate email');
  }
  
  return response.json();
}

export async function getQARules(activeOnly: boolean = true) {
  const headers = getAuthHeaders();
  
  const response = await fetch(`/api/qaValidation?activeOnly=${activeOnly}`, {
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch QA rules');
  }
  
  return response.json();
}

// Render Testing API
export async function submitRenderTest(html: string, emailSubject?: string, testProvider: 'litmus' | 'emailonacid' = 'litmus') {
  const headers = getAuthHeaders();
  
  const response = await fetch('/api/renderTest', {
    method: 'POST',
    headers,
    body: JSON.stringify({ html, emailSubject, testProvider }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit render test');
  }
  
  return response.json();
}

export async function getRenderTestStatus(testId: string) {
  const headers = getAuthHeaders();
  
  const response = await fetch(`/api/renderTest?testId=${testId}`, {
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get render test status');
  }
  
  return response.json();
}

// Version Control API
export async function saveEmailVersion(emailId: string, htmlContent: string, metadata: any = {}) {
  const headers = getAuthHeaders();
  
  const response = await fetch('/api/versionControl', {
    method: 'POST',
    headers,
    body: JSON.stringify({ emailId, htmlContent, metadata }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save email version');
  }
  
  return response.json();
}

export async function getEmailVersions(emailId: string) {
  const headers = getAuthHeaders();
  
  const response = await fetch(`/api/versionControl?emailId=${emailId}`, {
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get email versions');
  }
  
  return response.json();
}

export async function getEmailVersion(emailId: string, versionNumber: number) {
  const headers = getAuthHeaders();
  
  const response = await fetch(`/api/versionControl?emailId=${emailId}&versionNumber=${versionNumber}`, {
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get email version');
  }
  
  return response.json();
}

export async function rollbackEmailVersion(emailId: string, versionNumber: number) {
  const headers = getAuthHeaders();
  
  const response = await fetch('/api/versionControl', {
    method: 'PUT',
    headers,
    body: JSON.stringify({ emailId, versionNumber }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to rollback email version');
  }
  
  return response.json();
}

// SFMC Deployment API
export async function deployEmailToSFMC(emailId: string, emailName: string, sfmcFolderId?: string, versionId?: string) {
  const headers = getAuthHeaders();
  
  const response = await fetch('/api/deployEmail', {
    method: 'POST',
    headers,
    body: JSON.stringify({ emailId, emailName, sfmcFolderId, versionId }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to deploy email to SFMC');
  }
  
  return response.json();
}

export async function getEmailDeployments(emailId: string) {
  const headers = getAuthHeaders();
  
  const response = await fetch(`/api/deployEmail?emailId=${emailId}`, {
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get email deployments');
  }
  
  return response.json();
} 