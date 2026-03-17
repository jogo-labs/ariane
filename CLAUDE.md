# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**mARIAnne** is an accessible web components library (`@marianne/core`) built with **Lit 3** and **TypeScript**. It's an npm workspaces monorepo orchestrated by Turborepo with a dual distribution strategy (NPM + CDN).

## Commands

### Monorepo (root)

```bash
npm run build             # Build all packages/apps
npm run dev               # Parallel dev mode (watch)
npm run test              # Run all tests
npm run lint              # Lint all packages
npm run format            # Prettier (TS, JS, JSON, CSS, Astro, MD)
npm run create mr-<name>  # Scaffold a new component
```

### Core package (`packages/core/`)

```bash
npm run build:manifest  # Generate custom-elements.json (CEM)
npm run build:bundles   # esbuild → dist/ (NPM) + cdn/
npm run build:css       # Process CSS themes
npm run build:types     # tsc --emitDeclarationOnly
npm run test            # vitest run (single pass)
npm run test:watch      # vitest (interactive)
npm run test:coverage   # vitest --coverage
npm run lint            # eslint src
```

### Docs app (`apps/docs/`)

```bash
npm run dev    # Astro dev server (requires custom-elements.json to exist first)
npm run build  # Astro static build
```

## Architecture

### Structure

```
packages/core/src/
  components/   # One directory per component (e.g., button/, stepper/)
  controllers/  # Reusable Lit ReactiveControllers
  context/      # @lit/context providers for parent-child communication
  state/        # Pure state computation engines
  styles/       # Shared CSS (reset, utilities, animations, themes/)
  types/        # TypeScript interfaces
  index.ts      # Barrel export
apps/docs/      # Astro 5 + MDX documentation site
```

### Component file conventions

Each component lives in `components/<name>/` with:

- `<name>.ts` — LitElement class, decorated with `@customElement('mr-<name>')`
- `<name>.styles.ts` — Lit `css` tagged template styles
- `<name>.test.ts` — Vitest tests

Complex components add:

- `<name>.renderer.ts` — Separate render helpers (e.g., `renderDesktop` / `renderMobile`)
- `<name>.utils.ts` — Helper functions

### Naming conventions

- **Tag names**: `mr-<name>` (prefix defined in `packages/core/package.json` → `config.componentPrefix`)
- **Class names**: `Mr<Name>` (PascalCase)
- **Custom events**: prefixed `mr-` (e.g., `mr-click`, `mr-stepper-step-changed`)
- **CSS custom properties**: `--mr-<component>-<property>` (e.g., `--mr-button-bg`)
- **CSS parts**: `part="base"`, `part="label"`, `part="prefix"`, `part="suffix"`

### Key patterns

**Properties**: Always use `reflect: true` for attributes that should sync to HTML.

**Global type declaration**: Every component file ends with:

```typescript
declare global {
    interface HTMLElementTagNameMap {
        'mr-<name>': Mr<Name>;
    }
}
```

**Custom events**: Always `{ bubbles: true, composed: true }` to traverse Shadow DOM.

**Parent-child composition**: Use `@lit/context` — parent exposes a `ContextProvider`, child subscribes via `ContextConsumer`. See `stepper/` for reference.

**No Shadow DOM components**: Data-container components (e.g., `mr-stepper-item`) override `createRenderRoot()` to return `this`.

### Build outputs

- `dist/` — Tree-shakeable ESM, Lit as external peer dep
- `cdn/` — Self-contained bundle (Lit bundled in), includes an autoloader
- `custom-elements.json` — Source of truth for all component metadata; consumed by the docs app

### Testing pattern

```typescript
async function fixture(html: string): Promise<MrComponent> {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstElementChild as MrComponent;
    document.body.appendChild(el);
    await (el as any).updateComplete;
    return el;
}
```

### Docs generation

`packages/core/cem.config.js` configures `@custom-elements-manifest/analyzer` to generate:

- `custom-elements.json` — component API (props, events, slots, CSS parts/props)
- `vscode.html-custom-data.json` / `vscode.css-custom-data.json` — IDE completions

JSDoc tags used in component files:

| Tag                | Effect                                                |
| ------------------ | ----------------------------------------------------- |
| `@display demo`    | Page shows variants + playground + API ref (default)  |
| `@display docs`    | Page shows only API ref (no playground)               |
| `@parent mr-<tag>` | Marks as sub-component; adds back-link to parent page |
| `@ignore`          | Hides a member from the playground controls           |

### Docs site architecture (`apps/docs/`)

The docs site is a custom Astro 5 + MDX static site. **No Starlight, no api-viewer.**

**Page structure per component** (`/components/[slug]`):

1. **Exemples** — variants stacked vertically, all server-side rendered via `<Fragment set:html>`
2. **Playground** — server-side initial render + live controls generated from CEM members
3. **Référence API** — static tables (attributes, events, slots, CSS parts/props)
4. **Sticky TOC** — right column, `IntersectionObserver`-driven active highlighting

