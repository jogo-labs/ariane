import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findDuplicateTokens } from './validate-no-duplicate-tokens.js';

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
