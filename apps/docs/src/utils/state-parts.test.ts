import { describe, expect, it } from 'vitest';
import { isStatePart } from './state-parts.js';

describe('isStatePart', () => {
    it("reconnaît un part d'état simple (élément)--(état)", () => {
        expect(isStatePart('bullet--current')).toBe(true);
        expect(isStatePart('count--warning')).toBe(true);
        expect(isStatePart('count--error')).toBe(true);
    });

    it("reconnaît un part d'état sur un élément dont le nom contient un tiret simple", () => {
        expect(isStatePart('step-link--current')).toBe(true);
        expect(isStatePart('nav-button--disabled')).toBe(true);
        expect(isStatePart('sort-button--pending')).toBe(true);
    });

    it('rejette un part sans séparateur --', () => {
        expect(isStatePart('bullet')).toBe(false);
        expect(isStatePart('action-button')).toBe(false);
        expect(isStatePart('step-link')).toBe(false);
    });
});
