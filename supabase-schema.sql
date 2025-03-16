-- EmailGen Studio Database Schema
-- This script creates the tables and relationships as specified in the backend structure document

-- Table for storing user information and roles
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  clerk_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL, -- Possible values: 'Administrator', 'Developer', 'Marketer'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing email version details
CREATE TABLE IF NOT EXISTS email_versions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(255),
  html_content TEXT,
  version INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing QA rules configuration (client-specific guidelines)
CREATE TABLE IF NOT EXISTS qa_rules (
  id SERIAL PRIMARY KEY,
  rule_name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing logs and notifications for version control changes
CREATE TABLE IF NOT EXISTS change_logs (
  id SERIAL PRIMARY KEY,
  email_version_id INTEGER REFERENCES email_versions(id),
  change_description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Additional tables needed for the application functionality

-- Table for storing email conversions
CREATE TABLE IF NOT EXISTS email_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  html_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing QA validation results
CREATE TABLE IF NOT EXISTS qa_validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id),
  html_content TEXT NOT NULL,
  results JSONB NOT NULL,
  passed BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing email deployments
CREATE TABLE IF NOT EXISTS email_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id INTEGER REFERENCES email_versions(id),
  user_id INTEGER REFERENCES users(id),
  deployment_target TEXT NOT NULL,
  deployment_status TEXT NOT NULL,
  deployment_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  email_id INTEGER,
  user_id INTEGER REFERENCES users(id),
  version_number INTEGER,
  metadata JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_validation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy for users table
CREATE POLICY "Users can view their own data" 
  ON users 
  FOR SELECT 
  USING (clerk_id = auth.uid());

-- Policy for email_versions table
CREATE POLICY "Users can view their own email versions" 
  ON email_versions 
  FOR SELECT 
  USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()));

CREATE POLICY "Users can insert their own email versions" 
  ON email_versions 
  FOR INSERT 
  WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()));

-- Policy for qa_rules table
CREATE POLICY "Everyone can view QA rules" 
  ON qa_rules 
  FOR SELECT 
  USING (TRUE);

CREATE POLICY "Only administrators can modify QA rules" 
  ON qa_rules 
  FOR ALL 
  USING (
    auth.uid() IN (
      SELECT clerk_id FROM users WHERE role = 'Administrator'
    )
  );

-- Policy for change_logs table
CREATE POLICY "Users can view change logs for their emails" 
  ON change_logs 
  FOR SELECT 
  USING (
    email_version_id IN (
      SELECT id FROM email_versions WHERE user_id IN (
        SELECT id FROM users WHERE clerk_id = auth.uid()
      )
    )
  );

-- Policy for email_conversions table
CREATE POLICY "Users can view their own conversions" 
  ON email_conversions 
  FOR SELECT 
  USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()));

CREATE POLICY "Users can insert their own conversions" 
  ON email_conversions 
  FOR INSERT 
  WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()));

-- Policy for qa_validation_results table
CREATE POLICY "Users can view their own validation results" 
  ON qa_validation_results 
  FOR SELECT 
  USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()));

CREATE POLICY "Users can insert their own validation results" 
  ON qa_validation_results 
  FOR INSERT 
  WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()));

-- Policy for email_deployments table
CREATE POLICY "Users can view their own deployments" 
  ON email_deployments 
  FOR SELECT 
  USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()));

CREATE POLICY "Users can insert their own deployments" 
  ON email_deployments 
  FOR INSERT 
  WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()));

-- Policy for notifications table
CREATE POLICY "Users can view their own notifications" 
  ON notifications 
  FOR SELECT 
  USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_email_versions_user_id ON email_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_email_versions_created_at ON email_versions(created_at);
CREATE INDEX IF NOT EXISTS idx_qa_rules_is_active ON qa_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_change_logs_email_version_id ON change_logs(email_version_id);
CREATE INDEX IF NOT EXISTS idx_email_conversions_user_id ON email_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_qa_validation_results_user_id ON qa_validation_results(user_id);
CREATE INDEX IF NOT EXISTS idx_email_deployments_user_id ON email_deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read); 