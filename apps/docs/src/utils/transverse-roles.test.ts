import { describe, expect, it } from 'vitest';
import { isTransversePart, TRANSVERSE_ROLES } from './transverse-roles.js';

describe('isTransversePart', () => {
    it('reconnaît un rôle du catalogue (ex: action-button)', () => {
        expect(isTransversePart('action-button', 'ar-pagination')).toBe(true);
    });

    it('reconnaît le part racine (nom du composant sans préfixe)', () => {
        expect(isTransversePart('charcounter', 'ar-charcounter')).toBe(true);
        expect(isTransversePart('datepicker', 'ar-datepicker')).toBe(true);
    });

    it('rejette un part spécifique sans rôle transverse', () => {
        expect(isTransversePart('base', 'ar-tab')).toBe(false);
        expect(isTransversePart('nav', 'ar-tab-group')).toBe(false);
    });

    it("ne confond pas le nom d'un autre composant avec la racine", () => {
        expect(isTransversePart('charcounter', 'ar-pagination')).toBe(false);
    });

    it('contient bien les rôles attendus du chantier #181', () => {
        expect(TRANSVERSE_ROLES).toContain('control');
        expect(TRANSVERSE_ROLES).toContain('field');
        expect(TRANSVERSE_ROLES).toContain('action-button');
        expect(TRANSVERSE_ROLES).toContain('input');
        expect(TRANSVERSE_ROLES).toContain('select');
    });
});
