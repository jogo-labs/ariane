# `ar-breadcrumb` — audit CSS hérité + token vs `::part()` (lot 4, issue #129)

**Date :** 2026-07-30
**Statut :** Validé, prêt pour plan d'implémentation

## Contexte

Suite de la généralisation du critère token-vs-part (ADR-005) engagée sur `ar-stepper` (lot 1),
`ar-datepicker` (lot 2), `ar-alert`/`ar-dialog` (lots 3a/3b). `ar-breadcrumb` est le premier des
4 composants du lot 4 (`breadcrumb`, `dropdown`, `pagination`, `tooltip`).

Particularité signalée avant de commencer : le CSS de `ar-breadcrumb` vient d'un import d'un
autre projet, potentiellement peu optimisé pour le HTML réellement rendu par le composant actuel.
Une passe d'audit du CSS hérité (classes/propriétés vs structure réelle) a donc précédé
l'application du critère token-vs-part proprement dit — même esprit que la refonte du bouton
close d'`ar-dialog` en lot 3b (audit « crucial vs cosmétique » avant tout code).

Cet audit a été mené par lecture croisée de `breadcrumb.ts` (template) et `breadcrumb.styles.ts`
(sélecteurs), vérifié visuellement (Playwright, viewport mobile 375px, panel dropdown ouvert)
pour le point le plus incertain (puce mobile), puis étendu en cours de revue à deux axes
supplémentaires demandés par le mainteneur : appliquer systématiquement la logique « ajouter un
`part` pour débloquer un token » (au lieu de considérer un blocage structurel comme définitif),
et nettoyer la nomenclature interne des mentions redondantes de « breadcrumb » — même geste que
le nettoyage de classes internes déjà mené sur `ar-stepper` (lot 1).

## 1. Nettoyage CSS mort/redondant + suppression des classes `.breadcrumb-*` redondantes avec un `part`

Trouvé en comparant le HTML réellement rendu (aucune icône dans un item, un seul `<ol>` actif à
la fois) aux sélecteurs déclarés :

- **`.breadcrumb-text .icon:first-child`, `.breadcrumb-link .icon:first-child`,
  `.breadcrumb-link:visited .icon:first-child`** — supprimées. `ArBreadcrumbItem` n'expose que
  `label`/`href`, aucune icône n'est jamais rendue dans `[part='current']`/`[part='link']`. CSS
  mort, résidu de l'import.
- **`.breadcrumb-desktop .breadcrumb-item + .breadcrumb-item { padding: 0; }`** — supprimée,
  aucune autre règle ne donne de padding à un `<li>` (valeur native déjà 0).
- **`padding: 0`/`position: relative` sur les items mobiles** — supprimés. `position: relative`
  n'a jamais été nécessaire sur l'item lui-même (rien n'y est positionné en absolu, seul l'`<ol>`
  parent en a besoin pour son connecteur pointillé — qui reste un `::before`, cf. section 3.3).

**Chaque élément qui porte déjà un `part` perd sa classe `.breadcrumb-*` dédiée**, devenue
strictement redondante — même nettoyage que celui mené sur `ar-stepper` (lot 1, classes
`.stepper-*` remplacées par des sélecteurs `[part=...]`) :

