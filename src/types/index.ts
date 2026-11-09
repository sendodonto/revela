export type ImageSize = 'thumb' | 'display' | 'original';

export interface Photo {
  id: string;
  galleryId: string;
  albumId: string | null;
  name: string;
  width: number;
  height: number;
  bytes: number;
  position: number;
  /** Tiny inline preview shown while the real image loads. */
  blur: string | null;
  createdAt: string;
}

export interface Album {
  id: string;
  galleryId: string;
  name: string;
  position: number;
}

export interface ShareSettings {
  hasPassword: boolean;
  expiresAt: string | null;
  allowDownload: boolean;
  allowFavorites: boolean;
  allowSelection: boolean;
  /** Maximum photos the client may pick in a formal selection; null = no limit. */
  selectionLimit: number | null;
  presentation: boolean;
  /** Seconds each photo stays on screen in the presentation. */
  slideSeconds: number;
  /** 'ambiente' (bundled track), 'custom' (uploaded by the photographer) or null. */
  music: 'ambiente' | 'custom' | null;
}

export interface Gallery {
  id: string;
  slug: string;
  title: string;
  clientName: string;
  description: string;
  eventDate: string | null;
  coverPhotoId: string | null;
  status: 'draft' | 'published';
  settings: ShareSettings;
  createdAt: string;
  updatedAt: string;
}

export interface GallerySummary extends Gallery {
  photoCount: number;
  views: number;
  downloads: number;
  favorites: number;
  selectionsSubmitted: number;
}

export interface Studio {
  name: string;
  photographerName: string;
  logo: string | null;
  accent: string;
  cover: string | null;
  email: string;
  phone: string;
  instagram: string;
  website: string;
  city: string;
}

export interface Stats {
  galleries: number;
  published: number;
  photos: number;
  bytes: number;
  views: number;
  downloads: number;
}

export interface Selection {
  id: string;
  galleryId: string;
  visitorId: string;
  clientName: string;
  note: string;
  photoIds: string[];
  status: 'open' | 'submitted';
  submittedAt: string | null;
  updatedAt: string;
}

export interface VisitorFavorites {
  visitorId: string;
  label: string;
  photoIds: string[];
  updatedAt: string;
}

/** What the client's browser receives: no password hash, no other client's data. */
export interface PublicPhoto extends Photo {
  thumb: string;
  display: string;
}

export interface PublicGallery {
  gallery: Omit<Gallery, 'status'>;
  studio: Studio;
  albums: Album[];
  photos: PublicPhoto[];
  musicUrl: string | null;
}

export type OpenResult =
  | { status: 'ok'; data: PublicGallery }
  | { status: 'locked'; title: string; studio: Studio; wrongPassword?: boolean }
  | { status: 'expired'; title: string; studio: Studio }
  | { status: 'not-found' };

export type EventType = 'view' | 'download';
