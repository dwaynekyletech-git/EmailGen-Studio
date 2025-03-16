-- EmailGen Studio Database Migration Script
-- This script updates the existing database schema to match the schema specified in the backend structure document

-- First, check if the users table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    -- Create users table
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      clerk_id TEXT UNIQUE NOT NULL,
      email VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL, -- Possible values: 'Administrator', 'Developer', 'Marketer'
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Enable RLS on users table
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    
    -- Create policy for users table
    CREATE POLICY "Users can view their own data" 
      ON users 
      FOR SELECT 
      USING (clerk_id = auth.uid()::text);
      
    -- Create index for users table
    CREATE INDEX idx_users_clerk_id ON users(clerk_id);
  END IF;
END
$$;

-- Check if the email_versions table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_versions') THEN
    -- Create email_versions table
    CREATE TABLE email_versions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      title VARCHAR(255),
      html_content TEXT,
      version INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Enable RLS on email_versions table
    ALTER TABLE email_versions ENABLE ROW LEVEL SECURITY;
    
    -- Create policies for email_versions table
    CREATE POLICY "Users can view their own email versions" 
      ON email_versions 
      FOR SELECT 
      USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));
      
    CREATE POLICY "Users can insert their own email versions" 
      ON email_versions 
      FOR INSERT 
      WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));
      
    -- Create indexes for email_versions table
    CREATE INDEX idx_email_versions_user_id ON email_versions(user_id);
    CREATE INDEX idx_email_versions_created_at ON email_versions(created_at);
  END IF;
END
$$;

-- Check if the qa_rules table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'qa_rules') THEN
    -- Create qa_rules table
    CREATE TABLE qa_rules (
      id SERIAL PRIMARY KEY,
      rule_name VARCHAR(255) NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Enable RLS on qa_rules table
    ALTER TABLE qa_rules ENABLE ROW LEVEL SECURITY;
    
    -- Create policies for qa_rules table
    CREATE POLICY "Everyone can view QA rules" 
      ON qa_rules 
      FOR SELECT 
      USING (TRUE);
      
    CREATE POLICY "Only administrators can modify QA rules" 
      ON qa_rules 
      FOR ALL 
      USING (
        auth.uid()::text IN (
          SELECT clerk_id FROM users WHERE role = 'Administrator'
        )
      );
      
    -- Create index for qa_rules table
    CREATE INDEX idx_qa_rules_is_active ON qa_rules(is_active);
  END IF;
END
$$;

-- Check if the change_logs table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'change_logs') THEN
    -- Create change_logs table
    CREATE TABLE change_logs (
      id SERIAL PRIMARY KEY,
      email_version_id INTEGER REFERENCES email_versions(id),
      change_description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Enable RLS on change_logs table
    ALTER TABLE change_logs ENABLE ROW LEVEL SECURITY;
    
    -- Create policy for change_logs table
    CREATE POLICY "Users can view change logs for their emails" 
      ON change_logs 
      FOR SELECT 
      USING (
        email_version_id IN (
          SELECT id FROM email_versions WHERE user_id IN (
            SELECT id FROM users WHERE clerk_id = auth.uid()::text
          )
        )
      );
      
    -- Create index for change_logs table
    CREATE INDEX idx_change_logs_email_version_id ON change_logs(email_version_id);
  END IF;
END
$$;

-- Check if the email_conversions table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_conversions') THEN
    -- Alter email_conversions table to match the new schema
    BEGIN
      -- Add user_id column if it doesn't exist
      IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'email_conversions' AND column_name = 'user_id') THEN
        ALTER TABLE email_conversions ADD COLUMN user_id INTEGER REFERENCES users(id);
      END IF;
      
      -- Create index for email_conversions table
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_conversions_user_id') THEN
        CREATE INDEX idx_email_conversions_user_id ON email_conversions(user_id);
      END IF;
      
      -- Enable RLS on email_conversions table if not already enabled
      IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'email_conversions') THEN
        ALTER TABLE email_conversions ENABLE ROW LEVEL SECURITY;
        
        -- Create policies for email_conversions table
        CREATE POLICY "Users can view their own conversions" 
          ON email_conversions 
          FOR SELECT 
          USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));
          
        CREATE POLICY "Users can insert their own conversions" 
          ON email_conversions 
          FOR INSERT 
          WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error altering email_conversions table: %', SQLERRM;
    END;
  ELSE
    -- Create email_conversions table
    CREATE TABLE email_conversions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER REFERENCES users(id),
      file_name TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      html_content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Enable RLS on email_conversions table
    ALTER TABLE email_conversions ENABLE ROW LEVEL SECURITY;
    
    -- Create policies for email_conversions table
    CREATE POLICY "Users can view their own conversions" 
      ON email_conversions 
      FOR SELECT 
      USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));
      
    CREATE POLICY "Users can insert their own conversions" 
      ON email_conversions 
      FOR INSERT 
      WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));
      
    -- Create index for email_conversions table
    CREATE INDEX idx_email_conversions_user_id ON email_conversions(user_id);
  END IF;
