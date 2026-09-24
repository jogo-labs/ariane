import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractComponentRules } from './extract-component-rules.js';

test('exclut :root et [data-theme] de chaque bloc @layer, garde les règles composants', () => {
    const bundled = `
@layer ariane.theme {
  :root {
    --ar-color-text: black;
  }
}
@layer ariane.theme {
  :root[data-theme='dark'], [data-theme='dark'] {
    color-scheme: dark;
  }
}
@layer ariane.theme {
  ar-alert {
    color: var(--ar-color-text);
  }
}
`;
    const result = extractComponentRules(bundled);
    assert.doesNotMatch(result, /--ar-color-text: black/);
    assert.doesNotMatch(result, /data-theme/);
    assert.match(result, /ar-alert\s*\{[\s\S]*color: var\(--ar-color-text\);/);
});

test('enrobe le résultat dans un unique @layer ariane.theme', () => {
    const bundled = `@layer ariane.theme {\n  ar-alert {\n    color: red;\n  }\n}\n`;
    const result = extractComponentRules(bundled);
    const layerOpenings = result.match(/@layer ariane\.theme\s*\{/g) ?? [];
    assert.equal(layerOpenings.length, 1);
});

test('gère plusieurs composants dans des blocs @layer séparés', () => {
    const bundled = `
@layer ariane.theme {
  ar-alert { color: red; }
}
@layer ariane.theme {
  ar-dialog { color: blue; }
}
`;
    const result = extractComponentRules(bundled);
    assert.match(result, /ar-alert/);
    assert.match(result, /ar-dialog/);
});
