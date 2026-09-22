const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    // Vercel Functions have a fixed 4.5MB request-body ceiling that this can't raise; kept just under
    // it (and above the app-level checks in lib/actions/legacyImport.js) so local dev matches production.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
