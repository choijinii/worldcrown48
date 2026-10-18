/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /**
   * Google account avatars come from lh3.googleusercontent.com when a user
   * signs in (D-1 handoff §9 trap 8). Allow that host so <Image /> and
   * raw <img> requests aren't 403'd by Next's image optimisation pipeline.
   */
  /**
   * FONT-1 — 자체 글꼴은 버전 이름 폴더(pretendard-1.3.9 · playfair-1.203)에 두므로 한 번 받으면
   * 다시 묻지 않게 한다. 글꼴을 바꿀 때는 폴더 이름(버전)을 바꾼다.
   */
  async headers() {
    return [
      {
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