| Avant                                               | Après                                                                                                                                                                                   |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<nav part="nav" class="breadcrumb-container">`     | `<nav part="nav">` — règle stylée via `[part='nav']`                                                                                                                                    |
| `<ol class="breadcrumb breadcrumb-desktop">`        | `<ol part="list list--desktop">` (voir section 2)                                                                                                                                       |
| `<ol class="breadcrumb breadcrumb-mobile">`         | `<ol part="list list--mobile">` (voir section 2)                                                                                                                                        |
| `<a part="link" class="breadcrumb-link">`           | `<a part="link">` — règle stylée via `[part='link']`                                                                                                                                    |
| `<span part="current" class="breadcrumb-text">`     | `<span part="current">` — règle stylée via `[part='current']`                                                                                                                           |
| `<li part="item" class="breadcrumb-item[ active]">` | `<li part="item">` (voir ci-dessous, `.active` disparaît sans remplacement sur cet élément)                                                                                             |
| `<div class="breadcrumb-dropdown">`                 | `<div class="dropdown">` — wrapper structurel sans valeur de style pilotée, pas de `part` nécessaire, préfixe retiré (même sort que `.stepper-dropdown` → `.dropdown` sur `ar-stepper`) |

**`.active` retirée — bug de cascade découvert, pas juste une redondance.**
`.breadcrumb-item.active { color: ...; font-weight: 700; }` cible le `<li>`. `color` est
redondant (déjà identifié : `color: inherit` sur l'enfant laisse remonter la valeur de l'ancêtre,
donc ce doublon n'a pas d'effet visuel). `font-weight: 700` est différent : l'enfant
`.breadcrumb-text` déclare sa **propre valeur littérale** `font-weight: 400` — en CSS, une
déclaration directe sur un élément l'emporte toujours sur l'héritage, quelle que soit la
spécificité comparée entre les deux règles (qui portent d'ailleurs sur des éléments différents,
li vs span). Résultat : `font-weight: 700` n'a **jamais** été visuellement appliqué depuis
l'origine du composant — l'élément courant n'a jamais été distinct par la graisse, seule sa
couleur (héritée, identique aux autres) et `aria-current="page"` le signalent.

**Décision du mainteneur : corriger le bug plutôt que documenter la disparition d'un no-op.**
Pas besoin de créer un `item--current` (part d'état sur `item`) pour ça : `part="current"` sur le
`<span>` désigne déjà, par construction, exclusivement l'élément courant (seul le dernier item
est jamais rendu comme `current` plutôt que `link`). `font-weight: 700` migre directement sur ce
part existant : `ar-breadcrumb::part(current) { font-weight: 700; }`, littéral (branche 4, usage
unique, pas de fallback critique). **Premier changement visuel réel de ce lot** (contrairement à
tout le reste de la section 1) — à vérifier visuellement avant de merger, comme tout changement
de rendu.

Aucun changement visuel attendu pour ce point, à l'exception du fix `font-weight` ci-dessus —
vérification de non-régression (et du nouveau rendu gras) en implémentation.

## 2. `part="list"` commun + variantes `list--desktop`/`list--mobile` — débloque `--ar-breadcrumb-color`

**Constat initial (première passe de cette spec) :** `--ar-breadcrumb-color` semblait devoir
rester un token car la classe `.breadcrumb` qui le consomme est partagée par les deux `<ol>`
(mobile et desktop), et seul le desktop exposait un `part` (`list`, déjà existant côté desktop
via `part="list"` sur l'`<ol>` desktop uniquement).

**Révision (suite à relecture par le mainteneur) :** rien n'empêche de poser le même `part` sur
les deux `<ol>` — ils ne coexistent jamais dans le DOM (rendu conditionnel selon `isMobile`), donc
`part="list"` désigne sans ambiguïté « la liste actuellement affichée », que ce soit la version
desktop ou mobile. Deux `part` supplémentaires en variante, même convention BEM `--` que
`bullet`/`bullet--current` sur `ar-stepper` :

- `<ol part="list list--desktop">` — remplace `.breadcrumb.breadcrumb-desktop`.
- `<ol part="list list--mobile">` — remplace `.breadcrumb.breadcrumb-mobile`.

`default.css` :

```css
ar-breadcrumb::part(list) {
    color: var(--ar-breadcrumb-color);
}
```

`--ar-breadcrumb-color` **migré en branche 4** — n'est plus un token consommé par
`breadcrumb.styles.ts`. Le composant ne déclare plus `margin`/`padding`/`border-radius`/
`background-color`/`color` sur `[part='list']` du tout : ces valeurs (dont le `margin: 0` déjà
identifié comme redondant entre `.breadcrumb-mobile` et `.breadcrumb` dans l'audit initial)
deviennent une opinion de thème unique sur `::part(list)`, cosmétiques et sans fallback critique
(nav reste utilisable sans thème, juste sans mise en forme).

`[part~='list--desktop']`/`[part~='list--mobile']` gardent en interne uniquement ce qui est
structurel (jamais une question de thème) : `display: flex; flex-flow: row wrap;` pour le
desktop, `display: flex; flex-direction: column;` + `position: relative` pour le mobile (nécessaire
au positionnement absolu du connecteur pointillé, cf. section 3.3, qui reste un `::before` de
cet élément) — ce ne sont pas des valeurs de design, elles ne migrent pas.

## 3. Puce mobile et séparateur desktop — pseudo-éléments → vrais éléments `part`

**Constat initial :** 5 tokens (`separator-color`, `bullet-color`, `bullet-ring-color`,
`mobile-separator-color`, `active-bullet-color`) restaient bloqués par la contrainte 3 de
l'ADR-005 (`::part()` ne peut jamais cibler `::before`/`::after`), tous portés par des
pseudo-éléments décoratifs.

**Révision (demande explicite du mainteneur — appliquer partout où c'est possible la logique
« un blocage structurel n'est pas définitif, on peut ajouter ce qu'il faut pour débloquer », déjà
pratiquée sur `ar-stepper`/`ar-datepicker` en créant de nouveaux `part`), puis nuancée après
discussion :** un pseudo-élément décoratif est structurellement **impossible à exposer par erreur**
à l'arbre d'accessibilité — aucune vigilance requise, contrairement à un vrai `<span>` qui dépend
d'un `aria-hidden="true"` posé et maintenu correctement. La contrainte 3 de l'ADR-005 n'est
d'ailleurs pas formulée comme un oubli à corriger : c'est une exception délibérément permanente,
au même rang que « lu en JS » ou « réutilisé inter-composants ». La convertir en vrai élément ne
se justifie donc que si le gain dépasse la simple réduction du nombre de tokens — typiquement
quand un thème pourrait vouloir aller au-delà de la couleur (forme, bordure, contenu).

C'est le cas pour la **puce** (un consommateur peut vouloir une puce carrée, une icône, une
bordure — un token ne pourra jamais couvrir ça) et, dans une moindre mesure, le **séparateur**.
Ce n'est pas le cas pour le **connecteur pointillé mobile** : personne ne restyle la forme d'une
ligne pointillée, seule sa couleur est un point de personnalisation plausible, ce qu'un token fait
très bien — et le convertir aurait exigé de le sortir de l'`<ol>` (un `<span>` n'est pas un enfant
valide d'une liste, pas plus qu'un pseudo-élément ne peut porter un `part`) et de le repositionner
en absolu par rapport à `[part='panel']` au lieu de l'`<ol>` lui-même, la plus grosse surface de
régression visuelle de tout ce lot pour un bénéfice quasi nul. **Le connecteur reste un
`::before`, `--ar-breadcrumb-mobile-separator-color` reste un token** (cf. section 3.3).

### 3.1 Puce mobile → `part="bullet"` / `part="bullet bullet--current"`

Chaque `<li part="item">` du mode mobile reçoit un premier enfant
`<span part="bullet" aria-hidden="true"></span>` (avant le lien/texte). L'élément courant (dernier
de la liste tronquée, déjà `item--current`) reçoit en plus le part d'état :
`part="bullet bullet--current"` — même convention exacte que `ar-stepper`.

- Taille (`width`/`height`/`margin`) reste interne (littérale, structurelle) — même précédent que
  `ar-stepper` (`[part~='bullet']` y garde `width`/`height` en dur dans `stepper.styles.ts`,
  seules forme/couleur sont externalisées). `::part(bullet)` (thème) ne pilote que
  `border-radius`, `background-color` (`bullet-color`) et `box-shadow` (`bullet-ring-color`).
- `::part(bullet--current)` (déclarée après, garde-fou d'ordre déjà en place via
  `validate-part-state-order.js`) : `background-color` (`active-bullet-color`) uniquement — le
  `box-shadow` de la règle de base continue de s'appliquer (composition normale, seule la
  propriété redéclarée est reprise).
- La règle `:first-child:before` d'origine (grosse puce sur le premier élément visible, jugée
  incohérente en section « Puce mobile agrandie » de la version précédente de cette spec) **n'a
  plus de raison d'exister** : avec la conversion en part d'état, seul `item--current` (l'élément
  réellement courant) porte `bullet--current`. Le problème identifié précédemment (grosse puce
  sur le mauvais élément) disparaît structurellement, pas seulement par suppression d'une règle.

`--ar-breadcrumb-bullet-color`, `--ar-breadcrumb-bullet-ring-color`,
`--ar-breadcrumb-active-bullet-color` **migrés en branche 4** (littéraux dans
`::part(bullet)`/`::part(bullet--current)` de `default.css`, plus de token scopé).

### 3.2 Séparateur desktop → `part="separator"`

Pour chaque item desktop d'index > 0, un `<span part="separator" aria-hidden="true"></span>` est
inséré en premier enfant du `<li part="item">` (avant le lien). Rendu conditionnel au template
(`index > 0`), pas de séparateur avant le premier item — même logique que le sélecteur CSS
`+ .breadcrumb-item:before` qu'il remplace.

`::part(separator)` reprend `margin`, `height: 65%`, `width: 1px`, `transform: rotate(15deg)`,
`background-color`. `--ar-breadcrumb-separator-color` **migré en branche 4**.

### 3.3 Connecteur pointillé mobile — reste un `::before`, reste un token

**Inchangé** par rapport au CSS actuel : `[part~='list--mobile']:before` (renommé depuis
`.breadcrumb-mobile:before`, même sélecteur logique), positionné en absolu sur toute la hauteur de
la liste (`position: relative` déplacée sur `[part~='list--mobile']`, cf. section 2).
`--ar-breadcrumb-mobile-separator-color` **reste un token** — bloqué par la contrainte 3 de
l'ADR-005, décision assumée plutôt que contournée (cf. discussion ci-dessus).

### Résultat section 3

4 des 5 tokens précédemment bloqués par la contrainte 3 sont débloqués et migrés en branche 4
(`separator-color`, `bullet-color`, `bullet-ring-color`, `active-bullet-color`).
`--ar-breadcrumb-mobile-separator-color` reste un token, seule exception assumée de ce lot.

## 4. Boutons mobile (`home`/`trigger`) découplés de `button.styles.ts`

(Inchangé par rapport à la version précédente de cette spec.)

**Constat :** `#mobile-home-btn` et `[part='trigger']` portent les classes `.btn.btn-tertiary`
(`.btn-ratio-square` pour le trigger), qui gèrent déjà nativement tous les états
(repos/hover/actif/focus) via les tokens génériques `--ar-button-tertiary-*`. Les 4 tokens
`--ar-breadcrumb-toggle-bg*` sont déclarés dans `default.css` comme de purs alias 1:1 vers ces
mêmes tokens génériques, puis réappliqués par une règle interne dédiée dans
`breadcrumb.styles.ts` (spécificité ID) — redondance garantie par construction.

