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

    it('fr.expectedFormat interpole format et exemple', () => {
        expect(fr.expectedFormat('dd/MM/yyyy', '31/12/2026')).toBe(
            'Format attendu : dd/MM/yyyy (ex. 31/12/2026)',
        );
    });

    it('en.expectedFormat interpole format et exemple', () => {
        expect(en.expectedFormat('MM/dd/yyyy', '12/31/2026')).toBe(
            'Expected format: MM/dd/yyyy (e.g. 12/31/2026)',
        );
    });

    it('fr.availableDates interpole la plage', () => {
        expect(fr.availableDates('entre le 1er janvier 2026 et le 31 décembre 2026')).toBe(
            'Dates disponibles : entre le 1er janvier 2026 et le 31 décembre 2026',
        );
    });

    it('fr.dateRangeBetween/From/Until interpolent les bornes', () => {
        expect(fr.dateRangeBetween('1er janvier 2026', '31 décembre 2026')).toBe(
            'entre le 1er janvier 2026 et le 31 décembre 2026',
        );
        expect(fr.dateRangeFrom('1er janvier 2026')).toBe('à partir du 1er janvier 2026');
        expect(fr.dateRangeUntil('31 décembre 2026')).toBe("jusqu'au 31 décembre 2026");
    });

    it('en.dateRangeBetween/From/Until interpolent les bornes', () => {
        expect(en.dateRangeBetween('January 1, 2026', 'December 31, 2026')).toBe(
            'between January 1, 2026 and December 31, 2026',
        );
        expect(en.dateRangeFrom('January 1, 2026')).toBe('from January 1, 2026');
        expect(en.dateRangeUntil('December 31, 2026')).toBe('until December 31, 2026');
    });

    it('fr.formatOrdinalDate ajoute "1er" uniquement le 1er du mois', () => {
        const firstOfMonth = new Date(2026, 0, 1);
        const otherDay = new Date(2026, 0, 15);
        expect(fr.formatOrdinalDate(firstOfMonth, 'janvier 2026', '1 janvier 2026')).toBe(
            '1er janvier 2026',
        );
        expect(fr.formatOrdinalDate(otherDay, 'janvier 2026', '15 janvier 2026')).toBe(
            '15 janvier 2026',
        );
    });

    it("en.formatOrdinalDate ne marque jamais l'ordinal (comportement inchangé)", () => {
        const firstOfMonth = new Date(2026, 0, 1);
        expect(en.formatOrdinalDate(firstOfMonth, 'January 2026', 'January 1, 2026')).toBe(
            'January 1, 2026',
        );
    });
});
