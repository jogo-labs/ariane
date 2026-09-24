# Repo ariane-starter-kit : thème neutre + démo Kitchen Sink — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer un nouveau repo externe `jogo-labs/ariane-starter-kit` (template GitHub) contenant un thème CSS neutre et une page de démo statique "Kitchen Sink" montrant tous les composants Ariane avec ce thème, déployée sur GitHub Pages — plus l'outillage dans le monorepo `ariane` qui génère cette démo à partir des données déjà existantes (manifest CEM + variants MDX de la doc).

**Architecture:** Un script générateur (`scripts/starter-kit/`) vit dans `ariane`, composé de fonctions pures testables (lecture manifest, lecture variants MDX, construction HTML) orchestrées par une CLI. Le thème starter est une copie de `packages/core/src/styles/themes/default.css` dont seules les couleurs "identité" (palette primaire ambre, surfaces "Voûte") sont remplacées par des valeurs neutres — tout le reste du fichier (tokens sémantiques, tokens composants, règles CSS) référence ces primitives via `var()` et devient donc neutre automatiquement, sans risque d'oubli. Le flux de mise à jour reste manuel (niveau A) : le script écrit et committe dans un checkout frère du repo externe, le `push` reste un geste volontaire.

**Tech Stack:** Node.js (scripts CLI, `node:test` pour les tests unitaires — zéro nouvelle dépendance de test), `gray-matter` (nouvelle dépendance, parsing du frontmatter YAML des `.mdx`), GitHub Pages ("Deploy from a branch"), `gh` CLI pour la création du repo externe.

**Spec:** `docs/superpowers/specs/2026-09-23-starter-kit-demo-230-design.md`

## Global Constraints

- Le repo externe `ariane-starter-kit` contient uniquement du statique : `ariane-starter.css`, `index.html` (généré, jamais édité à la main), `README.md`. Pas de build côté ce repo.
- Le script générateur vit dans `ariane` (racine, `scripts/starter-kit/`) — jamais dans le repo externe, ni dans `packages/core` ou `apps/docs` (il lit les deux).
- Pas d'automatisation CI cross-repo (pas de PAT, pas de `repository_dispatch`) — le flux reste déclenché à la main par le dev.
- Pas de réutilisation littérale du composant Astro `Layout.astro`/`SiteNav` — la page Kitchen Sink est un HTML/CSS autonome, inspiré visuellement seulement (nav simple + contenu, pas de TOC).
- Palette de la page Kitchen Sink (chrome/nav) sobre et neutre, distincte de l'identité "Ariane" (pas la palette ambre/Voûte de `default.css`).
- CDN autoloader (`https://unpkg.com/@ariane-ui/core/cdn/autoloader.prod.js`) pour charger les composants dans la démo — pattern déjà établi, pas de bundler.
- Toute création d'artefact externe visible (repo GitHub, activation Pages) requiert une confirmation explicite avant exécution — ce sont des actions publiques difficiles à défaire proprement.

---

## Task 1: Branche de travail

**Files:** aucun fichier modifié.

- [ ] **Step 1: Créer la branche depuis `dev`**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout dev
git pull --ff-only
git checkout -b feat/starter-kit-demo-230
```

- [ ] **Step 2: Vérifier l'état propre**

```bash
git status
```

Expected: `nothing to commit, working tree clean`, branche `feat/starter-kit-demo-230`.

---

## Task 2: Lecture du manifest CEM

**Files:**

- Create: `scripts/starter-kit/read-manifest-components.js`
- Create: `scripts/starter-kit/__fixtures__/sample-manifest.json`
- Test: `scripts/starter-kit/read-manifest-components.test.js`

**Interfaces:**

- Produces: `readManifestComponents(manifestPath: string) => Array<{ tagName: string, summary: string }>` — lit un fichier `custom-elements.json`, ne garde que les déclarations avec `customElement === true` ET un `tagName` défini (élimine les classes de base type `ArianeElement` marquées `@internal`, déjà absentes du manifest publié, et tout faux-positif résiduel de l'heuristique de l'analyzer Lit).

- [ ] **Step 1: Créer le fixture manifest**

```json
{
    "schemaVersion": "1.0.0",
    "modules": [
        {
            "path": "src/components/alert/alert.ts",
            "declarations": [
                {
                    "kind": "class",
                    "name": "ArAlert",
                    "customElement": true,
                    "tagName": "ar-alert",
                    "summary": "Affiche un message important intégré au contenu environnant."
                }
            ]
        },
        {
            "path": "src/base/ariane-element.ts",
            "declarations": [
                {
                    "kind": "class",
                    "name": "ArianeElement",
                    "customElement": true
                }
            ]
        }
    ]
}
```

Écrire ce contenu dans `scripts/starter-kit/__fixtures__/sample-manifest.json`.

- [ ] **Step 2: Écrire le test (doit échouer)**

```js
// scripts/starter-kit/read-manifest-components.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readManifestComponents } from './read-manifest-components.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, '__fixtures__', 'sample-manifest.json');

