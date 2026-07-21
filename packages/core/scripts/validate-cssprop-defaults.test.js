import { describe, expect, it } from 'vitest';
import { extractThemeTokens, validateCssPropertyCoverage } from './validate-cssprop-defaults.js';

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

    it('normalise les espaces internes dans les valeurs multi-lignes (ex. box-shadow, gradient)', () => {
        const css = `
            @layer ariane.theme {
                :root {
                    --ar-test-shadow: 0 1px 2px
                        rgba(0,0,0,0.1);
                    --ar-test-gradient: linear-gradient(
                        90deg,
                        red,
                        blue
                    );
                }
            }
        `;
        const tokens = extractThemeTokens(css);
        expect(tokens.get('--ar-test-shadow')).toBe('0 1px 2px rgba(0,0,0,0.1)');
        expect(tokens.get('--ar-test-gradient')).toBe('linear-gradient( 90deg, red, blue )');
    });
});

describe('validateCssPropertyCoverage', () => {
    function manifestWithTag(tagName, cssProperties, customElement = true) {
        return {
            modules: [
                {
                    declarations: [
                        {
                            name: tagName
                                .replace(/-/g, ' ')
                                .split(' ')
                                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(''),
                            tagName,
                            customElement,
                            cssProperties,
                        },
                    ],
                },
            ],
        };
    }

    it('ne retourne aucune erreur quand un token est documenté dans cssProperties', () => {
        const manifest = manifestWithTag('ar-alert', [{ name: '--ar-alert-border-radius' }]);
        const themeTokens = new Map([['--ar-alert-border-radius', '0.5rem']]);
        expect(validateCssPropertyCoverage(manifest, themeTokens)).toEqual([]);
    });

    it("retourne une erreur quand un token du thème n'est pas documenté en @cssprop", () => {
        const manifest = manifestWithTag('ar-alert', []);
        const themeTokens = new Map([['--ar-alert-border-radius', '0.5rem']]);
        const errors = validateCssPropertyCoverage(manifest, themeTokens);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('ArAlert');
        expect(errors[0]).toContain('--ar-alert-border-radius');
    });

    it('ignore les tokens globaux qui ne matchent aucun tag (ex. --ar-color-*, --ar-spacing-*)', () => {
        const manifest = manifestWithTag('ar-alert', []);
        const themeTokens = new Map([
            ['--ar-color-text', '#171717'],
            ['--ar-spacing-sm', '0.5rem'],
        ]);
        expect(validateCssPropertyCoverage(manifest, themeTokens)).toEqual([]);
    });

    it('attribue correctement un token au composant avec le tag le plus long (ar-tab-group vs ar-tab)', () => {
        const manifest = {
            modules: [
                {
                    declarations: [
                        {
                            name: 'ArTab',
                            tagName: 'ar-tab',
                            customElement: true,
                            cssProperties: [],
                        },
                        {
                            name: 'ArTabGroup',
                            tagName: 'ar-tab-group',
                            customElement: true,
                            cssProperties: [],
                        },
                    ],
                },
            ],
        };
        const themeTokens = new Map([
            ['--ar-tab-group-active-shadow', '0 2px 4px rgba(0,0,0,0.1)'],
        ]);
        const errors = validateCssPropertyCoverage(manifest, themeTokens);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('ArTabGroup');
        expect(errors[0]).toContain('--ar-tab-group-active-shadow');
    });

    it('ignore les déclarations sans customElement:true (ex. classe TypeScript, interface, type)', () => {
        const manifest = {
            modules: [
                {
                    declarations: [
                        { name: 'ArButtonHelper', tagName: undefined, customElement: false },
                    ],
                },
            ],
        };
        const themeTokens = new Map([['--ar-button-helper-color', 'red']]);
        expect(validateCssPropertyCoverage(manifest, themeTokens)).toEqual([]);
    });

    it('ignore les déclarations sans tagName (ex. type alias, interface)', () => {
        const manifest = {
            modules: [
                {
                    declarations: [
                        { name: 'ArButtonConfig', customElement: true, tagName: undefined },
                    ],
                },
            ],
        };
        const themeTokens = new Map([['--ar-button-config-value', 'test']]);
        expect(validateCssPropertyCoverage(manifest, themeTokens)).toEqual([]);
    });

    it("ne compare pas la valeur du token, seule la présence de l'entrée @cssprop compte", () => {
        const manifest = manifestWithTag('ar-alert', [{ name: '--ar-alert-padding' }]);
        const themeTokens = new Map([['--ar-alert-padding', '0.75rem']]);
        expect(validateCssPropertyCoverage(manifest, themeTokens)).toEqual([]);
    });

    it('agrège les erreurs sur plusieurs tokens undocumented du même composant', () => {
        const manifest = manifestWithTag('ar-alert', []);
        const themeTokens = new Map([
            ['--ar-alert-border-radius', '0.5rem'],
            ['--ar-alert-padding', '1rem'],
        ]);
        const errors = validateCssPropertyCoverage(manifest, themeTokens);
        expect(errors).toHaveLength(2);
        expect(errors.every((e) => e.includes('ArAlert'))).toBe(true);
    });
});
