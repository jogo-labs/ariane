# Repo ariane-starter-kit : thème neutre dérivé + démo Kitchen Sink — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer un nouveau repo externe `jogo-labs/ariane-starter-kit` (template GitHub) contenant un thème CSS neutre **dérivé** de `ariane.css` (post-#256) et une page de démo statique "Kitchen Sink" montrant tous les composants Ariane avec ce thème, déployée sur GitHub Pages — plus l'outillage dans le monorepo `ariane` qui génère les deux à partir des données déjà existantes (manifest CEM, variants MDX de la doc, fragments réels du thème).

**Architecture:** Un script générateur (`scripts/starter-kit/`) vit dans `ariane`, composé de fonctions pures testables : lecture manifest, lecture variants MDX, construction HTML (repris tels quels du design pré-#256), plus deux nouvelles fonctions de dérivation CSS (`deriveNeutralPalette`, `deriveNeutralGlobalTokens`) qui neutralisent uniquement les 11 valeurs de la palette primaire (en préservant leur luminosité, donc leur contraste) et les 4 valeurs de l'échelle de radius — tout le reste de l'arbre `packages/core/src/styles/themes/ariane/` (19 fragments) est copié verbatim, puisqu'il référence déjà les primitives via `var()`. Le flux de mise à jour reste manuel (niveau A) : le script écrit et committe dans un checkout frère du repo externe, le `push` reste un geste volontaire.

**Tech Stack:** Node.js (scripts CLI, Vitest pour les tests unitaires — convention déjà établie pour `packages/core/scripts/*.test.js`, cf. #256), `gray-matter` (nouvelle dépendance, parsing du frontmatter YAML des `.mdx`), GitHub Pages ("Deploy from a branch"), `gh` CLI pour la création du repo externe.

**Spec:** `docs/superpowers/specs/2026-09-23-starter-kit-demo-230-design.md`

## Global Constraints

- Le repo externe `ariane-starter-kit` contient uniquement du statique généré : `ariane-starter.css`, `ariane-starter/` (arbre de fragments), `index.html` — jamais édités à la main, sauf `README.md`. Pas de build côté ce repo.
- Les scripts vivent dans `ariane` (racine, `scripts/starter-kit/`) — jamais dans le repo externe, ni dans `packages/core` ou `apps/docs` (ils lisent les deux).
- Pas d'automatisation CI cross-repo (pas de PAT, pas de `repository_dispatch`) — le flux reste déclenché à la main par le dev.
- `_palette.css` et `_global-tokens.css` neutralisés par **transformation ciblée** (regex), tout le reste copié **verbatim** — jamais de réécriture manuelle du thème starter.
- La luminosité (L) de chaque palier de la palette primaire est **préservée depuis la source réelle**, jamais recalculée ou codée en dur — garantit que le starter suit toute recalibration future de la palette ambre.
- Palette de la page Kitchen Sink (chrome/nav) sobre et neutre, distincte de l'identité "Ariane".
- CDN autoloader (`https://unpkg.com/@ariane-ui/core/cdn/autoloader.prod.js`) pour charger les composants dans la démo — pattern déjà établi, pas de bundler.
- Toute création d'artefact externe visible (repo GitHub, activation Pages) requiert une confirmation explicite avant exécution.

---

## Task 1: Branche de travail

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

Expected: `nothing to commit, working tree clean`.

---

## Task 2: Lecture du manifest CEM

**Files:**

- Create: `scripts/starter-kit/read-manifest-components.js`
- Create: `scripts/starter-kit/__fixtures__/sample-manifest.json`
- Test: `scripts/starter-kit/read-manifest-components.test.js`

**Interfaces:**

- Produces: `readManifestComponents(manifestPath: string) => Array<{ tagName: string, summary: string }>` — lit un fichier `custom-elements.json`, ne garde que les déclarations avec `customElement === true` ET un `tagName` défini.

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
            "declarations": [{ "kind": "class", "name": "ArianeElement", "customElement": true }]
        }
    ]
}
```

Écrire ce contenu dans `scripts/starter-kit/__fixtures__/sample-manifest.json`.

- [ ] **Step 2: Écrire le test (doit échouer)**

```js
// scripts/starter-kit/read-manifest-components.test.js
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readManifestComponents } from './read-manifest-components.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, '__fixtures__', 'sample-manifest.json');

describe('readManifestComponents', () => {
    it('ne garde que les déclarations customElement avec un tagName', () => {
        const components = readManifestComponents(FIXTURE);
        expect(components.length).toBe(1);
        expect(components[0]).toEqual({
            tagName: 'ar-alert',
            summary: 'Affiche un message important intégré au contenu environnant.',
        });
    });

    it('summary est toujours une string', () => {
        const components = readManifestComponents(FIXTURE);
        expect(typeof components[0].summary).toBe('string');
    });
});
```

Note : ce projet utilise Vitest (`describe`/`it`/`expect`) pour tous les tests de `scripts/*.test.js` — `vitest.config.ts` inclut déjà `scripts/**/*.test.js` dans son scan. Ne pas utiliser `node:test` (incohérent avec la convention établie, cf. #256).

- [ ] **Step 3: Lancer le test, vérifier l'échec**

```bash
npx vitest run scripts/starter-kit/read-manifest-components.test.js --workspace=packages/core 2>&1 || true
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run scripts/starter-kit/read-manifest-components.test.js
```

Expected: FAIL — module introuvable.

- [ ] **Step 4: Implémenter**

```js
// scripts/starter-kit/read-manifest-components.js
import { readFileSync } from 'node:fs';

