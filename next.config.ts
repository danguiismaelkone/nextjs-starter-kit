import type { NextConfig } from "next";

/**
 * Origine S3-compatible (MinIO/R2/S3, ITEM-027) — les documents/avatars sont
 * prévisualisés via des URLs signées pointant directement vers ce host (`img-src`/
 * `frame-src`), donc dérivée dynamiquement de `S3_ENDPOINT` plutôt qu'écrite en dur
 * (le host change selon le déploiement : MinIO local, AWS S3, Cloudflare R2...).
 */
function storageOrigin(): string | null {
  try {
    return process.env.S3_ENDPOINT ? new URL(process.env.S3_ENDPOINT).origin : null
  } catch {
    return null
  }
}

function buildCsp(): string {
  const s3Origin = storageOrigin()

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'unsafe-inline' : Next.js injecte des scripts inline pour l'hydratation (pas
    // de nonce configuré — voir Notes techniques ITEM-055) ; gstatic.com : SDK
    // Firebase Messaging chargé par le service worker (ITEM-036).
    "script-src": ["'self'", "'unsafe-inline'", "https://www.gstatic.com"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", ...(s3Origin ? [s3Origin] : [])],
    "media-src": ["'self'", ...(s3Origin ? [s3Origin] : [])],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", "https://api.stripe.com", "https://*.googleapis.com", "https://*.firebaseio.com", ...(s3Origin ? [s3Origin] : [])],
    "frame-src": ["'self'", "https://js.stripe.com", "https://checkout.stripe.com"],
    "worker-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  }

  return Object.entries(directives)
    .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
    .join("; ")
}

const nextConfig: NextConfig = {
  // Image de production Docker légère (ITEM-064) : ne trace/copie que les
  // fichiers réellement nécessaires à l'exécution (`.next/standalone`) plutôt
  // que tout `node_modules` — voir Dockerfile.
  output: "standalone",
  async headers() {
    return [
      {
        // Durcissement transversal (ITEM-055) : CSP + en-têtes standard sur toutes
        // les réponses (pages et API — inoffensif pour du JSON, protège les pages).
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: buildCsp() },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
