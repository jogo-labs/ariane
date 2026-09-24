# Renommage default.css → ariane.css + restructuration en imports — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renommer `packages/core/src/styles/themes/default.css` en `ariane.css`, éclater sa source en fragments importés par concern (palette, tokens sémantiques, tokens globaux, tokens partagés, un fragment par famille de composant combinant tokens+règles), tout en gardant `dist/styles/themes/ariane.css` comme un seul fichier bundlé (zéro changement pour le consommateur).

**Architecture:** Un script de migration ponctuel extrait `default.css` en fragments selon une table de correspondance ligne-à-ligne, vérifiée par un contrôle de couverture automatique (aucun token/règle perdu ou dupliqué). `scripts/build-css.js` passe en `bundle: true` (esbuild résout les `@import ... layer(ariane.theme);`) et son extracteur de règles pour le JS jumeau (#170) devient conscient de la structure CSS (exclut `:root`/`[data-theme]`) au lieu de chercher une ancre textuelle. `cem.config.js` et son nouveau garde-fou anti-doublon lisent `dist/styles/themes/ariane.css` (déjà bundlé) plutôt que la source — `turbo.json` gagne une dépendance `build:manifest → build:css` pour garantir cet ordre.

**Tech Stack:** Node.js (script de migration ponctuel, `node:test` pour les nouveaux tests), esbuild (déjà en dépendance, bundling CSS natif `@import`/`@layer`), Turborepo (`turbo.json`).

**Spec:** `docs/superpowers/specs/2026-09-24-ariane-css-restructure-256-design.md`

## Global Constraints

- `dist/styles/themes/ariane.css` reste un seul fichier minifié après build — aucune régression réseau pour le consommateur (`<link>`/bundler).
- Chaque token `--ar-*` doit être déclaré dans exactement un fragment source — pas de doublon silencieux.
- Fragments préfixés `_` (convention "partial") — jamais construits comme points d'entrée `dist/` autonomes.
- `@import url('./chemin') layer(ariane.theme);` en tête de `ariane.css` — jamais de `@import` imbriqué dans un bloc `@layer { }` (invalide en CSS).
- Pas de fichier `default.css` de compatibilité conservé (bibliothèque alpha, cf. `CLAUDE.md`).
- Les documents archivés (`docs/superpowers/specs/*.md`, `docs/superpowers/plans/*.md`) ne sont **jamais** modifiés par la mise à jour des références — ce sont des documents historiques.

---

## Task 1: Branche de travail

- [ ] **Step 1: Créer la branche depuis `dev`**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout dev
git pull --ff-only
git checkout -b refactor/ariane-css-restructure-256
```

- [ ] **Step 2: Vérifier l'état propre**

```bash
git status
```

Expected: `nothing to commit, working tree clean`.

---

## Task 2: Migration — extraire `default.css` en fragments

**Files:**

- Create: `packages/core/src/styles/themes/ariane.css` (entrée)
- Create: `packages/core/src/styles/themes/ariane/_palette.css`
- Create: `packages/core/src/styles/themes/ariane/_semantic-tokens.css`
- Create: `packages/core/src/styles/themes/ariane/_global-tokens.css`
- Create: `packages/core/src/styles/themes/ariane/shared/_panel.css`
- Create: `packages/core/src/styles/themes/ariane/shared/_anchor.css`
- Create: `packages/core/src/styles/themes/ariane/components/_alert.css`
- Create: `packages/core/src/styles/themes/ariane/components/_breadcrumb.css`
- Create: `packages/core/src/styles/themes/ariane/components/_charcounter.css`
- Create: `packages/core/src/styles/themes/ariane/components/_collapse.css`
- Create: `packages/core/src/styles/themes/ariane/components/_datepicker.css`
- Create: `packages/core/src/styles/themes/ariane/components/_dialog.css`
- Create: `packages/core/src/styles/themes/ariane/components/_dropdown.css`
- Create: `packages/core/src/styles/themes/ariane/components/_pagination.css`
- Create: `packages/core/src/styles/themes/ariane/components/_progressbar.css`
- Create: `packages/core/src/styles/themes/ariane/components/_spinner.css`
- Create: `packages/core/src/styles/themes/ariane/components/_stepper.css`
- Create: `packages/core/src/styles/themes/ariane/components/_tab.css`
- Create: `packages/core/src/styles/themes/ariane/components/_table-sort.css`
- Create: `packages/core/src/styles/themes/ariane/components/_tooltip.css`
- Create (temporaire, supprimé en Step 5): `scripts/migrate-theme-split.mjs`
- Delete: `packages/core/src/styles/themes/default.css`

- [ ] **Step 1: Écrire le script de migration avec la table de correspondance**

Table de lignes établie par lecture de `default.css` (état à la branche de départ — si le fichier a changé depuis, les bornes sont à réajuster ; le contrôle de couverture du Step 3 détecte tout écart).

```js
// scripts/migrate-theme-split.mjs (script ponctuel — supprimé après usage, Step 5)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SRC = 'packages/core/src/styles/themes/default.css';
const lines = readFileSync(SRC, 'utf8').split('\n');

// [firstLine, lastLine] 1-indexés, inclusifs.
const slice = (from, to) => lines.slice(from - 1, to).join('\n') + '\n';

const FRAGMENTS = {
    'packages/core/src/styles/themes/ariane/_palette.css': [[19, 122]],
    'packages/core/src/styles/themes/ariane/_semantic-tokens.css': [[124, 247]],
    'packages/core/src/styles/themes/ariane/_global-tokens.css': [
        [17, 17], // color-scheme: light dark;
        [249, 360], // sections 4+5+6
        [598, 622], // blocs [data-theme='dark'/'light']
    ],
    'packages/core/src/styles/themes/ariane/shared/_panel.css': [[366, 380]],
    'packages/core/src/styles/themes/ariane/shared/_anchor.css': [[381, 388]],
    'packages/core/src/styles/themes/ariane/components/_alert.css': [
        [389, 397],
        [1005, 1066],
    ],
    'packages/core/src/styles/themes/ariane/components/_breadcrumb.css': [
        [398, 404],
        [1123, 1288],
    ],
    'packages/core/src/styles/themes/ariane/components/_stepper.css': [
        [405, 419],
        [827, 1004],
    ],
    'packages/core/src/styles/themes/ariane/components/_progressbar.css': [
        [420, 429],
        [1497, 1515],
    ],
    'packages/core/src/styles/themes/ariane/components/_pagination.css': [
        [430, 435],
        [1327, 1467],
    ],
    'packages/core/src/styles/themes/ariane/components/_spinner.css': [[436, 440]],
    'packages/core/src/styles/themes/ariane/components/_tooltip.css': [[441, 454]],
    'packages/core/src/styles/themes/ariane/components/_dropdown.css': [
        [455, 460],
        [1289, 1326],
    ],
    'packages/core/src/styles/themes/ariane/components/_dialog.css': [
        [461, 476],
        [1067, 1122],
    ],
    'packages/core/src/styles/themes/ariane/components/_collapse.css': [[477, 482]],
    'packages/core/src/styles/themes/ariane/components/_charcounter.css': [
        [483, 488],
        [1482, 1496],
    ],
    'packages/core/src/styles/themes/ariane/components/_table-sort.css': [
        [489, 496],
        [1468, 1481],
    ],
    'packages/core/src/styles/themes/ariane/components/_tab.css': [
        [497, 511],
        [1516, 1569],
    ],
    'packages/core/src/styles/themes/ariane/components/_datepicker.css': [
        [512, 596],
        [630, 826],
    ],
};

for (const [outPath, ranges] of Object.entries(FRAGMENTS)) {
    mkdirSync(dirname(outPath), { recursive: true });
    const content = ranges.map(([from, to]) => slice(from, to)).join('\n');
    writeFileSync(outPath, content);
    console.log(`✓ ${outPath} (${ranges.length} plage(s))`);
}

const ENTRY = `/**
 * ariane.css — thème de la doc/démo Ariane ("Le Fil").
 * Utilise @layer pour éviter les conflits de spécificité avec les styles utilisateur.
 * Source éclatée en fragments par concern (voir ./ariane/) pour la maintenabilité —
 * dist/ reste un seul fichier bundlé (esbuild résout les @import, cf. build-css.js).
 *
 * Usage :
 *   <link rel="stylesheet" href="https://unpkg.com/@ariane-ui/core/dist/styles/themes/ariane.css">
 *   ou
 *   import '@ariane-ui/core/themes/ariane.css'; // via bundler
 */
@import url('./ariane/_palette.css') layer(ariane.theme);
@import url('./ariane/_semantic-tokens.css') layer(ariane.theme);
@import url('./ariane/_global-tokens.css') layer(ariane.theme);
@import url('./ariane/shared/_panel.css') layer(ariane.theme);
@import url('./ariane/shared/_anchor.css') layer(ariane.theme);
@import url('./ariane/components/_alert.css') layer(ariane.theme);
@import url('./ariane/components/_breadcrumb.css') layer(ariane.theme);
@import url('./ariane/components/_charcounter.css') layer(ariane.theme);
@import url('./ariane/components/_collapse.css') layer(ariane.theme);
@import url('./ariane/components/_datepicker.css') layer(ariane.theme);
@import url('./ariane/components/_dialog.css') layer(ariane.theme);
@import url('./ariane/components/_dropdown.css') layer(ariane.theme);
@import url('./ariane/components/_pagination.css') layer(ariane.theme);
@import url('./ariane/components/_progressbar.css') layer(ariane.theme);
@import url('./ariane/components/_spinner.css') layer(ariane.theme);
@import url('./ariane/components/_stepper.css') layer(ariane.theme);
@import url('./ariane/components/_tab.css') layer(ariane.theme);
@import url('./ariane/components/_table-sort.css') layer(ariane.theme);
@import url('./ariane/components/_tooltip.css') layer(ariane.theme);
`;
writeFileSync('packages/core/src/styles/themes/ariane.css', ENTRY);
console.log('✓ packages/core/src/styles/themes/ariane.css (entrée)');
```

Note : l'ordre des `@import` n'affecte pas la résolution des `var()` (les custom properties CSS se résolvent contre la cascade finale, pas séquentiellement comme des variables Sass) — seul l'ordre logique de lecture compte ici.

- [ ] **Step 2: Exécuter le script**

```bash
cd /Users/jon/Code/Active_projects/ariane
node scripts/migrate-theme-split.mjs
```

Expected: 19 lignes `✓ ...` + la ligne de l'entrée, aucune exception.

- [ ] **Step 3: Contrôle de couverture — aucun token/règle perdu ou dupliqué**

```bash
node -e "
const { readFileSync, readdirSync, statSync } = require('node:fs');
const { join } = require('node:path');

function walk(dir) {
    let out = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        out = statSync(full).isDirectory() ? out.concat(walk(full)) : out.concat(full.endsWith('.css') ? [full] : []);
    }
    return out;
}

