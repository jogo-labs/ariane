import { describe, expect, it } from 'vitest';
import { findPartStateOrderErrors } from './validate-part-state-order.js';

describe('findPartStateOrderErrors', () => {
    it("détecte une règle d'état déclarée avant sa base", () => {
        const source = `
            ar-test {
                &::part(indicator--current) {
                    background-color: red;
                }

                &::part(indicator) {
                    border-radius: 0.75rem;
                }
            }
        `;
        const errors = findPartStateOrderErrors('ariane.css', source);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('indicator--current');
        expect(errors[0]).toContain('indicator');
    });

    it("accepte une règle d'état déclarée après sa base", () => {
        const source = `
            ar-test {
                &::part(indicator) {
                    border-radius: 0.75rem;
                }

                &::part(indicator--current) {
                    background-color: red;
                }
            }
        `;
        expect(findPartStateOrderErrors('ariane.css', source)).toEqual([]);
    });

    it('ignore un part sans base déclarée dans le même bloc (aucune fausse relation)', () => {
        const source = `
            ar-test {
                &::part(step-link) {
                    color: blue;
                }

                &::part(indicator) {
                    border-radius: 0.75rem;
                }
            }
        `;
        expect(findPartStateOrderErrors('ariane.css', source)).toEqual([]);
    });

    it('traite chaque bloc de composant indépendamment', () => {
        const source = `
            ar-one {
                &::part(indicator--current) {
                    background-color: red;
                }
                &::part(indicator) {
                    border-radius: 0.75rem;
                }
            }

            ar-two {
                &::part(indicator) {
                    border-radius: 0.5rem;
                }
                &::part(indicator--current) {
                    background-color: blue;
                }
            }
        `;
        const errors = findPartStateOrderErrors('ariane.css', source);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('ar-one');
    });

    it('rapporte le bon numéro de ligne', () => {
        const source = [
            'ar-test {',
            '    &::part(indicator--current) {',
            '        background-color: red;',
            '    }',
            '',
            '    &::part(indicator) {',
            '        border-radius: 0.75rem;',
            '    }',
            '}',
        ].join('\n');
        const errors = findPartStateOrderErrors('ariane.css', source);
        expect(errors[0]).toContain(':2');
    });

    it('ignore une paire à simple tiret qui ressemblerait à une relation base/état (ex. step/step-link)', () => {
        const source = `
            ar-test {
                &::part(step-link) {
                    color: blue;
                }

                &::part(step) {
                    color: red;
                }
            }
        `;
        expect(findPartStateOrderErrors('ariane.css', source)).toEqual([]);
    });
});
