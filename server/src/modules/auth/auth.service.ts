import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { env } from "../../config/env.js";
import { User, type UserDoc } from "../../models/User.js";
import { Profile } from "../../models/Profile.js";
import { signToken } from "../../middleware/auth.js";

const googleClient = env.googleClientId ? new OAuth2Client(env.googleClientId) : null;

function publicUser(u: UserDoc) {
  return { id: String(u._id), email: u.email, createdAt: u.createdAt.toISOString() };
}

async function ensureProfile(userId: string, name: string) {
  const existing = await Profile.findOne({ userId });
  if (existing) return existing;
  const suffix = Math.floor(100000 + Math.random() * 900000);
  const publicId = `STUDY-${suffix}`;
  return Profile.create({
    userId,
    name: name || "New Student",
    publicId,
    avatar: null,
    subjects: [],
    profileCompleted: false,
  });
}

export async function signupWithEmail(email: string, password: string, name: string) {
  const existing = await User.findOne({ email });
  if (existing) {
    const e: any = new Error("An account with that email already exists");
    e.status = 409;
    throw e;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash });
  await ensureProfile(String(user._id), name);
  return { token: signToken(String(user._id)), user: publicUser(user) };
}

export async function loginWithEmail(email: string, password: string) {
  const user = await User.findOne({ email });
  if (!user || !user.passwordHash) {
    const e: any = new Error("Invalid email or password");
    e.status = 401;
    throw e;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const e: any = new Error("Invalid email or password");
    e.status = 401;
    throw e;
  }
  return { token: signToken(String(user._id)), user: publicUser(user) };
}

export async function loginWithGoogle(idToken: string) {
  if (!googleClient) {
    const e: any = new Error("Google sign-in not configured on server (GOOGLE_CLIENT_ID missing)");
    e.status = 501;
    throw e;
  }
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.googleClientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.email) {
    const e: any = new Error("Google token missing email");
    e.status = 400;
    throw e;
  }
  const { email, sub: googleId, name, picture } = payload;

  let user = await User.findOne({ $or: [{ googleId }, { email }] });
  if (!user) {
    user = await User.create({ email, googleId });
  } else if (!user.googleId) {
    user.googleId = googleId;
    await user.save();
  }
  await ensureProfile(String(user._id), name ?? email.split("@")[0]);
  return { token: signToken(String(user._id)), user: publicUser(user) };
}

export async function getMe(userId: string) {
  const user = await User.findById(userId);
  if (!user) {
    const e: any = new Error("User not found");
    e.status = 404;
    throw e;
  }
  return { user: publicUser(user) };
}
