/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config: { externals: any[]; }) => {
    config.externals = [
      ...(config.externals || []),
      {
        '@prisma/client': '@prisma/client',
        '.prisma/client': '.prisma/client',
      },
    ];
    return config;
  },

  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
          },
        ],
      },
    ];
  },

  images: {
    domains: ['randomuser.me'],
  },

  experimental: {
    optimizeFonts: false 
  }
};

module.exports = nextConfig;