/**
 * Lit un manifest CEM (`custom-elements.json`) et retourne la liste des
 * custom elements publiés (tagName + summary). Filtre toute déclaration
 * sans tagName — notamment les classes de base non enregistrées comme
 * élément (ex. ArianeElement).
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
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run scripts/starter-kit/read-manifest-components.test.js
```

Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add scripts/starter-kit/read-manifest-components.js scripts/starter-kit/read-manifest-components.test.js scripts/starter-kit/__fixtures__/sample-manifest.json
git commit -m "feat(starter-kit): lecture des composants depuis le manifest CEM"
```

---

## Task 3: Lecture des variants depuis les MDX de la doc

**Files:**

- Create: `scripts/starter-kit/read-mdx-variants.js`
- Create: `scripts/starter-kit/__fixtures__/sample-component.mdx`
- Test: `scripts/starter-kit/read-mdx-variants.test.js`
- Modify: `package.json` (racine) — ajout de `gray-matter` en devDependency

**Interfaces:**

- Produces: `readVariantsFromMdx(mdxPath: string) => Array<{ name: string, label: string, description: string, html: string }>` — retourne `[]` si le fichier n'existe pas ou n'a pas de `variants` dans son frontmatter.

- [ ] **Step 1: Installer `gray-matter`**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm install --save-dev gray-matter
```

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
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readVariantsFromMdx } from './read-mdx-variants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, '__fixtures__', 'sample-component.mdx');

describe('readVariantsFromMdx', () => {
    it('extrait les variants du frontmatter', () => {
        const variants = readVariantsFromMdx(FIXTURE);
        expect(variants.length).toBe(1);
        expect(variants[0].name).toBe('default');
        expect(variants[0].label).toBe('Défaut');
        expect(variants[0].html).toMatch(/<ar-sample>Contenu<\/ar-sample>/);
    });

    it("retourne un tableau vide si le fichier n'existe pas", () => {
        const variants = readVariantsFromMdx(path.join(__dirname, '__fixtures__', 'absent.mdx'));
        expect(variants).toEqual([]);
    });
});
```

- [ ] **Step 4: Lancer le test, vérifier l'échec, puis implémenter**

```js
// scripts/starter-kit/read-mdx-variants.js
import { readFileSync, existsSync } from 'node:fs';
import matter from 'gray-matter';

/**
 * Extrait le tableau `variants` du frontmatter d'un fichier `.mdx` de la doc
 * (`apps/docs/src/content/components/ar-*.mdx`). Réutilisé tel quel — zéro
 * duplication de contenu de démo. Retourne [] si le fichier n'existe pas ou
 * n'a pas de `variants` déclarés.
 */
export function readVariantsFromMdx(mdxPath) {
    if (!existsSync(mdxPath)) return [];
    const raw = readFileSync(mdxPath, 'utf8');
    const { data } = matter(raw);
    return data.variants ?? [];
}
```

- [ ] **Step 5: Lancer le test, vérifier le succès**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run scripts/starter-kit/read-mdx-variants.test.js
```

Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add package.json package-lock.json scripts/starter-kit/read-mdx-variants.js scripts/starter-kit/read-mdx-variants.test.js scripts/starter-kit/__fixtures__/sample-component.mdx
git commit -m "feat(starter-kit): lecture des variants depuis le frontmatter MDX"
```

---

## Task 4: Construction de la page HTML Kitchen Sink

**Files:**

- Create: `scripts/starter-kit/build-kitchen-sink-html.js`
- Test: `scripts/starter-kit/build-kitchen-sink-html.test.js`

**Interfaces:**

- Produces: `buildKitchenSinkHtml(components: Array<{ tagName, summary, variants }>) => { html: string, warnings: string[] }`.

- [ ] **Step 1: Écrire le test (doit échouer)**

```js
// scripts/starter-kit/build-kitchen-sink-html.test.js
import { describe, expect, it } from 'vitest';
import { buildKitchenSinkHtml } from './build-kitchen-sink-html.js';

