# Export CSSStyleSheet du thème + doc shadow DOM applicatif — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à un consommateur qui encapsule sa propre page dans un shadow DOM applicatif de
charger le thème Ariane dans ce shadow root — via un nouvel export `CSSStyleSheet` prêt à l'emploi
(`@ariane-ui/core/themes/default.js`) en plus du `.css` classique — et documenter les deux méthodes.

**Architecture:** `packages/core/scripts/build-css.js` génère, en plus du `.css` minifié déjà
produit, un module `.js` jumeau par fichier de thème, contenant uniquement la partie `::part()` du
thème (la partie tokens `:root` est exclue — elle ne matche rien dans un shadow root adopté). Le
split repose sur une ancre de commentaire dédiée déjà présente dans `default.css`. L'export npm est
étendu en miroir de l'entrée `.css` existante. Une nouvelle page de doc explique le pourquoi et les
deux méthodes de chargement.

**Tech Stack:** esbuild (déjà en place, `esbuild.transform` pour la minification en mémoire), Node
`fs`/`path`, Astro pour la doc.

## Global Constraints

- Issue : [#170](https://github.com/jogo-labs/ariane/issues/170). Spec :
  `docs/superpowers/specs/2026-08-11-shadow-dom-theme-export-design.md`.
- Nom de l'export : `defaultTheme` (dérivé du nom de fichier `default.css` → `defaultTheme`, pattern
  généralisable : kebab-case → camelCase + suffixe `Theme`).
- Chemin d'export npm : `@ariane-ui/core/themes/default.js` (mirroir de
  `@ariane-ui/core/themes/default.css`).
- L'ancre de split `build-split-anchor: components` existe déjà dans
  `packages/core/src/styles/themes/default.css` (ajoutée pendant le brainstorming) — ne pas la
  dupliquer, ne pas la renommer.
- `default.js` ne contient QUE la partie après l'ancre (règles `::part()`) — jamais les tokens
  (`:root`). Si l'ancre est introuvable dans un fichier thème source, le build doit échouer
  explicitement (message clair, exit code non nul), pas silencieusement produire un fichier vide ou
  incorrect.
- Pas de nouvelle dépendance — réutiliser esbuild déjà présent dans `packages/core`.
- Pas de fallback runtime pour les navigateurs sans `adoptedStyleSheets` — documenter la limite
  (Safari 16.4+), pas la compenser par du code.
- Prettier : 100 caractères, 4 espaces, quotes simples (CLAUDE.md).
- Conventional Commits (commitlint, header ≤ 100 caractères).
- Branches : `feat/<desc>` depuis `dev`. PR vers `dev`, jamais push direct sur `main`.

---

### Task 1: Créer la branche de travail

**Files:**

- Aucun fichier modifié — opération git uniquement.

**Interfaces:**

- Consumes: rien.
- Produces: branche `feat/170-theme-shadow-dom-export`, utilisée par toutes les tasks suivantes.

- [ ] **Step 1: Vérifier que `dev` est à jour et propre**

```bash
git -C /Users/jon/Code/Active_projects/ariane status --short
git -C /Users/jon/Code/Active_projects/ariane checkout dev
git -C /Users/jon/Code/Active_projects/ariane pull origin dev
```

Expected: `git status --short` ne montre rien avant de checkout ; après `pull`, `dev` local est à
jour avec `origin/dev`.

- [ ] **Step 2: Créer la branche**

```bash
git -C /Users/jon/Code/Active_projects/ariane checkout -b feat/170-theme-shadow-dom-export
```

Expected: bascule sur la nouvelle branche, confirmé par `git branch --show-current`.

---

### Task 2: `build-css.js` — générer le module JS jumeau du thème

**Files:**

- Modify: `packages/core/scripts/build-css.js`
- (Lecture seule, pour vérification) : `packages/core/src/styles/themes/default.css`

**Interfaces:**

- Consumes: l'ancre `build-split-anchor: components` déjà présente dans
  `packages/core/src/styles/themes/default.css` (ligne ~666, juste avant le commentaire-bannière
  `THÈME COMPOSANTS`).
- Produces: `packages/core/dist/styles/themes/default.js`, contenu :

    ```js
    export const defaultTheme = new CSSStyleSheet();
    defaultTheme.replaceSync('...CSS minifié, uniquement les règles ::part()...');
    ```

    Ce fichier est consommé par Task 3 (résolution du chemin npm) et référencé par Task 4 (doc).

