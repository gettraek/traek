import { describe, it, expect } from 'vitest';
import { mergeTranslations, DEFAULT_TRANSLATIONS } from '../i18n/index.js';

describe('mergeTranslations', () => {
	it('returns defaults when no overrides', () => {
		const result = mergeTranslations();
		expect(result).toEqual(DEFAULT_TRANSLATIONS);
	});

	it('deep-merges partial overrides', () => {
		const result = mergeTranslations({ input: { placeholder: 'Custom placeholder' } });
		expect(result.input.placeholder).toBe('Custom placeholder');
		// Other keys should remain from defaults
		expect(result.canvas).toEqual(DEFAULT_TRANSLATIONS.canvas);
	});

	it('does not mutate defaults', () => {
		const original = JSON.stringify(DEFAULT_TRANSLATIONS);
		mergeTranslations({ input: { placeholder: 'Changed' } });
		expect(JSON.stringify(DEFAULT_TRANSLATIONS)).toBe(original);
	});
});
