# Information Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructurer la documentation du projet en cinq couches à audience unique pour éliminer la duplication et clarifier où mettre chaque nouvelle information.

**Architecture:** Chaque fichier a une seule audience (intégrateur / contributeur externe / développeur interne / décisions techniques / Claude). La philosophie vit dans `CONTRIBUTING.md` — les autres fichiers pointent vers elle sans la dupliquer. Les Lessons de `CLAUDE.md` sont triées : vrais choix → ADRs, gotchas framework → `DEVELOPMENT.md`, règles actives courtes → restent dans `CLAUDE.md`.

**Tech Stack:** Markdown, Prettier (lint), Astro build (vérification liens), Git (PR par étape)

---

## Fichiers créés / modifiés

| Fichier                                            | Action                                |
| -------------------------------------------------- | ------------------------------------- |
| `DEVELOPMENT.md`                                   | Créer                                 |
| `CONTRIBUTING.md`                                  | Modifier (alléger)                    |
| `README.md`                                        | Modifier (alléger)                    |
| `docs/decisions/ADR-001-highlight-js-vs-shiki.md`  | Créer                                 |
| `docs/decisions/ADR-002-ci-workflows-separes.md`   | Créer                                 |
| `docs/decisions/ADR-003-stack-tests-vitest-wtr.md` | Créer                                 |
| `CLAUDE.md`                                        | Modifier (alléger + pointeurs)        |
| `.claude/settings.json`                            | Créer ou modifier (hook SessionStart) |

---

## Tâche 1 — Créer `DEVELOPMENT.md`

Contenu extrait de `CONTRIBUTING.md` (sections techniques) et `CLAUDE.md` (architecture, patterns, commandes).

**Fichiers :**

- Créer : `DEVELOPMENT.md`

- [ ] **Étape 1 : Créer `DEVELOPMENT.md`**

Contenu complet :

````markdown
# Guide de développement

> **Philosophie et positionnement du projet → [CONTRIBUTING.md](CONTRIBUTING.md)**
> Lis-le avant de démarrer si ce n'est pas déjà fait.

---

## Prérequis

