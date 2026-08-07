# Spec — lot 8, migration token vs `::part()` (issue #129)

**Date :** 2026-08-05
**Composants :** `ar-table-sort`, `ar-charcounter`, `ar-progressbar`, `ar-tab-group`, `ar-tab`, `ar-collapse`
**Référence :** ADR-005 (`docs/decisions/ADR-005-tokens-pilotes-par-attribut.md`), critère à 4 branches +
contraintes 1-6, pattern « part d'état » (BEM `--`).

## Contexte

Dernier lot groupé identifié dans l'audit du 2026-07-25 (candidats directs restants les moins
volumineux : `table-sort` 2, `collapse` 2, `charcounter` 1, `progressbar` 1, `tab-group` 1).
Traité en un seul lot/PR plutôt qu'en lots séparés vu le faible volume par composant. Audit
complet refait ici (étape 0 incluse — valeurs littérales jamais tokenisées, pas seulement les
tokens déjà nommés) plutôt que de reprendre les chiffres de l'audit initial tels quels.

## ar-table-sort

2 candidats confirmés :

- `--ar-table-sort-gap` (sur `[part='button']`) → migré en littéral dans `ar-table-sort::part(button)`.
- `--ar-table-sort-indicator-gap` (sur `[part='indicator']`) → migré en littéral dans
  `ar-table-sort::part(indicator)`.

4 tokens restent internes :

- `--ar-table-sort-indicator-size` : réutilisé 4× dans le même `.styles.ts` (largeur + 2×
  `calc()` de bordure de caret via `border-left`/`border-right`, + 2× hauteur de caret via
  `border-bottom`/`border-top`) — critère 3.
- `--ar-table-sort-indicator-color`, `--ar-table-sort-indicator-active-color`,
  `--ar-table-sort-indicator-pending-color` : pilotent des pseudo-éléments `::before`/`::after`
  de `[part='indicator']` — contrainte 3 (un `part` ne peut jamais cibler un pseudo-élément d'un
  élément `part`, `::part(indicator)::before` n'est pas un sélecteur valide).

### Étape 0 — état posé sur un élément qui porte déjà un `part`

`[part='button'][aria-disabled='true'] { cursor: wait; }` : `cursor: wait` n'a jamais été
tokenisé et pilote un état (`pending`, exposé sur le bouton via `aria-disabled="true"`) sur un
élément qui porte déjà un `part` — éligible au pattern part d'état plutôt que de rester figé en
interne. `pending` est déjà une `@property({ reflect: true })` de `ArTableSort`, il suffit de
conditionner l'attribut `part` du bouton dans le template (`part="button button--pending"` quand
`pending` est vrai). Nouvelle règle `ar-table-sort::part(button--pending) { cursor: wait; }`
déclarée après `::part(button)`, ouvre la porte à une personnalisation plus large que le curseur
seul (opacité, style visuel) pour un consommateur qui le souhaiterait.

## ar-charcounter

`[part='count']` porte déjà un `part` — le pattern « part d'état » (BEM `--`, établi lot 1)
s'applique directement aux surcharges `:host([state='warning'])`/`:host([state='error'])`.

- `--ar-charcounter-color` (base) + `--ar-charcounter-font-size` → migrés en littéral dans
  `ar-charcounter::part(count)`.
