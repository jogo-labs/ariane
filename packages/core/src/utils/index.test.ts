// @vitest-environment node
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Bundle un point d'entrée comme le fait un consommateur (Lit externe, comme dans dist/). */
async function bundle(relativePath: string) {
    const result = await build({
        entryPoints: [fileURLToPath(new URL(relativePath, import.meta.url))],
        bundle: true,
        write: false,
        metafile: true,
        format: 'esm',
        outfile: 'out.js',
        external: ['lit', 'lit/*', '@lit/*'],
        define: { __DEV__: 'false' },
        logLevel: 'silent',
    });
    const [output] = Object.values(result.metafile.outputs);
    return {
        inputs: Object.keys(result.metafile.inputs),
        exports: [...(output?.exports ?? [])].sort(),
        code: result.outputFiles[0]?.text ?? '',
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('@ariane-ui/core/utils', () => {
    it("n'embarque aucun composant et ne définit aucun custom element", async () => {
        const { inputs, code } = await bundle('./index.ts');

        expect(inputs.filter((path) => path.includes('/components/'))).toEqual([]);
        expect(code).not.toMatch(/customElements\s*\.\s*define/);
    });

    it('exporte exactement whenAllDefined et registerTranslation', async () => {
        const { exports } = await bundle('./index.ts');

        expect(exports).toEqual(['registerTranslation', 'whenAllDefined']);
    });

    it('reste accessible depuis le barrel principal (pas de breaking change)', async () => {
        const { exports } = await bundle('../index.ts');

        expect(exports).toContain('whenAllDefined');
        expect(exports).toContain('registerTranslation');
    });
});
