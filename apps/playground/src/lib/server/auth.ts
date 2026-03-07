import { Lucia } from 'lucia';
import type { DatabaseSession, DatabaseUser, Adapter } from 'lucia';
import { db } from './db.js';

// Minimal Supabase adapter for Lucia v3
class SupabaseLuciaAdapter implements Adapter {
	async getSessionAndUser(
		sessionId: string
	): Promise<[session: DatabaseSession | null, user: DatabaseUser | null]> {
		const { data: sessionRow } = await db()
			.from('sessions')
			.select('id, user_id, expires_at')
			.eq('id', sessionId)
			.maybeSingle();
		if (!sessionRow) return [null, null];

		const { data: userRow } = await db()
			.from('users')
			.select('id, email')
			.eq('id', sessionRow.user_id)
			.maybeSingle();
		if (!userRow) return [null, null];

		return [
			{
				id: sessionRow.id,
				userId: sessionRow.user_id,
				expiresAt: new Date(sessionRow.expires_at),
				attributes: {}
			},
			{ id: userRow.id, attributes: { email: userRow.email } }
		];
	}

	async getUserSessions(userId: string): Promise<DatabaseSession[]> {
		const { data } = await db()
			.from('sessions')
			.select('id, user_id, expires_at')
			.eq('user_id', userId);
		return (data ?? []).map((s) => ({
			id: s.id,
			userId: s.user_id,
			expiresAt: new Date(s.expires_at),
			attributes: {}
		}));
	}

	async setSession(session: DatabaseSession) {
		await db().from('sessions').upsert({
			id: session.id,
			user_id: session.userId,
			expires_at: session.expiresAt.toISOString()
		});
	}

	async updateSessionExpiration(sessionId: string, expiresAt: Date) {
		await db().from('sessions').update({ expires_at: expiresAt.toISOString() }).eq('id', sessionId);
	}

	async deleteSession(sessionId: string) {
		await db().from('sessions').delete().eq('id', sessionId);
	}

	async deleteUserSessions(userId: string) {
		await db().from('sessions').delete().eq('user_id', userId);
	}

	async deleteExpiredSessions() {
		await db().from('sessions').delete().lt('expires_at', new Date().toISOString());
	}
}

export const lucia = new Lucia(new SupabaseLuciaAdapter(), {
	sessionCookie: {
		attributes: {
			secure: process.env.NODE_ENV === 'production'
		}
	},
	getUserAttributes(attributes: { email?: string }) {
		return { email: attributes.email };
	}
});

declare module 'lucia' {
	interface Register {
		Lucia: typeof lucia;
		DatabaseUserAttributes: { email: string };
	}
}
