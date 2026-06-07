export type Gender = "male" | "female" | "other" | "prefer_not_to_say";

export const MALE_AVATARS = ["👨‍🎓", "🧑‍💻", "👨‍🏫", "🧑‍🔬", "👨‍💼", "🧑‍🎨"];
export const FEMALE_AVATARS = ["👩‍🎓", "👩‍💻", "👩‍🏫", "👩‍🔬", "👩‍💼", "👩‍🎨"];
export const NEUTRAL_AVATARS = ["🧑‍🎓", "🧑‍💻", "🧑‍🏫", "🧑‍🔬", "🧑‍💼", "🧑‍🎨"];

export function avatarsForGender(gender: Gender | string | null | undefined): string[] {
  switch (gender) {
    case "male": return MALE_AVATARS;
    case "female": return FEMALE_AVATARS;
    default: return NEUTRAL_AVATARS;
  }
}

export function randomAvatarForGender(gender: Gender | string | null | undefined): string {
  const pool = avatarsForGender(gender);
  return pool[Math.floor(Math.random() * pool.length)];
}

export const INTEREST_OPTIONS = [
  "DSA", "Web Dev", "AI/ML", "DBMS", "OS", "Networks", "Math",
  "Physics", "Chemistry", "Biology", "Design", "Business", "Finance",
  "React", "Python", "Java", "C++", "Go", "Rust", "LeetCode",
];