describe('buildKitchenSinkHtml', () => {
    it('rend le tagName, le summary et le html brut du variant', () => {
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
        expect(html).toMatch(/<h2>ar-alert<\/h2>/);
        expect(html).toMatch(/Affiche un message important\./);
        expect(html).toMatch(/<ar-alert>Texte<\/ar-alert>/);
        expect(warnings).toEqual([]);
    });

    it('échappe le texte (summary/label/description) mais pas le html du variant', () => {
        const { html } = buildKitchenSinkHtml([
            {
                tagName: 'ar-sample',
                summary: 'Résumé avec <balise> non voulue',
                variants: [
                    {
                        name: 'x',
                        label: 'Label',
                        description: 'desc',
                        html: '<ar-sample></ar-sample>',
                    },
                ],
            },
        ]);
        expect(html).toMatch(/Résumé avec &lt;balise&gt; non voulue/);
        expect(html).toMatch(/<ar-sample><\/ar-sample>/);
    });

    it('composant sans variant : avertissement + mention "démo à compléter"', () => {
        const { html, warnings } = buildKitchenSinkHtml([
            { tagName: 'ar-nouveau', summary: 'Un nouveau composant.', variants: [] },
        ]);
        expect(warnings.length).toBe(1);
        expect(warnings[0]).toMatch(/ar-nouveau/);
        expect(html).toMatch(/démo à compléter/i);
    });

    it('inclut la barre de nav sobre et le lien CDN autoloader', () => {
        const { html } = buildKitchenSinkHtml([]);
        expect(html).toMatch(/cdn\/autoloader\.prod\.js/);
        expect(html).toMatch(/ariane-starter\.css/);
        expect(html).toMatch(/class="ks-nav"/);
    });
});
```

- [ ] **Step 2: Implémenter**

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
 * chaque variant documenté (frontmatter MDX) rendu avec son HTML brut.
 * Ossature nav + contenu inspirée visuellement de la doc Astro, recodée en
 * HTML/CSS indépendant — pas de TOC, palette sobre distincte de l'identité
 * Ariane.
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

- [ ] **Step 3: Lancer le test, vérifier le succès**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run scripts/starter-kit/build-kitchen-sink-html.test.js
```

Expected: PASS (4 tests).

- [ ] **Step 4: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add scripts/starter-kit/build-kitchen-sink-html.js scripts/starter-kit/build-kitchen-sink-html.test.js
git commit -m "feat(starter-kit): génération de la page HTML Kitchen Sink"
```

---

## Task 5: Dérivation de la palette neutre

**Files:**

- Create: `scripts/starter-kit/derive-neutral-palette.js`
- Test: `scripts/starter-kit/derive-neutral-palette.test.js`

**Interfaces:**

- Produces: `deriveNeutralPalette(paletteCssText: string) => string`.

- [ ] **Step 1: Écrire le test (doit échouer)**

```js
// scripts/starter-kit/derive-neutral-palette.test.js
import { describe, expect, it } from 'vitest';
import { deriveNeutralPalette } from './derive-neutral-palette.js';

const SAMPLE = `:root {
    --ar-color-primary-05: oklch(16.5% 0.035 70);
    --ar-color-primary-40: oklch(52.43% 0.1108 74.71);
    --ar-color-primary-95: oklch(96.5% 0.038 87);

    --ar-color-vault: oklch(23.54% 0.0334 273.44);
    --ar-color-vault-deep: oklch(18.99% 0.0249 273.04);

    --ar-color-neutral-05: oklch(15.79% 0.002 90);
    --ar-color-green-05: oklch(17.74% 0.037 165.47);
}`;

describe('deriveNeutralPalette', () => {
    it('préserve la luminosité (L) de chaque palier primary, change teinte/chroma', () => {
        const result = deriveNeutralPalette(SAMPLE);
        expect(result).toMatch(/--ar-color-primary-05: oklch\(16\.5% 0\.02 250\);/);
        expect(result).toMatch(/--ar-color-primary-40: oklch\(52\.43% 0\.04 250\);/);
        expect(result).toMatch(/--ar-color-primary-95: oklch\(96\.5% 0\.015 250\);/);
    });

    it('alias vault/vault-deep vers la rampe neutre existante', () => {
        const result = deriveNeutralPalette(SAMPLE);
        expect(result).toMatch(/--ar-color-vault: var\(--ar-color-neutral-10\);/);
        expect(result).toMatch(/--ar-color-vault-deep: var\(--ar-color-neutral-05\);/);
    });

    it('laisse les autres hues (neutral, green, ...) inchangées', () => {
        const result = deriveNeutralPalette(SAMPLE);
        expect(result).toMatch(/--ar-color-neutral-05: oklch\(15\.79% 0\.002 90\);/);
        expect(result).toMatch(/--ar-color-green-05: oklch\(17\.74% 0\.037 165\.47\);/);
    });
});
```

- [ ] **Step 2: Implémenter**

```js
// scripts/starter-kit/derive-neutral-palette.js

// Chroma par palier — même structure de progression que la palette primaire
// d'origine, mais fortement réduite pour un rendu sobre. Hue 250 = slate-blue
// neutre, indépendant de la teinte ambre d'identité.
const PRIMARY_CHROMA = {
    '05': '0.02',
    10: '0.025',
    20: '0.03',
    30: '0.035',
    40: '0.04',
    50: '0.045',
    60: '0.05',
    70: '0.045',
    80: '0.035',
    90: '0.025',
    95: '0.015',
};
const NEUTRAL_HUE = 250;

/**
 * Neutralise la palette primaire (identité ambre) d'un fragment `_palette.css`
 * en un slate-blue sobre, pour le thème starter-kit. La luminosité (L) de
 * chaque palier est préservée telle quelle depuis la source — donc les
 * ratios de contraste calculés pour `ariane.css` restent valides ici ; seuls
 * la teinte et le chroma changent. `--ar-color-vault`/`-vault-deep`
 * deviennent des alias vers la rampe neutre déjà présente dans le fichier
 * (identité "Voûte" non pertinente pour un starter neutre). Tout le reste
 * (Neutral/Green/Yellow/Red/Blue/White — hues sémantiques universelles, pas
 * une identité de marque) passe inchangé.
 */
