/**
 * create-component.test.ts
 *
 * Tests d'intégration pour le script de scaffolding.
 * Chaque test exécute le script dans un répertoire temporaire isolé
 * puis vérifie les fichiers produits et les mises à jour de barrel/autoloader.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// ─── Setup ────────────────────────────────────────────────────────────────────

const SCRIPT = join(import.meta.dirname, '..', 'scripts', 'create-component.js');

/** Crée une structure minimale de projet dans un dossier temporaire. */
function createTmpProject(): string {
    const dir = join(tmpdir(), `ariane-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(join(dir, 'src', 'components'), { recursive: true });

    // package.json avec prefix "ar"
    writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ name: '@ariane-ui/core', config: { componentPrefix: 'ar' } }),
    );

    // barrel vide
    writeFileSync(join(dir, 'src', 'index.ts'), '// barrel\n');

    // autoloader avec marker
    writeFileSync(
        join(dir, 'src', 'autoloader.ts'),
        [
            'const COMPONENT_MAP: Record<string, () => Promise<unknown>> = {',
            '    // ⚠ Mis à jour automatiquement par le script create-component.js',
            '};',
            '',
        ].join('\n'),
    );

    return dir;
}

/** Exécute le script de scaffolding. */
function runScript(cwd: string, args: string[] = []): string {
    const scriptsDir = join(cwd, 'scripts');
    mkdirSync(scriptsDir, { recursive: true });

    const scriptContent = readFileSync(SCRIPT, 'utf-8');
    const tmpScript = join(scriptsDir, 'create-component.js');
    writeFileSync(tmpScript, scriptContent);

    return execFileSync('node', [tmpScript, ...args], {
        cwd,
        encoding: 'utf-8',
        env: { ...process.env, NODE_NO_WARNINGS: '1' },
    });
}

/** Exécute le script et attend un code de sortie non-0. */
function runScriptExpectError(cwd: string, args: string[] = []): string {
    const scriptsDir = join(cwd, 'scripts');
    mkdirSync(scriptsDir, { recursive: true });

    const scriptContent = readFileSync(SCRIPT, 'utf-8');
    const tmpScript = join(scriptsDir, 'create-component.js');
    writeFileSync(tmpScript, scriptContent);

    try {
        execFileSync('node', [tmpScript, ...args], {
            cwd,
            encoding: 'utf-8',
            env: { ...process.env, NODE_NO_WARNINGS: '1' },
        });
        throw new Error('Le script aurait dû échouer');
    } catch (err: unknown) {
        const e = err as Error & { stderr?: string; stdout?: string };
        if (e.message === 'Le script aurait dû échouer') throw e;
        return e.stderr || e.stdout || '';
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('create-component.js', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = createTmpProject();
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    // ── Création de fichiers ────────────────────────────────────────────────

    describe('création de fichiers', () => {
        it('crée les 3 fichiers du composant (.ts, .styles.ts, .test.ts)', () => {
            runScript(tmpDir, ['tooltip']);

            expect(existsSync(join(tmpDir, 'src/components/tooltip/tooltip.ts'))).toBe(true);
            expect(existsSync(join(tmpDir, 'src/components/tooltip/tooltip.styles.ts'))).toBe(true);
            expect(existsSync(join(tmpDir, 'src/components/tooltip/tooltip.test.ts'))).toBe(true);
        });

        it('génère le bon tag name dans le composant', () => {
            runScript(tmpDir, ['tooltip']);

            const content = readFileSync(
                join(tmpDir, 'src/components/tooltip/tooltip.ts'),
                'utf-8',
            );
            expect(content).toContain("@customElement('ar-tooltip')");
            expect(content).toContain('export class ArTooltip');
            expect(content).toContain("'ar-tooltip': ArTooltip");
        });

        it('génère le bon import dans le fichier de test', () => {
            runScript(tmpDir, ['tooltip']);

            const content = readFileSync(
                join(tmpDir, 'src/components/tooltip/tooltip.test.ts'),
                'utf-8',
            );
            expect(content).toContain('import type { ArTooltip }');
            expect(content).toContain("describe('ArTooltip'");
            expect(content).toContain('<ar-tooltip></ar-tooltip>');
        });
    });

    // ── Nommage ─────────────────────────────────────────────────────────────

    describe('nommage', () => {
        it('ne double pas le prefix si déjà présent', () => {
            runScript(tmpDir, ['ar-tooltip']);

            const content = readFileSync(
                join(tmpDir, 'src/components/tooltip/tooltip.ts'),
                'utf-8',
            );
            expect(content).toContain("@customElement('ar-tooltip')");
            expect(content).not.toContain('ar-ar-tooltip');
        });

        it('gère les noms composés (my-component → ar-my-component)', () => {
            runScript(tmpDir, ['my-component']);

            expect(existsSync(join(tmpDir, 'src/components/mycomponent/mycomponent.ts'))).toBe(
                true,
            );
            const content = readFileSync(
                join(tmpDir, 'src/components/mycomponent/mycomponent.ts'),
                'utf-8',
            );
            expect(content).toContain("@customElement('ar-my-component')");
            expect(content).toContain('export class ArMyComponent');
        });

        it('supporte un prefix custom via --prefix', () => {
            runScript(tmpDir, ['tooltip', '--prefix', 'ft']);

            const content = readFileSync(
                join(tmpDir, 'src/components/tooltip/tooltip.ts'),
                'utf-8',
            );
            expect(content).toContain("@customElement('ft-tooltip')");
            expect(content).toContain('export class FtTooltip');
        });
    });

    // ── Mise à jour du barrel ────────────────────────────────────────────────

    describe('barrel (index.ts)', () => {
        it("ajoute la ligne d'export dans index.ts", () => {
            runScript(tmpDir, ['tooltip']);

            const barrel = readFileSync(join(tmpDir, 'src/index.ts'), 'utf-8');
            expect(barrel).toContain(
                "export { ArTooltip } from './components/tooltip/tooltip.js';",
            );
        });

        it("n'ajoute pas de doublon si le composant existe déjà dans le barrel", () => {
            const barrelPath = join(tmpDir, 'src/index.ts');
            writeFileSync(
                barrelPath,
                "export { ArTooltip } from './components/tooltip/tooltip.js';\n",
            );

            runScript(tmpDir, ['dialog']);
            const barrel = readFileSync(barrelPath, 'utf-8');
            const tooltipMatches = barrel.match(/ArTooltip/g);
            expect(tooltipMatches).toHaveLength(1);
        });
    });

    // ── Mise à jour de l'autoloader ─────────────────────────────────────────

    describe('autoloader', () => {
        it("ajoute l'entrée dans COMPONENT_MAP", () => {
            runScript(tmpDir, ['tooltip']);

            const autoloader = readFileSync(join(tmpDir, 'src/autoloader.ts'), 'utf-8');
            expect(autoloader).toContain(
                "'ar-tooltip': () => import('./components/tooltip/tooltip.js')",
            );
        });

        it("n'ajoute pas de doublon si le tag existe déjà dans l'autoloader", () => {
            runScript(tmpDir, ['tooltip']);
            rmSync(join(tmpDir, 'src/components/tooltip'), { recursive: true });
            runScript(tmpDir, ['tooltip']);

            const autoloader = readFileSync(join(tmpDir, 'src/autoloader.ts'), 'utf-8');
            const matches = autoloader.match(/ar-tooltip/g);
            expect(matches).toHaveLength(1);
        });
    });

    // ── Validation / erreurs ────────────────────────────────────────────────

    describe('validation', () => {
        it('échoue sans argument', () => {
            const output = runScriptExpectError(tmpDir, []);
            expect(output).toContain('Fournir un nom');
        });

        it('échoue avec un nom invalide (majuscules)', () => {
            const output = runScriptExpectError(tmpDir, ['MyComponent']);
            expect(output).toContain('Nom invalide');
        });

        it('échoue si le composant existe déjà', () => {
            runScript(tmpDir, ['tooltip']);
            const output = runScriptExpectError(tmpDir, ['tooltip']);
            expect(output).toContain('existe déjà');
        });
    });
});
