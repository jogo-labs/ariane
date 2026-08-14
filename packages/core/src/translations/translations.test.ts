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

    it('fr.daySelected interpole la date formatée', () => {
        expect(fr.daySelected('12 juin 2026')).toBe('12 juin 2026, sélectionné');
    });

    it('en.daySelected interpole la date formatée', () => {
        expect(en.daySelected('June 12, 2026')).toBe('June 12, 2026, selected');
    });

    it('fr expose les libellés de navigation du calendrier', () => {
        expect(fr.openCalendar).toBe('Ouvrir le calendrier');
        expect(fr.selectDate).toBe('Sélectionner une date');
        expect(fr.previousYear).toBe('Année précédente');
        expect(fr.previousMonth).toBe('Mois précédent');
        expect(fr.nextMonth).toBe('Mois suivant');
        expect(fr.nextYear).toBe('Année suivante');
    });
});
