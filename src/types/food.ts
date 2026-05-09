export interface FoodPhoto {
  id: number;
  user_id: number;
  group_id?: string | null;
  photo_url: string;
  caption?: string | null;
  shot_date: string;
  shot_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoodPhotoComment {
  id: number;
  food_photo_id: number;
  content: string;
  created_at: string;
}

export interface FoodPhotoGroup {
  group_id: string;
  caption?: string | null;
  photos: FoodPhoto[];
}

export interface FoodPhotoDay {
  date: string;
  photos_count: number;
  groups: FoodPhotoGroup[];
}

export interface FoodBatchUploadResult {
  type: 'FOOD_PHOTO' | 'INFO';
  summary?: string | null;
  food_name?: string | null;
  track_id?: string | null;
  photos: FoodPhoto[];
  entry_id?: number | null;
  date?: string | null;
  processed_count: number;
  photo_count: number;
  info_count: number;
}