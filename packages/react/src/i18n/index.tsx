import React, { createContext, useContext, useMemo } from 'react';
import type { TraekTranslations, PartialTraekTranslations } from './types.js';
import { DEFAULT_TRANSLATIONS } from './defaults.js';

export type { TraekTranslations, PartialTraekTranslations } from './types.js';
export { DEFAULT_TRANSLATIONS } from './defaults.js';

const TraekI18nContext = createContext<TraekTranslations>(DEFAULT_TRANSLATIONS);

/** Deep-merge user overrides onto defaults. */
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
 */
export function mergeTranslations(overrides?: PartialTraekTranslations): TraekTranslations {
	if (!overrides) return DEFAULT_TRANSLATIONS;
	return deepMerge(
		DEFAULT_TRANSLATIONS as unknown as Record<string, unknown>,
		overrides as unknown as Record<string, unknown>
	) as unknown as TraekTranslations;
}

export interface TraekI18nProviderProps {
	translations?: PartialTraekTranslations;
	children: React.ReactNode;
}

/**
 * Provide translations to the Traek component tree.
 *
 * @example
 * ```tsx
 * <TraekI18nProvider translations={{ input: { placeholder: 'Type here...' } }}>
 *   <TraekCanvas ... />
 * </TraekI18nProvider>
 * ```
 */
export function TraekI18nProvider({ translations, children }: TraekI18nProviderProps) {
	const merged = useMemo(() => mergeTranslations(translations), [translations]);
	return <TraekI18nContext.Provider value={merged}>{children}</TraekI18nContext.Provider>;
}

/**
 * Access translations from the nearest TraekI18nProvider.
 * Falls back to defaults if no provider is present.
 */
export function useTraekI18n(): TraekTranslations {
	return useContext(TraekI18nContext);
}