const original = readFileSync('packages/core/src/styles/themes/default.css', 'utf8');
const fragments = walk('packages/core/src/styles/themes/ariane')
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');

const tokenRe = /--ar-[a-zA-Z0-9-]+(?=\s*:)/g;
const origTokens = [...new Set(original.match(tokenRe) ?? [])].sort();
const fragTokens = [...new Set(fragments.match(tokenRe) ?? [])].sort();

const missing = origTokens.filter((t) => !fragTokens.includes(t));
const extra = fragTokens.filter((t) => !origTokens.includes(t));
const dupCounts = {};
for (const t of fragments.match(tokenRe) ?? []) dupCounts[t] = (dupCounts[t] ?? 0) + 1;
const duplicated = Object.entries(dupCounts).filter(([, n]) => n > 1).map(([t]) => t);

console.log('Tokens manquants :', missing.length ? missing : 'aucun');
console.log('Tokens en trop (ne devraient pas exister) :', extra.length ? extra : 'aucun');
console.log('Tokens dupliqués entre fragments :', duplicated.length ? duplicated : 'aucun');
if (missing.length || extra.length || duplicated.length) process.exit(1);
console.log('✓ Couverture OK —', origTokens.length, 'tokens, tous présents une seule fois.');
"
```

Expected: `✓ Couverture OK`, sortie de sortie 0. **Si des tokens manquent ou sont dupliqués, ajuster les plages de lignes dans `FRAGMENTS` (Step 1) et relancer Step 2+3 depuis un `git checkout` propre des fragments** — ne pas corriger les fragments à la main, corriger la table et régénérer, pour rester traçable.

- [ ] **Step 4: Vérification visuelle rapide de deux fragments représentatifs**

```bash
head -5 packages/core/src/styles/themes/ariane/_palette.css
head -5 packages/core/src/styles/themes/ariane/components/_datepicker.css
tail -5 packages/core/src/styles/themes/ariane/components/_datepicker.css
```

Expected : `_palette.css` commence par le commentaire "Primary" ; `_datepicker.css` commence par ses tokens et se termine par une règle CSS fermée proprement (pas de ligne tronquée).

- [ ] **Step 5: Supprimer l'ancien fichier et le script de migration**

```bash
rm packages/core/src/styles/themes/default.css
rm scripts/migrate-theme-split.mjs
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/styles/themes/
git commit -m "refactor(core): éclater default.css en ariane.css + fragments importés (#256)"
```

---

## Task 3: `build-css.js` — bundling + extraction consciente de la structure

**Files:**

- Modify: `packages/core/scripts/build-css.js`
- Test: `packages/core/scripts/extract-component-rules.test.js`
- Create: `packages/core/scripts/extract-component-rules.js` (fonction extraite pour être testable indépendamment)

**Interfaces:**

- Produces: `extractComponentRules(bundledCss: string) => string` — reçoit le CSS déjà bundlé (plusieurs blocs `@layer ariane.theme { ... }` consécutifs), retourne un unique `@layer ariane.theme { ... }` ne contenant que les règles dont le sélecteur n'est pas `:root`/`[data-theme=...]`.

- [ ] **Step 1: Écrire le test (doit échouer)**

```js
// packages/core/scripts/extract-component-rules.test.js
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
```

- [ ] **Step 2: Lancer le test, vérifier l'échec**

```bash
node --test packages/core/scripts/extract-component-rules.test.js
```

Expected: FAIL — `Cannot find module './extract-component-rules.js'`.

- [ ] **Step 3: Implémenter**

```js
// packages/core/scripts/extract-component-rules.js