- [ ] **Step 1: Lire le fichier actuel pour confirmer son état avant modification**

```bash
cat /Users/jon/Code/Active_projects/ariane/packages/core/scripts/build-css.js
```

Expected: contenu identique à celui déjà connu (fonction `findCssFiles`, `esbuild.context` avec
`entryPoints`, branches `WATCH`/non-`WATCH`) — sert de point de départ, pas de vérification
automatisée possible ici (script de build, pas de suite de tests dédiée dans ce repo).

- [ ] **Step 2: Réécrire `build-css.js`**

Remplacer tout le contenu du fichier par :

```js
#!/usr/bin/env node
/**
 * build-css.js
 *
 * Traite les fichiers CSS globaux (thèmes, utilities) :
 * - Minifie via esbuild
 * - Copie vers dist/styles/ avec les fichiers originaux non-minifiés
 * - Pour les fichiers sous src/styles/themes/, génère en plus un module JS
 *   jumeau (<nom>.js) exportant un CSSStyleSheet déjà peuplé avec la partie
 *   "composants" du thème (règles ::part()), pour adoption via
 *   shadowRoot.adoptedStyleSheets dans un shadow DOM applicatif (#170).
 *   La partie tokens (:root) est volontairement exclue : :root ne matche
 *   rien dans un shadow root adopté (il désigne toujours l'élément racine du
 *   document), l'inclure serait du poids mort. Les tokens traversent déjà la
 *   frontière shadow DOM par héritage CSS, sans action requise.
 *
 * Les styles des composants (button.styles.ts) ne passent PAS ici :
 * ils sont du TypeScript traité par build-bundles.js.
 */

import esbuild from 'esbuild';
import { readdirSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname, relative, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CSS_SRC = join(ROOT, 'src', 'styles');
const CSS_OUT = join(ROOT, 'dist', 'styles');
const THEMES_SRC = join(CSS_SRC, 'themes');
const WATCH = process.argv.includes('--watch');

// Marqueur de split entre la partie tokens (:root) et la partie composants
// (::part()) d'un fichier de thème. Distinct du titre de section décoratif
// juste après (ex. "THÈME COMPOSANTS") : ce marqueur est le seul repère
// fiable pour ce script, il ne doit pas être renommé.
const SPLIT_ANCHOR = 'build-split-anchor: components';

/**
 * Scan récursif pour trouver tous les fichiers CSS.
 * @param {string} dir
 * @returns {string[]}
 */
function findCssFiles(dir) {
    if (!existsSync(dir)) return [];
    const results = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...findCssFiles(full));
        } else if (extname(entry.name) === '.css') {
            results.push(full);
        }
    }
    return results;
}

/**
 * Convertit un nom de fichier kebab-case en camelCase.
 * @param {string} str
 * @returns {string}
 */
function toCamelCase(str) {
    return str.replace(/[-_]+([a-zA-Z0-9])/g, (_, char) => char.toUpperCase());
}

/**
 * Pour chaque fichier de thème sous src/styles/themes/, génère un module JS
 * jumeau exportant un CSSStyleSheet peuplé avec la partie "composants" du
 * thème (tout ce qui suit SPLIT_ANCHOR dans le fichier source).
 * @returns {Promise<void>}
 */
async function generateThemeJsExports() {
    const themeFiles = findCssFiles(THEMES_SRC);

    for (const file of themeFiles) {
        const source = readFileSync(file, 'utf8');
        const anchorIndex = source.indexOf(SPLIT_ANCHOR);

        if (anchorIndex === -1) {
            throw new Error(
                `[build-css] Ancre "${SPLIT_ANCHOR}" introuvable dans ` +
                    `${relative(ROOT, file)} — requise pour générer l'export ` +
                    'CSSStyleSheet du thème (voir scripts/build-css.js).',
            );
        }

        const componentsSource = source.slice(anchorIndex);
        const { code: minified } = await esbuild.transform(componentsSource, {
            loader: 'css',
            minify: true,
        });

        const basename = relative(THEMES_SRC, file).replace(/\.css$/, '');
        const exportName = `${toCamelCase(basename)}Theme`;
        const jsContent =
            `export const ${exportName} = new CSSStyleSheet();\n` +
            `${exportName}.replaceSync(${JSON.stringify(minified)});\n`;

        const outDir = join(CSS_OUT, 'themes');
        mkdirSync(outDir, { recursive: true });
        writeFileSync(join(outDir, `${basename}.js`), jsContent);
    }
}

