export type Gender = "male" | "female" | "other" | "prefer_not_to_say";

const MALE_AVATARS = ["👨‍🎓", "🧑‍💻", "👨‍🏫", "🧑‍🔬", "👨‍💼", "🧑‍🎨"];
const FEMALE_AVATARS = ["👩‍🎓", "👩‍💻", "👩‍🏫", "👩‍🔬", "👩‍💼", "👩‍🎨"];
const NEUTRAL_AVATARS = ["🧑‍🎓", "🧑‍💻", "🧑‍🏫", "🧑‍🔬", "🧑‍💼", "🧑‍🎨"];

export function avatarsForGender(gender: Gender | string | null | undefined): string[] {
  switch (gender) {
    case "male":
      return MALE_AVATARS;
    case "female":
      return FEMALE_AVATARS;
    default:
      return NEUTRAL_AVATARS;
  }
}

export function randomAvatarForGender(gender: Gender | string | null | undefined): string {
  const pool = avatarsForGender(gender);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function isValidEmojiAvatar(avatar: string, gender: Gender | string | null | undefined): boolean {
  return avatarsForGender(gender).includes(avatar);
}