**Key files:**

| File                                   | Role                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/pages/components/[slug].astro`    | Dynamic route — resolves playground HTML, calls `buildControls()`, builds TOC entries |
| `src/components/Playground.astro`      | Variants + playground + ComponentApi; loads `public/js/playground.js`                 |
| `src/components/ComponentApi.astro`    | API tables from CEM; color swatches on CSS custom property defaults                   |
| `src/components/TableOfContents.astro` | Sticky TOC right column; receives `entries[]` via props                               |
| `src/components/SiteNav.astro`         | Left nav; auto-generated from CEM with parent/child hierarchy                         |
| `src/layouts/Layout.astro`             | 3-column grid (`260px 1fr 220px`) when `showToc={true}`                               |
| `src/content/config.ts`                | Zod schema for MDX frontmatter                                                        |
| `public/js/playground.js`              | Copy buttons + live attribute manipulation via `setAttribute`                         |
| `src/utils/cem-types.ts`               | Shared CEM TypeScript types + helpers (`getCustomElements`, `buildControls`)          |
| `src/utils/parse-tokens.ts`            | Parses `default.css` and categorizes CSS custom properties                            |
| `src/utils/tag-name.ts`                | `getSlug()`, `getPrefix()`, `groupByPrefix()` helpers                                 |
| `src/styles/doc-table.css`             | Shared table styles used by ComponentApi and tokens page                              |
| `src/pages/foundations/tokens.astro`   | Design tokens page; auto-extracts from theme CSS                                      |

**MDX frontmatter schema** (per component content file):

```yaml
tagName: mr-button # required
title: Bouton # required
description: … # optional, shown under title
playgroundTemplate: default # optional, name of variant used to init playground (defaults to first)
variants:
    - name: default
      label: Par défaut
      description: …
      html: '<mr-button>Label</mr-button>'
```

> **Sub-components**: use only `@parent mr-<tag>` JSDoc in the Lit class. No MDX field needed —
> the CEM `x-parent` field is read directly by the nav and home page to filter and nest the component.

**Playground control type detection** (in `src/utils/cem-types.ts` → `buildControls()`):

| CEM type                         | Control                                              |
| -------------------------------- | ---------------------------------------------------- |
| `'a' \| 'b' \| …` (string union) | `<select>`                                           |
| `'a' \| 'b' \| undefined`        | `<select>` with "Par défaut" first option (value="") |
| `boolean`                        | `<input type="checkbox">`                            |
| `number` / `number \| undefined` | `<input type="number">`                              |
| anything else                    | `<input type="text">`                                |

## Tooling Notes

- **Commits**: Conventional Commits enforced by commitlint + Husky
- **Pre-commit**: lint-staged runs ESLint + Prettier on staged files
- **TypeScript**: strict mode; use inline type imports (`import type`)
- **Prettier config**: 100 char width, 4 spaces, single quotes
- **Node requirement**: >=20, npm >=10

## Méthode de travail

**Remettre en cause la demande après 3 essais infructueux**
Si un correctif échoue 3 fois de suite, ne pas insister. S'arrêter et questionner la logique de la demande elle-même : est-ce rationnel ? Est-ce que ça va à l'encontre des conventions du domaine ? Est-ce que le problème vient du _quoi_ plutôt que du _comment_ ? Exposer le doute clairement à l'utilisateur et proposer une alternative avant de continuer. Exemple : tenter de simuler un layout mobile dans une preview desktop via CSS/JS alors que les DevTools sont l'outil fait pour ça.

---

## Lessons — décisions techniques et erreurs à ne pas reproduire

### Docs site

**Highlight.js plutôt que Shiki pour la coloration syntaxique**
Shiki est 100% serveur — impossible de re-coloriser côté client après que le playground ait réécrit le DOM. Utiliser uniquement highlight.js (CDN cdnjs, thème `github-dark`) : `hljs.highlightAll()` au chargement, `hljs.highlightElement(el)` après chaque mise à jour (après avoir réinitialisé l'attribut `data-highlighted`). Ne pas mélanger les deux outils — leurs palettes divergent même avec le même thème.

**Overlay nav mobile — `pointer-events`**
Un overlay avec `opacity: 0` bloque quand même les clics. Toujours ajouter `pointer-events: none` par défaut sur `.nav-overlay`, et `pointer-events: auto` uniquement avec la classe `.open`.

**IntersectionObserver double-init (TableOfContents)**
`TableOfContents.astro` est monté deux fois (desktop sticky + mobile inline). Utiliser un guard `window.__tocObserverInit` — seule la première instance crée l'observer. Les deux partagent les mêmes classes CSS `.toc-link`, un seul observer suffit.

**Sous-composants : `@parent` JSDoc seul suffit**
`index.astro` et `SiteNav.astro` lisent tous les deux `c['x-parent']` depuis le CEM. Le champ MDX `parent` a été supprimé du schéma Zod. L'annotation `@parent mr-<tag>` dans le composant Lit est la seule source de vérité — ne pas ajouter de champ MDX.

**Types CEM : ne pas dupliquer, utiliser `cem-types.ts`**
Toutes les interfaces CEM et helpers (`getCustomElements`, `buildControls`) sont dans `src/utils/cem-types.ts`. Avant d'écrire une interface CEM dans un fichier Astro, vérifier si elle existe déjà.

**Astro scoped styles et imports CSS partagés**
Pour partager du CSS entre composants, utiliser `@import` au début d'un bloc `<style>`. Astro résout les imports relatifs et applique quand même le scoping.

**`<script is:inline src="...">` plutôt que `defer`**
`defer` charge le script après le DOM, ce qui posait un problème pour `hljs.highlightAll()`. Utiliser `is:inline` explicitement pour un chargement synchrone — highlight.js est assez petit pour ça.

**Preview de composants indépendante du thème global**
Les éléments `.preview` ont leur propre attribut `data-theme="light|dark"` et redéfinissent les tokens `--mr-color-*` pour un contexte CSS isolé. Un bouton toggle local permet de basculer indépendamment du thème global.

**Variables CSS `--doc-*` pour les couleurs de la doc**
Ne jamais mettre de couleurs hex hardcodées dans `apps/docs/`. Le site supporte les thèmes light/dark via les variables `--doc-*` (ex : `--doc-text`, `--doc-border`, `--doc-text-muted`). Toujours vérifier si une variable existe avant d'écrire une valeur fixe.

### Package core

**Convention de dépréciation**
Utiliser `warnDeprecated(tag, member, message)` depuis `src/utils/deprecated.ts` pour signaler une propriété ou un attribut obsolète. Le warning ne s'affiche qu'une fois par session (garde en `Set`). Toujours annoter avec `@deprecated` en JSDoc pour que l'IDE le signale. Annoncer la suppression cible dans le message (ex: `Sera supprimé en v1.0.0.`).

Exemple d'usage dans un composant :

```typescript
import { warnDeprecated } from '../../utils/deprecated.js';

