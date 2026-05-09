export interface Entry {
  id?: number;
  title?: string;
  content: string;
  content_format?: string;
  date?: string;
  preview_text?: string;
  district?: string;
  photo_url?: string;
  mood?: string;
  created_at?: string;
  updated_at?: string;
}

export type EntryPayload = Pick<Entry, 'content' | 'district' | 'title' | 'photo_url' | 'mood'>;

export type DiaryEntry = Entry & {
  date: string;
};

export type GroupedDiaryEntries = Record<string, DiaryEntry[]>;

export type CalendarEntry = Pick<Entry, 'id' | 'created_at' | 'photo_url'> & {
  timestamp: string;
};

export type MapEntry = Entry & {
  timestamp: string;
  lat: number;
  lng: number;
};
