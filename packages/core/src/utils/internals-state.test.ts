import { describe, expect, it, vi } from 'vitest';
import { toggleState } from './internals-state.js';

function fakeInternals(): ElementInternals {
    return { states: new Set<string>() } as unknown as ElementInternals;
}

describe('toggleState', () => {
    it('ajoute le state quand active est true', () => {
        const internals = fakeInternals();
        toggleState(internals, 'open', true);
        expect(internals.states.has('open')).toBe(true);
    });

    it('retire le state quand active est false', () => {
        const internals = fakeInternals();
        internals.states.add('open');
        toggleState(internals, 'open', false);
        expect(internals.states.has('open')).toBe(false);
    });

    it("ne lève pas d'erreur si internals est undefined", () => {
        expect(() => toggleState(undefined, 'open', true)).not.toThrow();
    });

    it("ne lève pas d'erreur si states.add lève (navigateur sans :state(), nom sans tirets)", () => {
        // Chrome/Edge 90 à 124 : CustomStateSet n'accepte que les identifiants en `--nom`.
        const add = vi.fn(() => {
            throw new DOMException("The state must start with '--'", 'SyntaxError');
        });
        const internals = { states: { add, delete: add } } as unknown as ElementInternals;

        expect(() => toggleState(internals, 'open', true)).not.toThrow();
        expect(() => toggleState(internals, 'open', false)).not.toThrow();
        expect(add).toHaveBeenCalledTimes(2);
    });

    it("ne lève pas d'erreur si internals.states est undefined (happy-dom)", () => {
        const internals = { states: undefined } as unknown as ElementInternals;
        expect(() => toggleState(internals, 'open', true)).not.toThrow();
    });

    it('states.add/delete sont bien appelés (pas un side-effect détourné)', () => {
        const states = { add: vi.fn(), delete: vi.fn() };
        const internals = { states } as unknown as ElementInternals;

        toggleState(internals, 'disabled', true);
        expect(states.add).toHaveBeenCalledWith('disabled');
        expect(states.delete).not.toHaveBeenCalled();

        toggleState(internals, 'disabled', false);
        expect(states.delete).toHaveBeenCalledWith('disabled');
    });
});
