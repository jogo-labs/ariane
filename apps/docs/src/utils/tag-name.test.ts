import { describe, expect, it } from 'vitest';
import { getPrefix, getSlug, groupByPrefix } from './tag-name.js';

describe('getPrefix', () => {
    it('extrait le prefix "ar" de "ar-alert"', () => {
        expect(getPrefix('ar-alert')).toBe('ar');
    });

    it('extrait le prefix "ft" de "ft-stepper-item"', () => {
        expect(getPrefix('ft-stepper-item')).toBe('ft');
    });
});

describe('getSlug', () => {
    it('retourne "alert" pour "ar-alert"', () => {
        expect(getSlug('ar-alert')).toBe('alert');
    });

    it('retourne "stepper-item" pour "ar-stepper-item"', () => {
        expect(getSlug('ar-stepper-item')).toBe('stepper-item');
    });
});

describe('groupByPrefix', () => {
    it('regroupe des composants par prefix', () => {
        const components = [
            { tagName: 'ar-alert' },
            { tagName: 'ar-button' },
            { tagName: 'ft-card' },
        ];
        const result = groupByPrefix(components);
        expect(result['ar']).toHaveLength(2);
        expect(result['ft']).toHaveLength(1);
    });

    it('gère un tagName absent (chaîne vide → prefix vide)', () => {
        const result = groupByPrefix([{ tagName: undefined }]);
        expect(result['']).toHaveLength(1);
    });
});
