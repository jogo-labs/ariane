import { describe, expect, it } from 'vitest';
import {
    scopeThemeUnder,
    collectSelectors,
    collectDeclaredProperties,
    unscopedSelectors,
} from './scope-theme.js';

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

describe('collectDeclaredProperties', () => {
    const namesOf = (css) => [...collectDeclaredProperties(css).values()].flatMap((n) => [...n]);

    it('rapporte le vrai nom des déclarations à valeur var(), pas « unparsed »', () => {
        const names = namesOf('ar-alert { color: var(--x); margin: var(--y) !important; --z: 1; }');
        expect(names).toEqual(expect.arrayContaining(['color', 'margin', '--z']));
        expect(names).not.toContain('unparsed');
    });

    it('permet de détecter un starter qui abandonne `color: var(--x)` pour un sélecteur', () => {
        const reference = collectDeclaredProperties('ar-alert { color: var(--x); }');
        const starter = collectDeclaredProperties('ar-alert { padding: 1px; }');
        const missing = [];
        for (const [selector, names] of reference) {
            for (const name of names) {
                if (!starter.get(selector)?.has(name)) missing.push(name);
            }
        }
        expect(missing).toEqual(['color']);
    });
});
