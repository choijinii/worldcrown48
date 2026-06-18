/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /**
   * Google account avatars come from lh3.googleusercontent.com when a user
   * signs in (D-1 handoff §9 trap 8). Allow that host so <Image /> and
   * raw <img> requests aren't 403'd by Next's image optimisation pipeline.
   */
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