- Node ≥ 24 (LTS)
- npm ≥ 11
- [nvm](https://github.com/nvm-sh/nvm) recommandé

## Setup

```bash
git clone https://github.com/jogo-labs/ariane
cd ariane
nvm use          # active Node 24 via .nvmrc
npm install
```
````

## Commandes racine

| Commande                  | Description                                       |
| ------------------------- | ------------------------------------------------- |
| `npm run dev`             | Watch core + docs en parallèle (pré-build le CEM) |
| `npm run build`           | Build complet (core + docs)                       |
| `npm run test`            | Tests unitaires Vitest                            |
| `npm run test:all`        | Tests unitaires + tests browser (Vitest + WTR)    |
| `npm run lint`            | ESLint sur tous les packages                      |
| `npm run format`          | Prettier sur tous les fichiers                    |
| `npm run create ar-<nom>` | Scaffold un nouveau composant                     |

## Commandes par workspace

### `packages/core`

| Commande                 | Description                       |
| ------------------------ | --------------------------------- |
| `npm run build:manifest` | Génère `custom-elements.json`     |
| `npm run build:bundles`  | esbuild → `dist/` (npm) + `cdn/`  |
| `npm run build:css`      | Thèmes CSS                        |
| `npm run build:types`    | Déclarations TypeScript           |
| `npm run test`           | Vitest, passe unique              |
| `npm run test:watch`     | Vitest interactif                 |
| `npm run test:coverage`  | Vitest avec rapport de couverture |
| `npm run test:browser`   | @web/test-runner + Chromium       |
| `npm run lint`           | ESLint                            |

---

## Architecture du monorepo

```text
packages/core/src/
  components/   # Un répertoire par composant (ex: button/, stepper/)
  controllers/  # Lit ReactiveControllers réutilisables
  context/      # @lit/context providers (communication parent-enfant)
  state/        # Moteurs de calcul d'état purs
  styles/       # CSS partagé (reset, utilitaires, animations, thèmes)
  types/        # Interfaces TypeScript
  index.ts      # Export barrel
apps/docs/      # Site de documentation Astro
```

## Conventions fichiers composant

Chaque composant dans `components/<name>/` :

- `<name>.ts` — classe LitElement, `@customElement('ar-<name>')`
- `<name>.styles.ts` — styles Lit `css` tagged template
- `<name>.test.ts` — tests Vitest

Composants complexes ajoutent :

- `<name>.renderer.ts` — helpers de rendu (desktop/mobile)
- `<name>.utils.ts` — fonctions utilitaires

## Conventions de nommage

| Élément               | Convention                | Exemple          |
| --------------------- | ------------------------- | ---------------- |
| Tag HTML              | `ar-<name>`               | `ar-button`      |
| Classe                | `Ar<Name>`                | `ArButton`       |
| Événements custom     | `ar-<event>`              | `ar-alert-close` |
| CSS custom properties | `--ar-<component>-<prop>` | `--ar-button-bg` |
| CSS parts             | `part="base"`             | `part="label"`   |

---

## Patterns de code

### Propriétés — toujours `reflect: true`

Sans `reflect: true`, l'attribut HTML n'est pas synchronisé avec la propriété JS.
Le `outerHTML` du playground afficherait des attributs absents.

```typescript
@property({ reflect: true })
variant: 'filled' | 'outlined' = 'filled';

@property({ type: Boolean, reflect: true })
disabled = false;
```

### Événements custom — toujours `bubbles + composed`

Sans `composed: true`, l'événement ne traverse pas le Shadow DOM.
Sans `bubbles: true`, il ne remonte pas dans le DOM light.

```typescript
this.dispatchEvent(
    new CustomEvent('ar-change', {
        bubbles: true,
        composed: true,
        detail: { value: this.value },
    }),
);
```

### Global type declaration (fin de chaque fichier composant)

```typescript
declare global {
    interface HTMLElementTagNameMap {
        'ar-<name>': Ar<Name>;
    }
}
```

### Composition parent-enfant

Utiliser `@lit/context` — le parent expose un `ContextProvider`, l'enfant s'abonne via `ContextConsumer`. Voir `stepper/` pour référence.

### Composants sans Shadow DOM

Les composants conteneurs de données overrident `createRenderRoot()` :

```typescript
override createRenderRoot() {
    return this;
}
```

---

## JSDoc CEM — annotations obligatoires

Le CEM (`custom-elements.json`) est généré depuis la JSDoc. Toujours documenter :

```typescript
/**
 * @summary Description courte (une phrase).
 * @display demo
 *
 * @slot              - Slot par défaut.
 * @slot prefix       - Icône avant le contenu.
 *
 * @csspart base      - L'élément racine du composant.
 *
 * @cssprop --ar-mon-composant-bg - Couleur de fond.
 *
 * @event {CustomEvent} ar-change - Émis lors d'un changement.
 */
```

| Annotation         | Effet                                           |
| ------------------ | ----------------------------------------------- |
| `@display demo`    | Page doc : exemples + playground + API (défaut) |
| `@display docs`    | Page doc : API uniquement                       |
| `@parent ar-<tag>` | Marque comme sous-composant                     |
| `@ignore`          | Exclut un membre des contrôles playground       |

---

## Tests unitaires (Vitest + happy-dom)

### Pattern standard

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ArAlert } from './alert.js';

async function fixture(html: string): Promise<ArAlert> {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstElementChild as ArAlert;
    document.body.appendChild(el);
    await (el as any).updateComplete;
    await (el as any).updateComplete; // double await pour les queueMicrotask
    return el;
}

async function waitForUpdate(el: LitElement): Promise<void> {
    await (el as any).updateComplete;
    await (el as any).updateComplete;
}

function getPart(el: Element, name: string): Element | null {
    return el.shadowRoot?.querySelector(`[part="${name}"]`) ?? null;
}

