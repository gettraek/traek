/**
 * Umami analytics – safe to call from any environment (no-op when script not loaded or SSR).
 * Use data-umami-event="EventName" on elements for simple click tracking, or track() for custom data.
 */
declare global {
	interface Window {
		umami?: { track: (name: string, data?: Record<string, string | number | boolean>) => void };
	}
}

export function track(eventName: string, data?: Record<string, string | number | boolean>): void {
	if (typeof window === 'undefined') return;
	window.umami?.track(eventName, data);
}
