---
name: Revela
description: A private exhibition for every finished photo shoot.
colors:
  accent: "#a33a2a"
  wall: "#fbfbf9"
  wall-2: "#f3f2ee"
  paper: "#ffffff"
  rule: "#e7e6e1"
  rule-2: "#d3d2cc"
  ink: "#121212"
  ink-2: "#45443f"
  ink-3: "#66655f"
  room: "#0b0b0b"
  room-2: "#1b1b1a"
  screening: "#000000"
  danger: "#a1261b"
  ok: "#2f6b3c"
typography:
  display:
    fontFamily: "Libre Caslon Display, Big Caslon, Georgia, serif"
    fontSize: "clamp(42px, 6vw, 84px)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.012em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    fontFeature: "\"tnum\", \"lnum\""
  caption:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.33
    fontFeature: "\"tnum\", \"lnum\""
rounded:
  none: "0px"
  sm: "8px"
  field: "10px"
  row: "12px"
  dialog: "18px"
  sheet: "22px"
  pill: "9999px"
spacing:
  gutter-mobile: "8px"
  margin-mobile: "16px"
  gutter-desktop: "28px"
  margin-desktop: "48px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.wall}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "#2a2a28"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  button-ghost:
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    height: "44px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "0 14px"
    height: "44px"
  sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
  photo-tile:
    rounded: "{rounded.none}"
  wall-label:
    textColor: "{colors.ink-3}"
    typography: "{typography.caption}"
  lightbox:
    backgroundColor: "{colors.room}"
    textColor: "{colors.paper}"
  presentation:
    backgroundColor: "{colors.screening}"
    textColor: "{colors.paper}"
---

# Design System: Revela

## Overview

**Creative North Star: "The White-Cube Exhibition"**

Every delivery is a private show. The gallery opens like a title wall with the client's names lettered large, hangs the work on a quiet off-white wall with small museum labels under each print, and the presentation is the darkened screening room. The interface is the gallery building, not the art: wall white ground, ink type, hairline rules instead of boxes, and photographs that are never rounded, framed or covered by chrome at rest.

Density is low and deliberate on the client side (generous margins, captioned works, one primary action per view) and calm but practical in the admin, which shares the same wall, ink, Geist and pill controls without the display serif. The photographer's own brand owns the experience: their mark sits on the cover, their accent colors the states. Revela itself stays almost invisible.

Confirmed rejections from the brief and the shipped build: cover banner over rounded masonry thumbnails, icon toolbars over images, gradients, decorative cards, generic AI-dashboard chrome.

