// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { afterAll, describe, expect, it } from 'vitest';

const TYPES_MODULE = fileURLToPath(new URL('./translation', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'ar-translation-types-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
let counter = 0;

/** Compile `body` avec les types importés et renvoie les messages d'erreur du fichier. */
function check(body: string): string[] {
    const file = join(dir, `fixture-${counter++}.ts`);
    writeFileSync(
        file,
        `import type { Translation, FullTranslation } from '${TYPES_MODULE}';\n${body}\nexport {};\n`,
    );
    const program = ts.createProgram([file], {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
        strict: true,
        exactOptionalPropertyTypes: true,
        experimentalDecorators: true,
        skipLibCheck: true,
        noEmit: true,
        types: [],
    });
    return ts
        .getPreEmitDiagnostics(program)
        .filter((d) => d.file?.fileName === file)
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
}

describe('types Translation et FullTranslation', () => {
    it('accepte une traduction réduite à $code, $name et $dir', () => {
        const body = `const t: Translation = { $code: 'es', $name: 'Español', $dir: 'ltr' }; void t;`;
        expect(check(body)).toEqual([]);
    });

    it('accepte une traduction partielle, fonctions comprises', () => {
        const body = `const t: Translation = {
            $code: 'es', $name: 'Español', $dir: 'ltr',
            closeAlert: 'Cerrar',
            sortFailed: (columnLabel: string) => columnLabel,
        }; void t;`;
        expect(check(body)).toEqual([]);
    });

    it('rejette un terme inconnu', () => {
        const body = `const t: Translation = { $code: 'es', $name: 'E', $dir: 'ltr', closeAlerte: 'x' }; void t;`;
        expect(check(body).join('\n')).toContain('closeAlerte');
    });

    it('rejette un terme du mauvais type', () => {
        const body = `const t: Translation = { $code: 'es', $name: 'E', $dir: 'ltr', closeAlert: 3 }; void t;`;
        expect(check(body).join('\n')).toContain("'number' is not assignable to type 'string'");
    });

    it('exige $code, $name et $dir', () => {
        const body = `const t: Translation = { closeAlert: 'x' }; void t;`;
        expect(check(body).length).toBeGreaterThan(0);
    });

    it('FullTranslation exige tous les termes', () => {
        const body = `const t: FullTranslation = { $code: 'es', $name: 'E', $dir: 'ltr' }; void t;`;
        expect(check(body).join('\n')).toContain(
            "missing the following properties from type 'FullTranslation'",
        );
    });

    it('une FullTranslation est assignable à Translation', () => {
        const body = `declare const full: FullTranslation; const t: Translation = full; void t;`;
        expect(check(body)).toEqual([]);
    });
});
