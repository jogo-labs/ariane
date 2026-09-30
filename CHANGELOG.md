# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et ce projet adhère au [Versionnage Sémantique](https://semver.org/lang/fr/).

> **Note** : Les versions `0.x.x-alpha.x` sont des pré-versions instables.
> L'API publique peut changer sans préavis avant la version `1.0.0`.

> **Historique** : les sections à partir de la prochaine release sont générées depuis les
> Conventional Commits (`npm run changelog`). Les versions `0.1.0-alpha.4` à `0.1.0-alpha.11`
> ne sont pas détaillées ici : voir les [GitHub Releases](https://github.com/jogo-labs/ariane/releases).

---

## [0.1.0-alpha.12](https://github.com/jogo-labs/ariane/compare/v0.1.0-alpha.11...v0.1.0-alpha.12) (2026-09-30)

### Ajouté

- **core:** sous-path @ariane-ui/core/utils sans effet de bord ([#272](https://github.com/jogo-labs/ariane/issues/272)) ([e86f3a9](https://github.com/jogo-labs/ariane/commit/e86f3a9969ba538951d1e4c7390a1af03a44b697)), references [#267](https://github.com/jogo-labs/ariane/issues/267)

### Corrigé

- **ci:** validate-no-hardcoded-tokens détecte les fallbacks var() à imbrication profonde ([#274](https://github.com/jogo-labs/ariane/issues/274)) ([7d5ed67](https://github.com/jogo-labs/ariane/commit/7d5ed67d6d10f9da46d171cb0e90ce39dc5c75d2))
- **core:** whenAllDefined accepte { prefix, root } et parcourt les shadow roots ([#271](https://github.com/jogo-labs/ariane/issues/271)) ([b496d61](https://github.com/jogo-labs/ariane/commit/b496d618c8bad7e82787e6e34f02616bbb7fd1c3))
- **panel:** masque les panneaux flottants par défaut, sans dépendre de :popover-open ([#283](https://github.com/jogo-labs/ariane/issues/283)) ([#290](https://github.com/jogo-labs/ariane/issues/290)) ([810c634](https://github.com/jogo-labs/ariane/commit/810c6348d29cf03b8197337c749f5e2a912b9033))
- **popover:** ferme le panneau au tap extérieur sur Safari iOS < 18.3 ([#283](https://github.com/jogo-labs/ariane/issues/283)) ([#289](https://github.com/jogo-labs/ariane/issues/289)) ([d007add](https://github.com/jogo-labs/ariane/commit/d007addfca6f21ed40ce790ee2755dae1bd692f1))
- rend ar-breadcrumb importable sans window et tolère les états sans tirets ([#282](https://github.com/jogo-labs/ariane/issues/282)) ([#286](https://github.com/jogo-labs/ariane/issues/286)) ([a75ebc8](https://github.com/jogo-labs/ariane/commit/a75ebc8e637acf56420867525a67c7d423b7f6d4))

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
