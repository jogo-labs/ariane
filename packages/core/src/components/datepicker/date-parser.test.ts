import { describe, expect, it } from 'vitest';
import { format, parse } from './date-parser.js';

describe('parse', () => {
    describe('saisie complète valide', () => {
        it('parse dd/MM/yyyy', () => {
            const r = parse('12/06/2026', 'dd/MM/yyyy');
            expect(r).toEqual({ complete: true, valid: true, date: new Date(2026, 5, 12) });
        });

        it('parse avec un seul chiffre pour dd et MM', () => {
            const r = parse('1/6/2026', 'dd/MM/yyyy');
            expect(r).toEqual({ complete: true, valid: true, date: new Date(2026, 5, 1) });
        });

        it('parse yyyy-MM-dd', () => {
            const r = parse('2026-06-12', 'yyyy-MM-dd');
            expect(r).toEqual({ complete: true, valid: true, date: new Date(2026, 5, 12) });
        });

        it('accepte le 29/02 une année bissextile', () => {
            const r = parse('29/02/2024', 'dd/MM/yyyy');
            expect(r.complete).toBe(true);
            expect(r.valid).toBe(true);
            expect(r.date).toEqual(new Date(2024, 1, 29));
        });
    });

    describe('saisie incomplète', () => {
        it('retourne complete:false pour une saisie partielle', () => {
            const r = parse('12/06', 'dd/MM/yyyy');
            expect(r).toEqual({ complete: false, valid: false, date: null });
        });

        it('retourne complete:false pour une saisie vide', () => {
            const r = parse('', 'dd/MM/yyyy');
            expect(r).toEqual({ complete: false, valid: false, date: null });
        });

        it('retourne complete:false pour une année incomplète', () => {
            const r = parse('12/06/202', 'dd/MM/yyyy');
            expect(r).toEqual({ complete: false, valid: false, date: null });
        });
    });

    describe('saisie complète invalide', () => {
        it('retourne valid:false pour le 30/02', () => {
            const r = parse('30/02/2026', 'dd/MM/yyyy');
            expect(r.complete).toBe(true);
            expect(r.valid).toBe(false);
            expect(r.date).toBeNull();
        });

        it('retourne valid:false pour le 31/11', () => {
            const r = parse('31/11/2026', 'dd/MM/yyyy');
            expect(r.complete).toBe(true);
            expect(r.valid).toBe(false);
            expect(r.date).toBeNull();
        });

        it('retourne valid:false pour le 29/02 hors année bissextile', () => {
            const r = parse('29/02/2025', 'dd/MM/yyyy');
            expect(r.complete).toBe(true);
            expect(r.valid).toBe(false);
            expect(r.date).toBeNull();
        });

        it('retourne valid:false pour le mois 13', () => {
            const r = parse('01/13/2026', 'dd/MM/yyyy');
            expect(r.complete).toBe(true);
            expect(r.valid).toBe(false);
            expect(r.date).toBeNull();
        });
    });
});

describe('format', () => {
    it('formate dd/MM/yyyy', () => {
        expect(format(new Date(2026, 5, 12), 'dd/MM/yyyy')).toBe('12/06/2026');
    });

    it('formate yyyy-MM-dd', () => {
        expect(format(new Date(2026, 5, 1), 'yyyy-MM-dd')).toBe('2026-06-01');
    });

    it('padde les jours et mois avec zéro', () => {
        expect(format(new Date(2026, 0, 5), 'dd/MM/yyyy')).toBe('05/01/2026');
    });

    it('aller-retour format → parse', () => {
        const date = new Date(2026, 5, 12);
        const str = format(date, 'dd/MM/yyyy');
        const result = parse(str, 'dd/MM/yyyy');
        expect(result.valid).toBe(true);
        expect(result.date).toEqual(date);
    });
});
