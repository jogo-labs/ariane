import { describe, expect, it } from 'vitest';
import { extractThemeTokens, validateCssPropertyDefaults } from './validate-cssprop-defaults.js';

describe('extractThemeTokens', () => {
    it('extrait un token simple', () => {
        const css = `:root { --ar-color-text: #171717; }`;
        const tokens = extractThemeTokens(css);
        expect(tokens.get('--ar-color-text')).toBe('#171717');
    });

    it('retire le commentaire oklch trailing', () => {
        const css = `:root { --ar-color-primary-05: #010105 /* oklch(7.47% 0.022 279.71) */; }`;
        const tokens = extractThemeTokens(css);
        expect(tokens.get('--ar-color-primary-05')).toBe('#010105');
    });

    it('garde une référence var() non résolue', () => {
        const css = `:root { --ar-pagination-bg: var(--ar-button-tertiary-bg); }`;
        const tokens = extractThemeTokens(css);
        expect(tokens.get('--ar-pagination-bg')).toBe('var(--ar-button-tertiary-bg)');
    });

    it("extrait plusieurs tokens malgré l'imbrication @layer/:root", () => {
        const css = `
            @layer ariane.theme {
                :root {
                    --ar-color-text: #171717;
                    --ar-spacing-sm: 0.5rem;
                }
            }
        `;
        const tokens = extractThemeTokens(css);
        expect(tokens.size).toBe(2);
        expect(tokens.get('--ar-spacing-sm')).toBe('0.5rem');
    });

    it('retourne une map vide pour un CSS sans token --ar-*', () => {
        const css = `:root { --other-prop: red; }`;
        const tokens = extractThemeTokens(css);
        expect(tokens.size).toBe(0);
    });

    it("ignore la surcharge dark mode manuelle (:root[data-theme='dark']) et garde la valeur claire", () => {
        const css = `
            @layer ariane.theme {
                :root {
                    --ar-alert-info-border: var(--ar-color-info-bg);
                }

                :root[data-theme='dark'] {
                    --ar-alert-info-border: var(--ar-color-info-40);
                }
            }
        `;
        const tokens = extractThemeTokens(css);
        expect(tokens.get('--ar-alert-info-border')).toBe('var(--ar-color-info-bg)');
    });

    it('ignore la surcharge dark mode automatique (@media prefers-color-scheme: dark) et garde la valeur claire', () => {
        const css = `
            @layer ariane.theme {
                :root {
                    --ar-alert-info-border: var(--ar-color-info-bg);
                }

                @media (prefers-color-scheme: dark) {
                    :root:not([data-theme='light']) {
                        --ar-alert-info-border: var(--ar-color-info-40);
                    }
                }
            }
        `;
        const tokens = extractThemeTokens(css);
        expect(tokens.get('--ar-alert-info-border')).toBe('var(--ar-color-info-bg)');
    });
});

describe('validateCssPropertyDefaults', () => {
    function manifestWith(cssProperties) {
        return {
            modules: [{ declarations: [{ name: 'ArPagination', cssProperties }] }],
        };
    }

    it('ne retourne aucune erreur quand la valeur JSDoc correspond au thème', () => {
        const themeTokens = new Map([['--ar-pagination-radius', '0.75rem']]);
        const manifest = manifestWith([{ name: '--ar-pagination-radius', default: '0.75rem' }]);
        expect(validateCssPropertyDefaults(manifest, themeTokens)).toEqual([]);
    });

    it('retourne une erreur détaillée quand la valeur JSDoc diverge du thème', () => {
        const themeTokens = new Map([['--ar-pagination-radius', '0.75rem']]);
        const manifest = manifestWith([{ name: '--ar-pagination-radius', default: '1rem' }]);
        const errors = validateCssPropertyDefaults(manifest, themeTokens);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('ArPagination');
        expect(errors[0]).toContain('--ar-pagination-radius');
        expect(errors[0]).toContain('1rem');
        expect(errors[0]).toContain('0.75rem');
    });

    it('ignore les cssProperties sans default (rien à comparer)', () => {
        const themeTokens = new Map([['--ar-charcounter-color', '#171717']]);
        const manifest = manifestWith([{ name: '--ar-charcounter-color' }]);
        expect(validateCssPropertyDefaults(manifest, themeTokens)).toEqual([]);
    });

    it('ignore les tokens absents du thème (props hors thème, ex. --ar-dialog-width)', () => {
        const themeTokens = new Map();
        const manifest = manifestWith([{ name: '--ar-dialog-width', default: '500px' }]);
        expect(validateCssPropertyDefaults(manifest, themeTokens)).toEqual([]);
    });

    it('agrège les erreurs sur plusieurs déclarations', () => {
        const themeTokens = new Map([
            ['--ar-pagination-radius', '0.75rem'],
            ['--ar-alert-padding', '1rem'],
        ]);
        const manifest = {
            modules: [
                {
                    declarations: [
                        {
                            name: 'ArPagination',
                            cssProperties: [{ name: '--ar-pagination-radius', default: '1rem' }],
                        },
                        {
                            name: 'ArAlert',
                            cssProperties: [{ name: '--ar-alert-padding', default: '2rem' }],
                        },
                    ],
                },
            ],
        };
        expect(validateCssPropertyDefaults(manifest, themeTokens)).toHaveLength(2);
    });
});
