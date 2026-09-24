# `ar-dropdown` — token vs `::part()` (lot 5, issue #129)

**Date :** 2026-07-31
**Statut :** Validé, prêt pour plan d'implémentation

## Contexte

Suite de la généralisation du critère token-vs-part (ADR-005) : lot 1 (`ar-stepper`), lot 2
(`ar-datepicker`), lots 3a/3b (`ar-alert`/`ar-dialog`), lot 4 (`ar-breadcrumb`). `ar-dropdown` est
le premier des 3 composants restants (`dropdown`, `pagination`, `tooltip`), traité seul (périmètre
plus restreint que les lots précédents).

**Particularité par rapport aux lots précédents** : contrairement à `ar-breadcrumb`, le CSS
d'`ar-dropdown` n'est pas hérité d'un import externe — c'est du travail interne récent (PR #62,
2026-04-30, refonte du panel partagé `panel.styles.ts` consommé par `dropdown`/`breadcrumb`/
`stepper` mobile). Aucun CSS mort trouvé, aucune classe interne redondante avec un `part` (un seul
`part` existe déjà : `panel`), pas de dépendance à `button.styles.ts` (le composant ne rend aucun
bouton lui-même, uniquement un trigger slotté), aucune icône décorative interne. L'audit se réduit
donc à l'application directe du critère token-vs-part sur les 10 tokens `--ar-dropdown-*` de
`default.css`.

**Constat additionnel (comparaison avec `ar-breadcrumb`/`ar-stepper`, déjà migrés en lot 4)** :
`ar-dropdown` importe bien `panel.styles.ts` (`dropdown.ts:8`), mais `dropdown.styles.ts`
re-déclare `bg`/`color`/`border-color`/`border-radius`/`box-shadow`/`padding`/`min-width`/
`max-width` sur le même sélecteur `[part='panel']`, ce qui écrase systématiquement les
déclarations de `panelBaseStyles` (même spécificité, `dropdown.styles.ts` vient après dans
`static override styles = [panelStyles, styles]`). `ar-breadcrumb` et `ar-stepper` ne
re-déclarent, eux, que **2 propriétés** (`bg`, `border-color`) — `color` n'a jamais eu de token
dédié côté breadcrumb/stepper, il retombe sur `--ar-panel-text` (fallback `CanvasText`) déjà posé
par `panelBaseStyles`, sans jamais diverger. `ar-dropdown` garde un `--ar-dropdown-color`
redondant (`default.css:439` : `var(--ar-panel-text)`, valeur strictement identique au fallback
partagé, jamais consommé ailleurs — vérifié par grep). Décision : aligner `ar-dropdown` sur ce
pattern plus étroit, pas seulement sur le traitement radius/shadow/padding/max-width/min-width.

## Application du critère (10 tokens)

