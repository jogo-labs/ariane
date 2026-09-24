# Renommage default.css → ariane.css + restructuration en imports (#256)

## Contexte

Points 1 et 2 de #230, extraits en issue dédiée (#256) pour être traités avant de reprendre le chantier starter-kit (#230 points 3&4, spec/plan déjà écrits et en pause — `docs/superpowers/specs/2026-09-23-starter-kit-demo-230-design.md`). Constat : `default.css` (1570 lignes) est en réalité le thème de la doc Ariane, pas un thème neutre au sens headless — le nom induit en erreur. Cette spec couvre :

1. Renommer `default.css` → `ariane.css`.
2. Réorganiser `ariane.css` en imports (`@import` de fragments) plutôt qu'un unique gros fichier.

## Couplages techniques identifiés (pas cosmétique, ça touche le build)

- **`scripts/build-css.js`** génère un module JS jumeau (`ariane.js`, futur nom) exportant un `CSSStyleSheet` peuplé avec la partie "règles composants" du thème (adoption shadow DOM applicatif, #170). Aujourd'hui il repère un marqueur texte (`build-split-anchor: components`) dans le fichier source unique pour séparer tokens (`:root`) et règles.
- **`packages/core/cem.config.js`** a le chemin `src/styles/themes/default.css` en dur, utilisé par 3 validateurs CI (couverture `@cssprop`, valeurs codées en dur, ordre `::part()`+état) qui lisent ce fichier comme source de vérité unique.
- Le fichier enrobe tout dans `@layer ariane.theme { ... }` (évite les conflits de spécificité avec le CSS consommateur) — `@import` ne peut pas être imbriqué dans un bloc `@layer { }` (invalide en CSS), donc la manière de préserver ce comportement avec des imports change la mécanique du fichier d'entrée.

## Décisions

### Structure des fichiers

```
packages/core/src/styles/themes/
  ariane.css                          ← fichier d'entrée, remplace default.css
  ariane/
    _palette.css                      ← section 1 (palette brute)
    _semantic-tokens.css              ← sections 2+3 (variants sémantiques d'état + tokens sémantiques)
    _global-tokens.css                ← sections 4+5+6 (typo, espacement/forme, génériques mutualisés)
                                         + les 2 blocs [data-theme='dark'/'light'] (mode clair/sombre)
    shared/
      _panel.css                      ← tokens --ar-panel-* (partagés dropdown/breadcrumb/stepper/datepicker)
      _anchor.css                     ← tokens --ar-anchor-* (partagés, positionnement ancré)
    components/
      _alert.css                      ← tokens + règles ar-alert (un seul fichier, cf. décision ci-dessous)
      _breadcrumb.css                 ← ar-breadcrumb + ar-breadcrumb-item
      _charcounter.css
      _collapse.css
      _datepicker.css
      _dialog.css
      _dropdown.css                   ← ar-dropdown + ar-dropdown-item
      _pagination.css
      _progressbar.css
      _spinner.css
      _stepper.css                    ← ar-stepper + ar-stepper-item
      _tab.css                        ← ar-tab-group + ar-tab + ar-tab-panel
      _table-sort.css
      _tooltip.css
```

**Préfixe `_`** sur tous les fragments (convention Sass "partial", reconnue) : signale "importé seulement, jamais construit comme point d'entrée autonome". `scripts/build-css.js` doit exclure tout fichier dont le nom commence par `_` de sa liste de points d'entrée esbuild (sinon chaque fragment serait aussi construit comme un artefact `dist/` à part entière, ce qui n'a pas de sens).

**Un fragment combine tokens ET règles par famille de composant** (parent + enfants ensemble : `_breadcrumb.css` contient `ar-breadcrumb` et `ar-breadcrumb-item`, etc.) — décision explicite : plus logique côté maintenance (`ariane`) et côté starter-kit (un fichier = un composant à personnaliser), au prix d'une extraction un peu plus riche côté `build-css.js` (cf. ci-dessous) — mais ce coût est entièrement interne à ce script, invisible de l'extérieur.

