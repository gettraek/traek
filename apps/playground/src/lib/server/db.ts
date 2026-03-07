import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import type { Database } from './database.types.js';

function getSupabaseClient() {
	const url = env.SUPABASE_URL;
	const key = env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
	return createClient<Database>(url, key, { auth: { persistSession: false } });
}

// Lazy singleton — created once per server process
let _client: ReturnType<typeof getSupabaseClient> | null = null;

export function db() {
	if (!_client) _client = getSupabaseClient();
	return _client;
}