const cssFiles = findCssFiles(CSS_SRC);

if (cssFiles.length === 0) {
    console.log('No CSS theme files found, skipping.');
    process.exit(0);
}

// Construire les entry points en préservant la structure de répertoires
const entryPoints = Object.fromEntries(
    cssFiles.map((file) => {
        const key = relative(CSS_SRC, file).replace(/\.css$/, '');
        return [key, file];
    }),
);

mkdirSync(CSS_OUT, { recursive: true });

const ctx = await esbuild.context({
    entryPoints,
    outdir: CSS_OUT,
    bundle: false, // pas de résolution d'imports @import ici
    minify: true,
    logLevel: 'info',
});

if (WATCH) {
    await ctx.watch();
    // Génération initiale seulement : un fichier thème modifié en watch ne
    // régénère pas automatiquement son .js jumeau. Limitation acceptée —
    // npm run build (utilisé pour vérifier un changement réel) régénère
    // toujours tout depuis zéro.
    await generateThemeJsExports();
    console.log('[css] watching...');
} else {
    await ctx.rebuild();
    await generateThemeJsExports();
    await ctx.dispose();
    console.log(`✓ CSS: ${cssFiles.length} file(s) → dist/styles/`);
}
```

- [ ] **Step 3: Lancer le build CSS et vérifier la génération**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && node scripts/build-css.js
```

Expected: sortie `✓ CSS: 1 file(s) → dist/styles/`, aucune erreur.

- [ ] **Step 4: Inspecter le fichier généré**

```bash
cat /Users/jon/Code/Active_projects/ariane/packages/core/dist/styles/themes/default.js | head -c 500
grep -c ':root' /Users/jon/Code/Active_projects/ariane/packages/core/dist/styles/themes/default.js
grep -o 'ar-datepicker' /Users/jon/Code/Active_projects/ariane/packages/core/dist/styles/themes/default.js | head -1
```

Expected:

- Le fichier commence par `export const defaultTheme = new CSSStyleSheet();`.
- `grep -c ':root'` retourne `0` (aucune règle de tokens dans le fichier généré).
- `ar-datepicker` est trouvé (confirme que les règles `::part()` des composants sont bien présentes).

- [ ] **Step 5: Vérifier le chemin d'échec explicite**

Simuler une ancre manquante sans altérer le fichier source de façon durable :

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core
sed 's/build-split-anchor: components/anchor-renommee-par-erreur/' src/styles/themes/default.css > /tmp/default-broken.css
cp src/styles/themes/default.css /tmp/default-original-backup.css
cp /tmp/default-broken.css src/styles/themes/default.css
node scripts/build-css.js; echo "exit code: $?"
cp /tmp/default-original-backup.css src/styles/themes/default.css
git diff --stat src/styles/themes/default.css
```

Expected: le build échoue avec le message `Ancre "build-split-anchor: components" introuvable
dans src/styles/themes/default.css — ...` et un exit code non nul (`echo "exit code: $?"` affiche
une valeur ≠ 0). Après la restauration (`cp` du backup), `git diff --stat` ne montre aucune
différence — le fichier source est revenu à son état d'origine (avec l'ancre intacte, ajoutée
pendant le brainstorming).

- [ ] **Step 6: Re-générer proprement après le test d'échec**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && node scripts/build-css.js
```

Expected: succès, comme au Step 3 (le fichier source étant restauré, l'ancre est de nouveau
présente).

