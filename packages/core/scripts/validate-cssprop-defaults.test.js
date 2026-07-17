import { describe, expect, it } from 'vitest';
import { extractThemeTokens } from './validate-cssprop-defaults.js';

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
});
