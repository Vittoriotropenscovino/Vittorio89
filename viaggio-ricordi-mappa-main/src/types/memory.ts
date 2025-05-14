
export interface Memory {
  id: string;
  place: string;
  description: string;
  date: string;
  location: {
    lat: number;
    lng: number;
  };
  media?: MediaItem[];
  thumbnail?: string;
}

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
}
