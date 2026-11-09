import { DEMO } from '@/lib/config';
import { createDemoAdmin, createDemoPublic } from './demo-repository';
import { createHttpPublic } from './http-public';
import type { AdminRepository, PublicRepository } from './repository';
import { createSupabaseAdmin } from './supabase-repository';

let admin: AdminRepository | null = null;
let pub: PublicRepository | null = null;

export const getAdmin = () => (admin ??= DEMO ? createDemoAdmin() : createSupabaseAdmin());
export const getPublic = () => (pub ??= DEMO ? createDemoPublic() : createHttpPublic());
export { DEMO };