END
$$;

-- Check if the qa_validation_results table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'qa_validation_results') THEN
    -- Alter qa_validation_results table to match the new schema
    BEGIN
      -- Add user_id column if it doesn't exist
      IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'qa_validation_results' AND column_name = 'user_id') THEN
        ALTER TABLE qa_validation_results ADD COLUMN user_id INTEGER REFERENCES users(id);
      END IF;
      
      -- Create index for qa_validation_results table
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_qa_validation_results_user_id') THEN
        CREATE INDEX idx_qa_validation_results_user_id ON qa_validation_results(user_id);
      END IF;
      
      -- Enable RLS on qa_validation_results table if not already enabled
      IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'qa_validation_results') THEN
        ALTER TABLE qa_validation_results ENABLE ROW LEVEL SECURITY;
        
        -- Create policies for qa_validation_results table
        CREATE POLICY "Users can view their own validation results" 
          ON qa_validation_results 
          FOR SELECT 
          USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));
          
        CREATE POLICY "Users can insert their own validation results" 
          ON qa_validation_results 
          FOR INSERT 
          WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error altering qa_validation_results table: %', SQLERRM;
    END;
  ELSE
    -- Create qa_validation_results table
    CREATE TABLE qa_validation_results (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER REFERENCES users(id),
      html_content TEXT NOT NULL,
      results JSONB NOT NULL,
      passed BOOLEAN NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Enable RLS on qa_validation_results table
    ALTER TABLE qa_validation_results ENABLE ROW LEVEL SECURITY;
    
    -- Create policies for qa_validation_results table
    CREATE POLICY "Users can view their own validation results" 
      ON qa_validation_results 
      FOR SELECT 
      USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));
      
    CREATE POLICY "Users can insert their own validation results" 
      ON qa_validation_results 
      FOR INSERT 
      WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));
      
    -- Create index for qa_validation_results table
    CREATE INDEX idx_qa_validation_results_user_id ON qa_validation_results(user_id);
  END IF;
END
$$;

-- Check if the email_deployments table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_deployments') THEN
    -- Create email_deployments table
    CREATE TABLE email_deployments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email_id INTEGER REFERENCES email_versions(id),
      user_id INTEGER REFERENCES users(id),
      deployment_target TEXT NOT NULL,
      deployment_status TEXT NOT NULL,
      deployment_details JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Enable RLS on email_deployments table
    ALTER TABLE email_deployments ENABLE ROW LEVEL SECURITY;
    
    -- Create policies for email_deployments table
    CREATE POLICY "Users can view their own deployments" 
      ON email_deployments 
      FOR SELECT 
      USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));
      
    CREATE POLICY "Users can insert their own deployments" 
      ON email_deployments 
      FOR INSERT 
      WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));
      
    -- Create index for email_deployments table
    CREATE INDEX idx_email_deployments_user_id ON email_deployments(user_id);
  END IF;
END
$$;

-- Check if the notifications table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
    -- Create notifications table
    CREATE TABLE notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type TEXT NOT NULL,
      email_id INTEGER,
      user_id INTEGER REFERENCES users(id),
      version_number INTEGER,
      metadata JSONB,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Enable RLS on notifications table
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    
    -- Create policy for notifications table
    CREATE POLICY "Users can view their own notifications" 
      ON notifications 
      FOR SELECT 
      USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));
      
    -- Create indexes for notifications table
    CREATE INDEX idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX idx_notifications_is_read ON notifications(is_read);
  END IF;
END
$$; 