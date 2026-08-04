# `ar-pagination` — token vs `::part()` + découplage `button.styles.ts` (lot 6, issue #129)

**Date :** 2026-08-04
**Statut :** Validé, prêt pour plan d'implémentation

## Contexte

Suite de la généralisation du critère token-vs-part (ADR-005) : lot 1 (`ar-stepper`), lot 2
(`ar-datepicker`), lots 3a/3b (`ar-alert`/`ar-dialog`), lot 4 (`ar-breadcrumb`), lot 5
(`ar-dropdown`). `ar-pagination` est le 2ᵉ des 3 composants restants (`pagination`, `tooltip`).

**Périmètre plus large que les lots précédents** : contrairement à `ar-dropdown`, `ar-pagination`
dépend encore de `button.styles.ts` (classes `.btn`/`.btn-tertiary`/`.btn-ratio-square`) pour tout
son habillage interactif. Ce chantier a été acté en cours de discussion (2026-08-03/04) : on
profite de l'audit #129 pour achever le découplage entamé lot 4 (`ar-breadcrumb` s'était déjà
affranchi de `button.styles.ts` pour ses boutons mobile home/trigger) — `ar-pagination` devient le
2ᵉ composant à s'en détacher. Après ce lot, seul `ar-stepper` consommera encore
`button.styles.ts`/les tokens `--ar-button-*` partagés ; le commentaire `default.css:322`
(« Partagé - breadcrumb, dialog, pagination ») est déjà obsolète pour `breadcrumb`/`dialog` et le
devient pour `pagination` — à corriger en « Partagé - stepper » (voire à réévaluer si stepper
migre un jour aussi, hors scope ici).

