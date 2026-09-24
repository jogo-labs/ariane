import { describe, expect, it } from 'vitest';
import { extractComponentRules } from './extract-component-rules.js';

describe('extractComponentRules', () => {
    it('exclut :root et [data-theme] de chaque bloc @layer, garde les règles composants', () => {
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
        expect(result).not.toMatch(/--ar-color-text: black/);
        expect(result).not.toMatch(/data-theme/);
        expect(result).toMatch(/ar-alert\s*\{[\s\S]*color: var\(--ar-color-text\);/);
    });

    it('enrobe le résultat dans un unique @layer ariane.theme', () => {
        const bundled = `@layer ariane.theme {\n  ar-alert {\n    color: red;\n  }\n}\n`;
        const result = extractComponentRules(bundled);
        const layerOpenings = result.match(/@layer ariane\.theme\s*\{/g) ?? [];
        expect(layerOpenings.length).toBe(1);
    });

    it('gère plusieurs composants dans des blocs @layer séparés', () => {
        const bundled = `
@layer ariane.theme {
  ar-alert { color: red; }
}
@layer ariane.theme {
  ar-dialog { color: blue; }
}
`;
        const result = extractComponentRules(bundled);
        expect(result).toMatch(/ar-alert/);
        expect(result).toMatch(/ar-dialog/);
    });
});
