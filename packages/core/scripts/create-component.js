#!/usr/bin/env node
/**
 * create-component.js
 *
 * Génère le scaffolding complet d'un nouveau composant :
 *   - src/components/<n>/<tagname>.ts
 *   - src/components/<n>/<tagname>.styles.ts
 *   - src/components/<n>/<tagname>.test.ts
 *   - ../../apps/docs/src/content/components/<tagname>.mdx
 *   Et met à jour src/index.ts (barrel)
 *
 * Usage :
 *   npm run create -- button              → mr-button  (prefix par défaut)
 *   npm run create -- my-component        → mr-my-component
 *   npm run create -- mr-button           → mr-button  (prefix déjà présent, pas doublé)
 *   npm run create -- button --prefix ft  → ft-button
 *   npm run create -- button --prefix ""  → erreur, prefix requis
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DOCS_ROOT = join(__dirname, '../../../apps/docs');

// ─── Lecture du prefix dans package.json (permet de centraliser la config) ────
// Priorité : --prefix <val> en CLI > scripts.createPrefix dans package.json > "mr"

function readPackagePrefix() {
    try {
        const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
        return pkg.config?.componentPrefix ?? null;
    } catch {
        return null;
    }
}

// ─── Parsing des arguments ────────────────────────────────────────────────────

const args = process.argv.slice(2);

// Extraire --prefix <val> si présent
let cliPrefix = null;
const prefixFlagIndex = args.indexOf('--prefix');
if (prefixFlagIndex !== -1) {
    cliPrefix = args[prefixFlagIndex + 1];
    args.splice(prefixFlagIndex, 2);
}

const input = args[0];
const PREFIX = cliPrefix ?? readPackagePrefix() ?? 'mr';

// ─── Validation ───────────────────────────────────────────────────────────────

if (!input) {
    console.error('\n❌ Fournir un nom : npm run create -- button');
    console.error('                   npm run create -- my-component');
    console.error('                   npm run create -- button --prefix ft\n');
    process.exit(1);
}

if (!/^[a-z][a-z0-9-]*$/.test(input)) {
    console.error(`\n❌ Nom invalide : "${input}"`);
    console.error('   Minuscules et tirets uniquement. Exemple : my-component\n');
    process.exit(1);
}

if (!/^[a-z][a-z0-9]*$/.test(PREFIX)) {
    console.error(`\n❌ Prefix invalide : "${PREFIX}"`);
    console.error('   Minuscules sans tiret uniquement. Exemple : mr\n');
    process.exit(1);
}

// ─── Dérivation des noms ──────────────────────────────────────────────────────

// Si l'input commence déjà par le prefix, on ne le redouble pas
// ex: "mr-button" avec prefix "mr" → "mr-button" (pas "mr-mr-button")
const tagName = input.startsWith(`${PREFIX}-`) ? input : `${PREFIX}-${input}`;

const parts = tagName.split('-');
const className = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');

// Répertoire = parties après le prefix, sans tirets : mr-my-button → mybutton
const dirName = parts.slice(1).join('');

const componentDir = join(ROOT, 'src', 'components', dirName);
const fileName = dirName;

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
 * @cssprop [--${tagName}-size=auto] - Taille du composant.
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

const mdxTemplate = `---
tagName: ${tagName}
title: ${className.replace(new RegExp(`^${PREFIX.charAt(0).toUpperCase() + PREFIX.slice(1)}`), '')}
description: Description du composant ${tagName}.
variants:
  - name: Par défaut
    description: Rendu par défaut du composant.
    html: |
      <${tagName}></${tagName}>
---

Documentation narrative du composant \`${tagName}\`.
`;

// ─── Écriture des fichiers ────────────────────────────────────────────────────

mkdirSync(componentDir, { recursive: true });

const files = [
    {
        path: join(componentDir, `${fileName}.ts`),
        content: componentTemplate,
        label: `src/components/${dirName}/${fileName}.ts`,
    },
    {
        path: join(componentDir, `${fileName}.styles.ts`),
        content: stylesTemplate,
        label: `src/components/${dirName}/${fileName}.styles.ts`,
    },
    {
        path: join(componentDir, `${fileName}.test.ts`),
        content: testTemplate,
        label: `src/components/${dirName}/${fileName}.test.ts`,
    },
];

const mdxDir = join(DOCS_ROOT, 'src/content/components');
const mdxPath = join(mdxDir, `${tagName}.mdx`);
const hasDocs = existsSync(DOCS_ROOT);

if (hasDocs) {
    mkdirSync(mdxDir, { recursive: true });
    files.push({
        path: mdxPath,
        content: mdxTemplate,
        label: `apps/docs/src/content/components/${tagName}.mdx`,
    });
}

console.log(`\n🧩 Création de "${tagName}"...\n`);

for (const { path, content, label } of files) {
    writeFileSync(path, content, 'utf-8');
    console.log(`  ✓ ${label}`);
}

// ─── Mise à jour du barrel ────────────────────────────────────────────────────

const barrelPath = join(ROOT, 'src', 'index.ts');
const barrelContent = readFileSync(barrelPath, 'utf-8');
const exportLine = `export { ${className} } from './components/${dirName}/${fileName}.js';\n`;

if (!barrelContent.includes(exportLine)) {
    writeFileSync(barrelPath, barrelContent + exportLine, 'utf-8');
    console.log(`  ✓ src/index.ts mis à jour`);
}

// ─── Résumé ───────────────────────────────────────────────────────────────────

console.log(`\n✅ Composant "${tagName}" créé avec succès !\n`);
console.log(`   Prochaines étapes :`);
console.log(`   1. Implémenter  src/components/${dirName}/${fileName}.ts`);
console.log(`   2. Styles dans  src/components/${dirName}/${fileName}.styles.ts`);
console.log(`   3. Tests dans   src/components/${dirName}/${fileName}.test.ts`);
if (hasDocs) {
    console.log(`   4. Compléter les démo des variantes dans apps/docs/src/content/components/${tagName}.mdx`);
}
console.log('');
