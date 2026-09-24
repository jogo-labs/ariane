# Config globale distance/offset des composants ancrés — design

Date : 2026-07-07
Statut : validé

## Contexte

`AnchoredController` (`packages/core/src/controllers/anchored.controller.ts`) et
`TooltipController` (`packages/core/src/controllers/tooltip.controller.ts`) pilotent tous les
deux `Popover` (`packages/core/src/utils/popover.ts`) pour positionner un panel flottant via
Floating UI. Cinq composants les utilisent : `ar-dropdown`, `ar-tooltip`, `ar-datepicker`,
`ar-stepper`, `ar-breadcrumb`.

Aujourd'hui, `distance` (espacement perpendiculaire trigger→panel) et `offset` (décalage latéral)
sont :

- exposés en attribut Lit `@property` par instance sur `ar-tooltip` et `ar-dropdown` seulement ;
- codés en dur (valeurs par défaut du contrôleur) sur `ar-datepicker`, `ar-stepper`,
  `ar-breadcrumb`, sans possibilité de personnalisation.

Il n'existe aucun moyen de configurer ce réglage de façon transversale à tous les composants
ancrés, ni de le personnaliser par CSS — alors que le modèle headless du projet (CLAUDE.md) veut
que toute valeur de design vive dans `themes/default.css` plutôt que dans des attributs JS.

## Objectif

Remplacer le réglage par attribut JS par des custom properties CSS, avec un levier global et une
surcharge possible par composant ou par instance.

## Décisions

### 1. Périmètre : les 5 composants ancrés

`ar-dropdown`, `ar-tooltip`, `ar-datepicker`, `ar-stepper`, `ar-breadcrumb` sont tous concernés,
pas seulement les deux qui exposaient déjà l'attribut.

### 2. CSS uniquement — suppression des attributs JS

Les attributs Lit `distance`/`offset` sont retirés de `ar-tooltip` et `ar-dropdown` (breaking
change, acceptable en alpha). La seule façon de personnaliser ce réglage devient la custom
property CSS. `setDistance`/`setOffset` sont retirés de `Popover` et `AnchoredController` (plus
d'API JS pour ce réglage).

### 3. Tokens : global + surcharge par composant

Nouveau groupe de tokens dans `packages/core/src/styles/themes/default.css`, sur le modèle du
groupe `--ar-panel-*` déjà réutilisé par plusieurs composants :

```css
:root {
    /* positionnement des composants ancrés (popovers) */
    --ar-anchor-distance: 4px;
    --ar-anchor-offset: 0px;

    --ar-dropdown-distance: var(--ar-anchor-distance);
    --ar-dropdown-offset: var(--ar-anchor-offset);
    --ar-tooltip-distance: 6px; /* défaut distinct, comme aujourd'hui */
    --ar-tooltip-offset: var(--ar-anchor-offset);
    --ar-datepicker-distance: var(--ar-anchor-distance);
    --ar-datepicker-offset: var(--ar-anchor-offset);
    --ar-stepper-distance: var(--ar-anchor-distance);
    --ar-stepper-offset: var(--ar-anchor-offset);
    --ar-breadcrumb-distance: var(--ar-anchor-distance);
    --ar-breadcrumb-offset: var(--ar-anchor-offset);
}
```

Redéfinir `--ar-anchor-distance` change les 5 composants d'un coup. Surcharger
`--ar-dropdown-distance` sur une instance (`#my-dropdown { --ar-dropdown-distance: 12px; }`) ne
touche que celle-là. Ces tokens vivent uniquement dans `themes/default.css` — aucune valeur de
repli dans les fichiers `*.styles.ts` des composants, conformément au modèle headless.

### 4. Lecture réactive à chaque repositionnement

`Popover._position()` est déjà appelé à chaque recalcul de position par `autoUpdate` de Floating
UI (scroll, resize, changement de contenu). `distance`/`offset` dans `PopoverOptions` deviennent
`number | (() => number)` ; `_position()` résout la valeur juste avant `computePosition()`. Un
changement de custom property CSS (media query, switch de thème à chaud) est donc pris en compte
sans code de synchronisation supplémentaire.

`Popover` reste agnostique du nommage CSS — il ne fait que résoudre ce qu'on lui passe.
`AnchoredController` et `TooltipController` portent la logique de lecture CSS et fournissent les
closures.

### 5. `AnchoredController` / `TooltipController`

Nouvelle option obligatoire `cssVarPrefix: string` (slug du composant, ex. `'dropdown'`,
`'tooltip'`, `'datepicker'`, `'stepper'`, `'breadcrumb'`).

```ts
private _readCssVar(kind: 'distance' | 'offset'): number {
    const raw = getComputedStyle(this._host)
        .getPropertyValue(`--ar-${this._opts.cssVarPrefix}-${kind}`)
        .trim();
    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 0;
}
```

### 6. Fallback JS = 0 partout (pas de valeur cosmétique en dur)

Si aucun thème n'est chargé (mode headless complet), `getComputedStyle` renvoie une chaîne vide et
`parseFloat` échoue → repli sur `0`. C'est un fallback structurel neutre (le panel reste
correctement positionné, juste sans espacement), cohérent avec la règle déjà en place dans
CLAUDE.md : _« les fallbacks structurels (0px pour des compensations de layout) sont
acceptables »_. Aucune valeur « raisonnable » (4, 6...) n'est codée en dur dans le JS — elle vit
exclusivement dans `themes/default.css`. Un seul default pour les 5 composants, pas de cas
particulier pour tooltip.

