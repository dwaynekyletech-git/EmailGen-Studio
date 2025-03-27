-- Add email_id column to email_versions table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'email_versions' AND column_name = 'email_id'
  ) THEN
    ALTER TABLE email_versions ADD COLUMN email_id TEXT;
    
    -- Create an index for better performance
    CREATE INDEX IF NOT EXISTS idx_email_versions_email_id ON email_versions(email_id);
    
    RAISE NOTICE 'Added email_id column to email_versions table';
  ELSE
    RAISE NOTICE 'email_id column already exists in email_versions table';
  END IF;
END
$$; 