**Panel et Anchor** : vérifié dans le fichier source — ce sont des tokens partagés (consommés via `var()` par plusieurs composants), pas des règles partagées ; aucune règle CSS dédiée "Panel"/"Anchor" n'existe dans la section THÈME COMPOSANTS, chaque composant applique ses propres règles en consommant ces tokens. Fragments tokens-only, dans `shared/`, cohérent avec la convention déjà existante côté TypeScript (`packages/core/src/styles/shared/panel.styles.ts`).

### Fichier d'entrée : `@import ... layer()`, pas de nesting dans `@layer`

```css
/**
 * ariane.css — thème de la doc/démo Ariane ("Le Fil").
 * ...
 */
@import url('./ariane/_palette.css') layer(ariane.theme);
@import url('./ariane/_semantic-tokens.css') layer(ariane.theme);
@import url('./ariane/_global-tokens.css') layer(ariane.theme);
@import url('./ariane/shared/_panel.css') layer(ariane.theme);
@import url('./ariane/shared/_anchor.css') layer(ariane.theme);
@import url('./ariane/components/_alert.css') layer(ariane.theme);
/* ... un @import par fragment, ordre = ordre de dépendance (palette avant semantic-tokens avant global avant shared avant components) */
```

Chaque fragment ne contient **pas** son propre `@layer` — la couche est assignée par le qualificatif `layer(ariane.theme)` sur l'`@import`, pas par le contenu importé. **Vérifié empiriquement** (spike esbuild 0.28.2, `bundle: true`) : plusieurs `@import ... layer(ariane.theme)` bundlent en plusieurs blocs `@layer ariane.theme { ... }` dans la sortie, qui **fusionnent en une seule couche cumulative** selon la spec CSS Cascade Layers (même nom de couche = même couche) — comportement final identique au bloc `@layer` unique actuel. Zéro warning esbuild, minifié et non-minifié.

### `dist/` reste un seul fichier bundlé

`scripts/build-css.js` : ajouter `bundle: true` à la config esbuild (aujourd'hui `false`) pour l'entry point `ariane.css` — résout les `@import` à la compilation. Résultat : `dist/styles/themes/ariane.css` reste un unique fichier minifié, comme `default.css` aujourd'hui — **zéro changement pour le consommateur** (`<link>`/import bundler), zéro requête HTTP supplémentaire. La source (`src/`) reste éclatée pour la maintenabilité et sert de base au starter-kit (#230, en pause) pour sa propre version à base d'`@import` (destinée à être forkée/éditée, donc pas soumise à la même contrainte de perf réseau).

**Exclure les fragments (`_*.css`) de la liste des entry points esbuild** — sinon chaque fragment serait aussi construit comme artefact `dist/` autonome. Seuls les fichiers ne commençant pas par `_`, directement sous `src/styles/themes/` ou `src/styles/presets/`, sont des entry points (comportement actuel de `findCssFiles`, à filtrer en plus par préfixe).

### Génération du JS jumeau (`ariane.js`, #170) : extraction consciente de la structure, plus d'ancre textuelle

Remplace le marqueur `build-split-anchor: components` par une petite fonction qui opère sur la sortie **déjà bundlée** par esbuild (après résolution des `@import`, donc un ou plusieurs blocs `@layer ariane.theme { ... }` consécutifs) :

- Parcourt chaque bloc `@layer ariane.theme { ... }` de la sortie bundlée.
- À l'intérieur, ne garde que les règles de premier niveau dont le sélecteur **n'est pas** `:root`, `:root[data-theme='dark']`, `[data-theme='dark']`, `:root[data-theme='light']`, `[data-theme='light']` (les tokens et le pilotage du mode clair/sombre — inutiles dans un shadow root adopté, cf. commentaire existant : les tokens traversent déjà la frontière shadow DOM par héritage CSS).
- Concatène les règles conservées dans un nouveau `@layer ariane.theme { ... }` unique pour la sortie JS (mécanisme de ré-enrobage déjà existant, inchangé).

Implémentation : repérage de blocs de premier niveau par comptage d'accolades (pas besoin d'un vrai parseur CSS — même niveau de rusticité que les validateurs existants du projet). Fonction pure, testable avec des fixtures CSS courtes (bloc `@layer` contenant un mix `:root` + règles composant).