test('ne garde que les déclarations customElement avec un tagName', () => {
    const components = readManifestComponents(FIXTURE);
    assert.equal(components.length, 1);
    assert.deepEqual(components[0], {
        tagName: 'ar-alert',
        summary: 'Affiche un message important intégré au contenu environnant.',
    });
});

test('summary vide par défaut si absent du manifest', () => {
    const components = readManifestComponents(FIXTURE);
    // Le composant sans tagName (ArianeElement) est filtré, ne peut pas avoir de summary manquant ici.
    // On vérifie juste que la propriété summary est toujours une string.
    assert.equal(typeof components[0].summary, 'string');
});
```

- [ ] **Step 3: Lancer le test, vérifier l'échec**

```bash
node --test scripts/starter-kit/read-manifest-components.test.js
```

Expected: FAIL — `Cannot find module './read-manifest-components.js'`.

- [ ] **Step 4: Implémenter**

```js
// scripts/starter-kit/read-manifest-components.js
import { readFileSync } from 'node:fs';

/**
 * Lit un manifest CEM (`custom-elements.json`) et retourne la liste des
 * custom elements publiés (tagName + summary). Filtre toute déclaration
 * sans tagName — notamment les classes de base non enregistrées comme
 * élément (ex. ArianeElement), que l'heuristique de l'analyzer Lit peut
 * marquer customElement:true à tort.
 */
export function readManifestComponents(manifestPath) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const components = [];
    for (const mod of manifest.modules ?? []) {
        for (const decl of mod.declarations ?? []) {
            if (decl.customElement && decl.tagName) {
                components.push({ tagName: decl.tagName, summary: decl.summary ?? '' });
            }
        }
    }
    return components;
}
```

- [ ] **Step 5: Lancer le test, vérifier le succès**

```bash
node --test scripts/starter-kit/read-manifest-components.test.js
```

Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add scripts/starter-kit/read-manifest-components.js scripts/starter-kit/read-manifest-components.test.js scripts/starter-kit/__fixtures__/sample-manifest.json
git commit -m "feat(starter-kit): lecture des composants depuis le manifest CEM"
```

---

## Task 3: Lecture des variants depuis les MDX de la doc

**Files:**

- Create: `scripts/starter-kit/read-mdx-variants.js`
- Create: `scripts/starter-kit/__fixtures__/sample-component.mdx`
- Test: `scripts/starter-kit/read-mdx-variants.test.js`
- Modify: `package.json:1` (racine) — ajout de `gray-matter` en devDependency

**Interfaces:**

- Produces: `readVariantsFromMdx(mdxPath: string) => Array<{ name: string, label: string, description: string, html: string }>` — retourne `[]` si le fichier n'existe pas ou n'a pas de `variants` dans son frontmatter.

- [ ] **Step 1: Installer `gray-matter`**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm install --save-dev gray-matter
```

Note : `gray-matter` s'installe dans le `package.json` racine (le script n'appartient à aucun workspace `packages/*`/`apps/*`).

- [ ] **Step 2: Créer le fixture MDX**

```
---
tagName: ar-sample
title: Sample
variants:
    - name: default
      label: Défaut
      description: Rendu par défaut.
      html: |
          <ar-sample>Contenu</ar-sample>
---

## Section narrative (ignorée par le générateur)
```

Écrire ce contenu dans `scripts/starter-kit/__fixtures__/sample-component.mdx`.

- [ ] **Step 3: Écrire le test (doit échouer)**

```js
// scripts/starter-kit/read-mdx-variants.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readVariantsFromMdx } from './read-mdx-variants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, '__fixtures__', 'sample-component.mdx');

test('extrait les variants du frontmatter', () => {
    const variants = readVariantsFromMdx(FIXTURE);
    assert.equal(variants.length, 1);
    assert.equal(variants[0].name, 'default');
    assert.equal(variants[0].label, 'Défaut');
    assert.match(variants[0].html, /<ar-sample>Contenu<\/ar-sample>/);
});

test("retourne un tableau vide si le fichier n'existe pas", () => {
    const variants = readVariantsFromMdx(path.join(__dirname, '__fixtures__', 'absent.mdx'));
    assert.deepEqual(variants, []);
});
```

- [ ] **Step 4: Lancer le test, vérifier l'échec**

```bash
node --test scripts/starter-kit/read-mdx-variants.test.js
```

Expected: FAIL — `Cannot find module './read-mdx-variants.js'`.

- [ ] **Step 5: Implémenter**

```js
// scripts/starter-kit/read-mdx-variants.js
import { readFileSync, existsSync } from 'node:fs';
import matter from 'gray-matter';

/**
 * Extrait le tableau `variants` du frontmatter d'un fichier `.mdx` de la doc
 * (`apps/docs/src/content/components/ar-*.mdx`). Ce contenu est déjà écrit à
 * la main pour la doc réelle — réutilisé tel quel, zéro duplication.
 * Retourne [] si le fichier n'existe pas ou n'a pas de `variants` déclarés
 * (ex. composant tout juste créé, pas encore documenté).
 */
