/** @type {import('next').NextConfig} */
const nextConfig = {
  // Share cards read bundled fonts from disk at runtime.
  outputFileTracingIncludes: { '/**/opengraph-image*': ['./assets/fonts/**'] },
  // Agents point their OpenAI/Anthropic SDK at https://<host>/v1
  async rewrites() {
    return [
      { source: '/v1/:path*', destination: '/api/v1/:path*' },
      // Remote MCP endpoint: https://<host>/mcp
      { source: '/mcp', destination: '/api/mcp' },
    ];
  },
  // Blink share links. Wallet-aware clients read /actions.json; browsers land on My line.
  async redirects() {
    return [
      { source: '/repay', destination: '/account', permanent: false },
      { source: '/lock', destination: '/account', permanent: false },
    ];
  },
};
export default nextConfig;
