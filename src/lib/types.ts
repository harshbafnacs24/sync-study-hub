// Shared API types for Sync & Study.

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface Profile {
  userId: string;
  name: string;
  avatar?: string | null;
  bio?: string | null;
  school?: string | null;
  year?: string | null;
  subjects: string[];
  goals?: string | null;
  timezone?: string | null;
  updatedAt?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export type ProfilePatch = Partial<
  Pick<Profile, "name" | "avatar" | "bio" | "school" | "year" | "subjects" | "goals" | "timezone">
>;
