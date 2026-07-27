import { describe, expect, it } from 'vitest';
import { findPartStateOrderErrors } from './validate-part-state-order.js';

describe('findPartStateOrderErrors', () => {
    it("détecte une règle d'état déclarée avant sa base", () => {
        const source = `
            ar-test {
                &::part(bullet-active) {
                    background-color: red;
                }

                &::part(bullet) {
                    border-radius: 0.75rem;
                }
            }
        `;
        const errors = findPartStateOrderErrors('default.css', source);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('bullet-active');
        expect(errors[0]).toContain('bullet');
    });

    it("accepte une règle d'état déclarée après sa base", () => {
        const source = `
            ar-test {
                &::part(bullet) {
                    border-radius: 0.75rem;
                }

                &::part(bullet-active) {
                    background-color: red;
                }
            }
        `;
        expect(findPartStateOrderErrors('default.css', source)).toEqual([]);
    });

    it('ignore un part sans base déclarée dans le même bloc (aucune fausse relation)', () => {
        const source = `
            ar-test {
                &::part(step-link) {
                    color: blue;
                }

                &::part(bullet) {
                    border-radius: 0.75rem;
                }
            }
        `;
        expect(findPartStateOrderErrors('default.css', source)).toEqual([]);
    });

    it('traite chaque bloc de composant indépendamment', () => {
        const source = `
            ar-one {
                &::part(bullet-active) {
                    background-color: red;
                }
                &::part(bullet) {
                    border-radius: 0.75rem;
                }
            }

            ar-two {
                &::part(bullet) {
                    border-radius: 0.5rem;
                }
                &::part(bullet-active) {
                    background-color: blue;
                }
            }
        `;
        const errors = findPartStateOrderErrors('default.css', source);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('ar-one');
    });

    it('rapporte le bon numéro de ligne', () => {
        const source = [
            'ar-test {',
            '    &::part(bullet-active) {',
            '        background-color: red;',
            '    }',
            '',
            '    &::part(bullet) {',
            '        border-radius: 0.75rem;',
            '    }',
            '}',
        ].join('\n');
        const errors = findPartStateOrderErrors('default.css', source);
        expect(errors[0]).toContain(':2');
    });
});
