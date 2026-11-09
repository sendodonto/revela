import type { Album, Gallery, Selection, ShareSettings, Studio, VisitorFavorites } from '@/types';
import manifest from './demo-photos.json';

// Demo content: a fictional studio and four real photo series from Pexels (free license, credited in README).

export interface DemoPhoto {
  id: string;
  galleryId: string;
  albumId: string | null;
  name: string;
  width: number;
  height: number;
  bytes: number;
  position: number;
  blur: string | null;
  createdAt: string;
  /** Either a site path (bundled demo photo) or an idb: reference (uploaded in this browser). */
  files: { original: string; display: string; thumb: string };
}

export interface DemoEvent { galleryId: string; type: 'view' | 'download'; count: number; at: string }

export interface DemoDB {
  version: number;
  studio: Studio;
  galleries: (Gallery & { musicFile: string | null })[];
  albums: Album[];
  photos: DemoPhoto[];
  favoritesByGallery: Record<string, VisitorFavorites[]>;
  selections: Selection[];
  events: DemoEvent[];
  /** SHA-256 of `${galleryId}:${password}`. Demo only: checked in the browser, so it demonstrates the flow, not real protection. */
  passwords: Record<string, string>;
}

export const DEMO_VERSION = 1;
export const DEMO_LOGIN = { email: 'clara@revela.demo', password: 'revela2026' };

const days = (n: number) => new Date(Date.UTC(2026, 10, 9) - n * 86_400_000).toISOString();

const settings = (over: Partial<ShareSettings>): ShareSettings => ({
  hasPassword: false,
  expiresAt: null,
  allowDownload: true,
  allowFavorites: true,
  allowSelection: false,
  selectionLimit: null,
  presentation: true,
  slideSeconds: 6,
  music: 'ambiente',
  ...over,
});

type SetKey = keyof typeof manifest;

const SERIES: { key: SetKey; gallery: Omit<Gallery, 'createdAt' | 'updatedAt' | 'coverPhotoId'> & { cover: string; created: number }; albums?: { name: string; ids: string[] }[] }[] = [
  {
    key: 'casamento-helena-rafael',
    gallery: {
      id: 'g-helena', slug: 'helena-e-rafael-x8k29qhm', title: 'Casamento', clientName: 'Helena & Rafael',
      description: 'Cerimônia na capela e retratos no casarão, numa tarde de setembro.',
      eventDate: '2026-09-12', status: 'published', cover: '28322761', created: 41,
      settings: settings({ slideSeconds: 6 }),
    },
    albums: [
      { name: 'Cerimônia', ids: ['28322745', '28322746', '28322747', '28322748', '28322749', '28322750', '28322751', '28322752', '28322753', '28322754', '28322755'] },
      { name: 'Retratos', ids: [] },
    ],
  },
  {
    key: 'gestante-julia-daniel',
    gallery: {
      id: 'g-julia', slug: 'julia-e-daniel-m4tz7rwa', title: 'Ensaio gestante', clientName: 'Júlia & Daniel',
      description: 'Fim de tarde no parque, à espera da Alice. Escolham as 15 fotos do álbum impresso.',
      eventDate: '2026-10-04', status: 'published', cover: '18417198', created: 30,
      settings: settings({ allowSelection: true, selectionLimit: 15, slideSeconds: 5 }),
    },
    albums: [
      { name: 'Campo', ids: ['18417169', '18417170', '18417171', '18417172', '18417173', '18417174', '18417175', '18417176', '18417182', '18417198', '18417199'] },
      { name: 'Bosque', ids: [] },
    ],
  },
  {
    key: 'ensaio-beatriz-livraria',
    gallery: {
      id: 'g-beatriz', slug: 'beatriz-livraria-q2hn8kpe', title: 'Ensaio na livraria', clientName: 'Beatriz',
      description: 'Retratos entre estantes e janelas, com a luz da manhã.',
      eventDate: '2026-10-20', status: 'published', cover: '31987757', created: 16,
      settings: settings({ hasPassword: true, allowDownload: false, expiresAt: '2027-01-31T23:59:00Z', music: null }),
    },
  },
  {
    key: 'retratos-luana-centro',
    gallery: {
      id: 'g-luana', slug: 'luana-centro-v7cd3xjs', title: 'Retratos no centro', clientName: 'Luana',
      description: '', eventDate: '2026-11-02', status: 'draft', cover: '31987741', created: 5,
      settings: settings({ presentation: false }),
    },
  },
];

