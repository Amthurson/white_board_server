/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "192.168.31.99",
    "192.168.31.99:3005",
    "https://192.168.31.99:3005",
    "localhost",
    "localhost:3005",
    "https://localhost:3005",
  ],
  async rewrites() {
    return [
      {
        source: "/socket.io/:path*",
        destination: "http://127.0.0.1:3006/socket.io/:path*",
      },
    ];
  },
  transpilePackages: ["@excalidraw/excalidraw"],
};

export default nextConfig;