export function deriveNeutralPalette(paletteCssText) {
    let out = paletteCssText.replace(
        /--ar-color-primary-(\d{2}):\s*oklch\(([\d.]+%)\s+[\d.]+\s+[\d.]+\);/g,
        (match, step, lightness) => {
            const chroma = PRIMARY_CHROMA[step];
            if (!chroma) return match;
            return `--ar-color-primary-${step}: oklch(${lightness} ${chroma} ${NEUTRAL_HUE});`;
        },
    );
    out = out.replace(
        /--ar-color-vault:\s*oklch\([^)]*\);/,
        '--ar-color-vault: var(--ar-color-neutral-10);',
    );
    out = out.replace(
        /--ar-color-vault-deep:\s*oklch\([^)]*\);/,
        '--ar-color-vault-deep: var(--ar-color-neutral-05);',
    );
    return out;
}
```

- [ ] **Step 3: Lancer le test, vérifier le succès**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run scripts/starter-kit/derive-neutral-palette.test.js
```

Expected: PASS (3 tests).

- [ ] **Step 4: Vérifier contre le vrai fichier**

```bash
cd /Users/jon/Code/Active_projects/ariane
node -e "
const { deriveNeutralPalette } = require('./scripts/starter-kit/derive-neutral-palette.js');
" 2>&1 || node --input-type=module -e "
import { readFileSync } from 'node:fs';
import { deriveNeutralPalette } from './scripts/starter-kit/derive-neutral-palette.js';
const src = readFileSync('packages/core/src/styles/themes/ariane/_palette.css', 'utf8');
const out = deriveNeutralPalette(src);
console.log(out.match(/--ar-color-primary-\d\d: oklch\([^)]*\);/g).join('\n'));
console.log(out.match(/--ar-color-vault(-deep)?: [^;]+;/g).join('\n'));
"
```

Expected : 11 lignes `--ar-color-primary-XX: oklch(<L identique à la source> <chroma neutre> 250);`, et les deux alias vault.

- [ ] **Step 5: Commit**

```bash
git add scripts/starter-kit/derive-neutral-palette.js scripts/starter-kit/derive-neutral-palette.test.js
git commit -m "feat(starter-kit): dérivation de la palette neutre (luminosité préservée)"
```

---

## Task 6: Dérivation des radius neutres

**Files:**

- Create: `scripts/starter-kit/derive-neutral-global-tokens.js`
- Test: `scripts/starter-kit/derive-neutral-global-tokens.test.js`

**Interfaces:**

- Produces: `deriveNeutralGlobalTokens(globalTokensCssText: string) => string`.

- [ ] **Step 1: Écrire le test (doit échouer)**

```js
// scripts/starter-kit/derive-neutral-global-tokens.test.js
import { describe, expect, it } from 'vitest';
import { deriveNeutralGlobalTokens } from './derive-neutral-global-tokens.js';

const SAMPLE = `:root {
    --ar-font-size-md: 1rem;
    --ar-border-radius-sm: 0.25rem; /* 4px, inchangé */
    --ar-border-radius-md: 0.5rem; /* 8px (était 6px) */
    --ar-border-radius-lg: 0.875rem; /* 14px (était 8px) */
    --ar-border-radius-xl: 1.5rem; /* 24px (était 12px) */
    --ar-border-radius-full: 9999px;
    --ar-button-height: 2.5rem;
}`;

describe('deriveNeutralGlobalTokens', () => {
    it('remplace uniquement sm/md/lg/xl par une échelle plus discrète', () => {
        const result = deriveNeutralGlobalTokens(SAMPLE);
        expect(result).toMatch(/--ar-border-radius-sm: 0\.25rem;/);
        expect(result).toMatch(/--ar-border-radius-md: 0\.375rem;/);
        expect(result).toMatch(/--ar-border-radius-lg: 0\.5rem;/);
        expect(result).toMatch(/--ar-border-radius-xl: 0\.75rem;/);
    });

    it('laisse -full et les autres tokens inchangés', () => {
        const result = deriveNeutralGlobalTokens(SAMPLE);
        expect(result).toMatch(/--ar-border-radius-full: 9999px;/);
        expect(result).toMatch(/--ar-font-size-md: 1rem;/);
        expect(result).toMatch(/--ar-button-height: 2\.5rem;/);
    });
});
```

- [ ] **Step 2: Implémenter**

```js
// scripts/starter-kit/derive-neutral-global-tokens.js

// Échelle plus discrète que celle d'Ariane (identité "#110") — valeurs
// courantes (proches des défauts Tailwind/shadcn), pas dérivées de la
// source : c'est un choix de design du starter, pas une préservation de
// contrainte de contraste (contrairement à la palette de couleurs).
const NEUTRAL_RADIUS = {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
};

/**
 * Neutralise l'échelle de radius (identité "#110") d'un fragment
 * `_global-tokens.css` — remplace uniquement --ar-border-radius-{sm,md,lg,xl}
 * (`-full` reste inchangé, déjà générique). Tout le reste du fichier
 * (typographie, espacement, tokens génériques mutualisés bouton/input/panel)
 * passe inchangé — ce ne sont pas des choix d'identité visuelle.
 */
export function deriveNeutralGlobalTokens(globalTokensCssText) {
    return globalTokensCssText.replace(
        /--ar-border-radius-(sm|md|lg|xl):\s*[^;]+;(?:\s*\/\*[^*]*\*\/)?/g,
        (match, size) => `--ar-border-radius-${size}: ${NEUTRAL_RADIUS[size]};`,
    );
}
```

