# Getting Started Refonte — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructurer les pages "Bien démarrer" pour mettre le CDN en avant, remonter les prérequis, et clarifier la séparation Démarrage rapide / Utilisation.

**Architecture:** `installation.astro` remplacée par `quickstart.astro` (CDN recommandé + npm avancé). `utilisation.astro` recentrée sur l'usage concret post-installation. Nav et CTA landing mis à jour.

**Tech Stack:** Astro 6, TypeScript, CSS

**Branche :** `feat/docs-getting-started-refonte`
**Issue :** [#8](https://github.com/jogo-labs/ariane/issues/8)
**Spec :** `docs/superpowers/specs/2026-03-26-getting-started-refonte.md`

---

## Fichiers concernés

| Fichier                                                  | Action              |
| -------------------------------------------------------- | ------------------- |
| `apps/docs/src/pages/getting-started/installation.astro` | Supprimer           |
| `apps/docs/src/pages/getting-started/quickstart.astro`   | Créer               |
| `apps/docs/src/pages/getting-started/utilisation.astro`  | Modifier            |
| `apps/docs/src/components/SiteNav.astro`                 | Modifier (ligne 31) |
| `apps/docs/src/pages/index.astro`                        | Modifier (ligne 32) |

---

## Task 1 : Créer `quickstart.astro`

**Files:**

- Create: `apps/docs/src/pages/getting-started/quickstart.astro`

- [ ] **Step 1 : Créer la page**

```astro
---
import Layout from '../../layouts/Layout.astro';
import TableOfContents from '../../components/TableOfContents.astro';

const tocEntries = [
    { id: 'prerequis',  label: 'Prérequis',         level: 1 as const },
    { id: 'cdn',        label: 'Via CDN',            level: 1 as const },
    { id: 'autoloader', label: 'Autoloader',         level: 2 as const },
    { id: 'bundle',     label: 'Bundle complet',     level: 2 as const },
    { id: 'npm',        label: 'Setup avancé (npm)', level: 1 as const },
];

const codeAutoloader = `<script type="module" src="https://unpkg.com/@ariane-ui/core/cdn/autoloader.js"></scr` + `ipt>
<link rel="stylesheet" href="https://unpkg.com/@ariane-ui/core/themes/default.css" />`;

const codeBundle = `<script type="module" src="https://unpkg.com/@ariane-ui/core/cdn/index.js"></scr` + `ipt>
<link rel="stylesheet" href="https://unpkg.com/@ariane-ui/core/themes/default.css" />`;

const codeUsage = `<ar-alert version="success">
  <span slot="title">Succès</span>
  <span slot="content">Opération réussie.</span>
</ar-alert>`;

const codeNpmInstall = `npm install @ariane-ui/core`;

const codeNpmGlobal = `import '@ariane-ui/core';
import '@ariane-ui/core/themes/default.css';`;

const codeNpmIndividuel = `import '@ariane-ui/core/dist/components/alert/alert.js';
import '@ariane-ui/core/themes/default.css';`;
---

<Layout
    title="Démarrage rapide"
    currentPath="/getting-started/quickstart"
    showToc={true}
>
    <div class="page-container">
        <div class="page-header">
            <h2 class="page-title">Démarrage rapide</h2>
        </div>

        <section id="prerequis">
            <h3 class="section-title">Prérequis</h3>
            <ul>
                <li>
                    Un navigateur moderne supportant les
                    <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_components"
                       target="_blank" rel="noopener">Web Components</a>
                    (Chrome, Firefox, Safari, Edge)
                </li>
                <li>Aucune dépendance framework — fonctionne avec Vue, React, Svelte, ou HTML pur</li>
                <li><em>Si intégration npm uniquement :</em> Node ≥ 22, npm ≥ 10</li>
            </ul>
        </section>

        <section id="cdn" class="main-section">
            <div>
                <h3 class="section-title">Via CDN <span class="badge">Recommandé</span></h3>
                <p>
                    La méthode la plus rapide — aucun outil requis. Ajoutez les deux balises dans
                    votre <code>&lt;head&gt;</code> et utilisez les composants directement en HTML.
                </p>
            </div>

            <section id="autoloader" class="subsection">
                <h4 class="subsection-title">Autoloader <span class="badge badge-subtle">À privilégier</span></h4>
                <p>
                    Ne charge chaque composant que lorsqu'il est utilisé dans la page.
                    Idéal pour la plupart des projets CDN.
                </p>
                <pre><code class="language-html" set:text={codeAutoloader} /></pre>
                <p class="hint">
                    Les deux balises sont requises : le script enregistre les composants,
                    le CSS fournit le thème.
                </p>
                <p>Les composants sont ensuite utilisables directement :</p>
                <pre><code class="language-html" set:text={codeUsage} /></pre>
            </section>

            <section id="bundle" class="subsection">
                <h4 class="subsection-title">Bundle complet</h4>
                <p>
                    Charge tous les composants en une seule requête. Adapté si vous utilisez
                    beaucoup de composants ou souhaitez éviter les imports dynamiques.
                </p>
                <pre><code class="language-html" set:text={codeBundle} /></pre>
            </section>
        </section>

        <section id="npm" class="main-section">
            <div>
                <h3 class="section-title">Setup avancé <span class="badge">Avec bundler</span></h3>
                <p>
                    Pour les projets utilisant Vite, Webpack, Rollup ou tout autre bundler.
                </p>
                <pre><code class="language-bash" set:text={codeNpmInstall} /></pre>
            </div>

            <section class="subsection">
                <h4 class="subsection-title">Import global</h4>
                <p>Enregistre tous les composants en une seule ligne :</p>
                <pre><code class="language-typescript" set:text={codeNpmGlobal} /></pre>
            </section>

            <section class="subsection">
                <h4 class="subsection-title">
                    Import individuel <span class="badge badge-subtle">Tree-shaking</span>
                </h4>
                <p>Pour inclure uniquement les composants effectivement utilisés :</p>
                <pre><code class="language-typescript" set:text={codeNpmIndividuel} /></pre>
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

- [ ] **Step 2 : Vérifier dans le navigateur**

```bash
cd apps/docs && npm run dev
```

Ouvrir `http://localhost:4321/getting-started/quickstart` et vérifier :

- 3 sections visibles (Prérequis, CDN, npm)
- TOC ancré (cliquer chaque entrée)
- Blocs de code colorés
- Aucune erreur console

- [ ] **Step 3 : Commit**

```bash
git add apps/docs/src/pages/getting-started/quickstart.astro
git commit -m "feat(docs): ajoute la page Démarrage rapide (closes #8)"
```

---

## Task 2 : Mettre à jour la navigation et le CTA

**Files:**

- Modify: `apps/docs/src/components/SiteNav.astro`
- Modify: `apps/docs/src/pages/index.astro`

- [ ] **Step 1 : Mettre à jour SiteNav.astro**

Ligne 31 — remplacer :

```typescript
{ href: '/getting-started/installation', label: 'Installation', ariaCurrent: undefined },
```

par :

```typescript
{ href: '/getting-started/quickstart', label: 'Démarrage rapide', ariaCurrent: undefined },
```

- [ ] **Step 2 : Mettre à jour le CTA de la landing**

Ligne 32 de `apps/docs/src/pages/index.astro` — remplacer :

```html
<a href="/getting-started/installation" class="btn-primary">Bien démarrer</a>
```

par :

```html
<a href="/getting-started/quickstart" class="btn-primary">Bien démarrer</a>
```

- [ ] **Step 3 : Vérifier**

- Nav : "Démarrage rapide" visible, actif sur `/getting-started/quickstart`
- Landing : bouton pointe vers `/getting-started/quickstart`

- [ ] **Step 4 : Commit**

```bash
git add apps/docs/src/components/SiteNav.astro apps/docs/src/pages/index.astro
git commit -m "feat(docs): met à jour la nav et le CTA vers /quickstart"
```

---

## Task 3 : Refondre `utilisation.astro`

**Files:**

- Modify: `apps/docs/src/pages/getting-started/utilisation.astro`

- [ ] **Step 1 : Réécrire la page**

```astro
---
import Layout from '../../layouts/Layout.astro';
import TableOfContents from '../../components/TableOfContents.astro';

const tocEntries = [
    { id: 'composants',       label: 'Utiliser les composants', level: 1 as const },
    { id: 'chargement',       label: 'Attendre le chargement',  level: 1 as const },
    { id: 'personnalisation', label: 'Personnalisation CSS',    level: 1 as const },
    { id: 'tokens',           label: 'Design Tokens',           level: 1 as const },
];

const codeHtml = `<ar-alert version="success">
  <span slot="title">Succès</span>
  <span slot="content">Votre message a bien été envoyé.</span>
</ar-alert>

<ar-spinner></ar-spinner>`;

const codeWhenDefined = `await customElements.whenDefined('ar-alert');
const alert = document.querySelector('ar-alert');
alert.setAttribute('version', 'success');`;

const codeWhenAllDefined = `const tags = [...new Set(
    [...document.querySelectorAll('*')]
        .map(el => el.localName)
        .filter(name => name.startsWith('ar-'))
)];
await Promise.all(tags.map(tag => customElements.whenDefined(tag)));
// Tous les composants ar-* sont prêts`;

const codeCustomProps = `ar-alert {
    --ar-alert-info-bg:   #f5f0ff;
    --ar-alert-info-icon: #7c3aed;
}`;

const codeTokens = `:root {
    --ar-color-interactive: #7c3aed;
    --ar-border-radius-md:  0.75rem;
}`;
---

<Layout
    title="Utilisation"
    currentPath="/getting-started/utilisation"
    showToc={true}
>
    <div class="page-container">
        <div class="page-header">
            <h2 class="page-title">Utilisation</h2>
            <p class="page-summary">
                Ces exemples supposent que vous avez suivi le
                <a href="/getting-started/quickstart">Démarrage rapide</a>.
                Ils s'appliquent quel que soit le mode d'intégration (CDN ou npm).
            </p>
        </div>

        <section id="composants" class="main-section">
            <div>
                <h3 class="section-title">Utiliser les composants</h3>
                <p>
                    Les composants sont des Custom Elements natifs — ils s'utilisent directement
                    en HTML, aucun framework requis.
                </p>
            </div>
            <pre><code class="language-html" set:text={codeHtml} /></pre>
        </section>

        <section id="chargement" class="main-section">
            <div>
                <h3 class="section-title">Attendre le chargement</h3>
                <p>
                    Les Custom Elements s'enregistrent de manière asynchrone. Si votre code
                    JavaScript interagit avec un composant au chargement de la page, attendez
                    qu'il soit défini avant d'agir dessus.
                </p>
            </div>

            <section class="subsection">
                <h4 class="subsection-title">Un composant individuel</h4>
                <pre><code class="language-js" set:text={codeWhenDefined} /></pre>
            </section>

            <section class="subsection">
                <h4 class="subsection-title">Tous les composants Ariane présents dans la page</h4>
                <pre><code class="language-js" set:text={codeWhenAllDefined} /></pre>
                <p class="hint">
                    À venir : un helper <code>whenAllDefined()</code> sera exporté depuis
                    <code>@ariane-ui/core</code> dans une prochaine version.
                </p>
            </section>
        </section>

        <section id="personnalisation" class="main-section">
            <div>
                <h3 class="section-title">Personnalisation CSS</h3>
                <p>
                    Chaque composant expose des <strong>CSS Custom Properties</strong> pour adapter
                    l'apparence sans surcharger les styles internes.
                </p>
            </div>
            <pre><code class="language-css" set:text={codeCustomProps} /></pre>
            <p>
                Les propriétés disponibles par composant sont listées dans la section
                <strong>Référence API</strong> de chaque page de composant.
            </p>
        </section>

        <section id="tokens" class="main-section">
            <div>
                <h3 class="section-title">Design Tokens</h3>
                <p>
                    Les valeurs globales (couleurs, espacements, typographie) viennent du fichier
                    de thème <code>themes/default.css</code>. Surchargez-les via <code>:root</code>
                    pour modifier l'ensemble de la librairie :
                </p>
            </div>
            <pre><code class="language-css" set:text={codeTokens} /></pre>
            <p>
                Consultez la page <a href="/foundations/tokens">Design Tokens</a> pour la liste
                complète des variables disponibles.
            </p>
        </section>
    </div>

    <TableOfContents entries={tocEntries} slot="toc" />
</Layout>

<style>
    @import '../../styles/doc-prose.css';

    .page-summary {
        margin-top: 0.5rem;
        color: var(--doc-text-muted);
    }

    .hint {
        font-size: 0.875rem;
        color: var(--doc-text-muted);
        margin-top: -0.5rem;
    }
</style>
```

- [ ] **Step 2 : Vérifier dans le navigateur**

Ouvrir `http://localhost:4321/getting-started/utilisation` et vérifier :

- Préambule avec lien vers `/getting-started/quickstart`
- 4 sections dans l'ordre du TOC
- Snippets `whenDefined` et `whenAllDefined` corrects
- Note "À venir" visible
- Aucun lien vers `/getting-started/installation`

- [ ] **Step 3 : Commit**

```bash
git add apps/docs/src/pages/getting-started/utilisation.astro
git commit -m "feat(docs): refond la page Utilisation (whenDefined, CDN-first)"
```

---

## Task 4 : Supprimer `installation.astro`

**Files:**

- Delete: `apps/docs/src/pages/getting-started/installation.astro`

- [ ] **Step 1 : Vérifier qu'aucun lien interne ne pointe encore vers `/installation`**

```bash
grep -r "getting-started/installation" apps/docs/src --include="*.astro" --include="*.mdx" --include="*.ts"
```

Résultat attendu : aucune ligne.

- [ ] **Step 2 : Supprimer le fichier**

```bash
git rm apps/docs/src/pages/getting-started/installation.astro
```

- [ ] **Step 3 : Vérifier que la 404 est bien servie**

Ouvrir `http://localhost:4321/getting-started/installation` → doit afficher une page 404.

- [ ] **Step 4 : Commit**

```bash
git commit -m "chore(docs): supprime installation.astro (remplacée par quickstart)"
```

---

## Task 5 : Ouvrir l'issue `whenAllDefined()`

- [ ] **Step 1 : Créer l'issue GitHub**

```bash
gh issue create \
  --repo jogo-labs/ariane \
  --title "feat(core): helper whenAllDefined() — attendre tous les composants ar-*" \
  --body "## Contexte

La page Utilisation documente le pattern manuel pour attendre tous les composants Ariane présents dans une page :

\`\`\`js
const tags = [...new Set(
    [...document.querySelectorAll('*')]
        .map(el => el.localName)
        .filter(name => name.startsWith('ar-'))
)];
await Promise.all(tags.map(tag => customElements.whenDefined(tag)));
\`\`\`

## Objectif

Exporter un helper depuis \`@ariane-ui/core\` :

\`\`\`ts
import { whenAllDefined } from '@ariane-ui/core';
await whenAllDefined(); // attend tous les ar-* présents dans document
\`\`\`

## Critères d'acceptance
- Exporté depuis le barrel \`@ariane-ui/core\`
- Accepte un préfixe optionnel (défaut : \`'ar-'\`)
- Documenté dans la page Utilisation en remplacement du snippet manuel
- Testé unitairement" \
  --label "scope:core,type:feat"
```

---

## Vérification finale

- [ ] `http://localhost:4321` — bouton CTA → `/getting-started/quickstart`
- [ ] `http://localhost:4321/getting-started/quickstart` — page complète, TOC fonctionnel
- [ ] `http://localhost:4321/getting-started/utilisation` — préambule + 4 sections
- [ ] Nav : "Démarrage rapide" actif sur quickstart, "Utilisation" actif sur utilisation
- [ ] `http://localhost:4321/getting-started/installation` → 404
- [ ] Build production : `npm run build` sans erreur
