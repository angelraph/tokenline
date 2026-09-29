/** @type {import('next').NextConfig} */
const nextConfig = {
  // Agents point their OpenAI/Anthropic SDK at https://<host>/v1
  async rewrites() {
    return [{ source: '/v1/:path*', destination: '/api/v1/:path*' }];
  },
};
export default nextConfig;