- `--ar-charcounter-warning-color` → nouveau part d'état `count--warning`, posé via
  `part="count count--warning"` en état warning ; règle `ar-charcounter::part(count--warning) {
color: ...; }` déclarée après `::part(count)` (garde-fou d'ordre `validate-part-state-order.js`).
- `--ar-charcounter-error-color` → même mécanisme, `count--error`.
- `--ar-charcounter-warning-weight` / `--ar-charcounter-error-weight` restent tokens : fallback
  WCAG déjà justifié (`a11y-fallback`, la graisse est le seul signal garanti sans thème quand la
  couleur seule ne distingue pas warning/error) — critère 1, prime sur la migration. Règle interne
  reciblée sur le part d'état lui-même (`[part~='count--warning']`/`[part~='count--error']`)
  plutôt que sur `:host([state='warning']) [part='count']` — les deux signaux (attribut `state`
  de l'hôte, token `part`) sont déjà synchronisés par le même rendu ; passer par le `part`
  directement évite de dupliquer la condition d'état sur deux mécanismes différents.

## ar-progressbar

### Nettoyage nomenclature (préalable)

Le CSS utilise encore des classes (`.progressbar-container`, `.progress-label`, `.content-label`,
`.progress`, `.progress-bar`, `.progress-percent`) strictement redondantes avec les `part` déjà
posés dans le template (`container`, `label`, `label-text`, percent, `track`, `bar`) — même dette
que `ar-stepper`/`ar-breadcrumb` avant leur nettoyage. Classes remplacées par des sélecteurs
`[part='...']` en interne, avant toute migration de token.

### Tokens

- `--ar-progressbar-percent-color` → migré en littéral dans `ar-progressbar::part(percent)`.
- `--ar-progressbar-track-color` / `--ar-progressbar-fill-color` restent tokens (fallback WCAG
  1.4.11 déjà justifié en JSDoc, `ButtonFace`/`ButtonText` — critère 1).

### Étape 0 — valeurs jamais tokenisées

- `border-radius: 50rem` sur `.progress`/`.progress-bar` (`track`/`bar`) → jamais tokenisé,
  candidat direct, migré en littéral dans `ar-progressbar::part(track)`/`::part(bar)`.
- `row-gap: 0.75rem` (container) → migré en littéral dans `ar-progressbar::part(container)`.
- `column-gap: 2rem` (label) → migré en littéral dans `ar-progressbar::part(label)`.

### Largeur du `:host` (`max-width: 500px` / `min-width: 200px`)

Décision du mainteneur : ni pur cosmétique (candidat direct) ni pur `functional-default` figé
façon `ar-dialog` — la largeur doit rester **mobile-first** (100% de l'espace disponible par
défaut) tout en gardant un plafond raisonnable en desktop, pour une raison a11y propre à ce
composant (lien visuel label/pourcentage — un `.progress-label` trop large éloigne le pourcentage
de son label, `column-gap: 2rem` fixe accentue le problème au-delà d'une certaine largeur).

Mécanisme retenu :

- `min-width: 200px` **supprimé** — contraire au mobile-first (imposait un plancher même sur un
  conteneur plus étroit que 200px, ex. une colonne mobile serrée). Le composant est `display:
block`, il occupe déjà 100% du conteneur parent par défaut sans qu'aucune règle ne soit
  nécessaire pour ce cas.
- `max-width` devient un token `--ar-progressbar-max-width` **normal**, déclaré dans
  `default.css :root` comme tous les autres tokens du lot — pas de mécanisme `functional-default`
  ici. `functional-default` (`--ar-dialog-width`) existe pour un cas précis qui ne s'applique pas
  à `ar-progressbar` : la largeur du dialog dépend d'un attribut (`size`/`mode`), donc plusieurs
  valeurs de repli conditionnelles doivent être assignées directement sur le token via plusieurs
  sélecteurs `:host([size='...'])` — un simple `var(--token, repli)` ne peut pas exprimer cette
  variance. `ar-progressbar` n'a aucune variance par attribut, une seule valeur de repli suffit :
  c'est exactement le cas couvert par le mécanisme `a11y-fallback` existant (amendement ADR-005
  du 2026-07-22, « valeur littérale justifiée » pour les dimensions sans équivalent système). Le
  token reste donc surchargeable normalement via `:root` par un consommateur, comme n'importe quel
  autre token de la librairie — pas de changement de mécanisme de personnalisation pour ce seul
  cas.

```css
:host {
    display: block;
    box-sizing: border-box;
    /* a11y-fallback: sans plafond, .progress-label peut s'étirer sur un conteneur très large et éloigner visuellement le pourcentage de son label (lien a11y label/valeur) */
    max-width: var(--ar-progressbar-max-width, 500px);
}
```

`min-width` retiré sans remplacement (mobile-first — `display: block` occupe déjà 100% du
conteneur parent par défaut, aucun plancher n'est nécessaire).

## ar-tab-group

1 seul candidat confirmé :

- `--ar-tab-group-gap` (sur `[part='base']`, single use) → migré en littéral dans
  `ar-tab-group::part(base)`.

Restent tokens (contrainte 4, réutilisation croisée) :

- `--ar-tab-group-border-top-width` / `--ar-tab-group-border-bottom-width` : lus par
  `tab.styles.ts` (`margin-block-start/end: calc(-1 * var(--ar-tab-group-border-*-width, 0px))`)
  pour compenser visuellement la bordure du groupe parent — cas déjà documenté dans ADR-005.
- `--ar-tab-group-border-color` : réutilisé 2× dans `tab-group.styles.ts` lui-même (règle
  `border-top` et `border-bottom`) — critère 3, réutilisation interne suffisante à elle seule,
  indépendamment de la contrainte 4.

## ar-tab

Initialement laissé hors scope (non mentionné dans le lot groupé), réintégré sur remarque du
mainteneur — couplé à `ar-tab-group` (tokens de bordure partagés), logique de traiter les deux
ensemble. Un seul `part` existant (`base`), toutes les propriétés migrables ciblent cet élément
ou `:host`.

### Migrables directement (branch 4, `:host`, single use)

- `--ar-tab-border-radius` → `ar-tab { border-radius: ...; }`.
- `--ar-tab-font-weight` → `ar-tab { font-weight: ...; }`.

`[part='base'] { border-radius: inherit; }` reste interne et continue de fonctionner tel quel :
`inherit` récupère la valeur calculée du host, que sa source soit interne ou externe.

### Nouvelle propriété Lit `active`, pilotée par `ar-tab-group`

Plutôt que de faire observer à `ar-tab` son propre attribut `aria-selected` (posé de l'extérieur
par `ar-tab-group._syncAll()` via `tab.setAttribute()`, donc invisible au cycle réactif de Lit
sans plomberie `attributeChangedCallback` dédiée), remarque du mainteneur reprise ici : ajouter
une véritable `@property({ reflect: true, type: Boolean }) active = false;` sur `ArTab` — même
pattern que le `active`/`selected` de WebAwesome (`sl-tab`). `ar-tab-group._syncAll()` fait
`tab.active = isActive;` (assignation de propriété JS) en plus de
`tab.setAttribute('aria-selected', String(isActive))`, inchangé — la sémantique ARIA reste une
responsabilité du tablist (même modèle que `role`/`aria-controls`/`tabindex`/`aria-disabled`,
déjà posés de la même façon), seul l'état visuel devient une propriété réactive Lit native. Plus
besoin d'`attributeChangedCallback`/`observedAttributes` : `render()` lit `this.active`
directement, Lit re-render automatiquement au changement de propriété.

**Nommage** : `active` pour la propriété/attribut d'hôte (aligné sur l'écosystème, WebAwesome) —
ne recrée pas la collision déjà écartée le 2026-07-27, qui concernait spécifiquement un _suffixe
de part d'état_ (`::part(x--active)` vs `::part(x):active`), pas un attribut d'hôte (`[active]`
vs `:active` sont des syntaxes non ambiguës). Le part d'état lui-même garde le nom `selected`
(`base--selected`) pour éviter cette collision documentée.

### `color`/`bg` — base + hover (pseudo-classe native, composition externe)

`color`/`bg` de base migrent vers `ar-tab::part(base)`. Le survol
(`:host(:hover:not([disabled]):not([active])) [part='base']`) est une pseudo-classe **native**
qui compose normalement avec une base externe, à condition que la règle de survol pour la même
propriété soit **elle aussi** externe (clarification ADR-005 du 2026-07-28, cas du bouton close
`ar-alert`) : migré vers `ar-tab:hover:not([disabled]):not([active])::part(base) { color: ...;
background: ...; }`.

### `active-color`/`active-bg` — état posé par le parent, pattern part d'état

`:host([active]) [part='base']` (nouvel attribut réfléchi, cf. ci-dessus) cible un état posé sur
un élément qui porte déjà un `part` — éligible au pattern part d'état comme les cas précédents du
chantier. `render()` conditionne `part="base base--selected"` sur `this.active`. Nouvelle règle
`ar-tab::part(base--selected) { color: ...; background: ...; }` déclarée après `::part(base)`
(garde-fou d'ordre).

### `disabled-opacity` — état sur `:host`, migration via sélecteur d'attribut externe

`:host([disabled]) { opacity: var(--ar-tab-disabled-opacity); }` — `:host` ne porte pas de `part`
(le pattern part d'état ne s'applique qu'aux éléments descendants), mais le précédent
`ar-alert[hiding] { }` (2026-07-28) s'applique directement : un sélecteur d'attribut externe sur
le tag l'emporte purement sur la règle `:host([attr])` interne. Migré vers
`ar-tab[disabled] { opacity: ...; }`.

### Nettoyage — tokens de composition jamais consommés par le composant

`--ar-tab-indicator-color`/`--ar-tab-indicator-width` sont documentés `@cssprop` mais **jamais
consommés via `var()` dans `tab.styles.ts`** — utilisés uniquement à l'intérieur de `default.css`
pour composer `--ar-tab-active-shadow` (seul token réellement lu par le composant, avec son repli
`a11y-fallback`). Même raisonnement que le nettoyage `ar-pagination` (lot 6, `color`/`bg` non
consommés en interne) : ce ne sont pas de vrais tokens d'API du composant, juste un choix
d'implémentation de `default.css`. Supprimés comme tokens publics, valeurs inlinées directement
dans la composition de `--ar-tab-active-shadow` dans `default.css`.

### Bug trouvé — repli a11y manquant sur `--ar-tab-focus-ring-offset`

`outline-offset: var(--ar-tab-focus-ring-offset);` n'a **aucun repli**, alors que sa valeur
négative documentée (`-2px` dans `default.css`) a un rôle fonctionnel réel : éviter que l'anneau
de focus soit rogné par `overflow-x: auto` du conteneur `[part='nav']` d'`ar-tab-group`. Sans
thème chargé, la propriété devient invalide faute de valeur de repli — anneau de focus
potentiellement coupé (WCAG 2.4.7). Corrigé avec `var(--ar-tab-focus-ring-offset, -2px)`, même
mécanisme que `--ar-tab-focus-ring-color` juste au-dessus dans le même bloc (qui a déjà son
repli `ButtonText`). Cette règle reste interne dans les deux cas (le repli n'a de sens que si la
déclaration elle-même vit dans le composant — `default.css` peut être totalement absent).

## ar-collapse

**0 candidat** — les deux tokens (`--ar-collapse-duration`, `--ar-collapse-easing`) sont bloqués :

- `--ar-collapse-duration` : lu en JavaScript via `getComputedStyle(this._panel).transitionDuration`
  dans `_shouldAnimate()` — critère 2 (lecture JS), verrouillé indépendamment de tout autre
  critère.
- `--ar-collapse-easing` : consommé dans la **même** déclaration `transition` que `duration`
  (`transition: height var(--ar-collapse-duration) var(--ar-collapse-easing);`). Une déclaration
  CSS shorthand ne peut pas être scindée entre une partie interne et une partie externe — migrer
  `easing` seul en `::part()` laisserait `duration` piloter une transition à moitié externalisée,
  cassant la garantie que `_shouldAnimate()` mesure la durée réellement appliquée. `easing` reste
  donc interne par indivisibilité de la déclaration, pas par un critère propre.

Aucune valeur littérale jamais tokenisée trouvée à l'étape 0 (`[part='base']` : `display`/
`flex-direction`/`align-items` sont structurels, pas des choix de design arbitraires).

Décision du mainteneur : inclure quand même `ar-collapse` dans ce lot pour documenter le résultat
dans l'ADR-005 et clore définitivement ce composant dans le chantier #129, plutôt que de laisser
un audit non traité.

## Résumé des changements de surface publique

| Composant   | Tokens supprimés/migrés                                                                                                                                                            | Nouveaux `::part()`/parts d'état                                                                          | Tokens conservés                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| table-sort  | 2 (`gap`, `indicator-gap`) + 1 littéral (`cursor: wait`)                                                                                                                           | `::part(button)`, `::part(button--pending)`, `::part(indicator)`                                          | 4                                                                                                         |
| charcounter | 4 (`color`, `font-size`, `warning-color`, `error-color`)                                                                                                                           | `::part(count)`, `::part(count--warning)`, `::part(count--error)`                                         | 2 (weights)                                                                                               |
| progressbar | 4 (`percent-color` + 3 littéraux jamais tokenisés) ; `min-width` supprimé                                                                                                          | `::part(track)`, `::part(bar)`, `::part(percent)`, `::part(container)`, `::part(label)`                   | 3 (track/fill + 1 nouveau `max-width`, a11y-fallback)                                                     |
| tab-group   | 1 (`gap`)                                                                                                                                                                          | `::part(base)`                                                                                            | 3                                                                                                         |
| tab         | 6 (`border-radius`, `font-weight`, `color`, `bg`, `hover-color`, `hover-bg`, `disabled-opacity`) — 7 en comptant, + 2 tokens de composition supprimés (`indicator-color`/`-width`) | `ar-tab { }`, `::part(base)`, `::part(base--selected)`, `ar-tab:hover...::part(base)`, `ar-tab[disabled]` | 4 (`padding-x/y`, `focus-ring-color`, `active-shadow`) + `active-color`/`active-bg` migrés en part d'état |
| collapse    | 0                                                                                                                                                                                  | —                                                                                                         | 2                                                                                                         |

**Bug corrigé au passage (hors migration)** : repli a11y manquant sur `--ar-tab-focus-ring-offset`.

## Vérification prévue

- `npm run build:manifest` (garde-fous `validate-no-hardcoded-tokens.js`,
  `validate-cssprop-defaults.js`, `validate-part-state-order.js`).
- Diff empirique `getComputedStyle` (ancien commit vs nouveau, propriété par propriété) sur chaque
  composant modifié — méthode retenue depuis le nettoyage `ar-stepper`/`button.styles.ts` (PR
  #156), plus fiable que la seule capture Playwright pour des écarts fins.
- Captures Playwright avec/sans thème (régression visuelle + rendu nu accessible).
- `npm run test:all` (Vitest + WTR browser).
