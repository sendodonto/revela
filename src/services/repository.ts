import type { ProcessedImage } from '@/lib/image';
import type { Album, Gallery, GallerySummary, OpenResult, Photo, Selection, Stats, Studio, VisitorFavorites, EventType, ImageSize } from '@/types';

export interface NewGallery { title: string; clientName: string; description: string; eventDate: string | null }

/** Photographer side. Demo: this browser. Supabase: the signed-in photographer, isolated by RLS. */
export interface AdminRepository {
  mode: 'demo' | 'supabase';
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  getSession(): Promise<{ email: string } | null>;

  getStudio(): Promise<Studio>;
  saveStudio(studio: Studio): Promise<void>;
  /** Stores a logo or cover image and returns the reference to keep in Studio. */
  uploadBrandAsset(kind: 'logo' | 'cover', file: File): Promise<string>;
  /** Turns a stored Studio.logo / Studio.cover reference into a displayable URL. */
  brandUrl(ref: string | null): Promise<string | null>;

  stats(): Promise<Stats>;
  listGalleries(): Promise<GallerySummary[]>;
  getGallery(id: string): Promise<Gallery | null>;
  createGallery(input: NewGallery): Promise<Gallery>;
  updateGallery(gallery: Gallery): Promise<void>;
  setPassword(galleryId: string, password: string | null): Promise<void>;
  deleteGallery(id: string): Promise<void>;
  uploadMusic(galleryId: string, file: File): Promise<void>;

  listPhotos(galleryId: string): Promise<Photo[]>;
  uploadPhoto(galleryId: string, file: File, processed: ProcessedImage, onProgress: (fraction: number) => void): Promise<Photo>;
  deletePhotos(galleryId: string, ids: string[]): Promise<void>;
  reorderPhotos(galleryId: string, orderedIds: string[]): Promise<void>;
  movePhotos(galleryId: string, ids: string[], albumId: string | null): Promise<void>;
  photoUrls(photos: Photo[], size: ImageSize): Promise<Record<string, string>>;

  listAlbums(galleryId: string): Promise<Album[]>;
  createAlbum(galleryId: string, name: string): Promise<Album>;
  renameAlbum(albumId: string, name: string): Promise<void>;
  deleteAlbum(albumId: string): Promise<void>;

  listFavorites(galleryId: string): Promise<VisitorFavorites[]>;
  listSelections(galleryId: string): Promise<Selection[]>;
  reopenSelection(selectionId: string): Promise<void>;
}

export interface OriginalFile { id: string; name: string; url: string }

/** Client side: everything goes through the gallery link and its rules. */
export interface PublicRepository {
  /** Brand and contact of the studio that owns this installation. */
  studio(): Promise<Studio>;
  open(slug: string, password?: string): Promise<OpenResult>;
  originals(slug: string, photoIds: string[] | 'all'): Promise<OriginalFile[]>;
  getFavorites(slug: string): Promise<string[]>;
  setFavorite(slug: string, photoId: string, on: boolean): Promise<void>;
  getSelection(slug: string): Promise<Selection | null>;
  saveSelection(slug: string, photoIds: string[]): Promise<Selection>;
  submitSelection(slug: string, clientName: string, note: string): Promise<Selection>;
  logEvent(slug: string, type: EventType, count?: number): Promise<void>;
}
