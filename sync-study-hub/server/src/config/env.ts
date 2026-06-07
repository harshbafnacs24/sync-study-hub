import dotenv from "dotenv";
dotenv.config();

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const configuredOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const defaultOrigins = [
  "http://localhost",
  "capacitor://localhost",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "https://sync-study-hub.harshbafna-cs24.workers.dev"
];

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGO_URI ?? process.env.MONGODB_URI ?? process.env.MONGO_URL ?? process.env.MONGODB_URL ?? "mongodb://127.0.0.1:27017/sync_and_study",
  jwtSecret: required("JWT_SECRET", "dev-only-insecure-secret"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  corsOrigins: Array.from(new Set([...configuredOrigins, ...defaultOrigins])),
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
};