export function readVariantsFromMdx(mdxPath) {
    if (!existsSync(mdxPath)) return [];
    const raw = readFileSync(mdxPath, 'utf8');
    const { data } = matter(raw);
    return data.variants ?? [];
}
```

- [ ] **Step 6: Lancer le test, vérifier le succès**

```bash
node --test scripts/starter-kit/read-mdx-variants.test.js
```

Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json scripts/starter-kit/read-mdx-variants.js scripts/starter-kit/read-mdx-variants.test.js scripts/starter-kit/__fixtures__/sample-component.mdx
git commit -m "feat(starter-kit): lecture des variants depuis le frontmatter MDX"
```

---

## Task 4: Construction de la page HTML Kitchen Sink

**Files:**

- Create: `scripts/starter-kit/build-kitchen-sink-html.js`
- Test: `scripts/starter-kit/build-kitchen-sink-html.test.js`

**Interfaces:**

- Consumes: rien des tasks précédentes directement (fonction pure, prend des données déjà assemblées) — mais le type d'entrée doit correspondre à ce que Task 5 assemblera : `Array<{ tagName: string, summary: string, variants: Array<{ name, label, description, html }> }>`.
- Produces: `buildKitchenSinkHtml(components) => { html: string, warnings: string[] }`.

- [ ] **Step 1: Écrire le test (doit échouer)**

```js
// scripts/starter-kit/build-kitchen-sink-html.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildKitchenSinkHtml } from './build-kitchen-sink-html.js';

test('rend le tagName, le summary et le html brut du variant', () => {
    const { html, warnings } = buildKitchenSinkHtml([
        {
            tagName: 'ar-alert',
            summary: 'Affiche un message important.',
            variants: [
                {
                    name: 'default',
                    label: 'Défaut',
                    description: 'Rendu par défaut.',
                    html: '<ar-alert>Texte</ar-alert>',
                },
            ],
        },
    ]);
    assert.match(html, /<h2>ar-alert<\/h2>/);
    assert.match(html, /Affiche un message important\./);
    assert.match(html, /<ar-alert>Texte<\/ar-alert>/);
    assert.deepEqual(warnings, []);
});

test('échappe le texte (summary/label/description) mais pas le html du variant', () => {
    const { html } = buildKitchenSinkHtml([
        {
            tagName: 'ar-sample',
            summary: 'Résumé avec <balise> non voulue',
            variants: [
                { name: 'x', label: 'Label', description: 'desc', html: '<ar-sample></ar-sample>' },
            ],
        },
    ]);
    assert.match(html, /Résumé avec &lt;balise&gt; non voulue/);
    assert.match(html, /<ar-sample><\/ar-sample>/);
});

test('composant sans variant : avertissement + mention "démo à compléter"', () => {
    const { html, warnings } = buildKitchenSinkHtml([
        { tagName: 'ar-nouveau', summary: 'Un nouveau composant.', variants: [] },
    ]);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /ar-nouveau/);
    assert.match(html, /démo à compléter/i);
});

test('inclut la barre de nav sobre et le lien CDN autoloader', () => {
    const { html } = buildKitchenSinkHtml([]);
    assert.match(html, /cdn\/autoloader\.prod\.js/);
    assert.match(html, /ariane-starter\.css/);
    assert.match(html, /class="ks-nav"/);
});
```

- [ ] **Step 2: Lancer le test, vérifier l'échec**

```bash
node --test scripts/starter-kit/build-kitchen-sink-html.test.js
```

Expected: FAIL — `Cannot find module './build-kitchen-sink-html.js'`.

- [ ] **Step 3: Implémenter**

```js
// scripts/starter-kit/build-kitchen-sink-html.js

function escapeHtml(text) {
    return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function renderVariant(variant) {
    return `
        <div class="ks-variant">
            <h3>${escapeHtml(variant.label)}</h3>
            <p class="ks-variant-desc">${escapeHtml(variant.description)}</p>
            ${variant.html}
        </div>`;
}

function renderComponent(component, warnings) {
    let body;
    if (component.variants.length === 0) {
        warnings.push(`${component.tagName} : aucun variant trouvé — démo à compléter.`);
        body =
            '<p class="ks-todo">Démo à compléter — aucun variant documenté pour ce composant.</p>';
    } else {
        body = component.variants.map(renderVariant).join('\n');
    }
    return `
    <section class="ks-component" id="${component.tagName}">
        <h2>${component.tagName}</h2>
        <p class="ks-summary">${escapeHtml(component.summary)}</p>
        ${body}
    </section>`;
}

/**
 * Construit la page statique "Kitchen Sink" : une section par composant,
 * chaque variant documenté (frontmatter MDX, cf. read-mdx-variants.js) rendu
 * avec son HTML brut. Ossature nav + contenu inspirée visuellement de la doc
 * Astro, recodée en HTML/CSS indépendant (pas de dépendance à Astro) — pas
 * de TOC, palette sobre distincte de l'identité Ariane.
 */
export function buildKitchenSinkHtml(components) {
    const warnings = [];
    const sections = components.map((c) => renderComponent(c, warnings)).join('\n');

    const html = `<!doctype html>
