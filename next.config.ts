module.exports = {
  webpack: (config: { externals: any[]; }) => {
    config.externals = [...config.externals, { 
      '@prisma/client': '@prisma/client',
      '.prisma/client': '.prisma/client' 
    }];
    return config;
  },
};