/**
 * Découpe un texte CSS en règles de premier niveau (comptage d'accolades —
 * pas un vrai parseur, suffisant pour un CSS déjà bundlé/formaté par esbuild).
 * Retourne [{ selector, body, raw }] où `raw` inclut le sélecteur + le bloc.
 */
function topLevelRules(css) {
    const rules = [];
    let depth = 0;
    let start = -1;
    let selectorStart = 0;
    for (let i = 0; i < css.length; i++) {
        const ch = css[i];
        if (ch === '{') {
            if (depth === 0) {
                start = i;
            }
            depth++;
        } else if (ch === '}') {
            depth--;
            if (depth === 0 && start !== -1) {
                const selector = css.slice(selectorStart, start).trim();
                const raw = css.slice(selectorStart, i + 1);
                rules.push({ selector, raw });
                selectorStart = i + 1;
                start = -1;
            }
        }
    }
    return rules;
}

const IGNORED_SELECTOR = /^(:root|\[data-theme=|:root\[data-theme=)/;

/**
 * Extrait, depuis un CSS déjà bundlé (plusieurs blocs `@layer ariane.theme { ... }`
 * consécutifs, sortie d'esbuild --bundle), uniquement les règles composants — exclut
 * :root et [data-theme=...] (tokens/pilotage de mode, inutiles dans un shadow root
 * adopté : ils traversent déjà la frontière shadow DOM par héritage CSS).
 */
export function extractComponentRules(bundledCss) {
    const layerBlocks = topLevelRules(bundledCss).filter(
        (r) => r.selector === '@layer ariane.theme',
    );

    const kept = [];
    for (const block of layerBlocks) {
        // Contenu entre la première { et la dernière }
        const inner = block.raw.slice(block.raw.indexOf('{') + 1, block.raw.lastIndexOf('}'));
        for (const rule of topLevelRules(inner)) {
            if (!IGNORED_SELECTOR.test(rule.selector)) {
                kept.push(rule.raw);
            }
        }
    }

    return `@layer ariane.theme {\n${kept.join('\n')}\n}`;
}
```

- [ ] **Step 4: Lancer le test, vérifier le succès**

```bash
node --test packages/core/scripts/extract-component-rules.test.js
```

Expected: PASS (3 tests).

- [ ] **Step 5: Câbler dans `build-css.js`**

Dans `packages/core/scripts/build-css.js` :

- Remplacer `bundle: false, // pas de résolution d'imports @import ici` par `bundle: true, // résout les @import (fragments de thème, cf. #256)` dans la config `esbuild.context(...)`.
- Exclure les fichiers préfixés `_` de la liste des entry points :

```js
const entryPoints = Object.fromEntries(
    cssFiles
        .filter((file) => !file.split('/').pop().startsWith('_'))
        .map((file) => {
            const key = relative(CSS_SRC, file).replace(/\.css$/, '');
            return [key, file];
        }),
);
```

- Remplacer la fonction `generateThemeJsExports()` : au lieu de chercher `SPLIT_ANCHOR` dans le fichier **source**, lire le fichier **déjà bundlé** dans `CSS_OUT` (généré par `ctx.rebuild()`, qui doit donc s'exécuter avant `generateThemeJsExports()` — déjà le cas dans l'ordre actuel du script) et appeler `extractComponentRules` :

```js
import { extractComponentRules } from './extract-component-rules.js';

async function generateThemeJsExports() {
    const themeFiles = findCssFiles(THEMES_SRC).filter((f) => !f.split('/').pop().startsWith('_'));

    for (const file of themeFiles) {
        const basename = relative(THEMES_SRC, file).replace(/\.css$/, '');
        const bundledPath = join(CSS_OUT, 'themes', `${basename}.css`);
        const bundledSource = readFileSync(bundledPath, 'utf8');

        const componentsSource = extractComponentRules(bundledSource);

        const { code: minified, warnings } = await esbuild.transform(componentsSource, {
            loader: 'css',
            minify: true,
        });

        if (warnings.length > 0) {
            const warningMessages = warnings
                .map(
                    (w) =>
                        `  - ${w.text} (${w.location ? `ligne ${w.location.line}` : 'position inconnue'})`,
                )
                .join('\n');
            throw new Error(
                `[build-css] Warnings de transformation CSS dans ${relative(ROOT, file)}:\n${warningMessages}\n` +
                    'Voir scripts/build-css.js pour les détails.',
            );
        }

        const exportName = `${toCamelCase(basename)}Theme`;
        const jsContent =
            `export const ${exportName} = new CSSStyleSheet();\n` +
            `${exportName}.replaceSync(${JSON.stringify(minified)});\n`;

        const outDir = join(CSS_OUT, 'themes');
        mkdirSync(outDir, { recursive: true });
        writeFileSync(join(outDir, `${basename}.js`), jsContent);
    }
}
```

- Supprimer la constante `SPLIT_ANCHOR` (plus utilisée) et son commentaire associé.

- [ ] **Step 6: Build réel, vérification manuelle**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run build:css --workspace=packages/core
wc -l packages/core/dist/styles/themes/ariane.css
grep -c "^" packages/core/dist/styles/themes/ariane.css
head -c 200 packages/core/dist/styles/themes/ariane.js
```

Expected : `ariane.css` = 1 seule ligne (minifié) ; `ariane.js` commence par `export const arianeTheme = new CSSStyleSheet();`.

- [ ] **Step 7: Commit**

```bash
git add packages/core/scripts/build-css.js packages/core/scripts/extract-component-rules.js packages/core/scripts/extract-component-rules.test.js
git commit -m "refactor(core): build-css.js — bundling @import + extraction CSS-aware pour ariane.js"
```

---

## Task 4: Garde-fou anti-doublon de token

**Files:**

- Create: `packages/core/scripts/validate-no-duplicate-tokens.js`
- Test: `packages/core/scripts/validate-no-duplicate-tokens.test.js`

**Interfaces:**

- Produces: `findDuplicateTokens(cssText: string) => string[]` — retourne les messages d'erreur (un par token dupliqué), `[]` si aucun doublon.

- [ ] **Step 1: Écrire le test (doit échouer)**

```js
// packages/core/scripts/validate-no-duplicate-tokens.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findDuplicateTokens } from './validate-no-duplicate-tokens.js';

test('détecte un token déclaré deux fois', () => {
    const css = `:root { --ar-color-text: red; } :root { --ar-color-text: blue; }`;
    const errors = findDuplicateTokens(css);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /--ar-color-text/);
});

test('aucune erreur si chaque token apparaît une seule fois', () => {
    const css = `:root { --ar-color-text: red; --ar-color-bg: white; }`;
    assert.deepEqual(findDuplicateTokens(css), []);
});
```

- [ ] **Step 2: Lancer le test, vérifier l'échec**

```bash
node --test packages/core/scripts/validate-no-duplicate-tokens.test.js
```

Expected: FAIL — module introuvable.

- [ ] **Step 3: Implémenter**

```js
// packages/core/scripts/validate-no-duplicate-tokens.js

/**
 * Un token --ar-* ne doit être déclaré que dans un seul fragment — cf. #256.
 * Une déclaration en double serait silencieusement écrasée par la dernière
 * en ordre d'import (cascade CSS standard sur une même propriété).
 */
export function findDuplicateTokens(cssText) {
    const counts = new Map();
    for (const match of cssText.matchAll(/(--ar-[a-zA-Z0-9-]+)(?=\s*:)/g)) {
        const name = match[1];
        counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts.entries()]
        .filter(([, n]) => n > 1)
        .map(
            ([name, n]) =>
                `${name} est déclaré ${n} fois — un token ne doit vivre que dans un seul fragment.`,
        );
}
```

- [ ] **Step 4: Lancer le test, vérifier le succès**

```bash
node --test packages/core/scripts/validate-no-duplicate-tokens.test.js
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/core/scripts/validate-no-duplicate-tokens.js packages/core/scripts/validate-no-duplicate-tokens.test.js
git commit -m "test(core): garde-fou anti-doublon de token --ar-*"
```

---

## Task 5: `cem.config.js` — lire `dist/styles/themes/ariane.css`, câbler le garde-fou

**Files:**

- Modify: `packages/core/cem.config.js`

- [ ] **Step 1: Mettre à jour le chemin lu et le nom du fichier**

Remplacer (deux occurrences, lignes ~210 et ~240) :

```js
resolve(process.cwd(), 'src/styles/themes/default.css'),
```

par :

```js
resolve(process.cwd(), 'dist/styles/themes/ariane.css'),
```

et :

```js
'src/styles/themes/default.css',
```

par :

```js
'dist/styles/themes/ariane.css',
```

- [ ] **Step 2: Ajouter l'appel au garde-fou anti-doublon**

Ajouter l'import en haut du fichier :

```js
import { findDuplicateTokens } from './scripts/validate-no-duplicate-tokens.js';
```

Dans `packageLinkPhase`, juste après le calcul de `themeTokens` :

```js
const duplicateTokenErrors = findDuplicateTokens(themeCss);
```

Ajouter `...duplicateTokenErrors` au tableau `allErrors`, et un bloc message dans le `throw` :

```js
const duplicateTokenErrorsMsg =
    duplicateTokenErrors.length > 0
        ? `\n  token(s) dupliqué(s) :\n${duplicateTokenErrors.map((e) => `    - ${e}`).join('\n')}`
        : '';
```

... et l'ajouter à la concaténation du message d'erreur final.

- [ ] **Step 3: Mettre à jour les commentaires qui citent `default.css`**

Lignes ~206, ~221, ~237 : remplacer les mentions littérales `default.css` par `ariane.css` dans les commentaires.

- [ ] **Step 4: Commit**

```bash
git add packages/core/cem.config.js
git commit -m "refactor(core): cem.config.js lit dist/ariane.css, câble le garde-fou anti-doublon"
```

---

## Task 6: Séquencement du build — `turbo.json` + `package.json`

**Files:**

- Modify: `turbo.json`
- Modify: `packages/core/package.json`

- [ ] **Step 1: Ajouter la dépendance dans `turbo.json`**

```json
"build:manifest": {
    "dependsOn": ["build:css"],
    "inputs": ["src/**/*.ts", "cem.config.js"],
    "outputs": ["dist/custom-elements.json"]
},
```

(remplace l'entrée `build:manifest` existante — ajoute seulement `"dependsOn": ["build:css"]`, le reste est inchangé.)

- [ ] **Step 2: Réordonner les scripts dans `packages/core/package.json`**

Remplacer :

```json
"build": "npm run build:manifest && npm run build:bundles && npm run build:css && npm run build:types",
"build:dev": "npm run build:manifest && npm run build:bundles:dev && npm run build:css && npm run build:types",
```

par :

```json
"build": "npm run build:css && npm run build:manifest && npm run build:bundles && npm run build:types",
"build:dev": "npm run build:css && npm run build:manifest && npm run build:bundles:dev && npm run build:types",
```

- [ ] **Step 3: Build complet, vérification**

```bash
cd /Users/jon/Code/Active_projects/ariane
rm -rf packages/core/dist packages/core/cdn
npm run build --workspace=packages/core
```

Expected: build réussi de bout en bout (CSS → manifest → bundles → types), aucune erreur des validateurs CEM (couverture `@cssprop`, doublons, etc.).

- [ ] **Step 4: Vérifier aussi via Turbo (chemin normal `npm run build` racine)**

```bash
cd /Users/jon/Code/Active_projects/ariane
rm -rf packages/core/dist packages/core/cdn
npm run build
```

Expected: succès, `packages/core/dist/styles/themes/ariane.css` et `ariane.js` présents.

- [ ] **Step 5: Commit**

```bash
git add turbo.json packages/core/package.json
git commit -m "build(core): séquencer build:css avant build:manifest (turbo + script direct)"
```

---

## Task 7: Suite de tests complète

**Files:** aucun — task de vérification uniquement.

- [ ] **Step 1: Lancer toute la suite de tests core**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test --workspace=packages/core
node --test packages/core/scripts/*.test.js
```

Expected: tous les tests passent. Porter une attention particulière à `packages/core/src/styles/themes/default-theme-scoping.browser.test.ts` (référence l'ancien nom — cf. Task 8) et `packages/core/src/components/datepicker/datepicker.test.ts` (référence `default.css` dans un commentaire ou un fixture, à vérifier).

- [ ] **Step 2: Lancer les tests navigateur**

```bash
npm run test:browser --workspace=packages/core
```

Expected: tous les tests passent (dont l'adoption `adoptedStyleSheets` via `ariane.js`, #170).

---

## Task 8: Mise à jour des ~80 références (`default.css`/`default.js`/`defaultTheme`)

**Files:** tous les fichiers listés par la recherche ci-dessous, **sauf** `docs/superpowers/specs/*.md` et `docs/superpowers/plans/*.md` (documents archivés, jamais modifiés).

- [ ] **Step 1: Lister les fichiers concernés, hors specs/plans archivés**

```bash
cd /Users/jon/Code/Active_projects/ariane
grep -rl "default\.css\|default\.js\b\|defaultTheme" \
  --include="*.ts" --include="*.js" --include="*.astro" --include="*.md" --include="*.json" . \
  | grep -v node_modules | grep -v "/dist/" | grep -v package-lock.json \
  | grep -v "^docs/superpowers/specs/" | grep -v "^docs/superpowers/plans/"
```

- [ ] **Step 2: Remplacer dans chaque fichier listé**

Pour chaque fichier : `default.css` → `ariane.css`, `default.js` → `ariane.js`, `defaultTheme` → `arianeTheme` (préserver la casse environnante — ex. dans un chemin `themes/default.css`, dans un identifiant JS `defaultTheme`). Utiliser `Edit` fichier par fichier plutôt qu'un `sed` global — certains fichiers ont plusieurs occurrences avec un contexte différent à vérifier individuellement (ex. `packages/core/README.md` peut avoir des exemples de code à garder cohérents).

Cas particulier — **renommer le fichier de test** dont le nom cite l'ancien thème :

```bash
git mv packages/core/src/styles/themes/default-theme-scoping.browser.test.ts \
       packages/core/src/styles/themes/ariane-theme-scoping.browser.test.ts
```

Puis mettre à jour son contenu (mêmes remplacements que ci-dessus).

- [ ] **Step 3: Vérifier qu'il ne reste aucune référence orpheline (hors archives)**

```bash
grep -rl "default\.css\|default\.js\b\|defaultTheme" \
  --include="*.ts" --include="*.js" --include="*.astro" --include="*.md" --include="*.json" . \
  | grep -v node_modules | grep -v "/dist/" | grep -v package-lock.json \
  | grep -v "^docs/superpowers/specs/" | grep -v "^docs/superpowers/plans/"
```

Expected: aucune sortie.

- [ ] **Step 4: Rebuild + tests docs**

```bash
npm run build --workspace=packages/core
npm run test --workspace=apps/docs
npm run build --workspace=apps/docs
```

Expected: succès, aucune référence cassée dans la doc générée.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs(core): mettre à jour les références default.css/default.js → ariane.css/ariane.js"
```

---

## Task 9: Pull Request

- [ ] **Step 1: Vérifier l'état complet**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run build
npm run test
git status
```

Expected: build et tests verts, working tree clean (tout committé).

- [ ] **Step 2: Pousser et ouvrir la PR**

```bash
git push -u origin refactor/ariane-css-restructure-256
gh pr create --base dev --title "refactor(core): default.css → ariane.css, restructuration en imports (#256)" --body "$(cat <<'EOF'
Implémente #256 (points 1&2 extraits de #230) : renommage `default.css` → `ariane.css`, source éclatée en fragments importés par concern (palette, tokens sémantiques, tokens globaux, tokens partagés, un fragment par famille de composant).

- `dist/` reste un seul fichier bundlé (esbuild `bundle: true`) — zéro changement pour le consommateur.
- Extraction du JS jumeau (#170) devenue consciente de la structure CSS plutôt que basée sur une ancre textuelle.
- Nouveau garde-fou CI : un token ne peut être déclaré que dans un seul fragment.
- `build:manifest` séquencé après `build:css` (turbo.json) — les validateurs CEM lisent le bundle déjà résolu, pas de résolveur d'imports maison.

Spec : `docs/superpowers/specs/2026-09-24-ariane-css-restructure-256-design.md`

Débloque la reprise de #230 (points 3&4, starter-kit — spec/plan déjà écrits, en pause).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01DBWvASBNGXKCie9vdzdJYf
EOF
)"
```

- [ ] **Step 3: Attendre la CI verte, merger uniquement sur confirmation explicite de l'utilisateur**

Ne pas merger sans confirmation — règle permanente du projet.