- [ ] **Step 3: Lancer le test, vérifier le succès**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run scripts/starter-kit/derive-neutral-global-tokens.test.js
```

Expected: PASS (2 tests).

- [ ] **Step 4: Commit**

```bash
git add scripts/starter-kit/derive-neutral-global-tokens.js scripts/starter-kit/derive-neutral-global-tokens.test.js
git commit -m "feat(starter-kit): dérivation de l'échelle de radius neutre"
```

---

## Task 7: Synchronisation du thème (copie de l'arbre + neutralisation ciblée)

**Files:**

- Create: `scripts/starter-kit/sync-starter-theme.js`
- Test: `scripts/starter-kit/sync-starter-theme.test.js`

**Interfaces:**

- Consumes: `deriveNeutralPalette` (Task 5), `deriveNeutralGlobalTokens` (Task 6).
- Produces: `syncStarterTheme({ srcThemesDir: string, repoPath: string }) => void` — copie `srcThemesDir/ariane.css` → `repoPath/ariane-starter.css` (réécrit les chemins `@import` de `./ariane/` vers `./ariane-starter/`) et `srcThemesDir/ariane/` → `repoPath/ariane-starter/` (récursif, verbatim sauf `_palette.css` et `_global-tokens.css`).

- [ ] **Step 1: Écrire le test (doit échouer)**

```js
// scripts/starter-kit/sync-starter-theme.test.js
import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { syncStarterTheme } from './sync-starter-theme.js';

describe('syncStarterTheme', () => {
    it("copie l'arbre, neutralise palette/radius, réécrit les imports", () => {
        const root = mkdtempSync(path.join(tmpdir(), 'sync-starter-theme-'));
        try {
            const srcThemesDir = path.join(root, 'themes');
            const repoPath = path.join(root, 'repo');
            mkdirSync(path.join(srcThemesDir, 'ariane', 'components'), { recursive: true });
            mkdirSync(repoPath, { recursive: true });

            writeFileSync(
                path.join(srcThemesDir, 'ariane.css'),
                `@import url('./ariane/_palette.css') layer(ariane.theme);\n` +
                    `@import url('./ariane/components/_alert.css') layer(ariane.theme);\n`,
            );
            writeFileSync(
                path.join(srcThemesDir, 'ariane', '_palette.css'),
                `:root {\n    --ar-color-primary-40: oklch(52.43% 0.1108 74.71);\n}`,
            );
            writeFileSync(
                path.join(srcThemesDir, 'ariane', '_global-tokens.css'),
                `:root {\n    --ar-border-radius-md: 0.5rem;\n}`,
            );
            writeFileSync(
                path.join(srcThemesDir, 'ariane', 'components', '_alert.css'),
                `ar-alert { color: red; }`,
            );

            syncStarterTheme({ srcThemesDir, repoPath });

            const entry = readFileSync(path.join(repoPath, 'ariane-starter.css'), 'utf8');
            expect(entry).toMatch(/@import url\('\.\/ariane-starter\/_palette\.css'\)/);
            expect(entry).not.toMatch(/\.\/ariane\//);

            const palette = readFileSync(
                path.join(repoPath, 'ariane-starter', '_palette.css'),
                'utf8',
            );
            expect(palette).toMatch(/--ar-color-primary-40: oklch\(52\.43% 0\.04 250\);/);

            const globalTokens = readFileSync(
                path.join(repoPath, 'ariane-starter', '_global-tokens.css'),
                'utf8',
            );
            expect(globalTokens).toMatch(/--ar-border-radius-md: 0\.375rem;/);

            const alert = readFileSync(
                path.join(repoPath, 'ariane-starter', 'components', '_alert.css'),
                'utf8',
            );
            expect(alert).toBe('ar-alert { color: red; }');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });
});
```

- [ ] **Step 2: Implémenter**

```js
// scripts/starter-kit/sync-starter-theme.js
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { deriveNeutralPalette } from './derive-neutral-palette.js';
import { deriveNeutralGlobalTokens } from './derive-neutral-global-tokens.js';

function copyTree(srcDir, destDir, transform) {
    mkdirSync(destDir, { recursive: true });
    for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);
        if (entry.isDirectory()) {
            copyTree(srcPath, destPath, transform);
        } else {
            writeFileSync(destPath, transform(entry.name, readFileSync(srcPath, 'utf8')));
        }
    }
}

/**
 * Synchronise le thème starter-kit depuis le thème réel d'Ariane (#256) :
 * copie `ariane.css` + l'arbre de fragments `ariane/` dans le repo externe,
 * en neutralisant uniquement `_palette.css` (identité couleur) et
 * `_global-tokens.css` (échelle de radius) — tout le reste (tokens
 * sémantiques, tokens partagés, tokens+règles par composant) est copié
 * verbatim : ces fragments référencent déjà les primitives via `var()`,
 * donc héritent automatiquement du rendu neutre.
 */
