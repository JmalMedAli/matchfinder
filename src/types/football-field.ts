export interface FootballField {
  id: string;
  name: string;
  address: string | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  created_at: string;
}
