/** @type {import('next').NextConfig} */
const nextConfig = {
  // Agents point their OpenAI/Anthropic SDK at https://<host>/v1
  async rewrites() {
    return [
      { source: '/v1/:path*', destination: '/api/v1/:path*' },
      // Remote MCP endpoint: https://<host>/mcp
      { source: '/mcp', destination: '/api/mcp' },
    ];
  },
};
export default nextConfig;
