import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/server/admin-client';
import { toStudio } from '@/services/supabase-repository';

// Public studio card for the home page: one installation = one studio. Only brand and contact fields leave the server.
export async function GET() {
  const db = adminClient();
  const { data } = await db.from('studios').select('*').order('updated_at').limit(1).maybeSingle();
  const studio = toStudio(data);
  const refs = [studio.logo, studio.cover].filter((x): x is string => !!x);
  const signed = refs.length ? ((await db.storage.from('galleries').createSignedUrls(refs, 3600)).data ?? []).map((d) => d.signedUrl) : [];
  let k = 0;
  return NextResponse.json({ ...studio, logo: studio.logo ? signed[k++] : null, cover: studio.cover ? signed[k++] : null }, { headers: { 'Cache-Control': 'private, max-age=300' } });
}