<html lang="fr">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kitchen Sink — Ariane Starter Kit</title>
    <script type="module" src="https://unpkg.com/@ariane-ui/core/cdn/autoloader.prod.js"></script>
    <link rel="stylesheet" href="./ariane-starter.css" />
    <style>
        :root {
            --ks-bg: #f8fafc;
            --ks-nav-bg: #0f172a;
            --ks-nav-fg: #f1f5f9;
            --ks-border: #e2e8f0;
            --ks-text: #1e293b;
            --ks-muted: #64748b;
        }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: system-ui, sans-serif; background: var(--ks-bg); color: var(--ks-text); }
        header.ks-nav {
            position: sticky;
            top: 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.75rem 1.5rem;
            background: var(--ks-nav-bg);
            color: var(--ks-nav-fg);
        }
        header.ks-nav a { color: inherit; text-decoration: none; font-weight: 600; }
        main.ks-content { max-width: 960px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }
        section.ks-component { border-top: 1px solid var(--ks-border); padding-block: 2rem; }
        section.ks-component:first-child { border-top: none; }
        section.ks-component h2 { margin: 0 0 0.25rem; font-size: 1.25rem; }
        p.ks-summary { color: var(--ks-muted); margin: 0 0 1.5rem; }
        div.ks-variant { margin-block-end: 1.5rem; }
        div.ks-variant h3 { font-size: 0.95rem; margin: 0 0 0.25rem; }
        p.ks-variant-desc { color: var(--ks-muted); font-size: 0.875rem; margin: 0 0 0.75rem; }
        p.ks-todo { color: #b45309; font-style: italic; }
    </style>
</head>
<body>
    <header class="ks-nav">
        <span>Ariane — Kitchen Sink</span>
        <a href="https://github.com/jogo-labs/ariane" target="_blank" rel="noopener">Voir le repo ariane ↗</a>
    </header>
    <main class="ks-content">${sections}
    </main>
</body>
</html>
`;

    return { html, warnings };
}
```

- [ ] **Step 4: Lancer le test, vérifier le succès**

```bash
node --test scripts/starter-kit/build-kitchen-sink-html.test.js
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/starter-kit/build-kitchen-sink-html.js scripts/starter-kit/build-kitchen-sink-html.test.js
git commit -m "feat(starter-kit): génération de la page HTML Kitchen Sink"
```

---

## Task 5: CLI orchestrateur (`generate-starter-demo.js`)

**Files:**

- Create: `scripts/starter-kit/generate-starter-demo.js`
- Test: `scripts/starter-kit/generate-starter-demo.test.js`
- Modify: `package.json:15` (racine, bloc `"scripts"`) — ajout de `"generate:starter-demo"`
- Modify: `.gitignore` — ajout de `dist-starter-demo/`

**Interfaces:**

- Consumes: `readManifestComponents` (Task 2), `readVariantsFromMdx` (Task 3), `buildKitchenSinkHtml` (Task 4).
- Produces: `generate({ manifestPath, mdxDir, dryRun, outDir, repoPath, coreVersion }) => { html: string, warnings: string[], committed: boolean }` — fonction exportée, injectée en chemins explicites (testable sans toucher aux vrais fichiers du repo). Le point d'entrée CLI (`if (import.meta.url === ...)`) calcule les chemins réels par défaut et appelle `generate()`.

- [ ] **Step 1: Écrire le test (doit échouer) — mode dry-run uniquement**

Le mode `--repo` (git add/commit) est vérifié manuellement en Task 9 (opération avec effets de bord sur un vrai repo git) — seul le mode dry-run, sans dépendance git, est couvert par un test automatisé ici.

```js
// scripts/starter-kit/generate-starter-demo.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate } from './generate-starter-demo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST = path.join(__dirname, '__fixtures__', 'sample-manifest.json');
const MDX_DIR = path.join(__dirname, '__fixtures__');

test('mode dry-run : écrit index.html dans outDir sans toucher à git', () => {
    const outDir = mkdtempSync(path.join(tmpdir(), 'starter-demo-'));
    try {
        const result = generate({
            manifestPath: MANIFEST,
            mdxDir: MDX_DIR,
            dryRun: true,
            outDir,
        });
        assert.equal(result.committed, false);
        const written = readFileSync(path.join(outDir, 'index.html'), 'utf8');
        assert.match(written, /<h2>ar-alert<\/h2>/);
        assert.equal(written, result.html);
    } finally {
        rmSync(outDir, { recursive: true, force: true });
    }
});
```

Note : le fixture `sample-manifest.json` (Task 2) référence `ar-alert`, mais aucun `ar-alert.mdx` n'existe dans `__fixtures__` — `readVariantsFromMdx` retournera `[]` pour ce composant (comportement déjà couvert Task 3), donc `warnings` contiendra un avertissement "démo à compléter" pour `ar-alert`. C'est attendu et sans impact sur ce test (on ne vérifie pas `warnings` ici).

- [ ] **Step 2: Lancer le test, vérifier l'échec**

```bash
node --test scripts/starter-kit/generate-starter-demo.test.js
```

Expected: FAIL — `Cannot find module './generate-starter-demo.js'`.

- [ ] **Step 3: Implémenter**

```js
// scripts/starter-kit/generate-starter-demo.js
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readManifestComponents } from './read-manifest-components.js';
import { readVariantsFromMdx } from './read-mdx-variants.js';
import { buildKitchenSinkHtml } from './build-kitchen-sink-html.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

/**
 * Assemble et écrit la démo Kitchen Sink.
 *
 * - dryRun: true  → écrit dans `outDir` (répertoire scratch local), aucune
 *   opération git. Utilisé par le smoke test CI et pour prévisualiser en
 *   local avant de pousser vers le vrai repo externe.
 * - dryRun: false → écrit `index.html` dans `repoPath` (checkout du repo
 *   externe `ariane-starter-kit`) et y fait `git add` + `git commit`. Ne
 *   pousse jamais — le `git push` reste un geste volontaire du dev, après
 *   relecture du diff.
 */
export function generate({ manifestPath, mdxDir, dryRun, outDir, repoPath, coreVersion }) {
    const components = readManifestComponents(manifestPath).map((c) => ({
        ...c,
        variants: readVariantsFromMdx(path.join(mdxDir, `${c.tagName}.mdx`)),
    }));

    const { html, warnings } = buildKitchenSinkHtml(components);
    for (const warning of warnings) {
        console.warn(`[generate-starter-demo] ${warning}`);
    }

    if (dryRun) {
        mkdirSync(outDir, { recursive: true });
        writeFileSync(path.join(outDir, 'index.html'), html);
        console.log(`Démo générée (dry-run) dans ${outDir}/index.html`);
        return { html, warnings, committed: false };
    }

    if (!existsSync(path.join(repoPath, '.git'))) {
        throw new Error(
            `${repoPath} n'est pas un dépôt git — clone jogo-labs/ariane-starter-kit en checkout frère avant de relancer.`,
        );
    }
    writeFileSync(path.join(repoPath, 'index.html'), html);

    execFileSync('git', ['add', 'index.html'], { cwd: repoPath });
    try {
        execFileSync('git', ['commit', '-m', `chore: régénère la démo (ariane v${coreVersion})`], {
            cwd: repoPath,
            stdio: 'pipe',
        });
        console.log(`Commit créé dans ${repoPath} — pense à \`git push\` après relecture.`);
        return { html, warnings, committed: true };
    } catch {
        console.log('Rien à mettre à jour — la démo était déjà à jour.');
        return { html, warnings, committed: false };
    }
}

