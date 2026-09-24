# `ar-tooltip` — token vs `::part()` (dernier lot du périmètre initial, issue #129)

**Date :** 2026-08-05
**Statut :** Validé, prêt pour plan d'implémentation

## Contexte

Suite de la généralisation du critère token-vs-part (ADR-005) : lot 1 (`ar-stepper`), lot 2
(`ar-datepicker`), lots 3a/3b (`ar-alert`/`ar-dialog`), lot 4 (`ar-breadcrumb`), lot 5
(`ar-dropdown`), lot 6 (`ar-pagination`). `ar-tooltip` est le **dernier composant du périmètre
initial de l'audit du 2026-07-25** (les composants restants — `table-sort`, `charcounter`,
`progressbar`, `tab-group`, `collapse`, `tab` — suivent un séquencement séparé, cf.
`[[project_token_vs_part_generalization_129]]`).

**Particularités par rapport aux lots précédents** :

- Composant le plus simple traité jusqu'ici : un seul élément stylé porteur de design
  (`[part='bubble']`), un second `part` purement géométrique (`arrow`), aucune dépendance à
  `button.styles.ts` ou `panel.styles.ts` (pas de bouton, pas de panel partagé — le tooltip
  utilise l'API Popover directement).
- Aucun CSS mort, aucune classe interne redondante, aucun `part` manquant à débloquer — le
  composant est déjà propre (pas d'historique d'import externe comme `ar-breadcrumb`).
- Deux tokens ont une calibration dark-mode **indépendante** (`bg`/`color`), un profil déjà
  rencontré sur les panels partagés (`ar-dropdown`/`ar-breadcrumb`/`ar-stepper`), mais ici
  appliqué à un composant qui ne partage pas de feuille de style.
- `--ar-tooltip-show-duration` illustre la contrainte 6 (garde `prefers-reduced-motion`) sur un
  cas nouveau : `animation` (pas `transition`), entièrement interne à `tooltip.styles.ts`.
- Audit complété par une revue de valeurs jamais tokenisées (étape 0) : `line-height: 1.4` sur
  `[part='bubble']`, jamais exposée comme token, candidate au même titre que les tokens existants.

## Application du critère (10 tokens + 1 valeur jamais tokenisée)

| Propriété                         | Décision                     | Raison                                                                                                                                                                                                                                                                       |
| --------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--ar-tooltip-distance`           | **Reste token**              | Lu en JS (`TooltipController._readCssVar` via `getComputedStyle`) — contrainte 2                                                                                                                                                                                             |
| `--ar-tooltip-offset`             | **Reste token**              | Idem                                                                                                                                                                                                                                                                         |
| `--ar-tooltip-bg`                 | **Reste token**              | Calibration dark-mode indépendante (`--ar-color-neutral-80`, pas un simple alias) — contrainte 1. Fallback a11y `Canvas` (`ar-tooltip` explicitement cité dans l'amendement du 2026-07-22). Réutilisé 2× dans le composant (`bubble` + `arrow`) — branche 3 aussi satisfaite |
| `--ar-tooltip-color`              | **Reste token**              | Calibration dark-mode indépendante (`--ar-color-neutral-10`) — contrainte 1. Fallback a11y `CanvasText`                                                                                                                                                                      |
| `--ar-tooltip-arrow-size`         | **Reste token**              | Réutilisé 2× dans la même règle (`width`/`height` de `[part='arrow']`) — branche 3                                                                                                                                                                                           |
| `--ar-tooltip-show-duration`      | **Reste token**              | Contrainte 6 : la propriété `animation` reste interne (`[part='bubble']:popover-open`), avec la garde `prefers-reduced-motion` juste en dessous. Externaliser casserait cette garde                                                                                          |
| `--ar-tooltip-border-radius`      | **Migre → `::part(bubble)`** | Usage unique, hors exception a11y (border-radius explicitement exclu par l'amendement du 2026-07-22), aucune calibration dark — branche 4                                                                                                                                    |
| `--ar-tooltip-font-size`          | **Migre → `::part(bubble)`** | Idem                                                                                                                                                                                                                                                                         |
| `--ar-tooltip-padding`            | **Migre → `::part(bubble)`** | Idem (padding générique explicitement exclu de l'exception a11y)                                                                                                                                                                                                             |
| `--ar-tooltip-max-width`          | **Migre → `::part(bubble)`** | Idem                                                                                                                                                                                                                                                                         |
| `line-height: 1.4` (jamais token) | **Migre → `::part(bubble)`** | Trouvée à l'étape 0 (valeur littérale jamais externalisée), même profil que les 4 tokens ci-dessus : usage unique, purement cosmétique, aucun fallback critique                                                                                                              |

Contrairement aux lots panel (`dropdown`/`breadcrumb`/`stepper`), les 5 propriétés migrées ne
proviennent pas d'une feuille de style partagée — elles se regroupent simplement en une seule
nouvelle règle `ar-tooltip::part(bubble)` dans le thème, sans redondance à traiter avec un
composant voisin.

## Changements

### `packages/core/src/components/tooltip/tooltip.styles.ts`

`[part='bubble']` perd les 5 propriétés migrées :

```css
[part='bubble'] {
    /* Popover positioning reset */
    position: absolute;
    inset: 0 auto auto 0;
    margin: 0;

    /* Box model */
    box-sizing: border-box;

    /* overflow: visible requis pour que le caret (position: absolute) dépasse de la bulle */
    overflow: visible;

    /* Visual */
    background-color: var(--ar-tooltip-bg, Canvas);
    color: var(--ar-tooltip-color, CanvasText);
    border: none;
    word-break: break-word;
}
```

`border-radius`, `font-size`, `padding`, `max-width`, `line-height` retirés. `[part='arrow']` et
le reste du fichier (animation, garde `prefers-reduced-motion`) inchangés.

### `packages/core/src/styles/themes/default.css`

Bloc `Tooltip` (`:root`, lignes ~413-424) : les 4 tokens migrés retirés, seuls `distance`,
`offset`, `bg`, `color`, `arrow-size`, `show-duration` restent :

```css
/* Tooltip */
--ar-tooltip-distance: 10px;
--ar-tooltip-offset: var(--ar-anchor-offset);
--ar-tooltip-bg: var(--ar-color-neutral-20);
--ar-tooltip-color: var(--ar-color-white);
--ar-tooltip-arrow-size: 6px;
--ar-tooltip-show-duration: var(--ar-panel-show-duration);
```

Nouvelle règle `::part(bubble)` ajoutée dans un bloc `ar-tooltip { }` (le fichier n'en a pas
encore, à créer à la suite du dernier bloc de composant — même schéma que
`ar-dropdown { &::part(panel) {...} } `) :

```css
ar-tooltip {
    &::part(bubble) {
        border-radius: var(--ar-border-radius-sm);
        font-size: 0.8125rem;
        padding: 0.375rem 0.625rem;
        max-width: 18rem;
        line-height: 1.4;
    }
}
```

`border-radius` continue de référencer le token générique déjà utilisé (`--ar-border-radius-sm`)
plutôt que d'être recodé en dur — seul l'intermédiaire `--ar-tooltip-border-radius` disparaît. Les
2 blocs dark-mode (`:root[data-theme='dark']` et `@media (prefers-color-scheme: dark)`, lignes
~602-604/~667-669) sont inchangés : ils ne redéfinissent que `bg`/`color`, qui restent tokens.

### `packages/core/src/components/tooltip/tooltip.ts` (JSDoc)

`@cssprop` retirés pour `--ar-tooltip-border-radius`, `--ar-tooltip-padding`,
`--ar-tooltip-font-size`, `--ar-tooltip-max-width`. Les 6 `@cssprop` restants (`bg`, `color`,
`arrow-size`, `show-duration`, `distance`, `offset`) inchangés. `@csspart bubble` enrichi pour
mentionner que le radius/padding/font-size/max-width/line-height sont désormais pilotables via
`::part(bubble)`.

### Tests

`tooltip.test.ts`/`tooltip.browser.test.ts`/`tooltip.a11y.test.ts` : aucun changement de structure
DOM ni de `part` (les 2 `part` existants, `bubble` et `arrow`, ne changent pas). Vérifier
qu'aucun test n'asserte la valeur calculée de `border-radius`/`font-size`/`padding`/`max-width`/
`line-height` directement sur le composant sans thème chargé — peu probable, ces valeurs sont
purement cosmétiques.

## Résultat attendu

- 4 tokens supprimés sur 10 (`border-radius`, `font-size`, `padding`, `max-width` — migrés vers
  `::part(bubble)`), 1 valeur littérale jamais tokenisée migrée avec eux (`line-height`). 6 tokens
  conservés (`bg`/`color` pour fallback a11y + calibration dark, `arrow-size` réutilisé en
  interne, `show-duration` pour la garde `prefers-reduced-motion`, `distance`/`offset` pour
  lecture JS).
- Aucun changement de structure DOM, aucun nouveau `part`, aucun changement visuel par défaut (le
  thème reproduit exactement les valeurs actuelles).
- `ar-tooltip` devient le dernier composant du périmètre initial de l'audit #129 à être traité —
  seuls les lots groupés restants (`table-sort`/`charcounter`/`progressbar`/`tab-group`/
  `collapse`, puis `tab` séparément) subsistent après ce lot.

## Hors scope

- Le trade-off `!important` documenté dans l'amendement ADR-005 du 2026-08-05 (verrouillage des
  resets structurels `position`/`overflow`/`border` de `[part='bubble']` contre une surcharge
  externe via `::part()`) n'est pas traité dans ce lot — aucune régression concrète ne le
  justifie aujourd'hui, cf. amendement.
- `table-sort`, `charcounter`, `progressbar`, `tab-group`, `collapse`, `tab` — lots suivants,
  séquencement séparé.
