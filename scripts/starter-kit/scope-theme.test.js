import { describe, expect, it } from 'vitest';
import { scopeThemeUnder, collectSelectors, unscopedSelectors } from './scope-theme.js';

const THEME = `
@layer ariane.theme {
  :root { --ar-color-text: black; }
}
@layer ariane.theme {
  :root[data-theme='dark'], [data-theme='dark'] { color-scheme: dark; }
}
@layer ariane.theme {
  ar-alert {
    color: var(--ar-color-text);
    &::part(close-button) { opacity: 0.75; }
  }
  ar-dialog[size='sm'] { --ar-dialog-width: 20rem; }
}
`;

describe('scopeThemeUnder', () => {
    it('enveloppe sous la classe et supprime tout :root', () => {
        const out = scopeThemeUnder(THEME, 'doc-demo');
        expect(out).toContain('.doc-demo');
        expect(out).not.toContain(':root');
    });

    it('place les tokens de :root sur le conteneur lui-même', () => {
        const out = scopeThemeUnder(THEME, 'doc-demo');
        expect(out).toMatch(/--ar-color-text:\s*black/);
    });

    it('ne laisse aucun sélecteur hors du conteneur', () => {
        expect(unscopedSelectors(scopeThemeUnder(THEME, 'doc-demo'), 'doc-demo')).toEqual([]);
    });
});

describe('unscopedSelectors', () => {
    it('détecte une règle globale', () => {
        const css = '.doc-demo { ar-alert { color: red; } } ar-tooltip { color: blue; }';
        expect(unscopedSelectors(css, 'doc-demo')).toHaveLength(1);
    });

    it('accepte une liste :is() dont tous les membres sont scopés', () => {
        const css = '.doc-demo { :is(ar-a, ar-b) { color: red; } }';
        expect(unscopedSelectors(css, 'doc-demo')).toEqual([]);
    });
});

describe('collectSelectors', () => {
    it('aplatit les règles imbriquées en sélecteurs complets', () => {
        const selectors = collectSelectors('ar-alert { &::part(close-button) { opacity: 1; } }');
        const flat = selectors.map((sel) => sel.map((c) => c.type).join(' '));
        expect(flat).toContain('type pseudo-element');
    });
});
