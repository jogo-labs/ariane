import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    buildDedupedTokenInventory,
    extractRootTokens,
    findDuplicateTokens,
} from './validate-no-duplicate-tokens.js';

test('détecte un token déclaré deux fois', () => {
    const css = `:root { --ar-color-text: red; } :root { --ar-color-text: blue; }`;
    const errors = findDuplicateTokens(css);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /--ar-color-text/);
});

test('aucune erreur si chaque token apparaît une seule fois', () => {
    const css = `:root { --ar-color-text: red; --ar-color-bg: white; }`;
    assert.deepEqual(findDuplicateTokens(css), []);
});

test('buildDedupedTokenInventory neutralise les redéclarations légitimes intra-fragment', () => {
    const fragment = `
        &[variant='info'] { --ar-alert-bg: var(--ar-color-info-bg); }
        &[variant='warning'] { --ar-alert-bg: var(--ar-color-warning-bg); }
        &[variant='error'] { --ar-alert-bg: var(--ar-color-danger-bg); }
    `;
    const inventory = buildDedupedTokenInventory([fragment]);
    assert.deepEqual(findDuplicateTokens(inventory), []);
});

test('buildDedupedTokenInventory ignore une mention de token dans un commentaire', () => {
    const fragment = `
        &::part(panel) {
            /* Valeur propre, volontairement non cascadée depuis --ar-panel-min-width :
               un menu dropdown reste lisible plus étroit. */
            min-width: 10rem;
        }
    `;
    const inventory = buildDedupedTokenInventory([fragment]);
    assert.deepEqual(findDuplicateTokens(inventory), []);
});

test('buildDedupedTokenInventory laisse détecter un doublon inter-fragments', () => {
    const fragmentA = `:root { --ar-alert-bg: red; }`;
    const fragmentB = `:root { --ar-alert-bg: blue; }`;
    const inventory = buildDedupedTokenInventory([fragmentA, fragmentB]);
    const errors = findDuplicateTokens(inventory);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /--ar-alert-bg/);
});

test('extractRootTokens exclut les overrides imbriqués dans un sélecteur composant', () => {
    const fragment = `
        :root {
            --ar-x: 1;
        }

        ar-foo {
            &::part(bar) {
                --ar-x: 2;
            }
        }
    `;
    const rootTokens = extractRootTokens(fragment);
    const matches = [...rootTokens.matchAll(/--ar-x(?=\s*:)/g)];
    assert.equal(matches.length, 1);
    assert.ok(!rootTokens.includes('ar-foo'));
});
