# Supabase Setup for EmailGen Studio

This document provides instructions on how to set up the Supabase database for EmailGen Studio.

## Prerequisites

- A Supabase account
- Access to the Supabase dashboard

## Setup Steps

1. **Create a Supabase Project**

   - Go to [Supabase](https://supabase.com/) and sign in
   - Create a new project
   - Note down the project URL and API keys

2. **Set Environment Variables**

   Make sure your `.env.local` file contains the following variables:

   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

3. **Create Storage Bucket**

   - In the Supabase dashboard, go to the "Storage" section
   - Click "Create bucket"
   - Name the bucket `design-files`
   - Set the appropriate access permissions (private is recommended)

4. **Create Database Tables**

   - In the Supabase dashboard, go to the "SQL Editor" section
   - Create a new query
   - Copy and paste the contents of the `supabase-setup.sql` file
   - Run the query to create all necessary tables and policies

   Alternatively, you can run the SQL commands one by one:

   ```sql
   -- Create email_conversions table
   CREATE TABLE IF NOT EXISTS email_conversions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id TEXT NOT NULL,
     file_name TEXT NOT NULL,
     storage_path TEXT NOT NULL,
     html_content TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Create RLS policies for email_conversions
   ALTER TABLE email_conversions ENABLE ROW LEVEL SECURITY;

   -- Policy to allow users to see only their own conversions
   CREATE POLICY "Users can view their own conversions" 
     ON email_conversions 
     FOR SELECT 
     USING (auth.uid()::text = user_id);

   -- Policy to allow users to insert their own conversions
   CREATE POLICY "Users can insert their own conversions" 
     ON email_conversions 
     FOR INSERT 
     WITH CHECK (auth.uid()::text = user_id);
   ```

   And so on for the other tables.

5. **Test the Connection**

   After setting up the database, you can test the connection by:
   
   - Running the application
   - Uploading a design file
   - Checking the Supabase dashboard to see if the data is being stored correctly

## Troubleshooting

If you encounter issues with the database connection:

1. **Check Environment Variables**
   
   Make sure your environment variables are correctly set in `.env.local`.

2. **Check Supabase Policies**
   
   Ensure that the Row Level Security (RLS) policies are correctly set up.

3. **Check Bucket Permissions**
   
   Make sure the `design-files` bucket has the correct permissions.

4. **Check Console Logs**
   
   The application logs detailed error messages to the console, which can help identify the issue.

## Database Schema

The application uses the following tables:

- `email_conversions`: Stores the results of converting design files to HTML
- `qa_rules`: Stores QA validation rules
- `qa_validation_results`: Stores the results of QA validation
- `email_versions`: Stores versions of email HTML
- `email_deployments`: Stores information about email deployments

Each table has appropriate Row Level Security (RLS) policies to ensure that users can only access their own data. 