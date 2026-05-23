import dotenv from "dotenv";
dotenv.config();

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: required("MONGO_URI", "mongodb://127.0.0.1:27017/sync_and_study"),
  jwtSecret: required("JWT_SECRET", "dev-only-insecure-secret"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:5173,capacitor://localhost,http://localhost")
    .split(",").map((s) => s.trim()).filter(Boolean),
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
};