export function buildSeed(): DemoDB {
  const galleries: DemoDB['galleries'] = [];
  const albums: Album[] = [];
  const photos: DemoPhoto[] = [];

  for (const { key, gallery, albums: albumDefs } of SERIES) {
    const { cover, created, ...g } = gallery;
    const albumIds = (albumDefs ?? []).map((a, i) => {
      const album: Album = { id: `${g.id}-a${i}`, galleryId: g.id, name: a.name, position: i };
      albums.push(album);
      return { ...album, ids: new Set(a.ids) };
    });
    manifest[key].forEach((p, i) => {
      const explicit = albumIds.find((a) => a.ids.has(p.id));
      const albumId = explicit?.id ?? albumIds.find((a) => a.ids.size === 0)?.id ?? null;
      photos.push({
        id: `p-${p.id}`, galleryId: g.id, albumId, name: `${p.id}.jpg`, width: p.width, height: p.height, bytes: p.bytes,
        position: i, blur: p.blur, createdAt: days(created),
        files: { original: `/demo/${key}/original/${p.id}.jpg`, display: `/demo/${key}/display/${p.id}.webp`, thumb: `/demo/${key}/thumb/${p.id}.webp` },
      });
    });
    galleries.push({ ...g, coverPhotoId: `p-${cover}`, createdAt: days(created), updatedAt: days(Math.max(1, created - 2)), musicFile: null });
  }

  const ids = (key: SetKey, picks: number[]) => picks.map((i) => `p-${manifest[key][i].id}`);
  const studio: Studio = {
    name: 'Clara Moraes Fotografia', photographerName: 'Clara Moraes', logo: null, accent: '#a33a2a',
    cover: '/demo/casamento-helena-rafael/display/28322763.webp', email: 'contato@claramoraes.demo', phone: '',
    instagram: '@claramoraes.demo', website: '', city: 'Curitiba, PR',
  };

  return {
    version: DEMO_VERSION,
    studio,
    galleries,
    albums,
    photos,
    favoritesByGallery: {
      'g-helena': [{ visitorId: 'demo-helena', label: 'Visitante 1', photoIds: ids('casamento-helena-rafael', [2, 5, 9, 14, 15, 18, 22, 25, 27]), updatedAt: days(3) }],
      'g-julia': [{ visitorId: 'demo-julia', label: 'Visitante 1', photoIds: ids('gestante-julia-daniel', [1, 4, 8, 12, 20]), updatedAt: days(6) }],
    },
    selections: [{
      id: 's-julia', galleryId: 'g-julia', visitorId: 'demo-julia', clientName: 'Júlia Andrade',
      note: 'Amamos! Essas são as do álbum. Dá para deixar a 7 em preto e branco?',
      photoIds: ids('gestante-julia-daniel', [0, 1, 3, 4, 6, 8, 10, 12, 14, 16, 17, 19, 20, 21]),
      status: 'submitted', submittedAt: days(5), updatedAt: days(5),
    }],
    events: [
      ...[38, 37, 37, 35, 30, 22, 12, 4, 2].map((d, i) => ({ galleryId: 'g-helena', type: 'view' as const, count: [14, 9, 6, 3, 5, 2, 4, 1, 2][i], at: days(d) })),
      { galleryId: 'g-helena', type: 'download', count: 29, at: days(37) },
      { galleryId: 'g-helena', type: 'download', count: 6, at: days(12) },
      ...[28, 27, 20, 6, 5].map((d, i) => ({ galleryId: 'g-julia', type: 'view' as const, count: [8, 4, 3, 2, 3][i], at: days(d) })),
      { galleryId: 'g-julia', type: 'download', count: 3, at: days(20) },
      ...[14, 13, 9].map((d, i) => ({ galleryId: 'g-beatriz', type: 'view' as const, count: [5, 2, 1][i], at: days(d) })),
    ],
    passwords: { 'g-beatriz': '3f0ec90bcc35133301a7ec530e2bd4168df063c99ded3fff19d5c181703e5ece' },
  };
}

/** Password of the protected demo gallery, shown on the demo home page so a visitor can try the flow. */
export const DEMO_GALLERY_PASSWORD = 'livraria';
