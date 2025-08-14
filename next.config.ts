import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },      // 빌드에서 ESLint 무시
  typescript: { ignoreBuildErrors: true },   // 타입 오류도 임시 무시(선택)
};

export default nextConfig;
