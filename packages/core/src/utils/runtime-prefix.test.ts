import { describe, expect, it } from 'vitest';
import { getRuntimePrefix } from './runtime-prefix.js';

describe('getRuntimePrefix', () => {
    it('dérive le préfixe par défaut npm', () => {
        expect(getRuntimePrefix('AR-STEPPER', 'stepper')).toBe('ar');
    });

    it('dérive un préfixe CDN personnalisé', () => {
        expect(getRuntimePrefix('ACME-STEPPER', 'stepper')).toBe('acme');
    });

    it('retourne le tag inchangé (en minuscules) si le suffixe ne correspond pas', () => {
        expect(getRuntimePrefix('AR-STEPPER', 'nonsense')).toBe('ar-stepper');
    });
});