Décision du mainteneur : `ar-breadcrumb` doit s'affranchir de `button.styles.ts` (perçu comme
peu compatible avec l'esprit headless à terme, réflexion séparée hors scope de ce lot) plutôt que
de supprimer les tokens redondants pour laisser `.btn-tertiary` gouverner seul. Même geste que la
refonte du bouton close d'`ar-dialog`/`ar-alert` (lots 3a/3b).

### Changements

- **Nouveau `part="home"`** sur l'élément actuellement identifié par `#mobile-home-btn`.
- **Retrait de `.btn`, `.btn-tertiary`, `.btn-ratio-square`** des deux boutons.
- **Structure et états réimplémentés directement dans `breadcrumb.styles.ts`**, pilotés par les 4
  tokens `--ar-breadcrumb-toggle-bg*` existants — qui cessent d'être des alias mécaniques.
- **Icon spacing géré localement**, plus de dépendance à `.btn .icon`.
- **Border-radius : aucun token.** Branche 4 pure — valeur littérale directement dans
  `::part(home)`/`::part(trigger)` de `default.css`, au choix du thème.
- **Focus visible : `outline: 2px solid currentColor; outline-offset: 2px;`**, sans token — même
  pattern que `ar-alert::part(close):focus-visible`.
- **Tests migrés** de `#mobile-home-btn`/`#breadcrumb-dropdown` vers
  `[part='home']`/`[part='trigger']`.

