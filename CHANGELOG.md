# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et ce projet adhère au [Versionnage Sémantique](https://semver.org/lang/fr/).

> **Note** : Les versions `0.x.x-alpha.x` sont des pré-versions instables.
> L'API publique peut changer sans préavis avant la version `1.0.0`.

---

## [0.1.0-alpha.3] — 2026-03-26

### Supprimé

- **`ar-button`** — retiré de la librairie (réplique un natif `<button>` sans apport a11y)

### Modifié

- **Tokens CSS** — refonte complète du système de design tokens :
    - Palette brute unifiée sur des stops `05→95` en oklch (`--ar-color-primary-*`, `--ar-color-neutral-*`, etc.)
    - Ajout des palettes orange, cyan, indigo, purple, pink
    - Tokens sémantiques d'état (`--ar-color-info-bg`, `--ar-color-success-text`…)
    - Migration de tous les composants vers les tokens sémantiques (plus de couleurs hardcodées)
    - Attribut `dark` supprimé de `ar-breadcrumb` — les composants suivent désormais le mode système

### Ajouté (documentation)

- Landing page avec hero, motif de fond et deux CTA
- Section "Bien démarrer" : pages Installation et Utilisation
- Page Design Tokens : grille palette complète + sous-sections sémantiques avec swatches
- Swatches couleur dans la référence API des composants et la page Design Tokens
- Migration Astro 6 + Node 22

### Corrigé

- Playground interactif non fonctionnel (script exécuté avant le DOM)
- Liens vers composant parent (`ar-stepper-item` → `ar-stepper`) cassés dans la doc
- Dark mode : couleurs hardcodées remplacées par des variables `--doc-*`
- Spinner : hérite de `currentColor` par défaut

---

## [0.1.0-alpha.1] — 2026-03-17

Première pré-version publique de Ariane. Les composants sont fonctionnels
mais l'API n'est pas encore stabilisée.

### Ajouté

- **`ar-alert`** — Composant d'alerte avec variants `info`, `success`, `warning`, `error`
- **`ar-breadcrumb`** — Fil d'Ariane avec support mobile (collapse), slotté via `<ar-breadcrumb-item>`
- **`ar-breadcrumb-item`** — Élément enfant de `ar-breadcrumb`
- **`ar-button`** — Bouton avec variants `primary`, `secondary`, `outline`, `ghost`, `danger` et tailles `sm`, `md`, `lg`
- **`ar-pagination`** — Composant de pagination avec navigation par pages
- **`ar-progressbar`** — Barre de progression avec valeur et label accessibles
- **`ar-spinner`** — Indicateur de chargement animé
- **`ar-stepper`** — Étapes de progression avec contexte parent/enfant
- **`ar-stepper-item`** — Étape individuelle enfant de `ar-stepper`
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
