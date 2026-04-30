import { afterEach, describe, expect, it } from 'vitest';
import { acquireScrollLock, isScrollLocked, releaseScrollLock } from './scroll-lock.js';

describe('scroll-lock', () => {
    const cleanup: HTMLElement[] = [];

    function makeEl(overflowY = ''): HTMLElement {
        const el = document.createElement('div');
        el.style.overflowY = overflowY;
        document.body.appendChild(el);
        cleanup.push(el);
        return el;
    }

    afterEach(() => {
        cleanup.forEach((el) => el.remove());
        cleanup.length = 0;
    });

    it('acquireScrollLock applique overflow:hidden', () => {
        const el = makeEl('auto');
        acquireScrollLock(el);
        expect(el.style.overflowY).toBe('hidden');
        expect(el.style.overflowX).toBe('hidden');
        releaseScrollLock(el);
    });

    it('releaseScrollLock restaure les styles originaux à count=0', () => {
        const el = makeEl('auto');
        acquireScrollLock(el);
        releaseScrollLock(el);
        expect(el.style.overflowY).toBe('auto');
        expect(el.style.overflowX).toBe('');
    });

    it('isScrollLocked renvoie true après acquire, false après release complète', () => {
        const el = makeEl();
        expect(isScrollLocked(el)).toBe(false);
        acquireScrollLock(el);
        expect(isScrollLocked(el)).toBe(true);
        releaseScrollLock(el);
        expect(isScrollLocked(el)).toBe(false);
    });

    it('ref-count : deux acquire, un release ne déverrouille pas encore', () => {
        const el = makeEl();
        acquireScrollLock(el);
        acquireScrollLock(el);
        releaseScrollLock(el);
        expect(el.style.overflowY).toBe('hidden');
        releaseScrollLock(el); // cleanup
    });

    it('ref-count : deux acquire, deux release restaure', () => {
        const el = makeEl();
        acquireScrollLock(el);
        acquireScrollLock(el);
        releaseScrollLock(el);
        releaseScrollLock(el);
        expect(el.style.overflowY).toBe('');
        expect(isScrollLocked(el)).toBe(false);
    });

    it("deux éléments différents : release de l'un ne restaure pas l'autre", () => {
        const el1 = makeEl();
        const el2 = makeEl();
        acquireScrollLock(el1);
        acquireScrollLock(el2);
        releaseScrollLock(el1);
        expect(isScrollLocked(el2)).toBe(true);
        expect(el2.style.overflowY).toBe('hidden');
        releaseScrollLock(el2); // cleanup
    });

    it('releaseScrollLock sur un élément inconnu ne crash pas', () => {
        const el = makeEl();
        expect(() => releaseScrollLock(el)).not.toThrow();
    });
});