// Dans updated() :
if (this.links !== undefined) {
    warnDeprecated(
        'mr-breadcrumb',
        'links',
        'Utilisez des éléments <a> slottés. Sera supprimé en v1.0.0.',
    );
}
```

**`reflect: true` obligatoire**
Sans `reflect: true`, l'attribut n'est pas synchronisé dans le DOM — le `outerHTML` du playground affichera des attributs absents même si la propriété a changé côté JS.

**`{ bubbles: true, composed: true }` sur tous les événements custom**
Sans `composed: true`, les événements ne traversent pas la frontière Shadow DOM. Sans `bubbles: true`, ils ne remontent pas non plus dans le DOM shadow.

**Tests : `textContent` des Text nodes Lit interpolés dans happy-dom**
happy-dom ne sérialise pas correctement les Text nodes dynamiques générés par Lit (`${this.prop}` dans un template html`...`). `element.textContent` retourne `''` même si le rendu est correct visuellement. Pour tester le contenu textuel, vérifier la propriété JS directement (`el.myProp`) plutôt que `element.textContent`. Les attributs, `hasAttribute`, `getAttribute` et la structure DOM (présence d'éléments, `hidden`) fonctionnent correctement.

**Tests : helpers `fixture()`, `waitForUpdate()`, `getPart()` pour les composants Lit**
Extraire ces trois helpers dans chaque fichier de test pour éviter les non-null assertions (`!`) bloquées par `lint-staged --max-warnings=0`. `getPart(el, 'name')` cible les éléments par `part="…"` — l'API publique stable du composant.

**Tests : `.ariaCurrent` (et autres propriétés ARIA Lit) ne reflètent pas en attribut dans happy-dom**
Quand Lit assigne une propriété ARIA via `.ariaCurrent`, `.ariaExpanded`, etc. (liaison de propriété DOM), `getAttribute('aria-current')` retourne `null` dans happy-dom. Tester la propriété JS directement : `(el as unknown as { ariaCurrent: string }).ariaCurrent`.

**Tests : `MrBreadcrumb.mobileQuery` — mock minimal avec `addEventListener`/`removeEventListener`**
Remplacer `MrBreadcrumb.mobileQuery` par `{ matches: true/false, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList`. Un objet sans ces méthodes plante dans `connectedCallback`/`disconnectedCallback`. Créer un helper `mockMediaQuery(matches)` en tête de fichier.

**Tests : composants avec `queueMicrotask` (ex: `_scheduleRebuild`) nécessitent deux `updateComplete`**
Quand le rendu est déclenché depuis un `queueMicrotask` (pattern de debounce), `await updateComplete` une seule fois ne suffit pas. Dans `fixture()` et `waitForUpdate()`, `await updateComplete` deux fois de suite pour absorber le cycle initial + le cycle déclenché par le microtask.
