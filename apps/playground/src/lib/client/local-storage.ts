import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface ConversationMeta {
	id: string;
	title: string;
	createdAt: string;
	updatedAt: string;
}

export interface Conversation extends ConversationMeta {
	snapshot: unknown;
}

interface PlaygroundDB extends DBSchema {
	conversations: {
		key: string;
		value: Conversation;
		indexes: { updatedAt: string };
	};
}

let _db: IDBPDatabase<PlaygroundDB> | null = null;

async function getDB(): Promise<IDBPDatabase<PlaygroundDB>> {
	if (_db) return _db;
	_db = await openDB<PlaygroundDB>('traek-playground', 1, {
		upgrade(db) {
			const store = db.createObjectStore('conversations', { keyPath: 'id' });
			store.createIndex('updatedAt', 'updatedAt');
		}
	});
	return _db;
}

export async function listConversations(): Promise<ConversationMeta[]> {
	const db = await getDB();
	const all = await db.getAllFromIndex('conversations', 'updatedAt');
	return all
		.map(({ id, title, createdAt, updatedAt }) => ({ id, title, createdAt, updatedAt }))
		.reverse();
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
	const db = await getDB();
	return db.get('conversations', id);
}

export async function saveConversation(conv: Conversation): Promise<void> {
	const db = await getDB();
	await db.put('conversations', { ...conv, updatedAt: new Date().toISOString() });
}

export async function deleteConversation(id: string): Promise<void> {
	const db = await getDB();
	await db.delete('conversations', id);
}

export async function countConversations(): Promise<number> {
	const db = await getDB();
	return db.count('conversations');
}
