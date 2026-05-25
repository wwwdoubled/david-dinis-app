/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  // v3.20.17: remove console.* em production builds (mantém .error e .warn)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
};