**Key Characteristics:**
- Wall white ground, pure white only on raised surfaces (fields, sheets, secondary buttons).
- Client names in a vinyl-lettering display serif; everything else in Geist with tabular numerals.
- Square-cornered photographs in justified rows, each with a "Nº 07 · Álbum" wall label.
- Controls are 9999px pills or bare text; the photographer's accent marks state only.
- Two dark rooms: the lightbox (#0b0b0b) and the presentation (pure black, auto-hiding chrome).

## Colors

A near-neutral gallery palette of wall whites, warm graphite inks and two black rooms, with a single borrowed accent.

### Primary
- **Photographer's Accent** (default Fired Oxide, configurable per studio via `--accent`): state only. Filled favorite hearts and the filled check of a chosen photo in a formal selection, plus the text caret. Never a button fill, never a background, never decoration.

### Neutral
- **Wall White** (wall): the page ground everywhere on the light side; also the text color on ink buttons and the selection highlight text.
- **Storage Wall** (wall-2): skeleton loaders, the demo notice band, disabled fields, missing-cover placeholder.
- **Raised White** (paper): only on things that sit off the wall: inputs, sheets/dialogs, secondary buttons.
- **Hairline** (rule): 1px dividers between sections and list rows, progress track.
- **Hairline Strong** (rule-2): control borders (fields, secondary buttons, the presentation play ring), switch off-track, scrollbar thumb.
- **Ink** (ink): primary text, primary button fill, switch on-track, focus ring, progress fill, text selection background.
- **Graphite** (ink-2): form labels, secondary text, admin nav items.
- **Label Gray** (ink-3): wall labels, metadata lines (event type · date · count), hints, placeholders. Darkens to #3d3c38 under `prefers-contrast: more`.
- **Viewing Room** (room) and **Room Panel** (room-2): the lightbox ground and its raised elements.
- **Screening Black** (screening): presentation mode and its title and end cards.
- **Danger** (danger) and **Ok** (ok): destructive actions/errors and success toasts. Functional only.

### Named Rules
**The Borrowed Accent Rule.** The accent belongs to the photographer and means "you marked this": favorite hearts and chosen checks. Primary actions are ink, not accent.

**The Raised White Rule.** Pure white appears only on surfaces lifted off the wall. The wall itself is never #fff.

## Typography

**Display Font:** Libre Caslon Display (with Big Caslon, Georgia, serif)
**Body Font:** Geist (with ui-sans-serif, system-ui, -apple-system)

**Character:** Vinyl gallery lettering against a precise, neutral grotesk. The serif names the show; Geist does every job.

### Hierarchy
- **Display** (400, 42px phone / 60px tablet / 84px wide desktop, line-height 1.02, -0.012em): client names on the gallery cover; client name on the presentation title and end cards (40px / 60-64px); studio name on the home (44px / 60px); gallery title on the password gate and in the admin gallery page header (34-40px).
- **Headline** (Geist 600, 26px / 30px, -0.02em): admin page titles and the dashboard greeting.
- **Title** (Geist 600, 17-19px): sheet titles (19px), empty-state titles (17px).
- **Body** (Geist 400, 15px, line-height 1.625): descriptions, switch labels, sheet copy; cover description capped at 46ch.
- **Label** (Geist 500, 13-14px, tabular numerals where figures appear): field labels, buttons (13/14/15px by size), metadata line under the display title (14-15px, ink-3, separated by " · ").
- **Caption** (Geist 400, 12px, tabular): wall labels under works, admin footnotes.

### Named Rules
**The Show Title Rule.** Libre Caslon Display is reserved for show titles: client and gallery names, and the studio name on the home. Admin page titles, greetings, headings of utility views and system messages are Geist semibold.

**The Fixed Cell Rule.** Every count, number and date is set with tabular lining numerals so figures never jump as they change ("12 / 29", "Nº 07").

## Layout

The client gallery is a full-width wall up to 1680px. The photo grid uses **justified rows**: each row is scaled so its photographs share one height and fill the width exactly, with target row heights of 160px on phones, 270px on desktop and 320px above 1400px. Gutters are 28px with 48px side margins on desktop, 8px gutters with 16px margins on phones (rows separated by 14px on phones to leave room for labels).

The cover is a split title wall on desktop (photograph ~60% left at full viewport height, names and actions bottom-aligned on the right) and stacked on phones (photograph at 66svh, min 380px, title block below). Admin screens sit in a 1180px column with 16px / 32px side padding beside a fixed nav rail from `lg` up.

Sheets are bottom sheets on phones (full width, safe-area padding) and centered panels from `sm` up (448px, or 672px for large). Touch targets are 44px minimum (icon buttons, heart and check hit areas).

## Elevation & Depth

Flat by default. Depth comes from tone (wall vs raised white vs the dark rooms) and from translucent material, not from shadows. Floating chrome over scrolling photographs uses a frosted wall material (82% wall white, 18px blur, 170% saturation) or its dark counterpart (55% room, 18px blur); both fall back to solid under `prefers-reduced-transparency`.

### Shadow Vocabulary
- **Float** (`0 1px 2px rgb(18 18 18 / 0.06), 0 12px 32px -14px rgb(18 18 18 / 0.28)`): toasts.
- **Sheet** (`0 -1px 0 rgb(18 18 18 / 0.04), 0 -18px 48px -28px rgb(18 18 18 / 0.4)`): dialogs and bottom sheets.
- **Icon lift** (`drop-shadow(0 1px 3px rgb(0 0 0 / 0.55))`): white heart and check glyphs over photographs, for legibility on any image.

### Named Rules
**The No Frame Rule.** Photographs never carry a shadow, border or radius. They hang directly on the wall.

## Shapes

Two shape families that never mix: photographs are square-cornered (0px) everywhere, in grid, cover, lightbox and presentation; controls are full pills (9999px) or bare text. Containers soften only where they are interactive surfaces: inputs 10px, admin nav items 8px, hover-highlighted list rows 12px, dialogs 18px, bottom sheets 22px top corners. Structure is drawn with 1px hairlines, not boxes.

## Components

### Buttons
Quiet, confident pills with instant press feedback.
- **Shape:** full pill (9999px); sizes 36 / 44 / 48px tall with 14 / 20 / 24px horizontal padding.
- **Primary:** ink fill, wall-white text, Geist 500; hovers to #2a2a28.
- **Secondary:** raised white with a hairline-strong border; border darkens toward ink on hover.
- **Ghost:** bare ink text, 5% ink wash on hover. Bare-text actions with a small ringed glyph (the cover's "Assistir à apresentação") are the secondary path on the title wall.
- **Danger / Light:** danger fill for destructive confirms; white fill for actions inside dark rooms.
- **Press:** every pressable scales to 0.96 on `:active` (140ms, ease-out-expo). Focus is a 2px ink outline offset 2px (white inside dark rooms).

### Inputs / Fields
- **Style:** raised white, 1px hairline-strong border, 10px radius, 44px tall, 15px text; label above in 13px Graphite, hint below in Label Gray.
- **Focus:** border goes to ink, no glow. **Error:** danger border and danger hint text. **Disabled:** storage-wall fill.

### Switch
A labelled row: label and description left, a 48x28 pill track right (ink when on, hairline-strong when off) with a white thumb that settles over 300ms.

### Sheets
Native dialog; rises 20px and fades in, leaves along the same path; backdrop dims to 36% ink. Title in 19px Geist semibold with a round close button.

### Navigation
Client: a frosted top bar (56px) with the studio mark and a horizontally scrolling filter tab row (fade mask on phones). Admin: left rail of 36px rows, 14px text, active row on a 7% ink wash with medium weight; collapses to a top bar below `lg`.

### Photo Tile and Wall Label (signature)
Square-cornered photograph in a justified row, fading up from an inline blur placeholder (480ms). Under it, always, a caption in 12px tabular Label Gray: "Nº 07 · Álbum"; the album is dropped when the tile is narrower than 130px. Heart (bottom-right) and selection check (top-right) are bare white glyphs with 44px hit areas, hidden until hover on pointer devices and always visible when active; when active they fill with the photographer's accent, the heart with a 380ms pop.

### Viewing Room (lightbox) and Screening Room (presentation)
The lightbox is a #0b0b0b room: the print grows from its grid position, swipes between works, carries "n / total" in tabular figures and its label line. The presentation is pure black with chrome that hides itself and the cursor when idle; it opens on a title card with the client's names (fades and blurs in and out over 3.2s) and closes on a slow 1.6s end card.

### Motion
Entrances rise 12px over 640ms on ease-out-expo `cubic-bezier(0.16, 1, 0.3, 1)`, staggered by delay; springs settle on `cubic-bezier(0.22, 1, 0.36, 1)`. Under `prefers-reduced-motion`, every animation and transition collapses to 1ms and the presentation title card is shown still.

## Do's and Don'ts

### Do:
- **Do** set the client's names as the display title on the cover, the presentation title card and the end card, with event type · date · count beneath in Geist Label Gray.
- **Do** caption every work with its wall label ("Nº 07 · Álbum") wherever it appears.
- **Do** keep photographs square-cornered in justified rows: 28px gutters / 48px margins on desktop, 8px / 16px on phones.
- **Do** use ink for primary actions and reserve the photographer's accent for favorite hearts and chosen checks.
- **Do** use tabular numerals for every count, index and date.
- **Do** keep touch targets at 44px or more and give every icon-only button an accessible label.

### Don't:
- **Don't** round, frame, shadow or overlay persistent chrome on a photograph.
- **Don't** use Libre Caslon Display for admin titles, greetings, utility headings or system messages.
- **Don't** fill buttons, backgrounds or decoration with the accent color.
- **Don't** use pure white as the page ground; it marks raised surfaces only.
- **Don't** box content in cards where a 1px hairline divides it.
- **Don't** add gradients beyond the short legibility scrim behind the studio mark on the cover.
