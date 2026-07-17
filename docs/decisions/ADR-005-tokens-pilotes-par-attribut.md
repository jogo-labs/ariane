# ADR-005 : Tokens pilotés par attribut — pas de valeur littérale dans les composants

**Statut :** Adopté
**Date :** 2026-07-16

## Contexte

ADR-004 pose la répartition en 3 couches (styles internes fixes / tokens `--ar-*` / `::part()`)
mais illustre la couche 2 avec un exemple aujourd'hui dépassé : `color: var(--ar-tab-color, currentColor)`,
un fallback fonctionnel inline dans le composant. Depuis le chantier headless (#47, PR #90), la
pratique a changé : `packages/core/src/styles/themes/default.css` est la seule source de valeurs de
design, sans fallback dans les composants (cf. CLAUDE.md, section « Philosophie de conception »).
Le reste d'ADR-004 (répartition en 3 couches) reste valide — seul cet exemple ponctuel est obsolète.

L'audit de `dialog.styles.ts` (2026-07-16, cf.
`docs/superpowers/specs/2026-07-16-dialog-width-headless-tokens-design.md`) a révélé un cas non
couvert par la règle « aucun fallback cosmétique » : des tokens dont la valeur dépend d'un
attribut du composant (`--ar-dialog-width` piloté par `size`/`mode`), codés en dur directement
sur `:host([size='sm'])` etc. Ce cas n'est pas un fallback au sens d'ADR-004 (pas de
`var(--token, valeur)` inline) mais une violation de même nature : une valeur de design présente
dans le code du composant plutôt que dans `default.css`.

## Décision

Amendement à ADR-004 : l'exemple `var(--ar-tab-color, currentColor)` ne doit plus être suivi —
aucune valeur de repli, fonctionnelle ou cosmétique, ne doit apparaître dans le CSS d'un composant.
Toute valeur de design vit dans `default.css`, consommée via `var(--token)` sans second argument.

Nouvelle règle pour les tokens pilotés par état/attribut : chaque état a son propre token
`default.css`, nommé `--ar-<composant>-<propriété>-<état>` (ex. `--ar-dialog-width-sm`). Le
composant sélectionne la valeur via `var()` dans ses règles d'attribut (`:host([attr='...'])`) —
jamais de valeur littérale, même conditionnelle. Le token « consolidé » que ces règles alimentent
(ex. `--ar-dialog-width`) reste public et documenté (`@cssprop`) s'il sert aussi de point de
surcharge direct pour un consommateur.

Un garde-fou automatique (`packages/core/scripts/validate-no-hardcoded-tokens.js`, branché dans
`cem.config.js`) fait échouer `npm run build:manifest` si une assignation `--ar-*: <valeur littérale>;`
est détectée dans un fichier `*.styles.ts`.

## Exception assumée : l'attribut `size`

`size` (`sm`/`md`/`lg`/`xl`) sort de l'esprit headless, indépendamment de la règle ci-dessus sur
le sourcing des tokens. Le sourcing est conforme (chaque palier vient d'un token `default.css`,
rien n'est codé en dur) — ce qui sort du cadre, c'est l'existence même d'une taxonomie de tailles
imposée par le composant : une librairie headless au sens strict n'a pas d'opinion sur les
paliers de largeur d'un dialog, elle expose juste le point de surcharge (`--ar-dialog-width`) et
laisse le consommateur choisir sa valeur. C'est le choix fait par des libs comparables comme
WebAwesome, qui n'a pas d'attribut `size` sur son dialog.

Ariane assume cette exception plutôt que de la corriger : les paliers apportent une valeur a11y/DX
réelle (évite les dialogs démesurés par défaut, cohérence visuelle immédiate) sans rien retirer au
modèle headless — `--ar-dialog-width` reste un point de surcharge direct, `size` n'est qu'une
commodité au-dessus. C'est aujourd'hui un cas isolé : aucun autre composant de la librairie
n'expose d'attribut de taille équivalent. Un futur composant qui voudrait reproduire ce pattern
doit se reposer la question plutôt que copier `size` par mimétisme — l'exception n'est pas un
précédent générique.

## Conséquences

- `dialog.styles.ts` migré : `--ar-dialog-spacing` et les 8 variantes de `--ar-dialog-width`
  (`sm`/`md`/`lg`/`xl` × `modal`/`drawer`) sourcées depuis `default.css`.
- Tout nouveau composant avec une valeur pilotée par attribut doit suivre ce pattern dès sa
  conception — le garde-fou automatique le rappellera sinon au premier `npm run build:manifest`.
- Pas de convention de nommage pour des tokens véritablement internes/non documentables — écartée
  faute de cas concret (YAGNI), à documenter séparément si un besoin apparaît.
