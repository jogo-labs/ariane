// scripts/starter-kit/generate-starter-demo.test.js
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate } from './generate-starter-demo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST = path.join(__dirname, '__fixtures__', 'sample-manifest.json');
const MDX_DIR = path.join(__dirname, '__fixtures__');
const REAL_THEMES_DIR = path.join(
    __dirname,
    '..',
    '..',
    'packages',
    'core',
    'src',
    'styles',
    'themes',
);

describe('generate (dry-run)', () => {
    it('écrit index.html et le thème dans outDir sans toucher à git', () => {
        const outDir = mkdtempSync(path.join(tmpdir(), 'starter-demo-'));
        try {
            const result = generate({
                manifestPath: MANIFEST,
                mdxDir: MDX_DIR,
                srcThemesDir: REAL_THEMES_DIR,
                dryRun: true,
                outDir,
            });
            expect(result.committed).toBe(false);
            const written = readFileSync(path.join(outDir, 'index.html'), 'utf8');
            expect(written).toMatch(/<h2>ar-alert<\/h2>/);
            expect(written).toBe(result.html);
            const entry = readFileSync(path.join(outDir, 'ariane-starter.css'), 'utf8');
            expect(entry).toMatch(/@import url\('\.\/ariane-starter\//);
        } finally {
            rmSync(outDir, { recursive: true, force: true });
        }
    });
});
