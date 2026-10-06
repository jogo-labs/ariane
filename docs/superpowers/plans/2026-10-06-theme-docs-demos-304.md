# Thème de la documentation et démos neutres — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Les démos de la documentation (pages composant et page d'accueil) montrent le thème neutre du starter-kit, tandis que le chrome du site reste en `ariane.css` ; le consommateur dispose d'un script pour générer la version JavaScript de son thème ; README, `DEVELOPMENT.md`, site de doc et skill présentent le starter-kit comme base de thème (#304, #307).

**Architecture:** Une feuille générée au build du site contient le thème du starter imbriqué sous `.doc-demo` (envelopper, `:root` → `&`, Lightning CSS). Elle est servie à `/themes/doc-demo.css` (à la volée en dev, écrite au build) et appliquée par une classe posée sur les conteneurs de démos existants. `ariane.css` et la génération du starter ne changent pas. Un script autonome `theme-to-js.js`, écrit et testé dans ce dépôt, est copié dans le dépôt du starter-kit.

**Tech Stack:** Node (ESM), Vitest, esbuild 0.28, Lightning CSS 1.33, Astro 6, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-06-theme-docs-demos-304-design.md`

## Global Constraints

- Prettier : 100 caractères, 4 espaces, single quotes. `import type` pour les types (TypeScript uniquement).
- Conventional Commits, en-tête ≤ 100 caractères (commitlint + Husky). Scopes usuels : `docs`, `core`, `chore`. Terminer chaque message de commit par `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Branche `docs/theme-docs-demos-304`, PR vers `dev`. Ne jamais pousser sans demande explicite du mainteneur (règle permanente) ; ne pas merger sans confirmation explicite.
- Planchers navigateurs du projet : Chrome 125, Firefox 126, Safari 17.5 (cible de Lightning CSS : `{ chrome: 125 << 16, firefox: 126 << 16, safari: (17 << 16) | (5 << 8) }`).
- Classe de conteneur des démos : `doc-demo`. URL de la feuille : `/themes/doc-demo.css`. Aucun fichier généré n'est versionné.
- `ariane.css`, `ariane.js`, `sync-starter-theme.js` et les scripts `derive-neutral-*` ne sont pas modifiés.
- Pas de retours à la ligne manuels dans la prose (commits, issues, PR, Markdown).
- Documentation et commentaires en français.
- Le shell : `grep` échoue dans les pipelines de cet environnement (« claude native binary not installed ») ; utiliser `awk`.
- `npm run check:skill` (inclus dans `build`) doit rester vert ; il exige que les composants racine soient cités dans `README.md`, `packages/core/README.md` et le `description` de `SKILL.md`.

## Review Focus