## 5. Tokens qui restent — récapitulatif final

- **`--ar-breadcrumb-distance`, `--ar-breadcrumb-offset`** — lus en JS par `AnchoredController`
  → restent tokens (contrainte 2 de l'ADR).
- **Famille panel** (`--ar-breadcrumb-panel-*`, 7 tokens) :
    - `panel-bg`, `panel-border-color` → restent tokens (fallback a11y `Canvas`/`ButtonBorder`,
      contrainte 1).
    - `panel-min-width`, `panel-max-width`, `panel-border-radius`, `panel-shadow`,
      `panel-padding` → migrés vers `::part(panel)`, sans token scopé.
- **4 tokens `--ar-breadcrumb-toggle-bg*`** — conservés, redéfinis (section 4).
- **`--ar-breadcrumb-mobile-separator-color`** — reste un token (contrainte 3 de l'ADR-005,
  connecteur pointillé laissé en `::before`, cf. section 3.3).

**Le reste** (`color`, `separator-color`, `bullet-color`, `bullet-ring-color`,
`active-bullet-color`) est migré en branche 4 grâce aux sections 2 et 3. Sur 19 tokens
`default.css` initiaux : 2 restent tels quels (distance/offset), 2 restent avec fallback a11y
(panel bg/border), 4 sont conservés mais redéfinis (toggle-bg), 1 reste pour la contrainte 3
(mobile-separator-color) — soit **9 tokens conservés, 10 supprimés** (5 panel + color + 4 famille
puce/séparateur), remplacés par des règles `::part()` littérales ou des tokens de thème sans
préfixe `--ar-breadcrumb-*`.

## Résultat attendu

- CSS mort/redondant retiré, classes internes `.breadcrumb-*` remplacées par des sélecteurs
  `[part=...]` partout où un `part` existe déjà ou est créé pour l'occasion.
- Nouveaux `part`/parts d'état : `bullet`/`bullet--current`, `separator`,
  `list--desktop`/`list--mobile` (en plus de `list` commun), `home`. Le connecteur pointillé
  mobile reste un `::before` interne, pas de `part` créé pour lui.
- Bug de la grosse puce mal alignée (première passe de cette spec) résolu structurellement par la
  conversion en part d'état, pas par un simple retrait de règle.
- Bug de cascade `font-weight` sur l'élément courant (jamais appliqué depuis l'origine) corrigé —
  premier changement de rendu visuel réel du lot, migré directement sur `::part(current)`.
- Boutons mobile entièrement découplés de `button.styles.ts`.
- 10 tokens supprimés sur 19, le reste conservé pour des raisons techniques vérifiées (lecture
  JS, fallback a11y, réutilisation, pseudo-élément décoratif sans gain de conversion identifié).

## Hors scope

- Réflexion globale sur la valeur de `button.styles.ts` dans une librairie headless — notée
  séparément, ne concerne que `ar-breadcrumb` dans ce lot.
- Lots suivants (`dropdown`, `pagination`, `tooltip`) — hors scope, à traiter séparément avec la
  même grille de lecture (parts communs + variantes, pseudo-éléments décoratifs convertibles,
  nettoyage de nomenclature).
