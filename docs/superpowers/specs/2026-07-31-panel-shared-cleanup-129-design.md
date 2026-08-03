# Nettoyage `panel.styles.ts` — redondances théme vs base partagée (issue #129)

**Date :** 2026-07-31
**Statut :** Validé, prêt pour plan d'implémentation

## Contexte

Effet de bord découvert en clôturant le lot 5 (`ar-dropdown`, PR #148) : la revue finale de
branche a signalé que 4 des 5 propriétés du nouveau bloc `ar-dropdown::part(panel)` dupliquaient
à l'identique des déclarations déjà présentes dans `panel.styles.ts` (la feuille de style
partagée, importée par `ar-dropdown`/`ar-breadcrumb`/`ar-stepper`/`ar-datepicker`). L'utilisateur
a repéré la même redondance côté `max-width` et a demandé une correction ciblée sur ce point.

**Reformulation du problème en creusant** : le sens de la correction n'est pas « retirer les
propriétés de `panel.styles.ts` » (première hypothèse du contrôleur, incorrecte) mais l'inverse —
`panel.styles.ts` est déjà la source canonique pour toute propriété qui ne fait que consommer le
token générique `--ar-panel-*` sans jamais diverger. Ce sont les blocs de thème par composant
(`default.css`) qui redéclarent inutilement ces valeurs identiques. Preuve : `ar-datepicker`
(4ᵉ consommateur de `panel.styles.ts`, pas seulement les 3 déjà migrés dans le chantier #129) fait
déjà ça correctement sans qu'aucune décision consciente ne l'ait établi — son bloc de thème ne
redéclare que `padding`/`max-width`/`width`, qui divergent réellement, et laisse `border-radius`/
`box-shadow` remonter silencieusement depuis la base partagée.

**Root cause** : aucune règle n'a jamais été formalisée pour ce cas. Les migrations des lots 1
(`ar-stepper`), 4 (`ar-breadcrumb`) et 5 (`ar-dropdown`) ont chacune copié un bloc de 4-5
propriétés dans `::part(panel)` par réflexe (cohérence avec le lot précédent), sans vérifier
individuellement lesquelles divergeaient réellement du générique.

## Audit — divergence réelle par propriété et par composant

| Propriété       | `panel.styles.ts` (base)    | `ar-stepper`                                                             | `ar-breadcrumb`                                                          | `ar-dropdown`                    | `ar-datepicker`                                                                                                           |
| --------------- | --------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `border-radius` | `var(--ar-panel-radius)`    | dupliqué, non divergent                                                  | dupliqué, non divergent                                                  | dupliqué, non divergent          | **absent — dépend de la base**                                                                                            |
| `box-shadow`    | `var(--ar-panel-shadow)`    | dupliqué, non divergent                                                  | dupliqué, non divergent                                                  | dupliqué, non divergent          | **absent — dépend de la base**                                                                                            |
| `padding`       | `var(--ar-panel-padding)`   | `0.75rem` — **diverge réellement**                                       | dupliqué, non divergent                                                  | dupliqué, non divergent          | `1rem` — **diverge réellement**                                                                                           |
| `max-width`     | `var(--ar-panel-max-width)` | dupliqué, non divergent                                                  | dupliqué, non divergent                                                  | dupliqué, non divergent          | override propre dans `datepicker.styles.ts` avec fallback a11y (`25rem`) — **diverge réellement**, indépendant de la base |
| `min-width`     | **absent de la base**       | `var(--ar-panel-min-width)` — non divergent, mais base ne le fournit pas | `var(--ar-panel-min-width)` — non divergent, mais base ne le fournit pas | `10rem` — **diverge réellement** | non utilisé                                                                                                               |

Deux constats actionnables :

1. `border-radius`/`box-shadow` ne divergent **jamais**, nulle part — aucun bloc de thème ne
   devrait les redéclarer.
2. `min-width` est absent de la base par asymétrie avec `max-width` (déjà présent) — deux
   composants sur trois le consomment sans diverger, ce qui justifie de l'ajouter à la base et de
   ne garder que la divergence réelle (`ar-dropdown`) en local.

Aucune régression possible en retirant une redéclaration non divergente : une règle externe
`ar-<composant>::part(panel)` l'emporte toujours sur la règle interne du shadow DOM
(`panel.styles.ts`) indépendamment de la spécificité comparée — si la règle externe redéclare
exactement la même valeur, la retirer ne change rien au résultat calculé (la règle interne prend
le relais avec la même valeur).

## Changements

### `packages/core/src/styles/shared/panel.styles.ts`

Ajouter `min-width: var(--ar-panel-min-width);` à la règle `[part='panel']`, à la suite de
`max-width` (même bloc « Tokens visuels »). Ajouter un commentaire documentant la règle générale
au-dessus du bloc `[part='panel']` :

```css
/* Cette règle est la source canonique pour toute propriété qui ne fait que consommer un
   token --ar-panel-* générique sans jamais diverger d'un composant à l'autre. Un
   composant consommateur (voir static override styles) ne doit ajouter sa propre règle
   ::part(panel) dans default.css QUE pour une propriété dont la valeur diverge réellement
   du générique — jamais pour redéclarer la même valeur. */
```

### `packages/core/src/styles/themes/default.css`

- **`ar-stepper { &::part(panel) { ... } }`** : ne garde que `padding: 0.75rem;`. Retire
  `border-radius`, `box-shadow`, `min-width`, `max-width`.
- **`ar-breadcrumb { &::part(panel) { ... } }`** : bloc entier supprimé (aucune propriété ne
  diverge). Vérifier qu'aucune autre règle du bloc `ar-breadcrumb { }` ne dépend de sa présence
  (juxtaposition avec les autres `&::part(...)` du même bloc composant — la suppression ne doit
  retirer que ce sous-bloc, pas le bloc `ar-breadcrumb { }` dans son ensemble, qui contient
  d'autres règles `::part()` non liées au panel).
- **`ar-dropdown { &::part(panel) { ... } }`** : ne garde que `min-width: 10rem;` avec son
  commentaire justificatif existant. Retire `border-radius`, `box-shadow`, `padding`,
  `max-width`.
- **`ar-datepicker { }`** : inchangé, déjà conforme à la règle.

### Documentation

- `docs/decisions/ADR-005-tokens-pilotes-par-attribut.md` : ajouter une section courte formalisant
  la règle générale trouvée (« un bloc de thème `::part(panel)` par composant ne redéclare que ce
  qui diverge réellement d'une feuille de style partagée, jamais une valeur identique au
  générique ») — utile pour les lots `pagination`/`tooltip` si l'un d'eux venait à consommer une
  feuille de style partagée similaire à l'avenir.
- Mémoire projet (`project_token_vs_part_generalization_129`) : déjà au courant de ce chantier,
  mise à jour après implémentation.

## Vérification

- Aucun changement de structure DOM, aucun nouveau `part`.
- Aucun changement visuel attendu par défaut : chaque valeur retirée d'un bloc de thème reste
  fournie par `panel.styles.ts` avec une valeur strictement identique.
- Vérification visuelle manuelle (Playwright) sur les 4 composants (`ar-stepper`, `ar-breadcrumb`,
  `ar-dropdown`, `ar-datepicker`), avec et sans thème chargé — le cas « sans thème » est
  particulièrement important ici : `border-radius`/`box-shadow`/`min-width`/`max-width`
  n'avaient de toute façon aucun fallback critique dans `panel.styles.ts` (pas de deuxième
  paramètre `var()`), donc leur absence sans thème est déjà le comportement actuel, inchangé par
  ce nettoyage.
- Tests existants des 4 composants (Vitest + WTR) : aucune assertion connue sur ces propriétés
  calculées (à revérifier par grep, même geste que le lot 5).
- Garde-fous CI (`validate-no-hardcoded-tokens.js`, `validate-part-state-order.js`) via
  `npm run build:manifest`.

## Résultat attendu

- `panel.styles.ts` devient la source unique et documentée pour `border-radius`/`box-shadow`/
  `padding`/`max-width`/`min-width` génériques.
- 14 déclarations redondantes supprimées dans `default.css` à travers 3 blocs de composant (5
  breadcrumb + 4 stepper + 4 dropdown + 1 ajout min-width en base), `ar-breadcrumb::part(panel)`
  disparaît entièrement.
- Règle générale documentée (ADR-005), applicable aux futurs composants qui consommeraient une
  feuille de style partagée similaire.

## Hors scope

- Réflexion plus large sur d'autres feuilles de style partagées du projet (`button.styles.ts`,
  `resetStyles`, `utilitiesStyles`) — même question potentiellement applicable, pas auditée ici.
- Lots `pagination`/`tooltip` du chantier #129 — indépendants, pas concernés par ce nettoyage
  (ne consomment pas `panel.styles.ts`).
