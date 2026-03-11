#!/usr/bin/env node
/**
 * create-component.js
 *
 * Génère le scaffolding d'un nouveau composant :
 *   - src/components/<name>/<tagname>.ts
 *   - src/components/<name>/<tagname>.styles.ts
 *   - src/components/<name>/<tagname>.test.ts
 *   Et met à jour src/index.ts (barrel)
 *
 * Usage :
 *   node scripts/create-component.js mr-my-component
 *   npm run create mr-my-component          (depuis packages/core)
 *   npm run create -- mr-my-component       (depuis la racine)
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ─── Validation du tag name ───────────────────────────────────────────────────

const tagName = process.argv[2];

if (!tagName) {
    console.error('\n❌ Fournir un tag name : node scripts/create-component.js mr-my-component\n');
    process.exit(1);
}

// Custom elements doivent contenir un tiret et commencer par une lettre minuscule
if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(tagName)) {
    console.error(`\n❌ Tag name invalide : "${tagName}"`);
    console.error('   Format requis : minuscules, séparé par tirets, avec au moins un tiret.');
    console.error('   Exemple : mr-my-component\n');
    process.exit(1);
}

// ─── Dérivation des noms ──────────────────────────────────────────────────────

const parts = tagName.split('-');

// mr-my-button → ['mr', 'my', 'button'] → 'MrMyButton'
const className = parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');

// mr-my-button → 'my-button' (sans le prefix)
// mr-my-button → 'my/button' → répertoire : 'mybutton'
// Convention : dossier = nom sans prefix, sans tirets
const dirName = parts.slice(1).join('');

const componentDir = join(ROOT, 'src', 'components', dirName);
const fileName = tagName; // ex: mr-my-button

// ─── Vérification doublon ─────────────────────────────────────────────────────

if (existsSync(componentDir)) {
    console.error(`\n❌ Le composant "${tagName}" existe déjà dans ${componentDir}\n`);
    process.exit(1);
}

// ─── Templates ────────────────────────────────────────────────────────────────

const componentTemplate = `import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './${fileName}.styles.js';

/**
 * @summary Résumé du composant ${tagName}.
 *
 * @slot         - Contenu principal.
 *
 * @csspart base - L'élément racine du composant.
 *
 * @event {CustomEvent} ${tagName}-change - Émis lors d'un changement.
 */
@customElement('${tagName}')
export class ${className} extends LitElement {
    static override styles = [styles];

    override render() {
        return html\`
            <div part="base">
                <slot></slot>
            </div>
        \`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        '${tagName}': ${className};
    }
}
`;

const stylesTemplate = `import { css } from 'lit';

export default css\`
    :host {
        display: block;
        box-sizing: border-box;
    }
\`;
`;

const testTemplate = `import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ${className} } from './${fileName}.js';
import './${fileName}.js';

async function fixture(html: string): Promise<${className}> {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstElementChild as ${className};
    document.body.appendChild(el);
    await (el as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    return el;
}

describe('${className}', () => {
    let el: ${className};

    afterEach(() => el?.remove());

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<${tagName}></${tagName}>');
        });

        it('monte un shadow DOM', () => {
            expect(el.shadowRoot).not.toBeNull();
        });

        it('contient un élément racine avec part="base"', () => {
            expect(el.shadowRoot!.querySelector('[part="base"]')).not.toBeNull();
        });
    });
});
`;

// ─── Écriture des fichiers ────────────────────────────────────────────────────

mkdirSync(componentDir, { recursive: true });

const files = [
    { path: join(componentDir, `${fileName}.ts`), content: componentTemplate },
    { path: join(componentDir, `${fileName}.styles.ts`), content: stylesTemplate },
    { path: join(componentDir, `${fileName}.test.ts`), content: testTemplate },
];

for (const { path, content } of files) {
    writeFileSync(path, content, 'utf-8');
    console.log(`  ✓ ${path.replace(ROOT + '/', '')}`);
}

// ─── Mise à jour du barrel src/index.ts ───────────────────────────────────────

const barrelPath = join(ROOT, 'src', 'index.ts');
const barrelContent = readFileSync(barrelPath, 'utf-8');
const exportLine = `export { ${className} } from './components/${dirName}/${fileName}.js';\n`;

// Éviter les doublons si lancé plusieurs fois
if (!barrelContent.includes(exportLine)) {
    writeFileSync(barrelPath, barrelContent + exportLine, 'utf-8');
    console.log(`  ✓ src/index.ts mis à jour`);
}

console.log(`\n✅ Composant "${tagName}" créé avec succès !\n`);
console.log(`   Prochaines étapes :`);
console.log(`   1. Implémenter src/components/${dirName}/${fileName}.ts`);
console.log(`   2. Ajouter les styles dans ${fileName}.styles.ts`);
console.log(`   3. Écrire les tests dans ${fileName}.test.ts`);
console.log(`   4. Documenter dans apps/docs/src/content/components/${tagName}.mdx\n`);
