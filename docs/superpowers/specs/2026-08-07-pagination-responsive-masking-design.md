# Design — Masquage responsive progressif d'ar-pagination (#152)

**Statut :** Validé (en attente de plan d'implémentation)
**Date :** 2026-08-07
**Issue :** [#152](https://github.com/jogo-labs/ariane/issues/152) — `ar-pagination` : repenser le
masquage responsive

## Contexte

`ar-pagination` masque actuellement ses numéros de page intermédiaires via une media query CSS
unique (`max-width: 640px`) qui ne tient compte ni du nombre de pages réellement rendues par
`_calculatePages` (jusqu'à 9 numéros + prev/next), ni de la largeur réelle du composant. Deux
problèmes en découlent : un seuil binaire non progressif, et un référentiel viewport plutôt que
composant — inadapté à un composant qui peut être placé dans un conteneur étroit (sidebar) sur un
écran large, ou en pleine largeur sur mobile.

Trouvé lors de l'audit token-vs-part #129 (lot 6), hors scope de cette migration, traité ici
séparément.

## Décisions issues du brainstorming

- **Référentiel de largeur** : la largeur propre du composant (son conteneur), pas le viewport.
  Le composant peut être intégré dans des contextes de largeur variable indépendants de l'écran.
- **Mécanisme** : JavaScript (`ResizeObserver`) plutôt que CSS pur (`@container`). Les seuils de
  container queries en dur seraient désynchronisés dès qu'un thème personnalise
  `--ar-pagination-btn-size` ou la typographie (`var()` n'est pas utilisable dans une condition
  `@container`) — incohérent avec la philosophie headless du projet (ADR-004).
- **Plancher minimal à largeur extrême** : prev/next + page courante + un texte visible en
  permanence `Page X / Y` (pas un nouveau widget interactif type `<select>`/combobox — hors scope,
  élargirait significativement le périmètre de cette issue vers un nouveau pattern d'interaction).

## Architecture

### 1. Mesure

Un `ResizeObserver` observe l'élément `<nav part="nav">` et déclenche, à chaque changement de
largeur, le recalcul d'un **budget** : le nombre de slots numériques (pages + ellipses, hors
prev/next) que l'espace disponible peut contenir.

- Largeur disponible pour les numéros = largeur du `nav` − largeur mesurée de `prev` − largeur
  mesurée de `next`.
- Largeur d'un item numérique : mesurée sur un item réellement rendu (ex. premier `<li>`
  numérique) après le premier rendu complet. Une valeur unique est utilisée pour tous les items
  (ils partagent un `min-width` commun via `--ar-pagination-btn-size`) — un composant avec des
  tailles d'item hétérogènes n'est pas dans le périmètre de cette issue.
- Pas de debounce/throttle sur le callback : le volume d'événements de resize pour ce composant
  est faible (pas un cas de scroll/drag continu).

Avant la première mesure (`firstUpdated`), le composant utilise un budget par défaut généreux
(comportement actuel, aucune troncature) pour éviter un rendu vide. Un léger réajustement visuel
au tout premier paint est accepté comme compromis assumé, sans mécanisme de masquage préventif
(pas de sur-ingénierie pour un flash d'une frame).

### 2. Algorithme de pagination généralisé

`_calculatePages(current, total, budget?)` est étendu avec un paramètre `budget` optionnel :

- **Sans `budget`** (ou budget suffisant pour le total) : comportement actuel inchangé — jusqu'à 9
  slots (boundary 1 + 2 ellipses + 5 pages autour de la courante) ou liste complète si
  `total < 10`.
- **Avec `budget` réduit** : réduction progressive du nombre de pages voisines affichées autour de
  la page courante (`siblingCount` décroissant : 2 → 1 → 0), puis abandon de first/last si le
  budget est encore insuffisant.
- **Sous le plancher** (budget ne permet même plus prev/next + courante + first/last) : ce cas
  n'est plus traité par `_calculatePages` mais par un mode de rendu distinct (voir §3).

Le budget pilote directement ce qui est **généré**, pas ce qui est **masqué en CSS** après coup —
contrairement à l'implémentation actuelle qui masque via `display: none` des `<a>` déjà présents
dans le DOM. Bénéfice secondaire : l'ordre de tabulation reflète naturellement ce qui est visible,
sans dépendre d'un `display:none` sur des liens qui restent focusables par défaut.

### 3. Palier texte

En dessous du budget plancher, la liste de numéros est remplacée par un texte visible en
permanence "Page X / Y" (réutilise l'infrastructure existante de `renderPageLabel`/annonce
a11y). prev/next restent affichés et fonctionnels dans tous les cas.

### 4. CSS

- Suppression de la media query `@media screen and (max-width: 640px)` (`pagination.styles.ts`).
- `[part='list']` passe de `flex-wrap: wrap` à `flex-wrap: nowrap` — le budget calculé par JS
  garantit que ce qui est rendu tient toujours sur une ligne, le wrap n'est plus un filet de
  sécurité nécessaire.

## Tests

- **Unitaires (Vitest)** : `_calculatePages(current, total, budget)` sur chaque palier de budget
  (large/inchangé, réduit avec siblingCount décroissant, minimal sans first/last). Le cas
  `total < 10` (déjà sans ellipse aujourd'hui) doit aussi pouvoir être tronqué si le budget est
  très restreint.
- **Browser (WTR)** : comportement responsive réel — redimensionner le conteneur et vérifier
  quels `part` sont présents à différentes largeurs, y compris le palier texte. Un `ResizeObserver`
  mocké en Vitest classique ne reflète pas le comportement réel du navigateur, donc pas de test
  unitaire sur ce point.

## Hors scope

- Un widget de saut de page (`<select>`/combobox) sur les très petites largeurs — pattern
  d'interaction différent, non demandé par l'issue.
- Support de tailles d'item hétérogènes entre les numéros de page.
- Débounce/throttle du `ResizeObserver` — à reconsidérer seulement si un cas d'usage réel montre
  un problème de performance.