- [ ] **Step 7: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add packages/core/scripts/build-css.js
git commit -m "feat(core): génère un export CSSStyleSheet du thème pour adoption shadow DOM (#170)"
```

Note : `dist/` n'est jamais commité (généré au build, cf. `.gitignore` — mémoire
`feedback_no_dist_commit`), seul `scripts/build-css.js` est ajouté.

---

### Task 3: Export npm — corriger et étendre le chemin `themes/*`

**Files:**

- Modify: `packages/core/package.json`

**Interfaces:**

- Consumes: `packages/core/dist/styles/themes/default.js` produit par Task 2 (doit exister sur
  disque pour que la vérification de résolution réussisse).
- Produces: chemin d'import public `@ariane-ui/core/themes/default.js` — consommé par Task 4 (doc).

- [ ] **Step 1: Vérifier le bug préexistant avant correction**

```bash
cd /Users/jon/Code/Active_projects/ariane
node -e "console.log(require.resolve('@ariane-ui/core/themes/default.css'))"
```

Expected: **échoue** avec `Cannot find module '.../dist/styles/themes/default.css.css'` — confirme
que le pattern actuel `"./themes/*": "./dist/styles/themes/*.css"` est déjà cassé sous résolution
Node stricte (le `*` capture `default.css` en entier, puis `.css` est ré-ajouté, produisant un
double suffixe). Ce bug préexistant n'a pas été détecté jusqu'ici car les consommateurs actuels
(CDN via unpkg, bundlers comme Vite) ont une résolution plus permissive que la spec Node stricte —
mais le nouvel export `.js` ne doit pas reproduire ce même défaut.

- [ ] **Step 2: Corriger l'entrée `exports` dans `package.json`**

Dans `packages/core/package.json`, remplacer :

```json
    "./themes/*": "./dist/styles/themes/*.css",
```

par deux entrées spécifiques à l'extension :

```json
    "./themes/*.css": "./dist/styles/themes/*.css",
    "./themes/*.js": "./dist/styles/themes/*.js",
```

- [ ] **Step 3: Vérifier la résolution des deux chemins**

```bash
cd /Users/jon/Code/Active_projects/ariane
node -e "console.log(require.resolve('@ariane-ui/core/themes/default.css'))"
node -e "console.log(require.resolve('@ariane-ui/core/themes/default.js'))"
```

Expected: les deux commandes réussissent et affichent respectivement
`.../packages/core/dist/styles/themes/default.css` et
`.../packages/core/dist/styles/themes/default.js` (chemins absolus, sans double extension).

- [ ] **Step 4: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add packages/core/package.json
git commit -m "fix(core): corrige et étend l'export npm themes/* pour couvrir .css et .js (#170)"
```

---

### Task 4: Documentation — page "shadow DOM applicatif"

**Files:**

- Create: `apps/docs/src/pages/getting-started/shadow-dom.astro`
- Modify: `apps/docs/src/components/SiteNav.astro`

**Interfaces:**

- Consumes: export `defaultTheme` depuis `@ariane-ui/core/themes/default.js` (Task 2 + 3) ; pattern
  de page existant `apps/docs/src/pages/getting-started/utilisation.astro` (composants `Layout`,
  `TableOfContents`, classes CSS partagées `doc-prose.css` : `.page-container`, `.page-header`,
  `.page-title`, `.summary`, `.main-section`, `.section-title`, `.subsection`, `.subsection-title`,
  `.callout`, `.callout-title`, `.badge`).
- Produces: page publique `/getting-started/shadow-dom`, lien de nav dans `SiteNav.astro`.

- [ ] **Step 1: Créer la page**

Créer `apps/docs/src/pages/getting-started/shadow-dom.astro` :

```astro
---
import Layout from '../../layouts/Layout.astro';
import TableOfContents from '../../components/TableOfContents.astro';

const tocEntries = [
    { id: 'pourquoi',         label: 'Pourquoi ::part() ne traverse pas',    level: 1 as const },
    { id: 'charger-le-theme', label: 'Charger le thème dans votre shadow root', level: 1 as const },
];

const codeLinkMethod = `class MonApp extends HTMLElement {
    connectedCallback() {
        const shadow = this.attachShadow({ mode: 'open' });

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/@ariane-ui/core/themes/default.css';

        shadow.append(link, document.createElement('ar-datepicker'));
    }
}
customElements.define('mon-app', MonApp);`;

const codeAdoptedStyleSheets = `import { defaultTheme } from '@ariane-ui/core/themes/default.js';

class MonApp extends HTMLElement {
    connectedCallback() {
        const shadow = this.attachShadow({ mode: 'open' });
        shadow.adoptedStyleSheets = [defaultTheme];
        shadow.append(document.createElement('ar-datepicker'));
    }
}
customElements.define('mon-app', MonApp);`;
---

<Layout
    title="Ariane dans un shadow DOM applicatif"
    currentPath="/getting-started/shadow-dom"
    showToc={true}
>
    <div class="page-container">
        <div class="page-header">
            <h2 class="page-title">Ariane dans un shadow DOM applicatif</h2>
            <p class="summary">
                Ce guide s'applique si votre application encapsule sa propre page ou une partie de
                son contenu dans un <em>web component</em> avec son propre shadow DOM, et y
                instancie des composants Ariane à l'intérieur. C'est un cas différent de
                l'imbrication interne à la librairie (un composant Ariane qui en instancie un
                autre dans son propre shadow root) — ici c'est votre propre frontière shadow DOM,
                pas celle d'Ariane.
            </p>
        </div>

        <section id="pourquoi" class="main-section">
            <div>
                <h3 class="section-title">Pourquoi <code>::part()</code> ne traverse pas la frontière</h3>
                <p>
                    Les <strong>tokens</strong> (CSS Custom Properties, <code>--ar-*</code>)
                    continuent de fonctionner sans rien faire : les custom properties héritent
                    naturellement à travers les frontières de shadow DOM, y compris la vôtre.
                </p>
                <p>
                    <strong><code>::part()</code></strong> en revanche ne peut pas atteindre les
                    composants Ariane depuis <code>default.css</code> chargé au niveau du document
                    : votre shadow root est une frontière que vous avez créée, et
                    <code>default.css</code> chargé au niveau document ne partage plus le même
                    arbre DOM que les composants Ariane qu'il cible à l'intérieur de votre shadow
                    root. C'est le fonctionnement standard du Shadow DOM — qui crée une frontière
                    est responsable d'y importer ce dont il a besoin, ce n'est pas une lacune
                    d'Ariane à corriger.
                </p>
            </div>
        </section>

        <section id="charger-le-theme" class="main-section">
            <div>
                <h3 class="section-title">Charger le thème dans votre shadow root</h3>
                <p>
                    Deux méthodes équivalentes en résultat visuel — chargez le thème
                    <em>dans</em> votre shadow root plutôt qu'au niveau document.
                </p>
            </div>

            <section class="subsection">
                <h4 class="subsection-title">Via <code>&lt;link&gt;</code> (universel)</h4>
                <p>
                    Un <code>&lt;link&gt;</code> classique, inséré dans votre shadow root plutôt
                    qu'au niveau document. Fonctionne dans tous les navigateurs, un fetch/parse
                    par instance de shadow root.
                </p>
                <pre><code class="language-js" set:text={codeLinkMethod} /></pre>
            </section>

            <section class="subsection">
                <h4 class="subsection-title">
                    Via <code>adoptedStyleSheets</code> <span class="badge">Recommandé</span>
                </h4>
                <p>
                    Ariane publie <code>@ariane-ui/core/themes/default.js</code>, un export du
                    thème sous forme de <code>CSSStyleSheet</code> déjà construit
                    (<code>defaultTheme</code>). Chargement synchrone (pas de FOUC), et une seule
                    feuille parsée, partageable telle quelle entre plusieurs shadow roots de votre
                    application via <code>shadow.adoptedStyleSheets</code> — le module n'est évalué
                    qu'une fois, chaque import y compris depuis des fichiers différents pointe vers
                    la même instance.
                </p>
                <pre><code class="language-js" set:text={codeAdoptedStyleSheets} /></pre>
                <p class="hint">
                    <code>default.js</code> ne contient que les règles <code>::part()</code>, pas
                    les tokens — les tokens n'ont besoin d'aucune de ces deux méthodes (héritage
                    CSS natif, cf. section précédente).
                </p>
                <div class="callout">
                    <p class="callout-title">Compatibilité</p>
                    <p>
                        <code>CSSStyleSheet</code> constructible et
                        <code>adoptedStyleSheets</code> sont supportés par tous les navigateurs
                        majeurs actuels (Safari 16.4+, mars 2023). Sans cette contrainte, préférez
                        la méthode <code>&lt;link&gt;</code> ci-dessus.
                    </p>
                </div>
            </section>
        </section>
    </div>

    <TableOfContents entries={tocEntries} slot="toc" />
</Layout>

<style>
    @import '../../styles/doc-prose.css';

    .hint {
        font-size: 0.875rem;
        color: var(--doc-text-muted);
        margin-top: -0.5rem;
    }
</style>
```

- [ ] **Step 2: Ajouter le lien de navigation**

Dans `apps/docs/src/components/SiteNav.astro`, modifier le tableau `gettingStartedLinks` :

```ts
const gettingStartedLinks: NavLink[] = [
    { href: '/getting-started/quickstart', label: 'Démarrage rapide', ariaCurrent: undefined },
    { href: '/getting-started/utilisation', label: 'Utilisation', ariaCurrent: undefined },
    { href: '/getting-started/shadow-dom', label: 'Shadow DOM applicatif', ariaCurrent: undefined },
].map((link) => ({
    ...link,
    ariaCurrent: currentPath === link.href ? ('page' as const) : undefined,
}));
```

(Seule l'ajout de la troisième ligne du tableau change — le `.map()` existant reste identique.)

- [ ] **Step 3: Build les docs et vérifier**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run build --workspace=apps/docs
```

Expected: build réussit sans erreur ; `apps/docs/dist/getting-started/shadow-dom/index.html` (ou
équivalent selon la config de routing Astro) existe.

- [ ] **Step 4: Lint Astro**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run lint --workspace=apps/docs
```

Expected: `astro check` passe sans erreur ni warning sur le nouveau fichier.

- [ ] **Step 5: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add apps/docs/src/pages/getting-started/shadow-dom.astro apps/docs/src/components/SiteNav.astro
git commit -m "docs: ajoute la page shadow DOM applicatif (#170)"
```

---

### Task 5: Build complet, vérification finale et PR

**Files:**

- Aucun fichier modifié — vérification + PR uniquement.

**Interfaces:**

- Consumes: l'ensemble des changements des Tasks 2-4.
- Produces: Pull Request vers `dev`.

- [ ] **Step 1: Build complet du monorepo**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run build
```

Expected: succès pour `@ariane-ui/core` et `apps/docs` (turbo orchestre les deux), aucune erreur.

- [ ] **Step 2: Suite de tests complète**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test
```

Expected: tous les tests passent (aucun test nouveau attendu pour ce chantier — pas de suite dédiée
pour les scripts de build ni pour les pages Astro statiques, cf. spec section Tests — mais la suite
existante ne doit montrer aucune régression).

- [ ] **Step 3: Lint complet**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run lint
```

Expected: aucune erreur.

- [ ] **Step 4: Push et création de la PR**

```bash
cd /Users/jon/Code/Active_projects/ariane
git push -u origin feat/170-theme-shadow-dom-export
gh pr create --base dev --title "feat(core): export CSSStyleSheet du thème + doc shadow DOM applicatif (#170)" --body "$(cat <<'EOF'
## Résumé

- Nouvel export `@ariane-ui/core/themes/default.js` (`defaultTheme`, `CSSStyleSheet` déjà peuplé) pour adoption via `shadowRoot.adoptedStyleSheets` dans un shadow DOM applicatif.
- Ne contient que les règles `::part()` du thème (pas les tokens — `:root` ne matche rien dans un shadow root adopté, et les tokens héritent déjà sans action requise).
- Corrige au passage un bug préexistant dans l'export npm `themes/*` (double suffixe `.css.css` sous résolution Node stricte).
- Nouvelle page de doc `/getting-started/shadow-dom` expliquant le pourquoi et les deux méthodes de chargement (`<link>` classique vs `adoptedStyleSheets`).

Closes #170 (à la release sur `main` — label `status:en-attente-release` à poser après merge, cf. convention du projet).

## Test plan

- [x] `npm run build` (monorepo complet)
- [x] `npm run test`
- [x] `npm run lint`
- [x] Vérification manuelle de la résolution du chemin d'export npm (`require.resolve`)
- [x] Vérification manuelle du chemin d'échec explicite (ancre de split manquante)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR créée, URL retournée par `gh pr create`.

- [ ] **Step 5: Poser le label `status:en-attente-release` sur l'issue une fois la PR mergée**

Ne pas exécuter avant confirmation explicite de l'utilisateur pour le merge (cf. mémoire
`feedback_merge_after_autonomous_fix` — ne jamais merger sans confirmation). Une fois la PR mergée
sur `dev` (par l'utilisateur ou après confirmation) :

```bash
gh issue edit 170 --add-label "status:en-attente-release"
```

Ne pas fermer l'issue #170 elle-même avant la release effective sur `main` (mémoire
`feedback_issue_close_on_release_only`).
