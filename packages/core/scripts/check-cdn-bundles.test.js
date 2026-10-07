// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CDN_EXPORTS, checkCdnBundles } from './check-cdn-bundles.js';

const PROD = 'export const a = 1;\n';
const DEV = 'export const a = 1; console.warn("avertissement");\n';

/** Construit un faux package avec un dossier cdn/ (production : `.js`, développement : `.dev.js`). */
function makePackage(root, { prodWarn = false, devWarn = true, extraFiles = [] } = {}) {
    mkdirSync(join(root, 'cdn', 'chunks'), { recursive: true });
    writeFileSync(join(root, 'cdn/index.js'), prodWarn ? DEV : PROD);
    writeFileSync(join(root, 'cdn/autoloader.js'), PROD);
    writeFileSync(join(root, 'cdn/index.dev.js'), devWarn ? DEV : PROD);
    writeFileSync(join(root, 'cdn/autoloader.dev.js'), PROD);
    writeFileSync(join(root, 'cdn/utils.js'), PROD);
    writeFileSync(join(root, 'cdn/utils.dev.js'), PROD);
    writeFileSync(join(root, 'cdn/chunks/alert-AAAA.js'), PROD);
    writeFileSync(join(root, 'cdn/chunks/alert-BBBB.dev.js'), PROD);
    for (const f of extraFiles) writeFileSync(join(root, f), PROD);
}

describe('checkCdnBundles', () => {
    let root;
    beforeEach(() => {
        root = mkdtempSync(join(tmpdir(), 'ariane-cdn-check-'));
    });
    afterEach(() => rmSync(root, { recursive: true, force: true }));

    it('ne signale rien quand les exports et les fichiers concordent', () => {
        makePackage(root);
        expect(checkCdnBundles({ exports: CDN_EXPORTS, root })).toEqual([]);
    });

    it('signale un export CDN attendu manquant', () => {
        makePackage(root);
        const exports = { ...CDN_EXPORTS };
        delete exports['./cdn.dev'];
        const errors = checkCdnBundles({ exports, root });
        expect(errors.join('\n')).toContain('./cdn.dev');
    });

    it('signale un export CDN `utils` manquant ou une cible `utils` absente', () => {
        makePackage(root);
        const exports = { ...CDN_EXPORTS };
        delete exports['./cdn/utils.dev'];
        expect(checkCdnBundles({ exports, root }).join('\n')).toContain('./cdn/utils.dev');
        rmSync(join(root, 'cdn/utils.js'));
        expect(checkCdnBundles({ exports: CDN_EXPORTS, root }).join('\n')).toContain(
            'cdn/utils.js',
        );
    });

    it("accepte `utils.dev.js` sans avertissement tant qu'un autre fichier dev en a", () => {
        makePackage(root);
        expect(checkCdnBundles({ exports: CDN_EXPORTS, root })).toEqual([]);
    });

    it('signale une version de production `utils` qui contient console.warn', () => {
        makePackage(root);
        writeFileSync(join(root, 'cdn/utils.js'), DEV);
        expect(checkCdnBundles({ exports: CDN_EXPORTS, root }).join('\n')).toContain(
            'cdn/utils.js',
        );
    });

    it('signale un ancien export `.prod` encore déclaré', () => {
        makePackage(root);
        const exports = { ...CDN_EXPORTS, './cdn.prod': './cdn/index.prod.js' };
        const errors = checkCdnBundles({ exports, root });
        expect(errors.join('\n')).toContain('./cdn.prod');
    });

    it('signale un export dont la cible ne pointe pas vers le fichier attendu', () => {
        makePackage(root);
        const exports = { ...CDN_EXPORTS, './cdn': './cdn/index.dev.js' };
        const errors = checkCdnBundles({ exports, root });
        expect(errors.join('\n')).toContain('./cdn');
    });

    it("signale une cible d'export absente du disque", () => {
        makePackage(root);
        rmSync(join(root, 'cdn/autoloader.dev.js'));
        const errors = checkCdnBundles({ exports: CDN_EXPORTS, root });
        expect(errors.join('\n')).toContain('cdn/autoloader.dev.js');
    });

    it('signale une version de production qui contient des avertissements de développement', () => {
        makePackage(root, { prodWarn: true });
        const errors = checkCdnBundles({ exports: CDN_EXPORTS, root });
        expect(errors.join('\n')).toContain('cdn/index.js');
        expect(errors.join('\n')).toContain('console.warn');
    });

    it('signale une version de développement sans aucun avertissement', () => {
        makePackage(root, { devWarn: false });
        const errors = checkCdnBundles({ exports: CDN_EXPORTS, root });
        expect(errors.join('\n')).toContain('développement');
    });

    it("signale un reste de l'ancienne nomenclature `.prod.js` dans cdn/", () => {
        makePackage(root, { extraFiles: ['cdn/index.prod.js'] });
        const errors = checkCdnBundles({ exports: CDN_EXPORTS, root });
        expect(errors.join('\n')).toContain('index.prod.js');
    });
});

describe('package.json', () => {
    it('déclare les exports CDN : le nom court est la production, `.dev` le développement', () => {
        const pkg = JSON.parse(
            readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf-8'),
        );
        const cdn = Object.fromEntries(
            Object.entries(pkg.exports).filter(([key]) => key.startsWith('./cdn')),
        );
        expect(cdn).toEqual(CDN_EXPORTS);
    });
});
