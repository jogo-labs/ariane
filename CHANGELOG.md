# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et ce projet adhère au [Versionnage Sémantique](https://semver.org/lang/fr/).

> **Note** : Les versions `0.x.x-alpha.x` sont des pré-versions instables.
> L'API publique peut changer sans préavis avant la version `1.0.0`.

---

## [0.1.0-alpha.1] — 2026-03-17

Première pré-version publique de mARIAnne. Les composants sont fonctionnels
mais l'API n'est pas encore stabilisée.

### Ajouté

- **`mr-alert`** — Composant d'alerte avec variants `info`, `success`, `warning`, `error`
- **`mr-breadcrumb`** — Fil d'Ariane avec support mobile (collapse), slotté via `<mr-breadcrumb-item>`
- **`mr-breadcrumb-item`** — Élément enfant de `mr-breadcrumb`
- **`mr-button`** — Bouton avec variants `primary`, `secondary`, `outline`, `ghost`, `danger` et tailles `sm`, `md`, `lg`
- **`mr-pagination`** — Composant de pagination avec navigation par pages
- **`mr-progressbar`** — Barre de progression avec valeur et label accessibles
- **`mr-spinner`** — Indicateur de chargement animé
- **`mr-stepper`** — Étapes de progression avec contexte parent/enfant
- **`mr-stepper-item`** — Étape individuelle enfant de `mr-stepper`
- Site de documentation Astro avec playground interactif, référence API et design tokens
- Distribution CDN (bundle auto-contenu) et npm (ESM tree-shakeable)
- Thème CSS personnalisable via CSS Custom Properties (`--mr-color-*`, `--mr-*`)

### Infrastructure

- Monorepo npm workspaces + Turborepo
- Build dual : ESM (`dist/`) + CDN bundle (`cdn/`)
- Génération automatique du Custom Elements Manifest (CEM)
- Tests unitaires Vitest + happy-dom
- CI GitHub Actions (lint, build, test) ; release déclenchée par tag `v*.*.*`
- Conventional Commits + commitlint + Husky

---

<!-- Les versions futures seront ajoutées ici, en tête de fichier. -->
