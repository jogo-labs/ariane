// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Le nom d'un composant vit dans quatre sources, qui doivent rester d'accord :
 *   - `defineComponent('ar-x', ArX)` dans `components/x/index.ts` (enregistrement) ;
 *   - `@tagname ar-x` dans le JSDoc de la classe (le manifeste en tire `tagName`, donc la doc) ;
 *   - la clé `'ar-x'` de `HTMLElementTagNameMap` dans `index.ts` (types) ;
 *   - la clé `x` de `COMPONENT_DEFS` dans `autoloader.ts` (chargement différé).
 */
const COMPONENTS_DIR = join(__dirname);
const AUTOLOADER = readFileSync(join(__dirname, '..', 'autoloader.ts'), 'utf-8');

const dirs = readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(COMPONENTS_DIR, e.name, 'index.ts')))
    .map((e) => e.name)
    .sort();

function autoloaderKeys(): string[] {
    const block = AUTOLOADER.slice(AUTOLOADER.indexOf('COMPONENT_DEFS'));
    return [...block.matchAll(/^\s+'?([a-z][a-z0-9-]*)'?:\s*\(\)\s*=>\s*import\(/gm)].map(
        (m) => m[1],
    );
}

describe('enregistrement des composants — cohérence des sources', () => {
    it('trouve les composants à vérifier', () => {
        expect(dirs.length).toBeGreaterThanOrEqual(19);
    });

    for (const dir of dirs) {
        describe(dir, () => {
            const index = readFileSync(join(COMPONENTS_DIR, dir, 'index.ts'), 'utf-8');
            const classFile = readFileSync(join(COMPONENTS_DIR, dir, `${dir}.ts`), 'utf-8');
            const call = index.match(/defineComponent\('([a-z][a-z0-9-]*)',\s*(\w+)\)/);

            it("`index.ts` enregistre via defineComponent('<tag>', Classe)", () => {
                expect(call, 'defineComponent absent').not.toBeNull();
                expect(index).not.toContain('customElements.define');
            });

            it('le tag par défaut est ar-<dossier>', () => {
                expect(call?.[1]).toBe(`ar-${dir}`);
            });

            it('la classe porte @tagname <tag>', () => {
                expect(classFile).toMatch(new RegExp(`@tagname\\s+${call?.[1]}\\b`));
            });

            it('HTMLElementTagNameMap déclare le même tag', () => {
                expect(index).toContain(`'${call?.[1]}': ${call?.[2]}`);
            });

            it("l'autoloader a la clé du nom sans préfixe", () => {
                expect(autoloaderKeys()).toContain(dir);
            });
        });
    }
});
