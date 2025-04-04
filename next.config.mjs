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

  // Custom webpack configuration to fix caching issues
  webpack: (config, { dev, isServer }) => {
    // Fix for "Caching failed for pack: Error: Unable to snapshot resolve dependencies"
    if (dev) {
      // Disable file system cache in development mode
      config.cache = {
        type: 'memory',
        maxGenerations: 1
      };
    }
    
    // Return modified config
    return config;
  },
};

export default nextConfig;