| Token                         | Décision                                    | Raison                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--ar-dropdown-distance`      | **Reste token**                             | Lu en JS (`AnchoredController._readCssVar` via `getComputedStyle`) — contrainte 2                                                                                                                                                                                                                                                            |
| `--ar-dropdown-offset`        | **Reste token**                             | Idem                                                                                                                                                                                                                                                                                                                                         |
| `--ar-dropdown-bg`            | **Reste token**                             | Fallback a11y critique (`Canvas`) sans thème — contrainte 1, même statut que `--ar-breadcrumb-panel-bg`/`--ar-stepper-panel-bg` (lot 4)                                                                                                                                                                                                      |
| `--ar-dropdown-border-color`  | **Reste token**                             | Fallback a11y critique (`ButtonBorder`) — contrainte 1, même statut que `--ar-breadcrumb-panel-border-color`/`--ar-stepper-panel-border-color`                                                                                                                                                                                               |
| `--ar-dropdown-color`         | **Supprimé (pas migré, pas de remplaçant)** | Duplication sans divergence jamais exercée du fallback déjà posé par `panelBaseStyles` (`--ar-panel-text`, `CanvasText`) — aligne `ar-dropdown` sur `ar-breadcrumb`/`ar-stepper`, qui n'ont jamais eu ce token. Le composant cesse de redéclarer `color` sur `[part='panel']` : la déclaration de `panelBaseStyles` s'applique telle quelle. |
| `--ar-dropdown-border-radius` | **Migre → `::part(panel)`**                 | Aucun fallback critique, branche 4                                                                                                                                                                                                                                                                                                           |
| `--ar-dropdown-shadow`        | **Migre → `::part(panel)`**                 | Idem                                                                                                                                                                                                                                                                                                                                         |
| `--ar-dropdown-padding`       | **Migre → `::part(panel)`**                 | Idem                                                                                                                                                                                                                                                                                                                                         |
| `--ar-dropdown-max-width`     | **Migre → `::part(panel)`**                 | Idem                                                                                                                                                                                                                                                                                                                                         |
| `--ar-dropdown-min-width`     | **Migre → `::part(panel)`**                 | Valeur littérale jamais cascadée (10rem, volontairement distincte de `--ar-panel-min-width` — un menu reste plus étroit qu'un panel générique), aucun fallback critique. Même geste que `ar-stepper::part(panel) { padding: 0.75rem; }` (divergence exprimée en littéral dans la règle de thème, pas en token)                               |

Symétrie stricte avec `ar-breadcrumb::part(panel)`/`ar-stepper::part(panel)` (vérifiés dans
`default.css:902-908` et `:1106-1112`) : seuls `bg`/`border-color` gardent un token (fallback
système), tout le reste (`color` compris, en le supprimant plutôt qu'en le migrant) devient soit
la retombée déjà gérée par `panelBaseStyles`, soit une règle `::part(panel)` littérale dans le
thème.

## Changements

### `packages/core/src/components/dropdown/dropdown.styles.ts`

`[part='panel']` ne garde que les 2 propriétés à fallback a11y (symétrie exacte avec
`breadcrumb.styles.ts`/`stepper.styles.ts`) :

```css
[part='panel'] {
    background-color: var(--ar-dropdown-bg, Canvas);
    border-color: var(--ar-dropdown-border-color, ButtonBorder);
}
```

`color`, `border-radius`, `box-shadow`, `padding`, `min-width`, `max-width` retirés de ce fichier.
`color` n'est pas remplacé — `panelBaseStyles` (`panel.styles.ts`, déjà importé) déclare
`color: var(--ar-panel-text, CanvasText)` sur le même `[part='panel']` ; sans redéclaration côté
`dropdown.styles.ts`, cette valeur s'applique directement. Les 5 autres propriétés deviennent une
opinion de thème pure (section suivante).

### `packages/core/src/styles/themes/default.css`

Bloc `Dropdown` : les 6 tokens (`color` + les 5 migrés) retirés, nouvelle règle `::part()` ajoutée
dans le bloc `ar-dropdown { }` existant (même structure que `ar-breadcrumb { &::part(panel) {...} }`
et `ar-stepper { &::part(panel) {...} }`, `default.css:1058`/`:881`) — vérifier s'il existe déjà un
bloc `ar-dropdown { }` hors `:root` ; sinon en créer un à la suite du dernier bloc de composant du
fichier :

```css
ar-dropdown {
    &::part(panel) {
        border-radius: var(--ar-panel-radius);
        box-shadow: var(--ar-panel-shadow);
        padding: var(--ar-panel-padding);
        /* Valeur propre, volontairement non cascadée depuis --ar-panel-min-width : un menu
           dropdown reste lisible plus étroit qu'un panel de disclosure générique (breadcrumb,
           stepper). */
        min-width: 10rem;
        max-width: var(--ar-panel-max-width);
    }
}
```

Le commentaire existant justifiant `min-width: 10rem` (non cascadé depuis `--ar-panel-min-width`)
est déplacé tel quel au-dessus de cette déclaration.

### `packages/core/src/components/dropdown/dropdown.ts` (JSDoc)

`@cssprop` retirés pour `--ar-dropdown-color`, `--ar-dropdown-border-radius`,
`--ar-dropdown-shadow`, `--ar-dropdown-padding`, `--ar-dropdown-max-width`,
`--ar-dropdown-min-width` (celui-ci n'avait d'ailleurs jamais eu d'entrée `@cssprop` dédiée —
vérifier). Les 4 `@cssprop` restants (`bg`, `border-color`, `distance`, `offset`) gardent leur
mention de cascade vers `--ar-panel-*` là où applicable. `@csspart panel` enrichi pour mentionner
les propriétés désormais pilotables via `::part(panel)`.

### Tests

`dropdown.test.ts`/`dropdown.browser.test.ts`/`dropdown.a11y.test.ts` : aucun changement de
structure DOM ni de `part` attendu (le seul `part` existant, `panel`, n'est ni ajouté ni retiré).
Vérifier qu'aucun test n'asserte la valeur calculée de `border-radius`/`shadow`/`padding`/
`min-width`/`max-width` directement sur le composant sans thème chargé (peu probable, ces valeurs
sont cosmétiques) — sinon adapter pour charger `default.css` ou cibler `::part(panel)`.

## Résultat attendu

- 6 tokens supprimés sur 10 (`color`, `border-radius`, `shadow`, `padding`, `max-width`,
  `min-width` — 5 migrés vers `::part(panel)`, `color` supprimé sans remplaçant dédié), 4
  conservés (`bg`/`border-color` pour fallback a11y, `distance`/`offset` pour lecture JS).
- `ar-dropdown` aligné strictement sur le pattern panel déjà établi par `ar-breadcrumb`/
  `ar-stepper` — plus de divergence de traitement entre les 3 composants consommant
  `panel.styles.ts`.
- Aucun changement de structure DOM, aucun nouveau `part`, aucun changement visuel par défaut
  (le thème `default.css` reproduit exactement les valeurs actuelles, `color` y compris — la
  valeur `--ar-panel-text` était déjà identique).
- `--ar-dropdown-min-width` n'est plus consommé par `dropdown.styles.ts` lui-même — seul le thème
  le fixe désormais, un consommateur override toujours via `ar-dropdown::part(panel)` (au lieu de
  redéfinir le token, cohérent avec le reste de la migration #129).

## Hors scope

- `pagination`, `tooltip` — lots suivants, même grille de lecture.
- Réflexion sur `panel.styles.ts` lui-même (partagé dropdown/breadcrumb/stepper) — inchangé, ce
  lot ne touche que la surcharge propre à `ar-dropdown`.