describe('ArAlert', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('affiche le message', async () => {
        const el = await fixture('<ar-alert>Texte</ar-alert>');
        expect(el.getAttribute('role')).toBe('alert');
    });
});
```

### Pièges courants happy-dom

- **`textContent` des interpolations Lit** : retourne `''`. Tester la propriété JS directement (`el.myProp`) plutôt que `el.textContent`.
- **Propriétés ARIA via liaison Lit** (`.ariaCurrent`, `.ariaExpanded`) : `getAttribute('aria-current')` retourne `null`. Tester `(el as any).ariaCurrent` directement.
- **`MediaQueryList` mock** : toujours inclure `addEventListener` et `removeEventListener` : `{ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList`.
- **`queueMicrotask` dans le rendu** : `await updateComplete` deux fois pour absorber le cycle initial + le cycle du microtask.

## Tests browser (web-test-runner + Playwright + axe-core)

Fichiers nommés `*.browser.test.ts` ou `*.a11y.test.ts`.

```typescript
import { expect, fixture, html } from '@open-wc/testing';
import { checkAccessibility } from '../../test-utils.js';

describe('ArAlert a11y', () => {
    it('passe axe-core', async () => {
        const el = await fixture(html`<ar-alert>Message</ar-alert>`);
        await checkAccessibility(el);
    });
});
```

---

## Build outputs

| Répertoire                  | Usage                                        |
| --------------------------- | -------------------------------------------- |
| `dist/`                     | Bundle npm — Lit en peer dep, tree-shakeable |
| `cdn/`                      | Bundle CDN — Lit bundlé, avec autoloader     |
| `dist/custom-elements.json` | Manifest CEM — consommé par la doc           |
| `dist/styles/themes/`       | Fichiers CSS de thème                        |

---

## Intégration IDE (VS Code)

Référencer dans `.vscode/settings.json` du projet consommateur :

```json
{
    "html.customData": ["./node_modules/@ariane-ui/core/dist/vscode.html-custom-data.json"],
    "css.customData": ["./node_modules/@ariane-ui/core/dist/vscode.css-custom-data.json"]
}
```

````

- [ ] **Étape 2 : Vérifier le lint**

```bash
npm run format
npm run lint
````

Résultat attendu : pas d'erreur.

- [ ] **Étape 3 : Commit**

```bash
git add DEVELOPMENT.md
git commit -m "docs: crée DEVELOPMENT.md — guide développeur interne"
```

---

## Tâche 2 — Alléger `CONTRIBUTING.md`

Remplacer le contenu technique par la philosophie, le positionnement et le workflow de contribution.

**Fichiers :**

- Modifier : `CONTRIBUTING.md`

- [ ] **Étape 1 : Réécrire `CONTRIBUTING.md`**

````markdown
# Contribuer à Ariane

Ce guide s'adresse aux contributeurs externes qui souhaitent proposer une amélioration,
signaler un bug ou soumettre un nouveau composant.

Pour le setup technique et les commandes : voir [DEVELOPMENT.md](DEVELOPMENT.md).

---

## Qu'est-ce qu'Ariane ?

Ariane se positionne entre deux extrêmes :

- **Web Awesome / Shoelace** — design system complet et opiniaté : l'intégrateur adopte le look de la librairie.
- **Radix UI / Headless UI** — composants sans style : l'intégrateur apporte tout le CSS.

**Ariane** : comportement accessible + tokens thémables, aucune opinion visuelle forte.
C'est la **fondation** sur laquelle construire son propre design system — pas un design system en soi.

---

## Philosophie

### Mission

Ariane prend en charge les patterns dont la complexité d'implémentation correcte est un obstacle
à l'accessibilité dans les projets réels. Elle ne réécrit pas les éléments natifs qui fonctionnent bien.

### Critères d'inclusion d'un composant

Un composant intègre Ariane si au moins l'une de ces conditions est vraie :

1. **Complexité a11y non triviale** — implémenter correctement le comportement accessible est difficile (stepper, datepicker, dialog, tabs).
2. **Absent des projets par difficulté d'implémentation** — le composant améliorerait l'UX mais est rarement bien fait (datepicker).
3. **Extension d'un natif insuffisant** — `<dialog>` → `<ar-dialog>` qui l'étend.

Un composant est **exclu** si :

- Il réplique un natif qui fait déjà bien le job (`<button>`, `<input>`, `<select>` de base).
- Sa valeur ajoutée est purement graphique sans apport a11y ou comportemental.

### Ergonomie de l'API

Intuitive par rapport aux natifs : un breadcrumb se compose comme un `<ul>/<li>`,
pas comme un JSON stringifié. Préférer des éléments enfants slottés aux props complexes.

### Thémabilité et accessibilité

- Les aspects visuels sont exposés via CSS custom properties (`--ar-*`).
- Les aspects qui garantissent l'accessibilité (focus management, bouton de fermeture) sont non négociables.
- Le thème par défaut satisfait les ratios de contraste **WCAG 2.2 AA** sans configuration supplémentaire.

---

## Proposer un nouveau composant

1. **Ouvrir une issue** en expliquant le besoin, les critères d'inclusion satisfaits, et une esquisse d'API.
2. **Discussion** — attendre un retour avant de commencer l'implémentation.
3. **PR sur `dev`** une fois l'issue validée.

---

## Workflow PR

Toutes les contributions passent par une Pull Request sur la branche `dev`.

```bash
git clone https://github.com/jogo-labs/ariane
cd ariane
nvm use
npm install
git checkout -b feat/mon-composant
```
````

---

## Conventions de commit

Les commits suivent **Conventional Commits**, vérifiés par commitlint + Husky.

```
feat(button): ajoute la prop `loading`
fix(stepper): corrige la navigation au clavier
docs(alert): met à jour les exemples
test(button): ajoute les cas disabled
chore(deps): met à jour esbuild
```

Types autorisés : `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `ci`.

````

- [ ] **Étape 2 : Vérifier le lint**

```bash
npm run format
````

- [ ] **Étape 3 : Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: refocus CONTRIBUTING.md — positionnement + philosophie + workflow"
```

---

## Tâche 3 — Alléger `README.md`

Retirer le contenu orienté développeur, garder uniquement ce dont l'intégrateur a besoin.

**Fichiers :**

- Modifier : `README.md`

- [ ] **Étape 1 : Supprimer la section "Structure du monorepo"**

Supprimer entièrement la section `## Structure du monorepo` (le bloc texte + la structure arborescente).

- [ ] **Étape 2 : Remplacer la section "Démarrage rapide"**

Remplacer la section `## Démarrage rapide` par :

````markdown
## Installation

### Via CDN (sans bundler)

```html
<script type="module" src="https://unpkg.com/@ariane-ui/core/cdn/index.js"></script>
<link rel="stylesheet" href="https://unpkg.com/@ariane-ui/core/themes/default.css" />

<ar-button>Cliquez-moi</ar-button>
```
````

### Via npm

```bash
npm install @ariane-ui/core
```

```typescript
import '@ariane-ui/core';
import '@ariane-ui/core/themes/default.css';

// ou import individuel (tree-shaking)
import '@ariane-ui/core/dist/components/button/button.js';

// attendre que des composants spécifiques soient prêts
import { whenAllDefined } from '@ariane-ui/core';
await whenAllDefined('ar-button', 'ar-stepper');
```

### Autoloader CDN

```html
<script type="module" src="/cdn/autoloader.js"></script>
```

````

- [ ] **Étape 3 : Supprimer la section "Commandes racine"**

Supprimer entièrement `## Commandes racine` (table de commandes). Ces infos vont dans `DEVELOPMENT.md`.

- [ ] **Étape 4 : Mettre à jour la section "Contribution"**

Remplacer :

```markdown
## Contribution

Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour les conventions et le workflow.
Pour modifier le site de documentation, voir [apps/docs/CONTRIBUTING.md](apps/docs/CONTRIBUTING.md).
````

par :

```markdown
## Contribution

Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour la philosophie et le workflow de contribution.
Pour le setup et les commandes de développement, voir [DEVELOPMENT.md](DEVELOPMENT.md).
```

- [ ] **Étape 5 : Vérifier le lint et le build**

```bash
npm run format
npm run build:manifest --workspace=packages/core
npm run build --workspace=apps/docs
```

Résultat attendu : build sans erreur, pas de liens cassés.

- [ ] **Étape 6 : Commit**

```bash
git add README.md
git commit -m "docs: allège README.md — orienté intégrateur uniquement"
```

---

## Tâche 4 — Créer les ADRs

Migrer les décisions architecturales clés depuis `CLAUDE.md` vers `docs/decisions/`.
Les gotchas framework vont dans `DEVELOPMENT.md` (déjà fait en Tâche 1).

**Fichiers :**

- Créer : `docs/decisions/ADR-001-highlight-js-vs-shiki.md`
- Créer : `docs/decisions/ADR-002-ci-workflows-separes.md`
- Créer : `docs/decisions/ADR-003-stack-tests-vitest-wtr.md`

- [ ] **Étape 1 : Créer `docs/decisions/ADR-001-highlight-js-vs-shiki.md`**

```markdown
# ADR-001 : Highlight.js plutôt que Shiki pour la coloration syntaxique

**Statut :** Adopté
**Date :** 2026-01-15

## Contexte

Le site de documentation affiche des blocs de code avec coloration syntaxique.
Le playground interactif régénère le HTML de ces blocs côté client après chaque
changement de contrôle — il faut donc pouvoir re-coloriser à la demande.

## Décision

Utiliser **highlight.js** via CDN (thème `github-dark`, chargé via `is:inline`).
Appeler `hljs.highlightAll()` au chargement initial, et `hljs.highlightElement(el)`
après chaque mise à jour du playground (après avoir réinitialisé `data-highlighted`).

## Alternatives rejetées

- **Shiki** — 100% serveur. Impossible de re-coloriser côté client après que le
  playground ait réécrit le DOM. Éliminé d'emblée.

## Conséquences

- La coloration syntaxique est uniforme sur toute la doc (même outil, même thème).
- Ne pas mélanger Shiki et highlight.js — leurs palettes divergent même avec le
  même nom de thème.
- Le script highlight.js doit être dans `<head>` avec `is:inline` et le code
  enveloppé dans `DOMContentLoaded` (cf. ADR-001 note d'implémentation).
```

- [ ] **Étape 2 : Créer `docs/decisions/ADR-002-ci-workflows-separes.md`**

```markdown
# ADR-002 : Deux workflows CI séparés (core / docs)

**Statut :** Adopté
**Date :** 2026-03-20

## Contexte

Le projet a un monorepo avec deux packages distincts : `packages/core` et `apps/docs`.
Un seul workflow CI lançait tous les jobs à chaque PR, même celles ne touchant qu'un seul package.

## Décision

Deux fichiers de workflow séparés avec filtres `on.pull_request.paths` natifs GitHub :

- `.github/workflows/ci-core.yml` — déclenché uniquement si `packages/core/**` ou les fichiers
  de config racine sont modifiés.
- `.github/workflows/ci-docs.yml` — déclenché uniquement si `apps/docs/**` ou `packages/core/**`
  sont modifiés (la doc dépend du core).

## Alternatives rejetées

- **`dorny/paths-filter` action** — filtre par job dans un seul workflow. Plus complexe,
  génère des warnings de dépréciation Node 20, et ne réduit pas vraiment les runs CI.
- **`on.pull_request.paths` dans un seul fichier avec jobs conditionnels** — les conditions
  `if:` sur les jobs ne permettent pas de filtrer le déclenchement du workflow lui-même.

## Conséquences

- Les paths filters s'appliquent au niveau `pull_request` seulement — pas sur les `push`
  directs sur les branches protégées.
- GitHub évalue les paths sur l'ensemble du diff PR (pas seulement le dernier commit) :
  si `package.json` est modifié dans un commit antérieur de la PR, les deux workflows
  se déclenchent sur chaque push ultérieur.
- Le lint core est isolé : `npm run lint --workspace=packages/core` (pas turbo global).
```

- [ ] **Étape 3 : Créer `docs/decisions/ADR-003-stack-tests-vitest-wtr.md`**

```markdown
# ADR-003 : Stack de tests dual — Vitest + @web/test-runner

**Statut :** Adopté
**Date :** 2026-02-10

## Contexte

Les composants Lit ont deux types de besoins de test distincts :

1. Tests unitaires rapides (logique, état, attributs) — pas besoin d'un vrai navigateur.
2. Tests d'accessibilité et de comportement Shadow DOM — nécessitent un vrai navigateur
   car happy-dom ne supporte pas correctement certains comportements Shadow DOM.

## Décision

Stack dual :

- **Vitest + happy-dom** pour les tests unitaires (`*.test.ts`). Rapide, pas de navigateur,
  couverture de code native.
- **@web/test-runner + Playwright (Chromium) + @open-wc/testing + axe-core** pour les tests
  browser (`*.browser.test.ts`, `*.a11y.test.ts`). Vrai navigateur, Shadow DOM réel,
  axe-core pour les audits d'accessibilité automatisés.

Les deux sont orchestrés depuis la racine via Turborepo (`test` et `test:browser`).

## Alternatives rejetées

- **Vitest browser mode** — en beta au moment du choix, API instable, support Shadow DOM
  limité pour les tests axe-core.
- **Jest + jsdom** — jsdom supporte encore moins bien le Shadow DOM que happy-dom.
  Moins adapté à l'écosystème ESM/Lit.
- **Migration complète vers WTR** — WTR ne produit pas de rapport de couverture de code
  natif, nécessiterait une consolidation manuelle. Objectif long terme possible.

## Conséquences

- Deux commandes séparées : `npm run test` (Vitest) et `npm run test:browser` (WTR).
- `npm run test:all` depuis la racine lance les deux.
- Les tests browser nécessitent Playwright Chromium installé (géré automatiquement en CI
  via `npx playwright install --with-deps chromium`).
- En local, Playwright Chromium doit être installé manuellement au premier setup :
  `npx playwright install chromium`.
```

- [ ] **Étape 4 : Vérifier le lint**

```bash
npm run format
```

- [ ] **Étape 5 : Commit**

```bash
git add docs/decisions/
git commit -m "docs: crée docs/decisions/ avec ADR-001, ADR-002, ADR-003"
```

---

## Tâche 5 — Alléger `CLAUDE.md`

Supprimer le contenu migré vers les autres fichiers. Ajouter les pointeurs.

**Fichiers :**

- Modifier : `CLAUDE.md`

- [ ] **Étape 1 : Supprimer la section "Lessons — docs site"**

Supprimer les sous-sections suivantes de `CLAUDE.md` (migrées en ADRs ou dans DEVELOPMENT.md) :

- "Highlight.js plutôt que Shiki" → ADR-001
- "Overlay nav mobile — pointer-events" → DEVELOPMENT.md (pièges courants)
- "IntersectionObserver double-init" → DEVELOPMENT.md (pièges courants)
- "Sous-composants : @parent JSDoc seul suffit" → DEVELOPMENT.md (conventions)
- "Types CEM : ne pas dupliquer" → DEVELOPMENT.md
- "Astro scoped styles" → DEVELOPMENT.md
- "`<script is:inline>` plutôt que defer" → DEVELOPMENT.md
- "Scripts `is:inline src` dans `<head>` — DOMContentLoaded" → DEVELOPMENT.md
- "Preview indépendante du thème global" → DEVELOPMENT.md
- "Variables CSS `--doc-*`" → DEVELOPMENT.md

Garder les sections "Package core" qui sont des règles actives courtes :

- "Convention de dépréciation" (reste — règle active avec code d'exemple)
- "`reflect: true` obligatoire" (reste)
- "`{ bubbles, composed }` sur tous les événements" (reste)
- Les pièges de tests happy-dom (peuvent migrer dans DEVELOPMENT.md à la prochaine révision)

- [ ] **Étape 2 : Remplacer la section "Lessons" par des pointeurs**

Ajouter après la section "Méthode de travail" :

```markdown
## Références

- **Philosophie et critères d'inclusion** → [CONTRIBUTING.md](CONTRIBUTING.md)
- **Setup, commandes, architecture, patterns** → [DEVELOPMENT.md](DEVELOPMENT.md)
- **Décisions techniques détaillées** → [`docs/decisions/`](docs/decisions/) — indexées par context-mode, utiliser `ctx_search` pour les retrouver
```

- [ ] **Étape 3 : Vérifier que les règles actives critiques sont toujours présentes**

S'assurer que ces éléments restent dans `CLAUDE.md` :

- Naming conventions (tag `ar-`, classe `Ar`, events `ar-`, CSS props `--ar-`)
- `reflect: true` obligatoire
- `bubbles: true, composed: true` sur les events
- Convention `warnDeprecated()`
- Section "Méthode de travail" (inchangée)
- Section "Lessons — package core" (règles actives, pas des gotchas)

- [ ] **Étape 4 : Vérifier le lint**

```bash
npm run format
npm run lint
```

- [ ] **Étape 5 : Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): allège CLAUDE.md — pointeurs vers DEVELOPMENT.md et ADRs"
```

---

## Tâche 6 — Hook SessionStart pour indexer les ADRs

Configurer un hook Claude Code projet qui indexe `docs/decisions/` au démarrage de session.

**Fichiers :**

- Créer ou modifier : `.claude/settings.json`

- [ ] **Étape 1 : Vérifier si `.claude/settings.json` existe**

```bash
ls .claude/
```

- [ ] **Étape 2 : Créer ou compléter `.claude/settings.json`**

Si le fichier n'existe pas, créer `.claude/` et le fichier :

```json
{
    "hooks": {
        "SessionStart": [
            {
                "matcher": "",
                "hooks": [
                    {
                        "type": "command",
                        "command": "node -e \"const {readdirSync, readFileSync} = require('fs'); const {resolve} = require('path'); const dir = resolve(process.cwd(), 'docs/decisions'); try { const files = readdirSync(dir).filter(f => f.endsWith('.md')); if (files.length > 0) console.log('[hook] ' + files.length + ' ADR(s) disponibles dans docs/decisions/ — utilise ctx_search pour les consulter.'); } catch {}\""
                    }
                ]
            }
        ]
    }
}
```

> Note : ce hook affiche simplement un rappel en début de session. L'indexation réelle via context-mode est gérée par le hook context-mode existant dans `.github/hooks/context-mode.json`. Si context-mode expose une API d'indexation de répertoire, l'étendre pour pointer vers `docs/decisions/` — à investiguer selon la version installée.

- [ ] **Étape 3 : Ajouter `.claude/` au `.gitignore` si nécessaire**

Vérifier que `.gitignore` contient déjà `.claude` (il le contient — vérifié).

- [ ] **Étape 4 : Commit**

```bash
git add .claude/settings.json
git commit -m "chore(claude): hook SessionStart — rappel ADRs disponibles"
```

---

## Tâche 7 — PR, CI et merge

- [ ] **Étape 1 : Pousser la branche et créer la PR**

```bash
git push -u origin docs/readme-contributing-update
gh pr create --title "docs: restructuration architecture de l'information" --base dev
```

- [ ] **Étape 2 : Attendre la CI verte**

```bash
gh pr checks <PR_NUMBER>
```

- [ ] **Étape 3 : Merger**

```bash
gh pr merge <PR_NUMBER> --squash --delete-branch
```
