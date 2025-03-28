/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static optimization where possible
  output: 'standalone',
  
  // Optimize images
  images: {
    domains: ['zyiaaqrqgbvzxqpwfvuk.supabase.co'], // Add your Supabase URL domain
    minimumCacheTTL: 60,
  },
  
  // Strict mode for better development
  reactStrictMode: true,
  
  // Disable x-powered-by header
  poweredByHeader: false,
  
  // Enable compression
  compress: true,
};

export default nextConfig;
