export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  position: string | null;
  city: string | null;
  bio: string | null;
  phone: string | null;
  whatsapp: string | null;
  facebook: string | null;
  instagram: string | null;
  show_phone: boolean;
  show_whatsapp: boolean;
  show_facebook: boolean;
  show_instagram: boolean;
  matches_played: number;
  goals_scored: number;
  motm_awards: number;
  avg_rating: number;
  completion_rate: number;
  created_at: string;
}

export interface ProfileUpdate {
  name?: string;
  position?: string;
  city?: string;
  bio?: string;
  phone?: string;
  whatsapp?: string;
  facebook?: string;
  instagram?: string;
  show_phone?: boolean;
  show_whatsapp?: boolean;
  show_facebook?: boolean;
  show_instagram?: boolean;
  image?: string;
}

export const FOOTBALL_POSITIONS = [
  "Goalkeeper",
  "Right Back",
  "Center Back",
  "Left Back",
  "Defensive Midfielder",
  "Central Midfielder",
  "Attacking Midfielder",
  "Right Winger",
  "Left Winger",
  "Striker",
] as const;

export const PROFILE_FIELDS = [
  "id",
  "name",
  "email",
  "image",
  "position",
  "city",
  "bio",
  "phone",
  "whatsapp",
  "facebook",
  "instagram",
  "show_phone",
  "show_whatsapp",
  "show_facebook",
  "show_instagram",
  "matches_played",
  "goals_scored",
  "motm_awards",
  "avg_rating",
  "completion_rate",
  "created_at",
] as const;

export type PublicProfile = Pick<
  Profile,
  "id" | "name" | "image" | "position" | "city" | "bio"
>;

export function filterPublicProfile(
  profile: Profile,
  viewerId: string | null,
): PublicProfile & Partial<Pick<Profile, "phone" | "whatsapp" | "facebook" | "instagram">> {
  const isOwner = viewerId === profile.id;
  const result: PublicProfile & Partial<Pick<Profile, "phone" | "whatsapp" | "facebook" | "instagram">> = {
    id: profile.id,
    name: profile.name,
    image: profile.image,
    position: profile.position,
    city: profile.city,
    bio: profile.bio,
  };

  if (isOwner || profile.show_phone) result.phone = profile.phone;
  if (isOwner || profile.show_whatsapp) result.whatsapp = profile.whatsapp;
  if (isOwner || profile.show_facebook) result.facebook = profile.facebook;
  if (isOwner || profile.show_instagram) result.instagram = profile.instagram;

  return result;
}
