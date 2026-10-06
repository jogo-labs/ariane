// scripts/starter-kit/theme-to-js.test.js
import { describe, expect, it } from 'vitest';
import { themeToJs } from './theme-to-js.js';

const THEME = `
:root { --ar-color-text: black; }
:root[data-theme='dark'], [data-theme='dark'] { color-scheme: dark; }
@layer mon-theme {
  :root { --ar-color-bg: white; }
  ar-alert { color: var(--ar-color-text); &::part(close-button) { opacity: .75; } }
}
ar-dialog[size='sm'] { --ar-dialog-width: 20rem; }
:root, ar-badge { color: red; }
`;

const SCOPED = `
:root[data-theme='dark'] ar-tag { color: blue; }
ar-chip[data-theme='dark'] { color: green; }
[data-theme='dark'] ar-pill { color: pink; }
`;

function sheetText(js) {
    const match = js.match(/replaceSync\((".*")\);/s);
    return JSON.parse(match[1]);
}

describe('themeToJs', () => {
    it('exporte un CSSStyleSheet au nom demandé', () => {
        const js = themeToJs(THEME, { name: 'monTheme' });
        expect(js).toContain('export const monTheme = new CSSStyleSheet();');
        expect(js).toContain('monTheme.replaceSync(');
    });

    it('nom par défaut : theme', () => {
        expect(themeToJs(THEME)).toContain('export const theme = new CSSStyleSheet();');
    });

    it('retire :root et [data-theme] (les tokens traversent déjà le shadow DOM)', () => {
        const css = sheetText(themeToJs(THEME));
        expect(css).not.toContain(':root');
        expect(css).not.toContain('data-theme');
        expect(css).not.toContain('--ar-color-text:black');
    });

    it('garde les règles de composants et leur couche, sans exiger ariane.theme', () => {
        const css = sheetText(themeToJs(THEME));
        expect(css).toContain('@layer mon-theme');
        expect(css).toContain('ar-alert');
        expect(css).toContain('::part(close-button)');
        expect(css).toContain('ar-dialog[size=sm]');
    });

    it('liste mixte : retire le membre document, garde le composant', () => {
        const css = sheetText(themeToJs(THEME));
        expect(css).toContain('ar-badge{color:red}');
        expect(css).not.toMatch(/:root,ar-badge|ar-badge,:root/);
    });

    it('garde les sélecteurs de composants qui mentionnent :root ou [data-theme] hors sujet', () => {
        const css = sheetText(themeToJs(SCOPED));
        expect(css).toContain(':root[data-theme=dark] ar-tag');
        expect(css).toContain('ar-chip[data-theme=dark]');
        expect(css).toContain('[data-theme=dark] ar-pill');
    });

    it("refuse un nom qui n'est pas un identifiant JavaScript", () => {
        expect(() => themeToJs(THEME, { name: 'mon-theme' })).toThrow(/identifiant/);
    });
});
