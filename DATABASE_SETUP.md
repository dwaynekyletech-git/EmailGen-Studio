# EmailGen Studio Database Setup

This document provides instructions on how to set up and update the database for EmailGen Studio according to the backend structure document.

## Database Schema

The EmailGen Studio database consists of the following tables:

1. **users** - Stores user information and roles
2. **email_versions** - Stores email version details
3. **qa_rules** - Stores QA rules configuration
4. **change_logs** - Stores logs and notifications for version control changes
5. **email_conversions** - Stores the results of converting design files to HTML
6. **qa_validation_results** - Stores the results of QA validation
7. **email_deployments** - Stores information about email deployments
8. **notifications** - Stores notifications for users

## Setup Instructions

### Option 1: Create a New Database

If you're setting up a new database, you can use the `supabase-schema.sql` script to create all the tables and policies at once.

1. Log in to your Supabase dashboard
2. Navigate to the SQL Editor
3. Create a new query
4. Copy and paste the contents of the `supabase-schema.sql` file
5. Run the query

### Option 2: Update an Existing Database

If you already have a database with some tables, you can use the `supabase-migration.sql` script to update it to match the required schema.

1. Log in to your Supabase dashboard
2. Navigate to the SQL Editor
3. Create a new query
4. Copy and paste the contents of the `supabase-migration.sql` file
5. Run the query

The migration script will:
- Check if each table exists
- Create missing tables
- Add missing columns to existing tables
- Set up Row Level Security (RLS) policies
- Create indexes for better performance

## Storage Buckets

In addition to the database tables, EmailGen Studio requires a storage bucket for design files:

1. In the Supabase dashboard, go to the "Storage" section
2. Click "Create bucket"
3. Name the bucket `design-files`
4. Set the appropriate access permissions (private is recommended)

## Verifying the Setup

After running the setup or migration script, you should verify that:

1. All tables have been created
2. Row Level Security (RLS) is enabled on all tables
3. The appropriate policies are in place
4. The storage bucket has been created

You can check the tables and policies in the "Table Editor" section of the Supabase dashboard.

## Troubleshooting

If you encounter any issues during the setup:

1. Check the error messages in the SQL Editor
2. Make sure you have the necessary permissions to create tables and policies
3. Verify that the Supabase project is properly set up
4. Check that the environment variables in your `.env.local` file match your Supabase project

## Next Steps

After setting up the database, you should:

1. Create at least one user with the 'Administrator' role
2. Add some initial QA rules
3. Test the application to ensure it can connect to the database

Example SQL to create an administrator user:

```sql
INSERT INTO users (clerk_id, email, role, created_at)
VALUES ('your_clerk_user_id', 'admin@example.com', 'Administrator', CURRENT_TIMESTAMP);
```

Replace `your_clerk_user_id` with the actual Clerk user ID of the administrator. 