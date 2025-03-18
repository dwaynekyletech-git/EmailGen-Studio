import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Validate the configuration
if (!supabaseUrl) {
  console.warn('⚠️ NEXT_PUBLIC_SUPABASE_URL is not set. Database operations will fail.');
}

if (!supabaseKey) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY is not set. Database operations will fail.');
}

// Create a single supabase client for interacting with your database
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Test connection (optional)
async function testConnection() {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.warn('⚠️ Supabase connection test failed:', error.message);
    } else {
      console.log('✅ Supabase connection test successful');
    }
  } catch (err) {
    console.warn('⚠️ Could not test Supabase connection:', err);
  }
}

// Don't block initialization with the test
testConnection().catch(console.error);

export default supabase; 