- La feuille scopée ne doit contenir aucune règle globale : tout sélecteur doit commencer par `.doc-demo`, y compris après aplatissement (fuite vers le chrome).
- Le starter doit définir tout ce que définit `ariane.css` (sinon une règle d'`ariane.css` fuit dans les démos) : comparaison structurelle des sélecteurs.
- Une modification d'un fragment du thème en développement (`npm run dev`) doit se refléter sans redémarrer le serveur.
- Le contenu de `Playground` est réinjecté par `playground.js` dans `[data-playground-preview]` : la classe doit rester sur le conteneur, pas sur le contenu réinjecté.
- Le script du consommateur doit supprimer les règles `:root` et `[data-theme]` d'un thème qui n'a pas de couche `ariane.theme` et pas de commentaire d'ancre.
- Les liens du site vers le starter-kit s'ouvrent dans un nouvel onglet avec `rel="noopener"`.
- Les chaînes `ariane.css` restantes dans README, doc et skill doivent toutes être qualifiées « thème de la documentation » ou supprimées.

---

## File Structure

| Fichier                                                                           | Responsabilité                                                                                                                          |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/starter-kit/scope-theme.js` (créer)                                      | `scopeThemeUnder(css, className)`, `collectSelectors(css)`, `unscopedSelectors(css, className)` : transformation et contrôle de scoping |
| `scripts/starter-kit/build-doc-demo-theme.js` (créer)                             | `bundleCss`, `buildDocDemoTheme`, `createDocDemoThemeProvider`, `DOC_DEMO_CLASS`                                                        |
| `scripts/starter-kit/theme-to-js.js` (créer)                                      | `themeToJs(css, { name })` + CLI : thème CSS → module JavaScript `CSSStyleSheet`                                                        |
| `scripts/starter-kit/templates/package.json` (créer)                              | `package.json` minimal du dépôt starter-kit (copié)                                                                                     |
| `scripts/starter-kit/generate-starter-demo.js` (modifier)                         | copie `theme-to-js.js` et `package.json` dans la cible                                                                                  |
| `apps/docs/astro.config.mjs` (modifier)                                           | sert et écrit `/themes/doc-demo.css`                                                                                                    |
| `apps/docs/src/layouts/Layout.astro`, `HomeLayout.astro` (modifier)               | chargent la feuille                                                                                                                     |
| `apps/docs/src/components/Playground.astro`, `src/pages/index.astro` (modifier)   | posent `doc-demo` sur les conteneurs                                                                                                    |
| `apps/docs/scripts/check-build.js` (modifier)                                     | vérifie la feuille dans `dist/`                                                                                                         |
| `apps/docs/playwright.config.ts`, `tests/theme/doc-demo.spec.ts` (modifier/créer) | test de non-régression de rendu                                                                                                         |
| Pages du site, README, `DEVELOPMENT.md`, skill, `CLAUDE.md` (modifier)            | documentation                                                                                                                           |

---

### Task 1: Transformation de scoping (`scope-theme.js`)

**Files:**

- Create: `scripts/starter-kit/scope-theme.js`
- Test: `scripts/starter-kit/scope-theme.test.js`
- Modify: `package.json` (racine, `devDependencies`)

**Interfaces:**

- Produces: `scopeThemeUnder(css: string, className: string): string` ; `collectSelectors(css: string): object[][]` (sélecteurs structurels de Lightning CSS, après aplatissement de l'imbrication) ; `unscopedSelectors(css: string, className: string): string[]` (liste lisible des sélecteurs qui ne commencent pas par `.className`, vide si tout est scopé).

- [ ] **Step 1: Ajouter les dépendances directes**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm install --save-dev lightningcss@^1.33.0 esbuild@^0.28.2`
Expected: `package.json` racine liste `lightningcss` et `esbuild` ; `package-lock.json` mis à jour ; `npm ls lightningcss esbuild` ne signale pas de doublon bloquant.

- [ ] **Step 2: Écrire les tests qui échouent**

```js
// scripts/starter-kit/scope-theme.test.js
import { describe, expect, it } from 'vitest';
import { scopeThemeUnder, collectSelectors, unscopedSelectors } from './scope-theme.js';

const THEME = `
@layer ariane.theme {
  :root { --ar-color-text: black; }
}
@layer ariane.theme {
  :root[data-theme='dark'], [data-theme='dark'] { color-scheme: dark; }
}
@layer ariane.theme {
  ar-alert {
    color: var(--ar-color-text);
    &::part(close-button) { opacity: 0.75; }
  }
  ar-dialog[size='sm'] { --ar-dialog-width: 20rem; }
}
`;

describe('scopeThemeUnder', () => {
    it('enveloppe sous la classe et supprime tout :root', () => {
        const out = scopeThemeUnder(THEME, 'doc-demo');
        expect(out).toContain('.doc-demo');
        expect(out).not.toContain(':root');
    });

    it('place les tokens de :root sur le conteneur lui-même', () => {
        const out = scopeThemeUnder(THEME, 'doc-demo');
        expect(out).toMatch(/--ar-color-text:\s*black/);
    });

    it('ne laisse aucun sélecteur hors du conteneur', () => {
        expect(unscopedSelectors(scopeThemeUnder(THEME, 'doc-demo'), 'doc-demo')).toEqual([]);
    });
});

describe('unscopedSelectors', () => {
    it('détecte une règle globale', () => {
        const css = '.doc-demo { ar-alert { color: red; } } ar-tooltip { color: blue; }';
        expect(unscopedSelectors(css, 'doc-demo')).toHaveLength(1);
    });

    it('accepte une liste :is() dont tous les membres sont scopés', () => {
        const css = '.doc-demo { :is(ar-a, ar-b) { color: red; } }';
        expect(unscopedSelectors(css, 'doc-demo')).toEqual([]);
    });
});

describe('collectSelectors', () => {
    it('aplatit les règles imbriquées en sélecteurs complets', () => {
        const selectors = collectSelectors('ar-alert { &::part(close-button) { opacity: 1; } }');
        const flat = selectors.map((sel) => sel.map((c) => c.type).join(' '));
        expect(flat).toContain('type pseudo-element');
    });
});
```

- [ ] **Step 3: Lancer les tests, vérifier l'échec**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx vitest run scripts/starter-kit/scope-theme.test.js`
Expected: FAIL (module introuvable).

- [ ] **Step 4: Implémenter**

```js
// scripts/starter-kit/scope-theme.js
import { transform } from 'lightningcss';

// Planchers du projet : l'imbrication CSS native est conservée (le thème s'en sert déjà).
const FLOOR_TARGETS = { chrome: 125 << 16, firefox: 126 << 16, safari: (17 << 16) | (5 << 8) };
// Cible volontairement ancienne : force l'aplatissement de l'imbrication, pour que chaque règle
// porte son sélecteur complet (utilisé uniquement pour analyser, jamais pour servir).
const FLAT_TARGETS = { chrome: 100 << 16 };

/**
 * Imbrique un thème sous `.className` : le texte est enveloppé dans `.className { … }` et chaque
 * `:root` devient `&` (un `:root` imbriqué est invalide ; le conteneur le remplace). Les tokens
 * posés sur le conteneur remplacent les tokens hérités du thème global, les règles `ar-x`
 * deviennent `.className ar-x` et l'emportent par la spécificité.
 */
export function scopeThemeUnder(css, className) {
    const wrapped = `.${className} {\n${css.replaceAll(':root', '&')}\n}`;
    const { code } = transform({
        filename: 'scoped-theme.css',
        code: Buffer.from(wrapped),
        targets: FLOOR_TARGETS,
    });
    return code.toString();
}

function lowerNesting(css) {
    return transform({ filename: 'flat.css', code: Buffer.from(css), targets: FLAT_TARGETS }).code;
}

/** Tous les sélecteurs de règles de style, imbrication aplatie (structure Lightning CSS). */
export function collectSelectors(css) {
    const selectors = [];
    transform({
        filename: 'selectors.css',
        code: lowerNesting(css),
        visitor: {
            Rule: {
                style(rule) {
                    for (const selector of rule.value.selectors) selectors.push(selector);
                },
            },
        },
    });
    return selectors;
}

function startsWithClass(selector, className) {
    const first = selector[0];
    if (first?.type === 'class' && first.name === className) return true;
    if (first?.type === 'pseudo-class' && first.kind === 'is') {
        return first.selectors.every((inner) => startsWithClass(inner, className));
    }
    return false;
}

/** Sélecteurs (texte lisible) qui ne commencent pas par `.className` : doit être vide. */
export function unscopedSelectors(css, className) {
    return collectSelectors(css)
        .filter((selector) => !startsWithClass(selector, className))
        .map((selector) =>
            selector
                .map((c) => c.type + (c.kind ? `:${c.kind}` : '') + (c.name ? `:${c.name}` : ''))
                .join(' '),
        );
}
```

- [ ] **Step 5: Lancer les tests, vérifier le succès**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx vitest run scripts/starter-kit/scope-theme.test.js`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add package.json package-lock.json scripts/starter-kit/scope-theme.js scripts/starter-kit/scope-theme.test.js
git commit -m "feat(docs): transformation qui imbrique un thème sous une classe (#304)"
```

---

### Task 2: Feuille des démos (`build-doc-demo-theme.js`)

**Files:**

- Create: `scripts/starter-kit/build-doc-demo-theme.js`
- Test: `scripts/starter-kit/build-doc-demo-theme.test.js`

**Interfaces:**

- Consumes: `scopeThemeUnder`, `collectSelectors`, `unscopedSelectors` (Task 1) ; `syncStarterTheme({ srcThemesDir, repoPath })` (`sync-starter-theme.js`, existant).
- Produces: `DOC_DEMO_CLASS = 'doc-demo'` ; `bundleCss(entryPath): Promise<string>` ; `buildDocDemoTheme(srcThemesDir): Promise<string>` ; `createDocDemoThemeProvider(srcThemesDir): { get(): Promise<string>, readonly builds: number }`.

- [ ] **Step 1: Écrire les tests qui échouent**

```js
// scripts/starter-kit/build-doc-demo-theme.test.js
import { describe, expect, it, beforeAll } from 'vitest';
import { cpSync, mkdtempSync, rmSync, utimesSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncStarterTheme } from './sync-starter-theme.js';
import { collectSelectors, unscopedSelectors } from './scope-theme.js';
import {
    DOC_DEMO_CLASS,
    bundleCss,
    buildDocDemoTheme,
    createDocDemoThemeProvider,
} from './build-doc-demo-theme.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const THEMES = path.resolve(__dirname, '../../packages/core/src/styles/themes');

describe('buildDocDemoTheme (thème réel)', () => {
    let css;
    beforeAll(async () => {
        css = await buildDocDemoTheme(THEMES);
    });

    it('ne contient que des règles scopées sous .doc-demo (aucune fuite vers le chrome)', () => {
        expect(css).toContain(`.${DOC_DEMO_CLASS}`);
        expect(css).not.toContain(':root');
        expect(unscopedSelectors(css, DOC_DEMO_CLASS)).toEqual([]);
    });

    it('le starter définit tout ce que définit ariane.css (aucune règle ne fuite)', async () => {
        const ariane = await bundleCss(path.join(THEMES, 'ariane.css'));
        const tmp = mkdtempSync(path.join(tmpdir(), 'starter-superset-'));
        try {
            syncStarterTheme({ srcThemesDir: THEMES, repoPath: tmp });
            const starter = await bundleCss(path.join(tmp, 'ariane-starter.css'));
            const key = (selector) => JSON.stringify(selector);
            const starterKeys = new Set(collectSelectors(starter).map(key));
            const missing = collectSelectors(ariane)
                .filter((selector) => !starterKeys.has(key(selector)))
                .map(key);
            expect(missing).toEqual([]);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });
});

describe('createDocDemoThemeProvider', () => {
    it('met en cache tant que les sources ne changent pas, reconstruit sinon', async () => {
        const tmp = mkdtempSync(path.join(tmpdir(), 'doc-demo-provider-'));
        try {
            const dir = path.join(tmp, 'themes');
            mkdirSync(dir, { recursive: true });
            cpSync(THEMES, dir, { recursive: true });
            const provider = createDocDemoThemeProvider(dir);

            const first = await provider.get();
            await provider.get();
            expect(provider.builds).toBe(1);

            const touched = path.join(dir, 'ariane', 'components', '_alert.css');
            const future = new Date(Date.now() + 60_000);
            utimesSync(touched, future, future);

            const second = await provider.get();
            expect(provider.builds).toBe(2);
            expect(second).toBe(first);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });
});
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx vitest run scripts/starter-kit/build-doc-demo-theme.test.js`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

```js
// scripts/starter-kit/build-doc-demo-theme.js
import { mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { syncStarterTheme } from './sync-starter-theme.js';
import { scopeThemeUnder } from './scope-theme.js';

export const DOC_DEMO_CLASS = 'doc-demo';

/** Bundle un CSS (résout les `@import … layer()`), sans écrire sur le disque. */
export async function bundleCss(entryPath) {
    const result = await build({
        entryPoints: [entryPath],
        bundle: true,
        write: false,
        loader: { '.css': 'css' },
        logLevel: 'silent',
    });
    return result.outputFiles[0].text;
}

/**
 * Thème neutre du starter-kit (dérivé d'`ariane.css` par `syncStarterTheme`, le même flux que le
 * Kitchen Sink), imbriqué sous `.doc-demo`. Aucune écriture dans le dépôt : le starter est
 * généré dans un répertoire temporaire.
 */
export async function buildDocDemoTheme(srcThemesDir) {
    const tmp = mkdtempSync(path.join(tmpdir(), 'doc-demo-theme-'));
    try {
        syncStarterTheme({ srcThemesDir, repoPath: tmp });
        const bundled = await bundleCss(path.join(tmp, 'ariane-starter.css'));
        return scopeThemeUnder(bundled, DOC_DEMO_CLASS);
    } finally {
        rmSync(tmp, { recursive: true, force: true });
    }
}

function latestMtimeMs(dir) {
    let latest = 0;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        latest = Math.max(
            latest,
            entry.isDirectory() ? latestMtimeMs(full) : statSync(full).mtimeMs,
        );
    }
    return latest;
}

/**
 * Fournisseur avec cache : la feuille n'est reconstruite que si un fichier de `srcThemesDir` a
 * changé (utilisé par le serveur de développement du site). Les scripts `derive-neutral-*` ne
 * sont pas surveillés : les modifier demande de redémarrer le serveur.
 */
export function createDocDemoThemeProvider(srcThemesDir) {
    let cached = null;
    let builds = 0;
    return {
        get builds() {
            return builds;
        },
        async get() {
            const stamp = latestMtimeMs(srcThemesDir);
            if (cached && cached.stamp === stamp) return cached.css;
            const css = await buildDocDemoTheme(srcThemesDir);
            builds += 1;
            cached = { stamp, css };
            return css;
        },
    };
}
```

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx vitest run scripts/starter-kit/build-doc-demo-theme.test.js`
Expected: PASS (3 tests). Si « le starter définit tout ce que définit ariane.css » échoue, la liste `missing` nomme les sélecteurs d'`ariane.css` absents du starter : c'est un vrai défaut (le starter doit suivre `ariane.css`), à traiter avant de continuer.

- [ ] **Step 5: Lancer toute la suite starter-kit**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test:starter-kit`
Expected: tous verts.

- [ ] **Step 6: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add scripts/starter-kit/build-doc-demo-theme.js scripts/starter-kit/build-doc-demo-theme.test.js
git commit -m "feat(docs): feuille de thème neutre scopée sous .doc-demo pour les démos (#304)"
```

---

### Task 3: Branchement dans le site de doc

**Files:**

- Modify: `apps/docs/astro.config.mjs`
- Modify: `apps/docs/src/layouts/Layout.astro:57`, `apps/docs/src/layouts/HomeLayout.astro:31`
- Modify: `apps/docs/src/components/Playground.astro:85,113`
- Modify: `apps/docs/src/pages/index.astro` (trois `div.try-preview-stage`, autour des lignes 421, 450, 473)
- Modify: `apps/docs/scripts/check-build.js`
- Modify: `apps/docs/playwright.config.ts`
- Create: `apps/docs/tests/theme/doc-demo.spec.ts`

**Interfaces:**

- Consumes: `createDocDemoThemeProvider(srcThemesDir)` (Task 2). `DOC_DEMO_CLASS` vaut `'doc-demo'`.
- Produces: la ressource `/themes/doc-demo.css` (dev et `dist/themes/doc-demo.css`) ; la classe `doc-demo` sur les conteneurs.

- [ ] **Step 1: Servir et écrire la feuille dans `astro.config.mjs`**

Ajouter l'import et le fournisseur après la définition de `CORE_ROOT` :

```js
import { createDocDemoThemeProvider } from '../../scripts/starter-kit/build-doc-demo-theme.js';

const docDemoTheme = createDocDemoThemeProvider(resolve(CORE_ROOT, 'src/styles/themes'));
```

Dans `configureServer`, au début du handler (juste après `const url = …;`) :

```js
// Thème neutre des démos, généré à la volée depuis les sources du thème
if (url === '/themes/doc-demo.css') {
    docDemoTheme
        .get()
        .then((css) => {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
            res.end(css);
        })
        .catch(next);
    return;
}
```

Dans `generateBundle`, remplacer la ligne `const { cp, copyFile, mkdir } = await import('fs/promises');` par `const { cp, copyFile, mkdir, writeFile } = await import('fs/promises');` et ajouter après la boucle `ASSET_MAPPINGS` :

```js
await mkdir(join(outDir, 'themes'), { recursive: true });
await writeFile(join(outDir, 'themes', 'doc-demo.css'), await docDemoTheme.get());
```

- [ ] **Step 2: Charger la feuille dans les deux layouts**

Dans `Layout.astro` (ligne 57) et `HomeLayout.astro` (ligne 31), ajouter juste après `<link rel="stylesheet" href="/themes/ariane.css" />` :

```html
<link rel="stylesheet" href="/themes/doc-demo.css" />
```

- [ ] **Step 3: Marquer les conteneurs de démos**

`Playground.astro` : remplacer `<div class="preview">` (ligne 85) par `<div class="preview doc-demo">` et `<div class="preview" data-playground-preview>` (ligne 113) par `<div class="preview doc-demo" data-playground-preview>`.

`index.astro` : remplacer chacune des trois occurrences de `<div class="try-preview-stage">` par `<div class="try-preview-stage doc-demo">`.

- [ ] **Step 4: Vérifier la feuille dans `check-build.js`**

Ajouter `import { readFileSync } from 'node:fs';` (compléter l'import existant de `node:fs`) et, juste avant `if (hasError) {` :

```js
const DOC_DEMO_THEME = join(DIST, 'themes', 'doc-demo.css');
if (!existsSync(DOC_DEMO_THEME)) {
    console.error('✗ Thème des démos manquant : themes/doc-demo.css');
    hasError = true;
} else {
    const demoCss = readFileSync(DOC_DEMO_THEME, 'utf8');
    if (!demoCss.includes('.doc-demo') || demoCss.includes(':root')) {
        console.error('✗ themes/doc-demo.css doit être scopé sous .doc-demo (sans :root)');
        hasError = true;
    } else {
        console.log('✓ themes/doc-demo.css');
    }
}
```

- [ ] **Step 5: Test de rendu Playwright**

`apps/docs/playwright.config.ts` : remplacer `testDir: './tests/a11y',` par `testDir: './tests',`.

```ts
// apps/docs/tests/theme/doc-demo.spec.ts
import { test, expect } from '@playwright/test';

/**
 * Les démos reçoivent le thème neutre du starter-kit (`.doc-demo`), le chrome du site garde
 * ariane.css. Une sonde `ar-alert` est posée dans et hors d'un conteneur pour comparer.
 */
async function probeColors(page) {
    await page.waitForFunction(() => customElements.get('ar-alert'));
    return page.evaluate(() => {
        const mk = (parent: Element) => {
            const el = document.createElement('ar-alert');
            el.textContent = 'sonde';
            parent.appendChild(el);
            return getComputedStyle(el).color;
        };
        const demo = document.querySelector('.doc-demo');
        return { inside: demo ? mk(demo) : null, outside: mk(document.body) };
    });
}

test.describe('thème des démos (.doc-demo)', () => {
    for (const scheme of ['light', 'dark'] as const) {
        test(`page composant, ${scheme} : la preview a un thème différent du chrome`, async ({
            page,
        }) => {
            await page.emulateMedia({ colorScheme: scheme });
            await page.goto('/components/alert/');
            await page.waitForLoadState('networkidle');
            const { inside, outside } = await probeColors(page);
            expect(inside).not.toBeNull();
            expect(inside).not.toBe(outside);
        });
    }

    test("page d'accueil : les démos sont dans un conteneur .doc-demo", async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        expect(await page.locator('.try-preview-stage.doc-demo').count()).toBeGreaterThan(0);
    });
});
```

- [ ] **Step 6: Construire et lancer les vérifications**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=packages/core && npm run build --workspace=apps/docs && npm run test:build --workspace=apps/docs && npm run test:a11y --workspace=apps/docs`
Expected: build OK ; `✓ themes/doc-demo.css` ; Playwright : les tests a11y existants et les trois tests `doc-demo` passent. Si le test « thème différent » échoue sur la valeur de `color` (les deux thèmes ont la même couleur de texte dans la sonde), remplacer la propriété comparée par `getPropertyValue('--ar-color-primary-50')` lue sur la sonde.

- [ ] **Step 7: Contrôle visuel (dev) et avec Firefox/WebKit**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run dev` puis ouvrir `/components/alert/` et `/` : la preview du composant et les démos de la page d'accueil (dropdown, dialog) montrent le thème neutre ; l'onglet « Essayez », le menu de thème et les callouts gardent le thème ambre. Modifier un fragment sous `packages/core/src/styles/themes/ariane/components/` et recharger : la preview suit sans redémarrer. Navigateurs : le spike a donné 0 écart dans Chromium et WebKit (clair et sombre) ; Firefox n'a pas pu être mesuré (Firefox headless se bloque dans cet environnement, erreur graphique `RenderCompositorSWGL`). Ouvrir les deux pages dans Firefox à la main et noter le résultat dans la description de la PR.

- [ ] **Step 8: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add apps/docs/astro.config.mjs apps/docs/src/layouts apps/docs/src/components/Playground.astro apps/docs/src/pages/index.astro apps/docs/scripts/check-build.js apps/docs/playwright.config.ts apps/docs/tests/theme
git commit -m "feat(docs): les démos reçoivent le thème neutre du starter-kit via .doc-demo (#304)"
```

---

### Task 4: Script JavaScript pour le consommateur (`theme-to-js.js`)

**Files:**

- Create: `scripts/starter-kit/theme-to-js.js`
- Test: `scripts/starter-kit/theme-to-js.test.js`
- Create: `scripts/starter-kit/templates/package.json`
- Modify: `scripts/starter-kit/generate-starter-demo.js` (copie + `git add`)
- Test: `scripts/starter-kit/generate-starter-demo.test.js` (assertions sur la copie)

**Interfaces:**

- Produces: `themeToJs(css: string, options?: { name?: string }): string` (module JavaScript exportant un `CSSStyleSheet` nommé `name`, défaut `theme`) ; CLI : `node theme-to-js.js <entrée.css> <sortie.js> [--name <identifiant>]`. Le script ne dépend que de `esbuild` et `lightningcss` (il est copié seul dans le dépôt du starter-kit).

- [ ] **Step 1: Écrire les tests qui échouent**

```js
// scripts/starter-kit/theme-to-js.test.js
import { describe, expect, it } from 'vitest';
import { themeToJs } from './theme-to-js.js';

const THEME = `
:root { --ar-color-text: black; }
:root[data-theme='dark'], [data-theme='dark'] { color-scheme: dark; }
@layer mon-theme {
  :root { --ar-color-bg: white; }
  ar-alert { color: var(--ar-color-text); &::part(close-button) { opacity: .75; } }
}
ar-dialog[size='sm'] { --ar-dialog-width: 20rem; }
`;

function sheetText(js) {
    const match = js.match(/replaceSync\((".*")\);/s);
    return JSON.parse(match[1]);
}

describe('themeToJs', () => {
    it('exporte un CSSStyleSheet au nom demandé', () => {
        const js = themeToJs(THEME, { name: 'monTheme' });
        expect(js).toContain('export const monTheme = new CSSStyleSheet();');
        expect(js).toContain('monTheme.replaceSync(');
    });

    it('nom par défaut : theme', () => {
        expect(themeToJs(THEME)).toContain('export const theme = new CSSStyleSheet();');
    });

    it('retire :root et [data-theme] (les tokens traversent déjà le shadow DOM)', () => {
        const css = sheetText(themeToJs(THEME));
        expect(css).not.toContain(':root');
        expect(css).not.toContain('data-theme');
        expect(css).not.toContain('--ar-color-text:black');
    });

    it('garde les règles de composants et leur couche, sans exiger ariane.theme', () => {
        const css = sheetText(themeToJs(THEME));
        expect(css).toContain('@layer mon-theme');
        expect(css).toContain('ar-alert');
        expect(css).toContain('::part(close-button)');
        expect(css).toContain('ar-dialog[size=sm]');
    });

    it("refuse un nom qui n'est pas un identifiant JavaScript", () => {
        expect(() => themeToJs(THEME, { name: 'mon-theme' })).toThrow(/identifiant/);
    });
});
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx vitest run scripts/starter-kit/theme-to-js.test.js`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

```js
// scripts/starter-kit/theme-to-js.js
/**
 * Génère la version JavaScript d'un thème CSS : un module qui exporte un `CSSStyleSheet` à
 * adopter dans un shadow DOM applicatif (`shadowRoot.adoptedStyleSheets = [theme]`).
 *
 * Les règles `:root` et `[data-theme]` sont retirées : `:root` ne correspond à rien dans un
 * shadow root, et les tokens (propriétés personnalisées) traversent déjà la frontière par
 * héritage depuis le document, qui doit donc charger le thème CSS. Les règles de composants
 * (`ar-x`, `::part()`) sont conservées avec leurs couches éventuelles.
 *
 * Usage : node scripts/theme-to-js.js <entrée.css> <sortie.js> [--name <identifiant>]
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { transform } from 'lightningcss';

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

const isDocumentLevel = (selector) =>
    selector.some(
        (c) =>
            (c.type === 'pseudo-class' && c.kind === 'root') ||
            (c.type === 'attribute' && c.name === 'data-theme'),
    );

export function themeToJs(css, { name = 'theme' } = {}) {
    if (!IDENTIFIER.test(name)) {
        throw new Error(`« ${name} » n'est pas un identifiant JavaScript valide.`);
    }
    const { code } = transform({
        filename: 'theme.css',
        code: Buffer.from(css),
        minify: true,
        visitor: {
            Rule: {
                style(rule) {
                    const kept = rule.value.selectors.filter((s) => !isDocumentLevel(s));
                    if (kept.length === 0) return [];
                    if (kept.length === rule.value.selectors.length) return undefined;
                    return { type: 'style', value: { ...rule.value, selectors: kept } };
                },
            },
        },
    });
    return (
        `export const ${name} = new CSSStyleSheet();\n` +
        `${name}.replaceSync(${JSON.stringify(code.toString())});\n`
    );
}

