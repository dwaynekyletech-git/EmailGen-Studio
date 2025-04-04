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

  // Custom webpack configuration to fix caching issues and transpile pdf-lib
  webpack: (config, { dev, isServer }) => {
    // Fix for "Caching failed for pack: Error: Unable to snapshot resolve dependencies"
    if (dev) {
      // Disable file system cache in development mode
      config.cache = {
        type: 'memory',
        maxGenerations: 1
      };
    }
    
    // Add pdf-lib to transpiled modules list
    config.module.rules.push({
      test: /\.m?js$/,
      include: [
        /node_modules\/pdf-lib/,
      ],
      use: {
        loader: 'babel-loader',
        options: {
          presets: [
            ['@babel/preset-env']
          ]
        }
      }
    });
    
    // Return modified config
    return config;
  },

  // Explicitly tell Next.js to handle pdf-lib as a dependency
  transpilePackages: ['pdf-lib'],
};

export default nextConfig;