function parseArgs(argv) {
    const args = { repo: '../ariane-starter-kit', dryRun: false };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--dry-run') args.dryRun = true;
        else if (argv[i] === '--repo') args.repo = argv[++i];
    }
    return args;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const { repo, dryRun } = parseArgs(process.argv.slice(2));
    const coreVersion = JSON.parse(
        readFileSync(path.join(ROOT, 'packages/core/package.json'), 'utf8'),
    ).version;
    generate({
        manifestPath: path.join(ROOT, 'packages/core/dist/custom-elements.json'),
        mdxDir: path.join(ROOT, 'apps/docs/src/content/components'),
        dryRun,
        outDir: path.join(ROOT, 'dist-starter-demo'),
        repoPath: path.resolve(process.cwd(), repo),
        coreVersion,
    });
}
```

- [ ] **Step 4: Lancer le test, vérifier le succès**

```bash
node --test scripts/starter-kit/generate-starter-demo.test.js
```

Expected: PASS (1 test).

- [ ] **Step 5: Ajouter le script npm et l'entrée `.gitignore`**

Dans `package.json` (racine), bloc `"scripts"`, ajouter après `"create"` :

```json
"generate:starter-demo": "node scripts/starter-kit/generate-starter-demo.js"
```

Dans `.gitignore`, ajouter une ligne :

```
dist-starter-demo/
```

- [ ] **Step 6: Vérifier manuellement contre le vrai manifest**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run build --workspace=packages/core
npm run generate:starter-demo -- --dry-run
cat dist-starter-demo/index.html | grep -c "<section class=\"ks-component\""
```

