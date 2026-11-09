# Product

<!-- impeccable:product-schema 1 -->

Facts below come from the user's written brief (2026-11-09). Items marked *(inferred)* were not confirmed in an interview: the user asked to proceed without further questions.

## Platform

web

## Stack

Brief-pinned: Next.js App Router, TypeScript, Tailwind CSS, Supabase (auth, Postgres, private Storage), Framer Motion (`motion` package), Lucide icons. Delegated details: the public demo is a static export on GitHub Pages running in demo mode (browser storage); a real installation runs on Vercel with Supabase, because gallery passwords and signed URLs need a server.

## Users

- **The photographer or studio owner** who buys an installation. Works from a laptop when delivering a job: uploads a finished shoot, sets sharing rules, sends the link, later checks what the client picked.
- **The photographer's client** (couple, family, expectant parents, portrait subject, event host). Receives the link on WhatsApp, opens it on a phone, often in one hand, with no account. Wants to see, relive, share and download their photos, and sometimes choose which ones get edited or printed.
- **Erick** *(inferred from his business)*: sells the installation to photographers; shows the demo link on a phone during the pitch.

## Product Purpose

A premium delivery experience for finished photo shoots, replacing Google Drive folders and storage links. Success: the photographer thinks "this is how I want to deliver my work"; the client thinks "what an incredible way to receive my photos".

## Positioning

Sold per photographer as a branded installation, not a public SaaS. The photographer's brand (logo, studio name, accent color, contact) carries the client experience; the product itself stays nearly invisible. The cinematic presentation mode is the headline differentiator.

## Operating Context

- Client side: WhatsApp link → phone browser → cover opening → gallery grid → lightbox / presentation / downloads / favorites / formal selection.
- Photographer side: authenticated admin → dashboard → gallery management (upload, reorder, albums, cover, publish) → sharing rules (password, expiry, downloads, favorites, presentation) → branding settings → reading client favorites and selections.
- Galleries hold dozens to hundreds of high-resolution photos; originals must be stored and downloadable (single, multi-select, full ZIP).

## Capabilities and Constraints

- Unguessable gallery links (`/g/<client-slug>-<random>`), optional password, optional expiry, download permission, favorites permission, presentation toggle.
- Favorites (casual) and Selection (formal approval, finalized by the client) are separate systems.
- Real storage: originals + generated thumbnails/display sizes; private bucket with signed URLs; safe deletion; upload validation and configurable size/count limits.
- Events: gallery views and downloads are recorded for the dashboard.
- Never expose private keys or private storage; RLS isolates photographers.
- Demo mode stores data in the visitor's browser and checks passwords client-side; it must be labelled as a demonstration and never presented as real security.

## Brand Commitments

- Product name *(inferred)*: Revela ("revelar" = to develop a photograph). Each installation shows the photographer's own brand instead.
- Brief-pinned direction: predominantly light interface; white, off-white, black, soft grays; elegant modern typography; lots of whitespace; discreet borders; soft natural motion; images as the protagonists; mobile-first.
- Brief bans: generic AI-dashboard look, exaggerated gradients, unnecessary cards, icon overload, decorative elements without function, visual clutter, decorative buttons.

## Evidence on Hand

- Demo photos: four real photo series from Pexels (free license) in `public/demo/`, credited in README. They are stock, not the photographer's work, and must be labelled as demo content.
- No real photographer, client, testimonial, pricing or customer exists yet. Do not invent any.

## Product Principles

1. The photographs lead; the interface recedes until the moment it is needed.
2. Everything shown works: no decorative button, no simulated integration.
3. The client never needs an account, instructions or a laptop.
4. The photographer's brand, not Revela's, is what the client remembers.
5. Private by default: a gallery is only reachable through its link and rules.

## Accessibility & Inclusion

WCAG AA contrast, keyboard operation of grid, lightbox and presentation, reduced-motion alternatives for the presentation's Ken Burns motion, touch targets ≥44px for one-handed phone use.
