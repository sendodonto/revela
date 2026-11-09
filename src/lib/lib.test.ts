import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gallerySlug } from './slug.ts';
import { justify } from './justify.ts';
import { formatBytes, formatDate, isExpired, plural } from './format.ts';

test('gallerySlug normalizes names and appends an unguessable suffix', () => {
  const s = gallerySlug('Ana & Pedro Ávila');
  assert.match(s, /^ana-e-pedro-avila-[a-z2-9]{8}$/);
  assert.notEqual(gallerySlug('Ana'), gallerySlug('Ana'));
  assert.match(gallerySlug('!!!'), /^galeria-[a-z2-9]{8}$/);
});

test('justify fills rows to the container width and keeps aspect ratios', () => {
  const items = [{ width: 3000, height: 2000 }, { width: 2000, height: 3000 }, { width: 3000, height: 2000 }, { width: 2000, height: 2000 }];
  const rows = justify(items, 1000, 300, 8);
  for (const row of rows.slice(0, -1)) {
    const total = row.items.reduce((s, i) => s + i.width, 0) + 8 * (row.items.length - 1);
    assert.ok(Math.abs(total - 1000) < 0.01);
  }
  const last = rows.at(-1)!;
  assert.ok(last.height <= 300);
  assert.equal(rows.flatMap((r) => r.items).length, items.length);
  const first = rows[0].items[0];
  assert.ok(Math.abs(first.width / rows[0].height - 1.5) < 1e-9);
});

test('format helpers', () => {
  assert.equal(formatDate('2026-03-14'), '14 de março de 2026');
  assert.equal(plural(1, 'foto', 'fotos'), '1 foto');
  assert.equal(formatBytes(512), '1 KB');
  assert.equal(formatBytes(5 * 1024 * 1024), '5 MB');
  assert.equal(isExpired(null), false);
  assert.equal(isExpired('2000-01-01T00:00:00Z'), true);
});

import { accessState, cleanSelection, downloadName } from './rules.ts';

test('accessState applies publish, expiry and password rules in that order', () => {
  const s = { hasPassword: false, expiresAt: null } as never;
  const g = (status: 'draft' | 'published', settings: object) => ({ status, settings: { ...(s as object), ...settings } }) as never;
  assert.equal(accessState(g('draft', {})), 'not-found');
  assert.equal(accessState(g('published', { expiresAt: '2000-01-01T00:00:00Z', hasPassword: true })), 'expired');
  assert.equal(accessState(g('published', { hasPassword: true })), 'locked');
  assert.equal(accessState(g('published', {})), 'ok');
});

test('cleanSelection dedupes, drops unknown photos and enforces the limit', () => {
  const valid = new Set(['a', 'b', 'c']);
  assert.deepEqual(cleanSelection(['a', 'a', 'x', 'b'], valid, null), ['a', 'b']);
  assert.throws(() => cleanSelection(['a', 'b', 'c'], valid, 2), /limite/);
});

test('downloadName numbers files and strips the random suffix', () => {
  assert.equal(downloadName('helena-e-rafael-x8k29qhm', 6, 'IMG_1.JPG'), 'helena-e-rafael-007.jpg');
});