export function syncStarterTheme({ srcThemesDir, repoPath }) {
    const entrySrc = path.join(srcThemesDir, 'ariane.css');
    const fragmentsSrc = path.join(srcThemesDir, 'ariane');
    const entryDest = path.join(repoPath, 'ariane-starter.css');
    const fragmentsDest = path.join(repoPath, 'ariane-starter');

    const entryContent = readFileSync(entrySrc, 'utf8').replaceAll(
        './ariane/',
        './ariane-starter/',
    );
    writeFileSync(entryDest, entryContent);

    copyTree(fragmentsSrc, fragmentsDest, (filename, content) => {
        if (filename === '_palette.css') return deriveNeutralPalette(content);
        if (filename === '_global-tokens.css') return deriveNeutralGlobalTokens(content);
        return content;
    });
}
```

- [ ] **Step 3: Lancer le test, vérifier le succès**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run scripts/starter-kit/sync-starter-theme.test.js
```

Expected: PASS (1 test).

- [ ] **Step 4: Vérifier contre le vrai arbre de thème (dry-run local)**

```bash
cd /Users/jon/Code/Active_projects/ariane
node --input-type=module -e "
import { syncStarterTheme } from './scripts/starter-kit/sync-starter-theme.js';
syncStarterTheme({
    srcThemesDir: 'packages/core/src/styles/themes',
    repoPath: '/tmp/ariane-starter-theme-check',
});
console.log('OK');
"
ls /tmp/ariane-starter-theme-check/ariane-starter/components | wc -l
grep -c "oklch(.* 250)" /tmp/ariane-starter-theme-check/ariane-starter/_palette.css
rm -rf /tmp/ariane-starter-theme-check
```

Expected : `OK`, 14 fichiers composants, 11 lignes primary avec hue 250.

- [ ] **Step 5: Commit**

```bash
git add scripts/starter-kit/sync-starter-theme.js scripts/starter-kit/sync-starter-theme.test.js
git commit -m "feat(starter-kit): synchronisation du thème starter (copie + neutralisation ciblée)"
```

---

## Task 8: CLI orchestrateur (`generate-starter-demo.js`)

**Files:**

- Create: `scripts/starter-kit/generate-starter-demo.js`
- Test: `scripts/starter-kit/generate-starter-demo.test.js`
- Modify: `package.json` (racine, bloc `"scripts"`) — ajout de `"generate:starter-demo"`
- Modify: `.gitignore` — ajout de `dist-starter-demo/`
- Modify: `.github/workflows/ci-core.yml` — smoke test dry-run

**Interfaces:**

- Consumes: `readManifestComponents`, `readVariantsFromMdx`, `buildKitchenSinkHtml`, `syncStarterTheme`.
- Produces: `generate({ manifestPath, mdxDir, srcThemesDir, dryRun, outDir, repoPath, coreVersion }) => { html: string, warnings: string[], committed: boolean }`.

- [ ] **Step 1: Écrire le test (doit échouer) — mode dry-run uniquement**

Le mode `--repo` (git add/commit) est vérifié manuellement en Task 9 (opération avec effets de bord sur un vrai repo git).

```js
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
```

Note : ce test utilise le VRAI `packages/core/src/styles/themes/` (pas un fixture) pour `syncStarterTheme`, car son contenu est stable et déjà vérifié en Task 7 — évite de dupliquer un fixture de thème complet.

- [ ] **Step 2: Implémenter**

```js
// scripts/starter-kit/generate-starter-demo.js
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readManifestComponents } from './read-manifest-components.js';
import { readVariantsFromMdx } from './read-mdx-variants.js';
import { buildKitchenSinkHtml } from './build-kitchen-sink-html.js';
import { syncStarterTheme } from './sync-starter-theme.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

/**
 * Assemble et écrit la démo Kitchen Sink + le thème starter dérivé.
 *
 * - dryRun: true  → écrit dans `outDir` (répertoire scratch local), aucune
 *   opération git. Utilisé par le smoke test CI et pour prévisualiser en
 *   local avant de pousser vers le vrai repo externe.
 * - dryRun: false → écrit dans `repoPath` (checkout du repo externe
 *   `ariane-starter-kit`) et y fait `git add` + `git commit`. Ne pousse
 *   jamais — le `git push` reste un geste volontaire du dev.
 */
export function generate({
    manifestPath,
    mdxDir,
    srcThemesDir,
    dryRun,
    outDir,
    repoPath,
    coreVersion,
}) {
    const components = readManifestComponents(manifestPath).map((c) => ({
        ...c,
        variants: readVariantsFromMdx(path.join(mdxDir, `${c.tagName}.mdx`)),
    }));

    const { html, warnings } = buildKitchenSinkHtml(components);
    for (const warning of warnings) {
        console.warn(`[generate-starter-demo] ${warning}`);
    }

    const target = dryRun ? outDir : repoPath;

    if (!dryRun && !existsSync(path.join(repoPath, '.git'))) {
        throw new Error(
            `${repoPath} n'est pas un dépôt git — clone jogo-labs/ariane-starter-kit en checkout frère avant de relancer.`,
        );
    }

    mkdirSync(target, { recursive: true });
    writeFileSync(path.join(target, 'index.html'), html);
    syncStarterTheme({ srcThemesDir, repoPath: target });

    if (dryRun) {
        console.log(`Démo + thème générés (dry-run) dans ${target}/`);
        return { html, warnings, committed: false };
    }

    execFileSync('git', ['add', 'index.html', 'ariane-starter.css', 'ariane-starter'], {
        cwd: repoPath,
    });
    try {
        execFileSync(
            'git',
            ['commit', '-m', `chore: régénère la démo et le thème (ariane v${coreVersion})`],
            { cwd: repoPath, stdio: 'pipe' },
        );
        console.log(`Commit créé dans ${repoPath} — pense à \`git push\` après relecture.`);
        return { html, warnings, committed: true };
    } catch {
        console.log('Rien à mettre à jour — la démo et le thème étaient déjà à jour.');
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
        srcThemesDir: path.join(ROOT, 'packages/core/src/styles/themes'),
        dryRun,
        outDir: path.join(ROOT, 'dist-starter-demo'),
        repoPath: path.resolve(process.cwd(), repo),
        coreVersion,
    });
}
```

- [ ] **Step 3: Lancer le test, vérifier le succès**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx vitest run scripts/starter-kit/generate-starter-demo.test.js
```

