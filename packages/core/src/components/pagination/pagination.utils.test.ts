import { describe, expect, it } from 'vitest';
import { _calculatePages, _clamp } from './pagination.utils.js';

describe('_calculatePages', () => {
    describe('sans budget (comportement existant inchangé)', () => {
        it('total < 10 : renvoie la liste complète', () => {
            expect(_calculatePages(3, 5)).toEqual([1, 2, 3, 4, 5]);
        });

        it('current proche du début : boundary + ellipsis de fin', () => {
            expect(_calculatePages(1, 15)).toEqual([1, 2, 3, 4, 5, 6, 7, -2, 15]);
            expect(_calculatePages(5, 15)).toEqual([1, 2, 3, 4, 5, 6, 7, -2, 15]);
        });

        it('current proche de la fin : ellipsis de début + boundary', () => {
            expect(_calculatePages(11, 15)).toEqual([1, -1, 9, 10, 11, 12, 13, 14, 15]);
            expect(_calculatePages(15, 15)).toEqual([1, -1, 9, 10, 11, 12, 13, 14, 15]);
        });

        it('current au milieu : deux ellipsis', () => {
            expect(_calculatePages(8, 15)).toEqual([1, -1, 6, 7, 8, 9, 10, -2, 15]);
        });
    });

    describe('avec budget suffisant pour le total', () => {
        it('renvoie la liste complète, comme sans budget', () => {
            expect(_calculatePages(3, 5, 5)).toEqual([1, 2, 3, 4, 5]);
            expect(_calculatePages(8, 15, 9)).toEqual([1, -1, 6, 7, 8, 9, 10, -2, 15]);
        });
    });

    describe('avec budget réduit : siblingCount décroissant', () => {
        it('budget=7 : siblingCount passe de 2 à 1', () => {
            expect(_calculatePages(8, 15, 7)).toEqual([1, -1, 7, 8, 9, -2, 15]);
        });

        it('budget=5 : siblingCount passe à 0', () => {
            expect(_calculatePages(8, 15, 5)).toEqual([1, -1, 8, -2, 15]);
        });

        it('budget tout juste suffisant pour siblingCount=1 (7 slots exactement)', () => {
            expect(_calculatePages(11, 15, 7)).toEqual([1, -1, 10, 11, 12, -2, 15]);
        });
    });

    describe('plancher : budget insuffisant même pour siblingCount=0', () => {
        it('current au bord (page 1) : représentation minimale à 3 slots', () => {
            expect(_calculatePages(1, 15, 3)).toEqual([1, -2, 15]);
        });

        it('current au bord (dernière page) : représentation minimale à 3 slots', () => {
            expect(_calculatePages(15, 15, 3)).toEqual([1, -1, 15]);
        });

        it('current au milieu : représentation minimale à 5 slots (plancher réel de la fonction)', () => {
            expect(_calculatePages(8, 15, 3)).toEqual([1, -1, 8, -2, 15]);
        });
    });

    describe('total < 10 avec budget très restreint (troncable aussi)', () => {
        it('current au bord : réduit à la représentation minimale', () => {
            expect(_calculatePages(1, 5, 3)).toEqual([1, -2, 5]);
        });

        it("budget partiellement restreint : tronque avant d'atteindre le plancher", () => {
            expect(_calculatePages(3, 5, 4)).toEqual([1, 3, 4, 5]);
        });
    });
});

describe('_clamp', () => {
    it('renvoie value si dans les bornes', () => {
        expect(_clamp(3, 1, 5)).toBe(3);
    });

    it('renvoie min si value < min', () => {
        expect(_clamp(-1, 1, 5)).toBe(1);
    });

    it('renvoie max si value > max', () => {
        expect(_clamp(10, 1, 5)).toBe(5);
    });
});