### Garde-fou : un token ne doit être déclaré que dans un seul fragment

Nouveau script (`packages/core/scripts/validate-no-duplicate-tokens.js` ou 4ᵉ vérification ajoutée au plugin CEM existant) : parcourt tous les fragments, extrait chaque déclaration `--ar-*`, erreur si un même nom de token apparaît dans plus d'un fragment (le dernier en ordre d'import écraserait silencieusement les autres — cf. spike, comportement `:root` cumulatif mais dernière déclaration du **même** nom qui gagne). Complète le filet de sécurité existant (couverture `@cssprop`, valeurs codées en dur, ordre part+état).

### Résolution des fragments pour les validateurs CEM (pas de dépendance à l'ordre du build)

`npm run build` exécute `build:manifest` (CEM, donc les validateurs) **avant** `build:css` — les validateurs ne peuvent pas dépendre du bundle `dist/` déjà généré. Nouvel utilitaire partagé `packages/core/scripts/resolve-theme-source.js` : lit le fichier d'entrée (`src/styles/themes/ariane.css`), résout récursivement chaque `@import url('...') layer(...);` par une lecture de fichier + concaténation de texte brut (pas une vraie résolution CSS — juste ce dont les validateurs ont besoin : le texte complet pour en extraire des noms de tokens/règles). Utilisé par les 3 validateurs existants (mise à jour du chemin en dur `src/styles/themes/default.css`) et par le nouveau garde-fou anti-doublon.

`scripts/build-css.js`, lui, continue d'utiliser la vraie résolution esbuild (déjà disponible, gère correctement `@layer`/nesting/minification) — pas besoin du même utilitaire là où un vrai bundler tourne déjà.

### Pas de compatibilité ascendante

Bibliothèque en `0.1.0-alpha.8`, aucune version stable publiée — pas de fichier `default.css` de compatibilité conservé en plus. Renommage propre. Cohérent avec `CLAUDE.md` : "Dépréciation ... pas nécessaire en alpha".

### Mise à jour des références existantes

~80 fichiers référencent `default.css`/`default.js`/`defaultTheme` (README, CLAUDE.md, ADRs, specs/plans passés, tests, pages Astro de la doc, `packages/core/README.md`, scripts de validation). Traitement mécanique (recherche/remplacement) en une task dédiée du plan, pas de décision de conception par fichier — seule exception : les **specs/plans archivés** (`docs/superpowers/specs/*.md`, `docs/superpowers/plans/*.md`) ne sont **pas** modifiés (ce sont des documents historiques, pas du code vivant).

## Hors scope (explicitement)

- Repo starter-kit externe (#230 points 3&4) — reste en pause, repris après ce chantier.
- Renommage des tokens `--ar-*` eux-mêmes — seule l'organisation en fichiers change, pas les noms de custom properties ni leurs valeurs.
- Fichier de compatibilité `default.css` — pas de shim, alpha assume les breaking changes.
- Split plus fin que "une famille de composant = un fragment" (ex. un fragment par variant) — pas justifié à ce stade.

## Points restant à trancher en implémentation (pas bloquants pour le plan)

- Ordre exact des `@import` dans `ariane.css` (doit respecter les dépendances `var()` entre fragments : palette avant semantic-tokens avant global avant shared avant components — à vérifier fragment par fragment lors de l'extraction réelle du contenu).
- Détail exact de la frontière entre `_global-tokens.css` et les tokens par composant pour certains cas limites (ex. `--ar-field-gap`, actuellement en fin de section 6, référencé par plusieurs composants).