Expected: PASS (1 test).

- [ ] **Step 4: Ajouter le script npm, `.gitignore`, et vérifier manuellement**

Dans `package.json` (racine), bloc `"scripts"`, ajouter après `"create"` :

```json
"generate:starter-demo": "node scripts/starter-kit/generate-starter-demo.js"
```

Dans `.gitignore`, ajouter :

```
dist-starter-demo/
```

Vérifier contre le vrai manifest :

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run build --workspace=packages/core
npm run generate:starter-demo -- --dry-run
grep -c "<section class=\"ks-component\"" dist-starter-demo/index.html
ls dist-starter-demo/ariane-starter/components | wc -l
```

Expected : le compte de sections correspond au nombre de composants publiés (19 au moment d'écrire ce plan) ; 14 fichiers composants dans `ariane-starter/components/` ; des avertissements "démo à compléter" apparaissent sur stdout pour les composants sans `variants` documentés (à vérifier au cas par cas).

- [ ] **Step 5: Smoke test CI**

Dans `.github/workflows/ci-core.yml`, job `ci`, insérer entre les steps `Build` et `Test` :

```yaml
- name: Smoke test — générateur starter-kit demo
  run: node scripts/starter-kit/generate-starter-demo.js --dry-run
```

- [ ] **Step 6: Commit**

```bash
git add scripts/starter-kit/generate-starter-demo.js scripts/starter-kit/generate-starter-demo.test.js package.json .gitignore .github/workflows/ci-core.yml
git commit -m "feat(starter-kit): CLI generate-starter-demo (démo + thème, dry-run + mode repo)"
```

---

## Task 9: Suite de tests complète

**Files:** aucun — task de vérification uniquement.

- [ ] **Step 1: Lancer toute la suite de tests core**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test --workspace=packages/core
```

Expected: tous les tests passent, y compris les 6 nouveaux fichiers `scripts/starter-kit/*.test.js`.

---

## Task 10: Bootstrap du repo externe `jogo-labs/ariane-starter-kit`

⚠️ **Cette task crée un repo GitHub public et active GitHub Pages — actions visibles de l'extérieur, difficiles à défaire proprement. Confirmer explicitement avec l'utilisateur avant d'exécuter le Step 1.**

**Files (dans le nouveau repo, hors du repo `ariane`) :**

- Create: `README.md` (seul fichier écrit à la main — `ariane-starter.css`/`ariane-starter/`/`index.html` sont générés en Task 11)

- [ ] **Step 1: Créer le repo (après confirmation explicite)**

Se positionner dans le répertoire **parent** de `ariane` avant de lancer la commande — `--clone` clone dans le répertoire courant, et on veut un checkout frère :

```bash
cd /Users/jon/Code/Active_projects
gh repo create jogo-labs/ariane-starter-kit --public \
  --description "Thème CSS neutre + démo Kitchen Sink pour démarrer avec Ariane" \
  --clone
```

Résultat attendu : `~/Code/Active_projects/ariane-starter-kit/` créé, checkout frère de `~/Code/Active_projects/ariane/`.

- [ ] **Step 2: Activer le flag "Template repository"**

```bash
gh api -X PATCH repos/jogo-labs/ariane-starter-kit -f is_template=true
```

- [ ] **Step 3: Écrire le README**

```markdown
# ariane-starter-kit

Point de départ pour styliser [Ariane](https://github.com/jogo-labs/ariane) : un thème CSS neutre (`ariane-starter.css` + `ariane-starter/`) à copier/forker, et une démo statique de tous les composants avec ce thème.

## Démo

👉 [Voir la Kitchen Sink](https://jogo-labs.github.io/ariane-starter-kit/)

## Utilisation

Copiez `ariane-starter.css` et le dossier `ariane-starter/` dans votre projet et adaptez les fragments à votre identité visuelle :

\`\`\`html
<script type="module" src="https://unpkg.com/@ariane-ui/core/cdn/autoloader.prod.js"></script>
<link rel="stylesheet" href="./ariane-starter.css" />
\`\`\`

`ariane-starter.css` est une liste d'imports vers `ariane-starter/` (palette, tokens sémantiques, tokens globaux, tokens partagés, un fragment par composant) — supprimez ou remplacez un fragment que vous ne gardez pas, ou ajoutez le vôtre en l'important à votre tour.

## Régénérer

`index.html`, `ariane-starter.css` et `ariane-starter/` sont générés depuis le monorepo [`ariane`](https://github.com/jogo-labs/ariane) — ne pas les éditer à la main ici. Voir `docs/superpowers/specs/2026-09-23-starter-kit-demo-230-design.md` dans ce repo-là pour le flux complet.
```

