import { describe, expect, it } from 'vitest';
import { isCancelableEvent, stripCancelableMarker } from './events.js';

describe('isCancelableEvent', () => {
    it('détecte le marqueur "@cancelable" en fin de description', () => {
        expect(isCancelableEvent("Émis avant l'ouverture. @cancelable")).toBe(true);
    });

    it('détecte le marqueur même sur une description sans point avant', () => {
        expect(isCancelableEvent('Avant fermeture. @cancelable')).toBe(true);
    });

    it('retourne false sans le marqueur', () => {
        expect(isCancelableEvent('Émis si ar-dialog-show est annulé.')).toBe(false);
    });

    it('retourne false si "cancelable" apparaît sans le marqueur exact', () => {
        expect(isCancelableEvent("Ceci n'est pas cancelable.")).toBe(false);
    });

    it('retourne false pour une description undefined', () => {
        expect(isCancelableEvent(undefined)).toBe(false);
    });

    it('retourne false pour une chaîne vide', () => {
        expect(isCancelableEvent('')).toBe(false);
    });
});

describe('stripCancelableMarker', () => {
    it('retire le marqueur "@cancelable" et l\'espace précédent', () => {
        expect(stripCancelableMarker("Émis avant l'ouverture. @cancelable")).toBe(
            "Émis avant l'ouverture.",
        );
    });

    it('laisse la description inchangée sans marqueur', () => {
        expect(stripCancelableMarker('Émis si ar-dialog-show est annulé.')).toBe(
            'Émis si ar-dialog-show est annulé.',
        );
    });

    it('retourne une chaîne vide pour une description undefined', () => {
        expect(stripCancelableMarker(undefined)).toBe('');
    });
});
