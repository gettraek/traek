/**
 * In-memory daily rate limiter by IP.
 * Key format: "YYYY-MM-DD:ip". Counts are reset conceptually per calendar day.
 */

const store = new Map<string, { date: string; count: number }>();

function today(): string {
	return new Date().toISOString().slice(0, 10);
}

/**
 * Check and consume one request for the given IP.
 * @returns { allowed: true } or { allowed: false, retryAfter: number } (seconds until midnight UTC)
 */
export function checkDailyLimit(
	ip: string,
	limit: number
): { allowed: true } | { allowed: false; retryAfter: number } {
	const key = ip;
	const todayStr = today();
	const entry = store.get(key);

	if (!entry) {
		store.set(key, { date: todayStr, count: 1 });
		return { allowed: true };
	}

	// New day: reset count
	if (entry.date !== todayStr) {
		store.set(key, { date: todayStr, count: 1 });
		return { allowed: true };
	}

	if (entry.count >= limit) {
		// Seconds until next midnight UTC
		const now = new Date();
		const tomorrow = new Date(
			Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
		);
		const retryAfter = Math.ceil((tomorrow.getTime() - now.getTime()) / 1000);
		return { allowed: false, retryAfter };
	}

	entry.count += 1;
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