**Audit CSS préalable (2026-08-03/04)** : le DOM actuel n'expose que 7 `part` (`nav`, `list`,
`item`, `link`, `current`, `prev`, `next`) mais le CSS interne s'appuie largement sur des classes
(`pagination`, `pagination-item`, `active`, `btn`, `btn-tertiary`, `btn-ratio-square`,
`icon`/`icon-chevron-*`) qui font doublon avec ces `part` ou n'existent que pour gagner la cascade
contre `button.styles.ts`. Deux gardes CSS mortes trouvées en vérifiant contre le DOM réellement
généré (aucune n'a d'impact visuel, la garde `!important` de l'état disabled de `button.styles.ts`
l'emportant de toute façon) :

- `.pagination a.btn.btn-tertiary:not(:disabled):not(.disabled):not([aria-disabled='true']):active`
  — un `<a>` ne peut jamais matcher `:disabled`, la classe `.disabled` n'est jamais posée par le
  composant, et le 3ᵉ `:not()` est rendu inutile par le `!important` de la règle disabled partagée.
- `.pagination-item[aria-hidden='true'] .btn-tertiary:not([aria-disabled='true'])` — seul
  l'ellipse matche cette règle, et l'ellipse ne porte jamais `aria-disabled`.

Ces deux gardes disparaissent de toute façon avec la disparition des classes `.btn`/`.btn-tertiary`
elles-mêmes (section suivante) — pas de changement isolé à faire, le nettoyage est absorbé par le
découplage.

**Confirmé empiriquement (Chromium réel, Playwright) que les `!important` de la règle ellipse sont
aujourd'hui nécessaires**, contrairement à une première intuition : sans eux, un `:active`
(mousedown) sur l'ellipse ferait gagner l'état « pressé » partagé de `.btn-tertiary`
(spécificité 0,5,0, supérieure à l'unconditionnelle 0,3,0 de la règle ellipse). Cette contrainte
disparaît avec la solution retenue ci-dessous (l'ellipse ne portera plus aucune classe bouton, donc
plus aucune règle bouton ne peut la concurrencer).

## Décisions DOM

| Avant                                                                               | Après                                                              | Raison                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `class="pagination"` sur `<ul part="list">`                                         | supprimée                                                          | doublon avec `[part="list"]`, y compris pour l'ancrage de spécificité (un attribut pèse comme une classe)                                                                                                                                                                                                                                                                                                                        |
| `class="pagination-item"` sur chaque `<li part="item">`                             | supprimée                                                          | doublon avec `[part="item"]`                                                                                                                                                                                                                                                                                                                                                                                                     |
| `class="pagination-item active"` sur le `<li>` de la page courante                  | `part="item item--current"`                                        | convention « part d'état » déjà établie (`bullet--current` sur `ar-stepper`) ; sert uniquement au masquage mobile désormais (le style visuel de la page active se fait directement sur `[part="current"]`, plus besoin de traverser le parent)                                                                                                                                                                                   |
| `<span class="btn btn-tertiary">...</span>` (ellipse, sans `part`)                  | `<span part="ellipsis">...</span>`, sans classe bouton             | l'ellipse n'est pas un bouton — lui appliquer les classes bouton n'avait de sens que pour hériter la mise en page, au prix d'un jeu de `!important` pour annuler le reste. Un `part` dédié permet un style pensé pour ce qu'elle est réellement, entièrement externalisé (default.css), sans aucun style interne (elle n'a besoin de rien par défaut sans thème — pas d'enjeu a11y/fonctionnel, contrairement aux vrais boutons) |
| `class="btn btn-tertiary btn-ratio-square"` sur `<a part="prev">`/`<a part="next">` | `part="prev nav-btn"` / `part="next nav-btn"`                      | découplage de `button.styles.ts` ; `nav-btn` regroupe le traitement carré partagé prev/next, même logique que `nav-btn`/`footer-btn` sur `ar-datepicker`                                                                                                                                                                                                                                                                         |
| `class="btn btn-tertiary"` sur `<a part="link">` / `<span part="current">`          | classes retirées, `part="link"` / `part="current"` seuls suffisent | idem découplage                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `class="icon icon-chevron-l/r"` sur les chevrons                                    | supprimée                                                          | n'existait que pour la convention `.btn .icon` (espacement/couleur disabled) de `button.styles.ts` ; les chevrons prev/next redeviennent un `<span aria-hidden="true">` nu, stylé si besoin via `::part(prev)`/`::part(next)`                                                                                                                                                                                                    |

**Résultat** : plus aucune classe sur `<ul>`/`<li>`/`<a>`/`<span>` (hors `sr-only`, utilitaire
indépendant de `button.styles.ts`) — uniquement des `part` et les attributs fonctionnels
(`href`, `aria-*`, `data-ar-pagination-page`).

## Disposition des tokens (7 tokens existants)

| Token                          | Décision                               | Raison                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------ | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--ar-pagination-color`        | **Reste token**                        | Surface de surcharge volontaire déjà documentée (JSDoc : « à surcharger localement pour un fond sombre ponctuel, indépendamment du thème global ») — le blocage technique d'origine (partagé avec l'ellipse sous `!important`) disparaît avec le nouveau `part="ellipsis"`, mais l'intention produit reste valable indépendamment de ce blocage. Cas du « on ne veut pas laisser passer seulement par `::part()` » : un consommateur doit pouvoir corriger le contraste en une ligne sans écrire de règle `::part()`. |
| `--ar-pagination-bg`           | **Reste token**                        | Même rationale que `color` — la paire `bg`/`color` est ce que le commentaire du composant décrit explicitement comme le point de surcharge « fond sombre ponctuel ». Vérifié empiriquement (Playwright) que le token a un effet réel (non « mort ») une fois qu'on laisse le temps au navigateur de recalculer le style — la confusion initiale venait d'une lecture de style synchrone dans le même tour de tâche JS, pas d'un vrai bug CSS.                                                                         |
| `--ar-pagination-bg-hover`     | **Migre → `::part()` littéral**        | Aucune rationale documentée distincte de la paire de base, aucun blocage — sortie mécanique de branche 4 une fois `button.styles.ts` retiré (plus de règle bouton concurrente à battre en spécificité)                                                                                                                                                                                                                                                                                                                |
| `--ar-pagination-bg-pressed`   | **Migre → `::part()` littéral**        | Idem                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `--ar-pagination-bg-focus`     | **Migre → `::part()` littéral**        | Idem                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `--ar-pagination-active-color` | **Migre → `::part(current)` littéral** | Aucune rationale « fond sombre » documentée pour l'état actif spécifiquement, aucun blocage (page active = branche de rendu distincte, pas un état superposé sur le même élément que `link`)                                                                                                                                                                                                                                                                                                                          |
| `--ar-pagination-active-bg`    | **Migre → `::part(current)` littéral** | Idem                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

**Réponse à la question « peut pas » vs « veut pas »** : après ce lot, aucun token
`--ar-pagination-*` ne reste bloqué par une contrainte technique (contrainte 1 dark-mode : aucune
surcharge `[data-theme='dark']` n'existe pour ces tokens ; lecture JS : aucune ; réutilisation
inter-composants : aucune). Les 2 tokens conservés (`color`, `bg`) le sont par choix produit
assumé, pas par blocage — à confirmer explicitement puisque c'est une lecture, pas une règle
mécanique de l'ADR.

## Nouveau CSS interne (`pagination.styles.ts`)

Structurel uniquement, plus aucune couleur/fond :

```css
:host {
    display: block;
    box-sizing: border-box;
}

[part='list'] {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    padding-left: 0;
    margin-bottom: 0;
    list-style: none;
}

[part='prev'],
[part='next'],
[part='link'],
[part='current'] {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin: 0 0.125rem;
}

[part='prev'],
[part='next'] {
    aspect-ratio: 1/1;
}

[part='prev']:focus-visible,
[part='next']:focus-visible,
[part='link']:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
}

[part='prev'][aria-disabled='true'],
[part='next'][aria-disabled='true'] {
    cursor: not-allowed;
    opacity: 0.5; /* ou équivalent — valeur exacte à trancher en implémentation */
}

@media only screen and (max-width: 640px) {
    [part='item']:not([part~='item--current']):not([aria-hidden='true']):not(:first-child):not(
            :last-child
        ):not(:nth-child(2)):not(:nth-last-child(2)) {
        display: none;
    }
}
```

Sur le modèle `ar-breadcrumb` (« simplification assumée » lot 4) : pas de reproduction de toute la
richesse de `button.styles.ts` (pas d'ombre d'appui `:active`, pas de `border-color` distinct au
focus) — un anneau de focus simple (`outline`, WCAG 2.4.7) et un état disabled minimal suffisent,
plutôt que d'importer la complexité qu'on vient de découpler.

`border: 1px solid var(--ar-pagination-active-color)` (page active) simplifié en `border-color`
seul — `1px solid` est déjà la valeur de base, la propriété courte ne faisait que la répéter.

## Nouveau CSS externe (`default.css`)

```css
ar-pagination {
    &::part(link),
    &::part(prev),
    &::part(next) {
        background-color: var(--ar-pagination-bg);
        color: var(--ar-pagination-color);
        border-radius: /* littéral — pilule, valeur reprise de --ar-button-border-radius-pill actuel */;
    }
    &::part(link):hover,
    &::part(prev):hover,
    &::part(next):hover {
        background-color: /* littéral, ex-valeur de --ar-pagination-bg-hover */;
    }
    &::part(link):active,
    &::part(prev):active,
    &::part(next):active {
        background-color: /* littéral, ex-valeur de --ar-pagination-bg-pressed */;
    }
    &::part(link):focus,
    &::part(prev):focus,
    &::part(next):focus {
        background-color: /* littéral, ex-valeur de --ar-pagination-bg-focus */;
    }
    &::part(current) {
        color: var(
            --ar-pagination-active-color
                /* reste un cascade vers --ar-color-interactive ? à trancher */
        );
        background-color: /* littéral, ex-valeur de --ar-pagination-active-bg */;
        border-color: var(--ar-pagination-active-color);
        font-weight: 700;
    }
    &::part(ellipsis) {
        color: var(--ar-color-text-muted);
        cursor: default;
    }
}
```

Note : `--ar-pagination-active-color` reste un token (branche « reste token » ci-dessus s'applique
à `color`/`bg` uniquement — mais `active-color` migre). Vérifier en implémentation si `border-color`
de `::part(current)` doit rester une propriété séparée pilotée par un token ou passer en littéral
identique — traité en détail durant le plan, pas figé ici.

## JSDoc (`pagination.ts`)

- `@csspart` : ajouter `ellipsis` (« Le `<span>` d'ellipse entre deux groupes de pages »), documenter
  `nav-btn` comme part secondaire (« Part combiné sur `prev`/`next`, pour cibler les deux boutons de
  navigation ensemble ») et `item--current` (« Variante d'état de `item`, posée sur le `<li>` de la
  page courante »).
- `@cssprop` : retirer les 5 entrées migrées (`bg-hover`, `bg-pressed`, `bg-focus`, `active-color`,
  `active-bg`), garder `color`/`bg` avec leur mention existante.

## Tests

Bonne nouvelle : `pagination.test.ts`/`pagination.a11y.test.ts` interrogent déjà très largement par
`[part="..."]` plutôt que par classe — impact attendu minimal. Points à vérifier explicitement :

- Aucune assertion n'utilise `.active`/`.btn`/`.btn-tertiary`/`.pagination-item` (vérifié par grep,
  aucune trouvée à ce jour).
- Ajouter un test pour `part="item item--current"` sur le `<li>` actif (nouveau comportement).
- Ajouter un test pour `part="ellipsis"` sur le `<span>` d'ellipse (remplace l'actuelle assertion
  par `[aria-hidden="true"]` uniquement).
- Ajouter un test pour `part="prev nav-btn"`/`part="next nav-btn"`.
- Vérifier visuellement (Playwright, comme lors de cet audit) qu'aucune régression de contraste/
  affordance n'apparaît sur l'état disabled et le focus ring après la réécriture bespoke.

## Résultat attendu

- 5 tokens supprimés sur 7 (`bg-hover`, `bg-pressed`, `bg-focus`, `active-color`, `active-bg`),
  2 conservés par choix produit documenté (`color`, `bg`).
- `ar-pagination` totalement affranchi de `button.styles.ts` — seul `ar-stepper` reste consommateur
  de `button.styles.ts`/`--ar-button-*` après ce lot.
- DOM allégé : plus aucune classe interne hors `sr-only`, 3 nouveaux `part` (`ellipsis`, `nav-btn`,
  `item--current`).
- 2 gardes CSS mortes éliminées (absorbées par la réécriture, pas de correctif isolé nécessaire).
- Comportement/visuel par défaut inchangé (le thème reproduit les valeurs actuelles) — seule
  l'API de surcharge change de forme pour 5 des 7 tokens.
- Commentaire `default.css:322` corrigé (« Partagé - stepper » au lieu de « breadcrumb, dialog,
  pagination »).

## Hors scope

- `tooltip` — lot suivant, même grille de lecture.
- `ar-stepper` — reste consommateur de `button.styles.ts`, non traité ici.
- `button.styles.ts` lui-même — inchangé, toujours utilisé par `ar-stepper`.
- Valeur exacte de l'opacité/du style disabled bespoke, et valeur littérale exacte de chaque
  propriété migrée en `::part()` — à finaliser dans le plan d'implémentation, pas figées dans cette
  spec de conception.