async function main(argv) {
    const args = argv.slice();
    const nameIndex = args.indexOf('--name');
    const name = nameIndex === -1 ? undefined : args.splice(nameIndex, 2)[1];
    const [entry, output] = args;
    if (!entry || !output) {
        console.error(
            'Usage : node scripts/theme-to-js.js <entrée.css> <sortie.js> [--name <identifiant>]',
        );
        process.exit(1);
    }
    const bundled = await build({
        entryPoints: [entry],
        bundle: true,
        write: false,
        loader: { '.css': 'css' },
        logLevel: 'silent',
    });
    writeFileSync(output, themeToJs(bundled.outputFiles[0].text, { name }));
    console.log(`✓ ${output} généré depuis ${entry}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await main(process.argv.slice(2));
}
```

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx vitest run scripts/starter-kit/theme-to-js.test.js`
Expected: PASS (5 tests). Si `ar-dialog[size=sm]` ne correspond pas à la minification (guillemets conservés), ajuster l'assertion à la sortie réelle de Lightning CSS (`ar-dialog[size=sm]` ou `ar-dialog[size="sm"]`) : c'est la seule assertion dépendante du format.

- [ ] **Step 5: Essai de bout en bout sur le starter réel**

Run:

```bash
cd /Users/jon/Code/Active_projects/ariane
node scripts/starter-kit/theme-to-js.js ../ariane-starter-kit/ariane-starter.css /tmp/claude-501/starter-theme.js --name starterTheme
awk 'NR<=2{print substr($0,1,120)}' /tmp/claude-501/starter-theme.js
```

Expected: `✓ … généré`, première ligne `export const starterTheme = new CSSStyleSheet();`. Comparer la taille à `packages/core/dist/styles/themes/ariane.js` (même ordre de grandeur).

- [ ] **Step 6: Modèle de `package.json` du starter-kit**

```json
{
    "name": "ariane-starter-kit",
    "private": true,
    "type": "module",
    "scripts": {
        "build:js": "node scripts/theme-to-js.js ariane-starter.css ariane-starter.js --name starterTheme"
    },
    "devDependencies": {
        "esbuild": "^0.28.2",
        "lightningcss": "^1.33.0"
    }
}
```

Enregistrer dans `scripts/starter-kit/templates/package.json`.

- [ ] **Step 7: Copier le script et le modèle dans `generate-starter-demo.js`**

Ajouter `copyFileSync` à l'import de `node:fs`, puis, après `syncPresets({ srcPresetsDir, repoPath: target });` :

```js
mkdirSync(path.join(target, 'scripts'), { recursive: true });
copyFileSync(
    path.join(__dirname, 'theme-to-js.js'),
    path.join(target, 'scripts', 'theme-to-js.js'),
);
copyFileSync(path.join(__dirname, 'templates', 'package.json'), path.join(target, 'package.json'));
```

et ajouter `'scripts'` et `'package.json'` à la liste des chemins de `git add` (l'appel `execFileSync('git', ['add', 'index.html', '.nojekyll', 'ariane-starter.css', 'ariane-starter', 'presets'], …)`).

- [ ] **Step 8: Tester la copie**

Dans `generate-starter-demo.test.js`, ajouter dans le test qui exécute `generate({ dryRun: true, … })` (suivre la structure existante du fichier) :

```js
expect(existsSync(path.join(outDir, 'scripts', 'theme-to-js.js'))).toBe(true);
expect(
    JSON.parse(readFileSync(path.join(outDir, 'package.json'), 'utf8')).scripts['build:js'],
).toContain('theme-to-js.js');
```

(importer `existsSync`/`readFileSync` si absents).

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test:starter-kit && node scripts/starter-kit/generate-starter-demo.js --dry-run`
Expected: tests verts ; dry-run OK.

- [ ] **Step 9: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add scripts/starter-kit
git commit -m "feat(core): script pour générer la version JavaScript d'un thème, livré au starter-kit (#304)"
```

---

### Task 5: Site de documentation

**Files:**

- Modify: `apps/docs/src/pages/index.astro` (constante `codeInstall`, lignes 16-23)
- Modify: `apps/docs/src/pages/theming/appliquer-un-theme.astro`
- Modify: `apps/docs/src/pages/theming/shadow-dom.astro`
- Modify: `apps/docs/src/content/components/ar-alert.mdx:74`
- Modify: `apps/docs/src/pages/getting-started/quickstart.astro` (si une URL `ariane.css` y figure)

**Interfaces:**

- Consumes: l'URL publique `https://jogo-labs.github.io/ariane-starter-kit/ariane-starter.css` (vérifiée) et le dépôt `https://github.com/jogo-labs/ariane-starter-kit`.

- [ ] **Step 1: Snippet de la page d'accueil**

Dans `index.astro`, remplacer le commentaire et le `<link>` du thème de `codeInstall` par :

```
<!-- Thème neutre du starter-kit, à copier dans votre projet pour le personnaliser (il suit la dernière release d'Ariane) -->
<link rel="stylesheet" href="https://jogo-labs.github.io/ariane-starter-kit/ariane-starter.css" />
```

Vérifier que le texte de la page d'accueil qui introduit l'étape 1 ne parle pas d'`ariane.css`.

- [ ] **Step 2: `theming/appliquer-un-theme.astro`**

Remplacer le contenu du sous-titre « Créer un thème » (paragraphes et lien `download-theme`) par :

```astro
            <NarrativeSubheading id="charger-un-theme">Créer un thème</NarrativeSubheading>
            <p>
                Chaque page de documentation d'un composant liste les différents points de personnalisation disponibles (Custom Properties CSS, CSS Parts et CSS Custom States). <br />
                Pour mieux comprendre les mécanismes et faciliter la création de votre thème, partez du <strong>thème neutre du starter-kit</strong> : il couvre tous les composants, il est commenté, et il gère les modes clair et sombre. <br />
                Copiez-le dans votre projet et adaptez-le à votre identité visuelle. Une démo (Kitchen Sink) montre tous les composants avec ce thème :
            </p>
            <p>
                <a class="download-theme" href="https://github.com/jogo-labs/ariane-starter-kit" target="_blank" rel="noopener">
                    Récupérer le thème neutre (starter-kit)
                </a>
                <a href="https://jogo-labs.github.io/ariane-starter-kit/" target="_blank" rel="noopener">Voir la démo</a>
            </p>
            <p>
                Les composants exposent aussi leurs états avec les <a href="/theming/personnalisation-avancee#state-parts">parts d'état</a> et les <strong>CSS Custom States</strong> (<code>:state(open)</code>, <code>:state(invalid)</code>…), listés dans la section <strong>Référence API</strong> de chaque composant.
            </p>
            <p class="hint">
                Le thème de cette documentation (<code>ariane.css</code>) ne sert que ce site : il n'est pas conçu pour être réutilisé et peut changer sans préavis.
            </p>
```

Vérifier dans `ComponentApi.astro` ou un composant réel que `:state(open)` et `:state(invalid)` existent (`awk '/cssState/' packages/core/dist/custom-elements.json | head`) et remplacer ces exemples par des états réels du manifeste s'ils n'existent pas. Dans le sous-titre « Éléments slottés ou externes », remplacer « thème de démo » par « thème du starter-kit » (3 occurrences) ; le paragraphe sur les presets reste valable.

- [ ] **Step 3: `theming/shadow-dom.astro`**

Remplacer la section « Utiliser le thème par défaut » (id `theme-defaut`, exemples CDN et npm avec `arianeTheme`) par une section « Générer la version JavaScript de votre thème » : expliquer que le thème CSS reste chargé dans le document (les tokens traversent le shadow DOM), puis montrer :

```bash
# Dans une copie du starter-kit (ou de votre thème)
npm install
npm run build:js   # génère ariane-starter.js : export const starterTheme = new CSSStyleSheet()
```

et l'usage (`import { starterTheme } from './ariane-starter.js'; shadow.adoptedStyleSheets = [starterTheme];`). Mettre à jour `tocEntries` (retirer `theme-defaut`, ajouter l'identifiant de la nouvelle section) et supprimer les constantes `codeAdoptedStyleSheetsCdnComponent` / `codeAdoptedStyleSheetsNpmComponent` devenues inutiles. Conserver l'exemple `codeCustomTheme` (thème construit à la main).

- [ ] **Step 4: `ar-alert.mdx:74`**

Remplacer « Au-delà des 4 presets fournis par `ariane.css` » par « Au-delà des 4 variantes prévues ».

- [ ] **Step 5: Autres mentions**

Run: `cd /Users/jon/Code/Active_projects/ariane && awk '/ariane\.css|arianeTheme|ariane\.js/{print FILENAME": "FNR": "substr($0,1,140)}' apps/docs/src/pages/*.astro apps/docs/src/pages/*/*.astro apps/docs/src/content/components/*.mdx`
Expected: plus aucune présentation d'`ariane.css` comme thème à utiliser. Corriger les restes (`quickstart.astro`, etc.) selon la même règle : thème du starter-kit, ou mention « thème de la documentation ».

- [ ] **Step 6: Vérifier**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run lint --workspace=apps/docs && npm run test --workspace=apps/docs && npm run build --workspace=apps/docs && npm run test:build --workspace=apps/docs`
Expected: tout vert. Contrôler dans le rendu l'ordre de la table des matières de `shadow-dom` et le lien `target="_blank"` (`rel="noopener"`).

- [ ] **Step 7: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add apps/docs/src
git commit -m "docs(docs): le starter-kit devient la base de thème documentée (#304)"
```

---

### Task 6: README, `DEVELOPMENT.md`, vérifications factuelles (#307)

**Files:**

- Modify: `README.md`, `packages/core/README.md`, `DEVELOPMENT.md`

- [ ] **Step 1: Corriger l'import individuel**

`README.md:60` cite `@ariane-ui/core/dist/components/button/button.js` : il n'existe pas de composant `ar-button` (les boutons sont des presets). `packages/core/README.md:61` cite `…/alert/alert.js`, qui n'enregistre pas le tag (seul `index.ts` appelle `defineComponent`). Remplacer les deux par `@ariane-ui/core/dist/components/alert/index.js` et vérifier :

Run: `cd /Users/jon/Code/Active_projects/ariane && ls packages/core/dist/components/alert/index.js && awk '/defineComponent/{print FILENAME": "$0}' packages/core/src/components/alert/index.ts`
Expected: le fichier existe ; `defineComponent('ar-alert', ArAlert);`.

- [ ] **Step 2: Quickstart sans `ariane.css`**

Dans `README.md` (lignes 35, 46, 57, 76) et `packages/core/README.md` (lignes 20, 28, 64, 120, 153) : remplacer les `<link>` et `import` d'`ariane.css` par le thème du starter-kit. Texte de référence à insérer une fois, dans la section d'installation de chaque README :

````md
### Thème

Ariane est headless : sans thème, aucun composant n'est stylé. Partez du thème neutre du [starter-kit](https://github.com/jogo-labs/ariane-starter-kit) (démo : [Kitchen Sink](https://jogo-labs.github.io/ariane-starter-kit/)) : copiez `ariane-starter.css` et le dossier `ariane-starter/` dans votre projet, puis adaptez-les.

```html
<link rel="stylesheet" href="./ariane-starter.css" />
```

Pour un essai rapide sans rien copier, le même thème est servi à `https://jogo-labs.github.io/ariane-starter-kit/ariane-starter.css` (non versionné, il suit la dernière release).
````

Les imports npm `import '@ariane-ui/core/themes/ariane.css';` deviennent `import './ariane-starter.css';`. Ne pas laisser d'exemple qui charge `ariane.css`. Dans la ligne 120 de `packages/core/README.md` (« Les valeurs par défaut sont définies dans `src/styles/themes/ariane.css` … ») : reformuler « Les valeurs de design sont définies par le thème (voir le starter-kit) ; le composant n'en porte aucune ».

- [ ] **Step 3: Compléter la personnalisation et l'architecture**

Dans `packages/core/README.md`, section personnalisation : ajouter les trois leviers dans cet ordre — tokens `--ar-*`, `::part()` (et parts d'état), **états personnalisés `:state()`** (« chaque composant expose ses états ; la liste figure dans la référence API de la page du composant »). Section architecture (arbre aux environs de la ligne 153) : vérifier chaque dossier cité contre `ls packages/core/src packages/core/src/styles` et corriger : `src/internal/` (`defineComponent`), `src/utils/` (sous-chemin `@ariane-ui/core/utils`), `src/styles/themes/` (thème de la documentation), `scripts/skill/` (skill et `llms.txt`), `skills/` et `llms/` (générés, publiés).

Run: `cd /Users/jon/Code/Active_projects/ariane && ls packages/core/src packages/core/src/styles packages/core/scripts`
Expected: la liste sert de référence pour l'arbre.

- [ ] **Step 4: Liste des commandes npm de `DEVELOPMENT.md`**

Les commandes absentes du document (vérifiées contre les `package.json`) : racine `generate:starter-demo`, `demo:starter-kit`, `test:starter-kit`, `changelog`, `test:changelog` ; core `build:dev`, `check:cdn`, `build:skill`, `check:skill`, `build:bundles:dev|prod` (si manquantes) ; docs `test:build`, `test:a11y`. Les ajouter au tableau existant avec une phrase chacune (ce que la commande fait, quand la lancer). Vérifier chacune : `cd /Users/jon/Code/Active_projects/ariane && node -e "console.log(Object.keys(require('./package.json').scripts).join(' '))"` (idem pour `packages/core` et `apps/docs`). Ajouter aussi un paragraphe « Thème du starter-kit » : `generate:starter-demo` régénère le Kitchen Sink et copie `scripts/theme-to-js.js` et `package.json` ; le thème des démos de la doc est généré à chaque `npm run dev` / `build` du site (`/themes/doc-demo.css`).

- [ ] **Step 5: Phrase du `label` de `ar-breadcrumb`**

`ar-breadcrumb.mdx:58` (« Le `label` est le seul texte vocalisé ») : vérifié contre `breadcrumb-item.ts` (le `label` est rendu dans `<span class="item-label">`, le marqueur est `aria-hidden`, le slot `indicator` est décoratif). Aucun changement.

- [ ] **Step 6: Vérifier**

Run: `cd /Users/jon/Code/Active_projects/ariane && npx prettier --check README.md packages/core/README.md DEVELOPMENT.md && npm run check:skill --workspace=packages/core`
Expected: OK (le contrôle de la skill exige toujours les 14 composants racine dans les deux README).

- [ ] **Step 7: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add README.md packages/core/README.md DEVELOPMENT.md
git commit -m "docs: README et DEVELOPMENT.md alignés sur le starter-kit et les commandes réelles (#307)"
```

---

### Task 7: Skill, `CLAUDE.md`, README du starter-kit, PR

**Files:**

- Modify: `packages/core/scripts/skill/content/ariane/references/theming.md`, `installation.md`, `SKILL.md`
- Modify: `CLAUDE.md`
- Modify (autre dépôt, checkout frère `../ariane-starter-kit`) : `README.md`

- [ ] **Step 1: `SKILL.md` et références**

`SKILL.md:12` (« Aucun style sans thème : charger `ariane.css` ou un thème propre ») devient « Aucun style sans thème : charger un thème (copié du starter-kit, ou le vôtre) ; un composant d'apparence brute : vérifier d'abord que le thème est chargé ». `theming.md` : ligne 21 (« Le thème fourni est `ariane.css` »), lignes 26-34 (exemples de chargement), 48-49, 51-63 (structure), 122 et 165 : présenter le starter-kit (`https://github.com/jogo-labs/ariane-starter-kit`, démo Kitchen Sink) comme thème de départ ; la structure de fragments décrite est celle du starter (même arbre que celui d'`ariane.css`, palette neutre) ; l'agent ne recommande plus de charger `ariane.css` ni d'importer `arianeTheme` ; pour la version JavaScript, renvoyer au script `npm run build:js` du starter. `theming.md:224` (CDN, `arianeTheme`) : remplacer par la génération du thème JavaScript. `installation.md` lignes 93, 103, 104 : « thème fourni » devient « thème du starter-kit ». Rappeler dans `theming.md` que, sur le CDN, aucune feuille de thème n'est versionnée : on copie les fichiers depuis GitHub.

- [ ] **Step 2: Régénérer et contrôler**

Run: `cd /Users/jon/Code/Active_projects/ariane/packages/core && npm run build:skill && npm run check:skill && awk '/ariane\.css|arianeTheme|thème fourni/{print FILENAME": "FNR": "substr($0,1,120)}' scripts/skill/content/ariane/SKILL.md scripts/skill/content/ariane/references/*.md`
Expected: contrôle vert ; plus aucune recommandation d'`ariane.css` ni de « thème fourni ».

- [ ] **Step 3: `CLAUDE.md`**

Dans « Common Commands », sous `generate:starter-demo` (déjà cité dans le workflow de release) ajouter : « Le thème des démos de la doc est généré au build du site (`/themes/doc-demo.css`) depuis les sources du thème ; le thème du starter-kit et ce thème-là suivent `ariane.css`. Un composant ajouté au thème doit figurer dans les deux (test `scripts/starter-kit`). »

- [ ] **Step 4: README du dépôt starter-kit (autre dépôt, local seulement)**

Dans `../ariane-starter-kit/README.md` : remplacer `autoloader.prod.js` par `autoloader.js` (URL d'avant #300 supprimée) ; ajouter une section « Version JavaScript du thème » : `npm install` puis `npm run build:js` (génère `ariane-starter.js`, un `CSSStyleSheet` à adopter dans un shadow DOM), et la commande pour l'adapter à son propre thème (`node scripts/theme-to-js.js <entrée.css> <sortie.js> --name <identifiant>`). Régénérer d'abord : `cd /Users/jon/Code/Active_projects/ariane && npm run generate:starter-demo -- --repo ../ariane-starter-kit` (crée un commit local dans ce dépôt). **Ne pas pousser** ce dépôt sans accord explicite du mainteneur.

- [ ] **Step 5: Vérification complète**

Run: `cd /Users/jon/Code/Active_projects/ariane && npm run test && npm run test:starter-kit && npm run lint && npm run build`
Expected: tout vert.

- [ ] **Step 6: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add packages/core/scripts/skill/content CLAUDE.md
git commit -m "docs(core): la skill et CLAUDE.md présentent le starter-kit comme base de thème (#304)"
```

- [ ] **Step 7: Pousser et ouvrir la PR (seulement sur demande du mainteneur)**

Attendre l'instruction explicite. Puis : `git push -u origin docs/theme-docs-demos-304`, `gh pr create --base dev` avec `Closes #304`, `Closes #307`, le template de PR (cases à cocher dont la skill consommateur), et la mention des limites vérifiées (navigateurs testés, `::backdrop`, datepicker). Ne pas merger sans confirmation.

---

## Self-Review

**Spec coverage.** Mécanisme (Tasks 1-2) ; feuille servie et écrite (Task 3 Step 1) ; marquage `div.preview` et `div.try-preview-stage` (Task 3 Step 3) ; tests (sélecteurs scopés et superset : Task 2 ; Playwright : Task 3 ; `check-build` : Task 3) ; script JavaScript du consommateur et sa copie (Task 4) ; README, `DEVELOPMENT.md`, vérifications factuelles (Task 6) ; site de doc (Task 5) ; skill et `CLAUDE.md` (Task 7) ; README du starter-kit et `autoloader.prod.js` (Task 7 Step 4, local seulement) ; limites (cross-navigateurs : Task 3 Step 7).

**Écart assumé avec la spec.** La spec dit « aplatir avec Lightning CSS » : le spike a validé une sortie qui **conserve l'imbrication native** (cible aux trois planchers) ; l'aplatissement n'est utilisé que pour analyser. Le plan suit le comportement vérifié.

**Types.** `scopeThemeUnder(css, className)`, `collectSelectors(css)`, `unscopedSelectors(css, className)` (Task 1) sont utilisés tels quels en Task 2 ; `DOC_DEMO_CLASS`, `bundleCss`, `buildDocDemoTheme`, `createDocDemoThemeProvider` (Task 2) en Task 3 ; `themeToJs(css, { name })` est cohérent avec le test et la CLI.

**Points à confirmer à l'exécution (signalés dans les étapes).** Le test Playwright compare `color` d'une sonde `ar-alert` (repli : un token) ; l'assertion sur la sortie minifiée de `ar-dialog[size=sm]` ; les exemples `:state(open)`/`:state(invalid)` à remplacer par des états réels du manifeste ; la vérification Firefox/WebKit (Step 7 de la Task 3) reste manuelle.