- [ ] **Step 4: Activer GitHub Pages**

```bash
gh api -X POST repos/jogo-labs/ariane-starter-kit/pages \
  -f "source[branch]=main" -f "source[path]=/"
```

- [ ] **Step 5: Commit et push le README**

```bash
cd /Users/jon/Code/Active_projects/ariane-starter-kit
git add README.md
git commit -m "chore: README"
git push
```

---

## Task 11: Générer et publier la démo et le thème réels

**Files:** aucun fichier modifié dans `ariane` — cette task exécute l'outillage des tasks précédentes contre le vrai repo externe.

- [ ] **Step 1: Rebuild du manifest à jour**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run build --workspace=packages/core
```

- [ ] **Step 2: Générer et committer dans le checkout frère**

```bash
npm run generate:starter-demo -- --repo ../ariane-starter-kit
```

Expected: message `Commit créé dans .../ariane-starter-kit — pense à \`git push\` après relecture.` ; avertissements listés pour tout composant sans variant documenté.

- [ ] **Step 3: Relire le diff avant de pousser**

```bash
cd /Users/jon/Code/Active_projects/ariane-starter-kit
git show HEAD --stat
git show HEAD -- ariane-starter/_palette.css
git show HEAD -- index.html | head -100
```

Vérifier : 19 fragments présents sous `ariane-starter/`, palette neutre (hue 250) dans `_palette.css`, présence des 19 composants dans `index.html`, pas de contenu HTML cassé.

- [ ] **Step 4: Pousser (geste volontaire, après relecture)**

```bash
git push
```

- [ ] **Step 5: Vérifier le déploiement Pages**

```bash
sleep 60
curl -sI https://jogo-labs.github.io/ariane-starter-kit/ | head -5
```

Expected: `HTTP/2 200`. Ouvrir l'URL dans un navigateur pour vérifier visuellement le rendu (nav sobre, composants stylés en slate-blue neutre, pas d'erreur console).

- [ ] **Step 6: Mettre à jour l'issue #230**

```bash
cd /Users/jon/Code/Active_projects/ariane
gh issue comment 230 --body "Points 3 & 4 livrés : https://github.com/jogo-labs/ariane-starter-kit (thème starter dérivé + démo Kitchen Sink déployée sur https://jogo-labs.github.io/ariane-starter-kit/)."
```

---

## Task 12: Pull Request

**Files:** aucun.

- [ ] **Step 1: Vérifier que toute la suite de tests passe**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test --workspace=packages/core
```

Expected: tous les tests passent.

- [ ] **Step 2: Pousser la branche et ouvrir la PR**

```bash
git push -u origin feat/starter-kit-demo-230
gh pr create --base dev --title "feat(core): starter-kit + démo Kitchen Sink (#230, points 3 & 4)" --body "$(cat <<'EOF'
Implémente les points 3 et 4 de #230 : thème CSS neutre **dérivé** de `ariane.css` (post-#256) + démo statique "Kitchen Sink" déployée sur GitHub Pages, dans un nouveau repo externe [jogo-labs/ariane-starter-kit](https://github.com/jogo-labs/ariane-starter-kit).

- Script générateur (`scripts/starter-kit/`) réutilisant le manifest CEM, les variants déjà écrits dans les `.mdx` de la doc, et l'arbre de fragments réel du thème (#256) — copié verbatim sauf palette (teinte/chroma neutralisés, luminosité préservée) et échelle de radius.
- Flux de mise à jour manuel mais outillé (`npm run generate:starter-demo -- --repo <checkout>`), documenté dans la checklist de release (`CLAUDE.md`).
- Smoke test CI (dry-run) contre toute régression du générateur.

Spec : `docs/superpowers/specs/2026-09-23-starter-kit-demo-230-design.md`

Démo : https://jogo-labs.github.io/ariane-starter-kit/

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01DBWvASBNGXKCie9vdzdJYf
EOF
)"
```

- [ ] **Step 3: Ajouter la ligne à la checklist de release**

Dans `CLAUDE.md`, section `## Git Workflow`, après la ligne `- Tag npm : ...`, ajouter :

```markdown
- Si un composant a changé depuis la dernière release : régénérer la démo et le thème starter-kit (`npm run generate:starter-demo -- --repo <checkout ariane-starter-kit>`) et pousser dans ce repo après relecture du diff. Checkout frère attendu à côté de `ariane` en local.
```

Commit séparé :

```bash
git add CLAUDE.md
git commit -m "docs: checklist release — régénération de la démo et du thème starter-kit"
git push
```

- [ ] **Step 4: Attendre la CI verte, merger uniquement sur confirmation explicite de l'utilisateur**

Ne pas merger sans confirmation — règle permanente du projet.