## Composants et fichiers impactés

| Fichier                                                 | Changement                                                                                                                  |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/src/utils/popover.ts`                    | `distance`/`offset` acceptent `number \| (() => number)`, résolus dans `_position()`. Retrait de `setDistance`/`setOffset`. |
| `packages/core/src/controllers/anchored.controller.ts`  | Option `cssVarPrefix` requise, méthode `_readCssVar`, closures passées à `Popover`. Retrait de `setDistance`/`setOffset`.   |
| `packages/core/src/controllers/tooltip.controller.ts`   | Idem.                                                                                                                       |
| `packages/core/src/components/dropdown/dropdown.ts`     | Retrait `@property distance/offset`, passe `cssVarPrefix: 'dropdown'`.                                                      |
| `packages/core/src/components/tooltip/tooltip.ts`       | Retrait `@property distance/offset`, passe `cssVarPrefix: 'tooltip'`.                                                       |
| `packages/core/src/components/datepicker/datepicker.ts` | Passe `cssVarPrefix: 'datepicker'`.                                                                                         |
| `packages/core/src/components/stepper/stepper.ts`       | Passe `cssVarPrefix: 'stepper'`.                                                                                            |
| `packages/core/src/components/breadcrumb/breadcrumb.ts` | Passe `cssVarPrefix: 'breadcrumb'`.                                                                                         |
| `packages/core/src/styles/themes/default.css`           | Nouveau groupe de tokens (section 3).                                                                                       |

## Tests

- Par composant ancré : la custom property CSS influence bien le positionnement (poser la valeur
  avant `show()`, vérifier le `transform` appliqué au panel).
- `Popover._position()` : résolution `number | (() => number)`.
- Suppression des tests existants sur les attributs `distance`/`offset` de `ar-tooltip` et
  `ar-dropdown` (API retirée).

## Documentation

- `apps/docs/` : pages `ar-tooltip` et `ar-dropdown` — retrait des entrées attribut
  `distance`/`offset` des tables API, ajout des `@cssprop` correspondants (JSDoc du composant).
- Changelog de la prochaine release : mentionner le breaking change (attributs `distance`/`offset`
  retirés de `ar-tooltip`/`ar-dropdown`).

## Hors scope

- Pas de nouvelle API JS de remplacement — CSS uniquement, par décision explicite.
- Pas de changement sur `placement` (reste un attribut/option JS, non concerné par ce chantier).
