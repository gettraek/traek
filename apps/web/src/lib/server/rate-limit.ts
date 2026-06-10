/**
 * In-memory daily rate limiter by namespace + IP.
 * Key format: "namespace:ip". Counts are reset conceptually per calendar day.
 */

const store = new Map<string, { date: string; count: number }>();

/** Hard cap on tracked entries to bound memory; least recently used are evicted first. */
const MAX_ENTRIES = 50_000;

function today(): string {
	return new Date().toISOString().slice(0, 10);
}

function setEntry(key: string, entry: { date: string; count: number }): void {
	if (store.has(key)) {
		// Refresh recency: delete + re-insert so Map insertion order tracks last use
		// and eviction below is LRU-ish instead of punishing long-lived active keys.
		store.delete(key);
	} else if (store.size >= MAX_ENTRIES) {
		// Evict least recently used entries (Map preserves insertion order)
		const excess = store.size - MAX_ENTRIES + 1;
		let evicted = 0;
		for (const oldKey of store.keys()) {
			store.delete(oldKey);
			evicted += 1;
			if (evicted >= excess) break;
		}
	}
	store.set(key, entry);
}

/**
 * Check and consume one request for the given namespace + IP.
 * @param namespace endpoint-specific bucket (e.g. 'chat', 'image') so limits aren't shared
 * @returns { allowed: true } or { allowed: false, retryAfter: number } (seconds until midnight UTC)
 */
export function checkDailyLimit(
	namespace: string,
	ip: string,
	limit: number
): { allowed: true } | { allowed: false; retryAfter: number } {
	const key = `${namespace}:${ip}`;
	const todayStr = today();
	const entry = store.get(key);

	if (!entry) {
		setEntry(key, { date: todayStr, count: 1 });
		return { allowed: true };
	}

	// New day: reset count
	if (entry.date !== todayStr) {
		setEntry(key, { date: todayStr, count: 1 });
		return { allowed: true };
	}

	if (entry.count >= limit) {
		// Seconds until next midnight UTC
		const now = new Date();
		const tomorrow = new Date(
			Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
		);
		const retryAfter = Math.ceil((tomorrow.getTime() - now.getTime()) / 1000);
		// Refresh recency for blocked keys too — at-limit entries are exactly the
		// ones the limiter must remember; without this they age out first and reset.
		store.delete(key);
		store.set(key, entry);
		return { allowed: false, retryAfter };
	}

	entry.count += 1;
	// Refresh recency on every successful hit so active counters aren't evicted/reset.
	store.delete(key);
	store.set(key, entry);
	return { allowed: true };
}

/**
 * Remove entries for past days to avoid unbounded memory growth.
 * Call periodically if desired (e.g. in a hook or cron); not required for correctness.
 */
export function pruneOldEntries(): void {
	const todayStr = today();
	for (const [key, entry] of store.entries()) {
		if (entry.date !== todayStr) {
			store.delete(key);
		}
	}
}
