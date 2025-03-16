# EmailGen Studio Backend

This directory contains the backend services and API routes for EmailGen Studio.

## API Endpoints

### 1. Convert Email API (`/api/convertEmail`)

Converts design files (.psd, .xd, .fig) to responsive HTML for SFMC.

**POST Request:**
```bash
curl -X POST http://localhost:3000/api/convertEmail \
  -F "file=@/path/to/design.psd"
```

**Response:**
```json
{
  "success": true,
  "html": "<!DOCTYPE html>...",
  "conversionId": "123"
}
```

### 2. QA Validation API (`/api/qaValidation`)

Validates HTML against custom QA rules.

**POST Request:**
```bash
curl -X POST http://localhost:3000/api/qaValidation \
  -H "Content-Type: application/json" \
  -d '{"html":"<!DOCTYPE html><html><body><h1>Test</h1></body></html>"}'
```

**Response:**
```json
{
  "success": true,
  "passed": true,
  "results": [
    {
      "ruleId": "1",
      "ruleName": "DOCTYPE Check",
      "description": "Checks if DOCTYPE is present",
      "severity": "error",
      "isPassing": true,
      "message": "Rule passed"
    }
  ]
}
```

**GET Request (fetch rules):**
```bash
curl -X GET http://localhost:3000/api/qaValidation?activeOnly=true
```

**Response:**
```json
{
  "rules": [
    {
      "id": "1",
      "name": "DOCTYPE Check",
      "description": "Checks if DOCTYPE is present",
      "rule_type": "regex",
      "rule_pattern": "<!DOCTYPE html>",
      "severity": "error",
      "is_active": true
    }
  ]
}
```

### 3. Render Test API (`/api/renderTest`)

Submits emails for render testing via Litmus/Email on Acid.

**POST Request:**
```bash
curl -X POST http://localhost:3000/api/renderTest \
  -H "Content-Type: application/json" \
  -d '{"html":"<!DOCTYPE html><html><body><h1>Test</h1></body></html>", "emailSubject":"Test Email"}'
```

**Response:**
```json
{
  "success": true,
  "testId": "test-1234567890",
  "testUrl": "https://example.com/render-test/test-1234567890",
  "message": "Render test submitted to litmus",
  "status": "pending"
}
```

**GET Request (check status):**
```bash
curl -X GET http://localhost:3000/api/renderTest?testId=test-1234567890
```

**Response:**
```json
{
  "testId": "test-1234567890",
  "provider": "litmus",
  "status": "pending",
  "testUrl": "https://example.com/render-test/test-1234567890",
  "createdAt": "2023-01-01T00:00:00.000Z"
}
```

### 4. Version Control API (`/api/versionControl`)

Manages email versions with rollback capability.

**POST Request (save version):**
```bash
curl -X POST http://localhost:3000/api/versionControl \
  -H "Content-Type: application/json" \
  -d '{"emailId":"123", "htmlContent":"<!DOCTYPE html>...", "metadata":{"author":"John Doe"}}'
```

**Response:**
```json
{
  "success": true,
  "versionId": "456",
  "versionNumber": 1
}
```

**GET Request (get versions):**
```bash
curl -X GET http://localhost:3000/api/versionControl?emailId=123
```

**Response:**
```json
{
  "success": true,
  "versions": [
    {
      "id": "456",
      "email_id": "123",
      "version_number": 1,
      "html_content": "<!DOCTYPE html>...",
      "metadata": {"author":"John Doe"},
      "created_at": "2023-01-01T00:00:00.000Z"
    }
  ]
}
```

**GET Request (get specific version):**
```bash
curl -X GET http://localhost:3000/api/versionControl?emailId=123&versionNumber=1
```

**PUT Request (rollback):**
```bash
curl -X PUT http://localhost:3000/api/versionControl \
  -H "Content-Type: application/json" \
  -d '{"emailId":"123", "versionNumber":1}'
```

**Response:**
```json
{
  "success": true,
  "message": "Rolled back to version 1",
  "newVersion": 2
}
```

### 5. Deploy Email API (`/api/deployEmail`)

Deploys emails to Salesforce Marketing Cloud.

**POST Request:**
```bash
curl -X POST http://localhost:3000/api/deployEmail \
  -H "Content-Type: application/json" \
  -d '{"emailId":"123", "emailName":"Test Email", "sfmcFolderId":"456"}'
```

**Response:**
```json
{
  "success": true,
  "sfmcAssetId": "asset-1234567890",
  "message": "Email successfully deployed to SFMC",
  "deployedAt": "2023-01-01T00:00:00.000Z"
}
```

**GET Request (get deployments):**
```bash
curl -X GET http://localhost:3000/api/deployEmail?emailId=123
```

**Response:**
```json
{
  "success": true,
  "deployments": [
    {
      "email_id": "123",
      "version_id": "456",
      "sfmc_asset_id": "asset-1234567890",
      "sfmc_folder_id": "456",
      "email_name": "Test Email",
      "status": "success",
      "deployed_at": "2023-01-01T00:00:00.000Z"
    }
  ]
}
```

## Environment Variables

Make sure to set the following environment variables in your `.env.local` file:

```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Email Testing Services
LITMUS_API_KEY=your_litmus_api_key
EMAIL_ON_ACID_API_KEY=your_email_on_acid_api_key

# Salesforce Marketing Cloud
SFMC_CLIENT_ID=your_sfmc_client_id
SFMC_CLIENT_SECRET=your_sfmc_client_secret
SFMC_ACCOUNT_ID=your_sfmc_account_id
SFMC_AUTH_URL=your_sfmc_auth_url

# AI Services
AI_API_KEY=your_ai_api_key
```

## Supabase Tables

The backend requires the following tables in your Supabase database:

1. `email_conversions` - Stores converted email designs
2. `qa_rules` - Stores QA validation rules
3. `qa_validation_results` - Stores results of QA validations
4. `render_tests` - Stores render test information
5. `email_versions` - Stores email versions for version control
6. `notifications` - Stores notifications for version changes
7. `sfmc_deployments` - Stores SFMC deployment information

## Next Steps

After implementing these backend features, proceed to Phase 4: Integration, which involves connecting the frontend components to these backend services. 