import { setContext, getContext } from 'svelte';
import type { TraekTranslations, PartialTraekTranslations } from './types';
import { DEFAULT_TRANSLATIONS } from './defaults';

const I18N_KEY = Symbol('traek-i18n');

/** Deep-merge user overrides onto defaults. Functions and primitives are replaced; objects are recursed. */
function deepMerge<T extends Record<string, unknown>>(
	defaults: T,
	overrides: Record<string, unknown>
): T {
	const result = { ...defaults };
	for (const key of Object.keys(overrides)) {
		const val = overrides[key];
		if (val === undefined) continue;
		const def = (defaults as Record<string, unknown>)[key];
		if (
			typeof val === 'object' &&
			val !== null &&
			!Array.isArray(val) &&
			typeof val !== 'function' &&
			typeof def === 'object' &&
			def !== null &&
			!Array.isArray(def) &&
			typeof def !== 'function'
		) {
			(result as Record<string, unknown>)[key] = deepMerge(
				def as Record<string, unknown>,
				val as Record<string, unknown>
			);
		} else {
			(result as Record<string, unknown>)[key] = val;
		}
	}
	return result;
}

/**
 * Merge user-provided partial translations with defaults.
 * Exported for use by integrators who want to build a full translations object.
 */
export function mergeTranslations(overrides?: PartialTraekTranslations): TraekTranslations {
	if (!overrides) return DEFAULT_TRANSLATIONS;
	return deepMerge(
		DEFAULT_TRANSLATIONS as unknown as Record<string, unknown>,
		overrides as unknown as Record<string, unknown>
	) as unknown as TraekTranslations;
}

/**
 * Set up the i18n context. Call this in your root layout or TraekCanvas.
 * Returns the resolved translations object.
 */
export function setTraekI18n(overrides?: PartialTraekTranslations): TraekTranslations {
	const translations = mergeTranslations(overrides);
	setContext(I18N_KEY, translations);
	return translations;
}

/**
 * Retrieve translations from the nearest Svelte context.
 * Falls back to defaults if no context was set (e.g. in tests or standalone usage).
 */
export function getTraekI18n(): TraekTranslations {
	try {
		return getContext<TraekTranslations>(I18N_KEY) ?? DEFAULT_TRANSLATIONS;
	} catch {
		return DEFAULT_TRANSLATIONS;
	}
}
