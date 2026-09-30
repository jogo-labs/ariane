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

    describe('navigateur sans :state() (Chrome/Edge 90 à 124 : seuls les noms en `--` sont acceptés)', () => {
        /** CustomStateSet de ces versions : `add` lève une SyntaxError pour un nom sans `--`. */
        function dashedOnlyInternals(): { internals: ElementInternals; states: Set<string> } {
            const states = new Set<string>();
            const add = states.add.bind(states);
            states.add = (name: string) => {
                if (!name.startsWith('--')) {
                    throw new DOMException("The state must start with '--'", 'SyntaxError');
                }
                return add(name);
            };
            return { internals: { states } as unknown as ElementInternals, states };
        }

        it('expose le state avec le préfixe -- quand le nom sans tirets est refusé', () => {
            const { internals, states } = dashedOnlyInternals();

            toggleState(internals, 'open', true);

            expect(states.has('--open')).toBe(true);
            expect(states.has('open')).toBe(false);
        });

        it('retire la variante préfixée quand active passe à false', () => {
            const { internals, states } = dashedOnlyInternals();
            toggleState(internals, 'open', true);

            toggleState(internals, 'open', false);

            expect(states.has('--open')).toBe(false);
        });

        it('retire la variante préfixée même si delete lève pour le nom sans tirets', () => {
            const states = new Set<string>(['--open']);
            const realDelete = states.delete.bind(states);
            states.delete = (name: string) => {
                if (!name.startsWith('--')) throw new DOMException('refusé', 'SyntaxError');
                return realDelete(name);
            };

            toggleState({ states } as unknown as ElementInternals, 'open', false);

            expect(states.has('--open')).toBe(false);
        });

        it("ne lève pas d'erreur si le nom préfixé est refusé lui aussi", () => {
            const refuse = vi.fn(() => {
                throw new DOMException('refusé', 'SyntaxError');
            });
            const internals = {
                states: { add: refuse, delete: refuse },
            } as unknown as ElementInternals;

            expect(() => toggleState(internals, 'open', true)).not.toThrow();
            expect(() => toggleState(internals, 'open', false)).not.toThrow();
        });
    });

    it("n'ajoute que le nom sans tirets quand il est accepté (Chrome/Edge 125+, Firefox, Safari)", () => {
        const internals = fakeInternals();

        toggleState(internals, 'open', true);

        expect([...internals.states]).toEqual(['open']);
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
