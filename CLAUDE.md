# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ariane** is an accessible web components library (`@ariane-ui/core`) built with **Lit 3** and **TypeScript**. npm workspaces monorepo orchestrated by Turborepo. Dual distribution: NPM (tree-shakeable ESM) + CDN (self-contained bundle with autoloader).

Ariane is a **foundation** for building design systems — not a design system itself. It handles patterns where correct accessible implementation is a real obstacle. It does not rewrite native elements that already work well.

## Références

- **Philosophie, positionnement et critères d'inclusion** → [CONTRIBUTING.md](CONTRIBUTING.md)
- **Setup, commandes, architecture, patterns de code** → [DEVELOPMENT.md](DEVELOPMENT.md)
- **Décisions techniques détaillées** → [`docs/decisions/`](docs/decisions/) — indexées par context-mode, utiliser `ctx_search` pour les retrouver

## Règles actives

### Naming

- Tag: `ar-<name>` · Class: `Ar<Name>` · Events: `ar-<event>`
- CSS custom properties: `--ar-<component>-<property>` (e.g. `--ar-button-bg`)
- CSS parts: `part="base"`, `part="label"`, `part="prefix"`, `part="suffix"`

### Properties — always `reflect: true`

Without `reflect: true`, the HTML attribute won't sync with the JS property — the playground's `outerHTML` will show missing attributes.

### Custom events — always `{ bubbles: true, composed: true }`

Without `composed: true`, events don't cross Shadow DOM boundary. Without `bubbles: true`, they don't bubble up through the light DOM either.

### Global type declaration

Every component file ends with:

```typescript
declare global {
    interface HTMLElementTagNameMap {
        'ar-<name>': Ar<Name>;
    }
}
```

### Tokens: doc vs. library

`--doc-*` variables (in `apps/docs/`) may reference existing `--ar-*` tokens but must never force adding a token to `packages/core` for a documentation-only need. **A token only enters `packages/core` if a component needs it.**

### Component variant

If `variant` is set explicitly on a component, it overrides the system theme. If unset, the component follows the system theme via semantic tokens.

---

## Docs site architecture (`apps/docs/`)

Custom Astro + MDX static site. No Starlight, no api-viewer.

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
tagName: ar-button # required
title: Bouton # required
description: … # optional, shown under title
playgroundTemplate: default # optional, name of variant used to init playground (defaults to first)
variants:
    - name: default
      label: Par défaut
      description: …
      html: '<ar-button>Label</ar-button>'
```

> **Sub-components**: use only `@parent ar-<tag>` JSDoc in the Lit class. No MDX field needed — the CEM `x-parent` field is read directly by the nav and home page.

**Playground control type detection** (`src/utils/cem-types.ts` → `buildControls()`):

| CEM type                         | Control                                              |
| -------------------------------- | ---------------------------------------------------- |
| `'a' \| 'b' \| …` (string union) | `<select>`                                           |
| `'a' \| 'b' \| undefined`        | `<select>` with "Par défaut" first option (value="") |
| `boolean`                        | `<input type="checkbox">`                            |
| `number` / `number \| undefined` | `<input type="number">`                              |
| anything else                    | `<input type="text">`                                |

---

## Tooling Notes

- **Commits**: Conventional Commits enforced by commitlint + Husky
- **Pre-commit**: lint-staged runs ESLint + Prettier on staged files
- **TypeScript**: strict mode; use inline type imports (`import type`)
- **Prettier config**: 100 char width, 4 spaces, single quotes
- **Node requirement**: >=24, npm >=11

---

## Méthode de travail

**Remettre en cause la demande après 3 essais infructueux**
Si un correctif échoue 3 fois de suite, ne pas insister. S'arrêter et questionner la logique de la demande elle-même : est-ce rationnel ? Est-ce que ça va à l'encontre des conventions du domaine ? Est-ce que le problème vient du _quoi_ plutôt que du _comment_ ? Exposer le doute clairement à l'utilisateur et proposer une alternative avant de continuer.

---

## Lessons — package core

**Convention de dépréciation**
Utiliser `warnDeprecated(tag, member, message)` depuis `src/utils/deprecated.ts`. Le warning ne s'affiche qu'une fois par session (garde en `Set`). Toujours annoter avec `@deprecated` en JSDoc. Annoncer la suppression cible dans le message.

```typescript
import { warnDeprecated } from '../../utils/deprecated.js';

// Dans updated() :
if (this.links !== undefined) {
    warnDeprecated(
        'ar-breadcrumb',
        'links',
        'Utilisez des éléments <a> slottés. Sera supprimé en v1.0.0.',
    );
}
```

**Tests : `textContent` des Text nodes Lit interpolés dans happy-dom**
`element.textContent` retourne `''` même si le rendu est correct. Tester la propriété JS directement (`el.myProp`). Les attributs, `hasAttribute`, `getAttribute` et la structure DOM fonctionnent correctement.

**Tests : helpers `fixture()`, `waitForUpdate()`, `getPart()`**
Extraire ces trois helpers dans chaque fichier de test pour éviter les non-null assertions (`!`) bloquées par `lint-staged --max-warnings=0`. `getPart(el, 'name')` cible les éléments par `part="…"`.

**Tests : `.ariaCurrent` (et autres propriétés ARIA Lit) ne reflètent pas en attribut dans happy-dom**
Tester la propriété JS directement : `(el as unknown as { ariaCurrent: string }).ariaCurrent`.

**Tests : `MediaQueryList` mock**
Toujours inclure `addEventListener` et `removeEventListener` : `{ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList`.

**Tests : `queueMicrotask` — double `updateComplete`**
Quand le rendu est déclenché depuis un `queueMicrotask`, `await updateComplete` deux fois de suite pour absorber le cycle initial + le cycle du microtask.
