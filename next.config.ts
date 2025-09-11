import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  turbopack: { root: __dirname }, // Tránh cảnh báo chọn nhầm lockfile ở thư mục khác
};

export default nextConfig;
