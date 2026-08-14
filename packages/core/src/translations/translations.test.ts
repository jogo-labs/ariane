import { describe, expect, it } from 'vitest';
import fr from './fr.js';
import en from './en.js';

describe('traductions', () => {
    it('fr a $code, $name, $dir renseignés', () => {
        expect(fr.$code).toBe('fr');
        expect(fr.$name).toBe('Français');
        expect(fr.$dir).toBe('ltr');
    });

    it('en a $code, $name, $dir renseignés', () => {
        expect(en.$code).toBe('en');
        expect(en.$name).toBe('English');
        expect(en.$dir).toBe('ltr');
    });

    it('fr et en implémentent les mêmes termes', () => {
        const termsOf = (t: Record<string, unknown>) =>
            Object.keys(t)
                .filter((k) => !k.startsWith('$'))
                .sort();
        expect(termsOf(fr)).toEqual(termsOf(en));
    });

    it('fr.sortApplied interpole columnLabel et order', () => {
        expect(fr.sortApplied('Prix', 'asc')).toBe('Prix : tri croissant appliqué');
        expect(fr.sortApplied('Prix', 'none')).toBe('Prix : tri supprimé');
    });

    it('en.sortApplied interpole columnLabel et order', () => {
        expect(en.sortApplied('Price', 'desc')).toBe('Price: descending sort applied');
    });

    it('fr.sortFailed interpole columnLabel', () => {
        expect(fr.sortFailed('Prix')).toBe('Prix : échec du tri.');
    });

    it('fr.sortInProgress est un terme statique', () => {
        expect(fr.sortInProgress).toBe('Tri en cours, veuillez patienter.');
    });
});