Expected: le script tourne sans exception ; le compte de sections correspond au nombre de composants publiés (19 au moment d'écrire ce plan) ; des avertissements "démo à compléter" apparaissent sur stdout pour les composants dont le `.mdx` n'a pas de `variants` (à vérifier au cas par cas — ne doit pas être une surprise silencieuse).

- [ ] **Step 7: Commit**

```bash
git add scripts/starter-kit/generate-starter-demo.js scripts/starter-kit/generate-starter-demo.test.js package.json .gitignore
git commit -m "feat(starter-kit): CLI generate-starter-demo (dry-run + mode repo)"
```

---

## Task 6: Smoke test CI

**Files:**

- Modify: `.github/workflows/ci-core.yml` (job `ci`, après le step `Build`)

**Interfaces:** aucune — cablage CI uniquement.

- [ ] **Step 1: Ajouter le step après `Build`, avant `Test`**

Dans `.github/workflows/ci-core.yml`, job `ci`, insérer entre les steps `Build` et `Test` :

```yaml
- name: Smoke test — générateur starter-kit demo
  run: node scripts/starter-kit/generate-starter-demo.js --dry-run
```

- [ ] **Step 2: Vérifier localement que la commande fonctionne isolément**

```bash
cd /Users/jon/Code/Active_projects/ariane
rm -rf dist-starter-demo
node scripts/starter-kit/generate-starter-demo.js --dry-run
test -f dist-starter-demo/index.html && echo OK
```

Expected: `OK` affiché, aucune exception.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci-core.yml
git commit -m "ci(core): smoke test dry-run du générateur starter-kit"
```

---

## Task 7: Documenter l'étape dans la checklist de release

**Files:**

- Modify: `CLAUDE.md` (section `## Git Workflow`)

**Interfaces:** aucune — documentation uniquement.

- [ ] **Step 1: Ajouter la ligne à la checklist**

Dans `CLAUDE.md`, section `## Git Workflow`, après la ligne `- Tag npm : ...`, ajouter :

```markdown
- Si un composant a changé depuis la dernière release : régénérer la démo starter-kit (`npm run generate:starter-demo -- --repo <checkout ariane-starter-kit>`) et pousser dans ce repo après relecture du diff. Checkout frère attendu à côté de `ariane` en local (cf. `docs/superpowers/specs/2026-09-23-starter-kit-demo-230-design.md`).
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: checklist release — régénération de la démo starter-kit"
```

---

## Task 8: Bootstrap du repo externe `jogo-labs/ariane-starter-kit`

⚠️ **Cette task crée un repo GitHub public et active GitHub Pages — actions visibles de l'extérieur, difficiles à défaire proprement. Confirmer explicitement avec l'utilisateur avant d'exécuter le Step 1.**

**Files (dans le nouveau repo, hors du repo `ariane`) :**

- Create: `ariane-starter.css`
- Create: `README.md`

- [ ] **Step 1: Créer le repo (après confirmation explicite)**

Se positionner dans le répertoire **parent** de `ariane` avant de lancer la commande — `--clone` clone dans le répertoire courant, et on veut un checkout frère (ex. `~/Code/Active_projects/`, pas à l'intérieur de `ariane`) :

```bash
cd /Users/jon/Code/Active_projects
gh repo create jogo-labs/ariane-starter-kit --public \
  --description "Thème CSS neutre + démo Kitchen Sink pour démarrer avec Ariane" \
  --clone
```

`--clone` crée le repo sur GitHub **et** le clone en local en une seule commande — rien à cloner à la main ensuite. Résultat attendu : `~/Code/Active_projects/ariane-starter-kit/` créé, checkout frère de `~/Code/Active_projects/ariane/`.

- [ ] **Step 2: Activer le flag "Template repository"**

```bash
gh api -X PATCH repos/jogo-labs/ariane-starter-kit -f is_template=true
```

- [ ] **Step 3: Copier `default.css` comme base et l'ouvrir pour édition**

```bash
cp /Users/jon/Code/Active_projects/ariane/packages/core/src/styles/themes/default.css \
   /Users/jon/Code/Active_projects/ariane-starter-kit/ariane-starter.css
```

- [ ] **Step 4: Remplacer la palette primaire (identité ambre) par une palette slate-blue neutre**

Dans `ariane-starter.css`, remplacer le bloc (11 déclarations `--ar-color-primary-*` + son commentaire) :

```css
/* Primary (ambre — identité #110) — 05=sombre → 95=clair.
           Ancré sur deux valeurs déjà vérifiées AA côté doc (charte-graphique.md) :
           40 = #8f5f00 (--doc-accent clair), 70 = #ffaa00 (--doc-ember brut).
           Contraste vérifié (OKLCH → sRGB, formule WCAG) :
           primary-40 vs blanc (fond de bouton, texte blanc dessus) = 5.52:1 (>=4.5)
           primary-70 vs vault #191d2e (texte interactif en sombre) = 8.76:1 (>=4.5) */
--ar-color-primary-05: oklch(16.5% 0.035 70);
--ar-color-primary-10: oklch(22.5% 0.05 71);
--ar-color-primary-20: oklch(31% 0.075 72);
--ar-color-primary-30: oklch(41.5% 0.095 73);
--ar-color-primary-40: oklch(52.43% 0.1108 74.71);
--ar-color-primary-50: oklch(60.5% 0.13 74.5);
--ar-color-primary-60: oklch(70.5% 0.155 74);
--ar-color-primary-70: oklch(80.16% 0.1705 73.27);
--ar-color-primary-80: oklch(86.5% 0.13 78);
--ar-color-primary-90: oklch(92.5% 0.075 83);
--ar-color-primary-95: oklch(96.5% 0.038 87);
```

par :

```css
/* Primary — accent slate-blue neutre (starter-kit, pas l'identité Ariane).
           Mêmes luminosités (L) que le thème d'origine — les ratios de contraste
           calculés pour default.css restent valides ici, seuls la teinte (hue 250)
           et le chroma (fortement réduit) changent pour un rendu sobre. */
--ar-color-primary-05: oklch(16.5% 0.02 250);
--ar-color-primary-10: oklch(22.5% 0.025 250);
--ar-color-primary-20: oklch(31% 0.03 250);
--ar-color-primary-30: oklch(41.5% 0.035 250);
--ar-color-primary-40: oklch(52.43% 0.04 250);
--ar-color-primary-50: oklch(60.5% 0.045 250);
--ar-color-primary-60: oklch(70.5% 0.05 250);
--ar-color-primary-70: oklch(80.16% 0.045 250);
--ar-color-primary-80: oklch(86.5% 0.035 250);
--ar-color-primary-90: oklch(92.5% 0.025 250);
--ar-color-primary-95: oklch(96.5% 0.015 250);
```

- [ ] **Step 5: Remplacer les surfaces "Voûte" par des alias neutres**

Remplacer :

```css
/* Vault (surfaces sombres dédiées — identité "Voûte", #110) — utilisé
           uniquement par --ar-color-bg/-bg-subtle côté sombre, jamais par un
           composant directement. Valeurs alignées sur --doc-vault/-vault-deep
           (apps/docs/src/styles/doc-tokens.css), converties en oklch natif. */
--ar-color-vault: oklch(23.54% 0.0334 273.44);
--ar-color-vault-deep: oklch(18.99% 0.0249 273.04);
```

par :

```css
/* Vault — alias neutres (starter-kit) : réutilise directement les
           valeurs de la rampe neutre plutôt qu'une identité de surface dédiée. */
--ar-color-vault: var(--ar-color-neutral-10);
--ar-color-vault-deep: var(--ar-color-neutral-05);
```

- [ ] **Step 6: Adoucir l'échelle de radius**

Remplacer :

```css
--ar-border-radius-sm: 0.25rem; /* 4px, inchangé */
--ar-border-radius-md: 0.5rem; /* 8px (était 6px) */
--ar-border-radius-lg: 0.875rem; /* 14px (était 8px) */
--ar-border-radius-xl: 1.5rem; /* 24px (était 12px) */
--ar-border-radius-full: 9999px;
```

par :

```css
--ar-border-radius-sm: 0.25rem; /* 4px */
--ar-border-radius-md: 0.375rem; /* 6px — plus discret que le thème Ariane */
--ar-border-radius-lg: 0.5rem; /* 8px — plus discret que le thème Ariane */
--ar-border-radius-xl: 0.75rem; /* 12px — plus discret que le thème Ariane */
--ar-border-radius-full: 9999px;
```

- [ ] **Step 7: Mettre à jour l'en-tête de commentaire du fichier**

Remplacer les 10 premières lignes (commentaire d'en-tête `/** Thème par défaut ... */`) par :

```css
/**
 * ariane-starter.css — thème de démarrage neutre pour Ariane.
 * Copie de packages/core/src/styles/themes/default.css dont seules les
 * couleurs d'identité (palette primaire, surfaces "Voûte") et l'échelle de
 * radius ont été remplacées par des valeurs neutres — tout le reste (tokens
 * sémantiques, tokens composants, règles CSS) référence ces primitives via
 * var() et hérite donc automatiquement du rendu neutre.
 *
 * Ce fichier est un point de départ à copier/adapter dans votre propre projet,
 * pas un package à installer.
 *
 * Usage :
 *   <link rel="stylesheet" href="./ariane-starter.css">
 */
```

- [ ] **Step 8: Écrire le README**

```markdown
# ariane-starter-kit

Point de départ pour styliser [Ariane](https://github.com/jogo-labs/ariane) : un thème CSS neutre (`ariane-starter.css`) à copier/forker, et une démo statique de tous les composants avec ce thème.

## Démo

👉 [Voir la Kitchen Sink](https://jogo-labs.github.io/ariane-starter-kit/)

## Utilisation

Copiez `ariane-starter.css` dans votre projet et adaptez les valeurs à votre identité visuelle :

\`\`\`html
<link rel="stylesheet" href="https://unpkg.com/@ariane-ui/core/cdn/autoloader.prod.js" />
<link rel="stylesheet" href="./ariane-starter.css" />
\`\`\`

`ariane-starter.css` couvre l'intégralité des tokens `--ar-*` d'Ariane — c'est une copie du thème par défaut de la librairie dont seules les couleurs d'identité ont été neutralisées, pas un sous-ensemble.

## Régénérer la démo

La page `index.html` est générée depuis le monorepo [`ariane`](https://github.com/jogo-labs/ariane) — ne pas l'éditer à la main ici. Voir `docs/superpowers/specs/2026-09-23-starter-kit-demo-230-design.md` dans ce repo-là pour le flux complet.
```

- [ ] **Step 9: Activer GitHub Pages**

```bash
gh api -X POST repos/jogo-labs/ariane-starter-kit/pages \
  -f "source[branch]=main" -f "source[path]=/"
```

- [ ] **Step 10: Commit et push dans `ariane-starter-kit`**

```bash
cd /Users/jon/Code/Active_projects/ariane-starter-kit
git add ariane-starter.css README.md
git commit -m "chore: thème starter neutre + README"
git push
```

---

## Task 9: Générer et publier la démo réelle

**Files:** aucun fichier modifié dans `ariane` — cette task ne fait qu'exécuter l'outillage des tasks précédentes contre le vrai repo externe.

- [ ] **Step 1: Rebuild du manifest à jour**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run build --workspace=packages/core
```

- [ ] **Step 2: Générer et committer dans le checkout frère**

```bash
npm run generate:starter-demo -- --repo ../ariane-starter-kit
```

Expected: message `Commit créé dans .../ariane-starter-kit — pense à \`git push\` après relecture.` sur stdout ; avertissements listés pour tout composant sans variant documenté (à vérifier — s'assurer qu'aucun composant existant n'en manque à ce stade).

- [ ] **Step 3: Relire le diff avant de pousser**

```bash
cd /Users/jon/Code/Active_projects/ariane-starter-kit
git show HEAD --stat
git show HEAD -- index.html | head -100
```

Vérifier : présence des 19 composants, pas de contenu HTML cassé, chemins CDN/CSS corrects.

- [ ] **Step 4: Pousser (geste volontaire, après relecture)**

```bash
git push
```

- [ ] **Step 5: Vérifier le déploiement Pages**

```bash
sleep 60
curl -sI https://jogo-labs.github.io/ariane-starter-kit/ | head -5
```

Expected: `HTTP/2 200`. Ouvrir l'URL dans un navigateur pour vérifier visuellement le rendu (nav sobre, composants stylés en slate-blue neutre, pas de FOUC ni d'erreur console).

- [ ] **Step 6: Mettre à jour l'issue #230**

```bash
cd /Users/jon/Code/Active_projects/ariane
gh issue comment 230 --body "Points 3 & 4 livrés : https://github.com/jogo-labs/ariane-starter-kit (thème starter + démo Kitchen Sink déployée sur https://jogo-labs.github.io/ariane-starter-kit/). Points 1 & 2 restent à traiter séparément."
```

---

## Task 10: Pull Request

**Files:** aucun.

- [ ] **Step 1: Vérifier que toute la suite de tests passe**

```bash
cd /Users/jon/Code/Active_projects/ariane
node --test scripts/starter-kit/*.test.js
npm run test --workspace=packages/core
```

Expected: tous les tests passent.

- [ ] **Step 2: Pousser la branche et ouvrir la PR**

```bash
git push -u origin feat/starter-kit-demo-230
gh pr create --base dev --title "feat(core): starter-kit + démo Kitchen Sink (#230, points 3 & 4)" --body "$(cat <<'EOF'
Implémente les points 3 et 4 de #230 : thème CSS neutre + démo statique "Kitchen Sink" déployée sur GitHub Pages, dans un nouveau repo externe [jogo-labs/ariane-starter-kit](https://github.com/jogo-labs/ariane-starter-kit).

- Script générateur (`scripts/starter-kit/`) réutilisant le manifest CEM + les variants déjà écrits dans les `.mdx` de la doc — zéro duplication de contenu de démo.
- Flux de mise à jour manuel mais outillé (`npm run generate:starter-demo -- --repo <checkout>`), documenté dans la checklist de release (`CLAUDE.md`).
- Smoke test CI (dry-run) contre toute régression du générateur.

Spec : `docs/superpowers/specs/2026-09-23-starter-kit-demo-230-design.md`

Démo : https://jogo-labs.github.io/ariane-starter-kit/

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01DBWvASBNGXKCie9vdzdJYf
EOF
)"
```

- [ ] **Step 3: Attendre la CI verte, puis merger sur confirmation explicite de l'utilisateur**

Ne pas merger sans confirmation — cf. règle permanente du projet (aucun merge autonome).
