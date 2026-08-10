# Design — Labels accessibles enrichis d'ar-pagination

**Statut :** Validé (en attente de plan d'implémentation)
**Date :** 2026-08-10
**Contexte :** suite du select de saut de page ([spec](2026-08-10-pagination-select-fallback-design.md),
PR #172)

## Contexte

Audit des labels et attributs ARIA actuels d'`ar-pagination` (`packages/core/src/components/pagination/pagination.ts`), à la demande explicite d'un retour terrain : en explorant la pagination au clavier/lecteur d'écran, rien n'indique le nombre total de pages ni la position de la page active dans l'ensemble — impossible de savoir si "page 5" est la dernière ou si on est en début/fin de liste.

**Déjà en place, non modifié par ce spec :**

- `role="navigation"` + `aria-labelledby` (landmark repérable).
- `aria-disabled` synchronisé sur prev/next.
- Ellipses masquées (`aria-hidden`).
- `announceA11y` après changement de page — annonce déjà "Page X sur Y" en entier, mais
  uniquement de façon réactive (après une action), jamais pendant l'exploration.
- Le `<select>` mobile (livré juste avant) a déjà des labels complets "Page X sur Y" par option.

**Piste explorée et écartée** : `aria-setsize`/`aria-posinset` (mécanisme ARIA natif prévu pour
une liste tronquée) — support réel vérifié partiel : VoiceOver ne respecte ces attributs que sur
`role="option"`, pas sur `role="listitem"`/liens (notre structure). Sources :
[aria-posinset — Accessibility Support](https://a11ysupport.io/tech/aria/aria-posinset_attribute),
[Issue #93 — a11ysupport.io](https://github.com/accessibilitysupported/a11ysupport.io/issues/93).
Écarté au profit d'un texte sr-only enrichi, fiable sur tous les lecteurs d'écran.

## Décisions issues du brainstorming

1. **Prev/next** : ajouter le total au label déjà présent.
2. **Liens de page + page active** : enrichir avec le total, sans changement visuel — nécessite de
   séparer texte lu (sr-only, complet) et texte affiché (`aria-hidden`, juste le numéro).
3. **`aria-current="true"` → `aria-current="page"`** : correction sémantique indépendante, trouvée
   en auditant l'existant. `"page"` est le token ARIA spécifiquement prévu pour "page courante
   dans un ensemble de pages" (vs `"true"`, générique) — certains lecteurs d'écran distinguent les
   deux à l'annonce.
4. **Nom du landmark dynamique** : `"Pagination"` (statique) devient `"Pagination, page X sur Y"`
   — donne le contexte immédiatement à qui saute directement dans la région via un raccourci
   lecteur d'écran (ex. navigation par régions NVDA/JAWS), sans avoir à explorer les liens.

Hors scope : nommage distinct pour plusieurs instances du composant sur une même page (landmark
"Pagination" partagé) — problème réel mais distinct, non soulevé par la demande initiale.

## Architecture

### 1. Prev/next (`pagination.ts`, `render()`)

```html
<span class="sr-only">Page précédente (page ${previousPageNumber} sur ${total})</span>
<span class="sr-only">Page suivante (page ${nextPageNumber} sur ${total})</span>
```

Simple ajout de texte — ces labels sont déjà entièrement sr-only (l'icône est séparément
`aria-hidden`), aucun risque de duplication visuelle.

### 2. Liens de page + page active

Structure actuelle (`renderPageLabel`) :

```html
<span class="sr-only">Page&nbsp;</span>${page}
```

Le numéro est affiché ET lu tel quel après le préfixe sr-only. Nouvelle structure — texte complet
lu, numéro seul affiché :

```html
<span class="sr-only">Page ${page} sur ${total}</span> <span aria-hidden="true">${page}</span>
```

`renderPageLabel(page, total)` gagne le paramètre `total` ; `renderPage`/`renderPageLink` (qui
l'appellent) le propagent depuis `render()`. Changement de signature accepté sans dépréciation
(composant en alpha, cf. CLAUDE.md).

**Sécurité vis-à-vis du bug historique (#152, "8sur15")** : ce bug venait de plusieurs bindings
Lit interpolés séparément à même niveau dans un conteneur `display:flex`, chacun devenant un
flex-item anonyme distinct (whitespace inter-item perdu). Ici, tout le texte lu est **une seule
chaîne interpolée dans un seul `<span>`** (`Page ${page} sur ${total}`) — même schéma déjà utilisé
sans problème pour les options du select et pour `_announcePageChange`. Le `<span class="sr-only">`
est de toute façon retiré du flux flex par `position: absolute` (propriété CSS des éléments
positionnés en absolu : ils ne participent pas au layout flex de leur parent), donc aucune
interaction avec le flex du conteneur `[part~='link']`/`[part~='current']`.

`aria-current` continue de porter l'information "page active" séparément — pas de texte
"page actuelle" dupliqué dans le label (déjà porté par `aria-current`, cf. point 3).

### 3. `aria-current="page"`

Dans `renderPageLink` :

```html
<span part="current" tabindex="-1" aria-current="page" data-ar-pagination-page="${page}"></span>
```

Remplace `aria-current="true"`. Seul ce point change dans `renderPageLink` ; le reste (structure,
`tabindex="-1"`, `data-ar-pagination-page`) est inchangé.

### 4. Nom du landmark dynamique

```html
<p id="ar-pagination" class="sr-only">Pagination, page ${current} sur ${total}</p>
```

Remplace le texte statique `"Pagination"`. `aria-labelledby="ar-pagination"` sur le `<nav>` reste
inchangé — seul le contenu du `<p>` référencé devient dynamique. Réactif à chaque changement de
`current`/`total` comme le reste du template.

## Tests

- **Unitaires (Vitest)** :
    - `aria-current` vaut `"page"` (pas `"true"`) sur `[part="current"]` — met à jour le test
      existant `'la page active a aria-current="true"'` (`pagination.test.ts:161`).
    - Contenu du `<span class="sr-only">` de chaque lien/page active = `"Page X sur Y"`.
    - Contenu du `<span aria-hidden="true">` = le numéro seul (comportement visuel inchangé).
    - Labels sr-only de prev/next incluent `"sur {total}"`.
    - Nom du landmark (`<p id="ar-pagination">`) reflète `current`/`total` courants, y compris après
      un changement de page.
- **Browser (WTR)** : aucune régression sur les tests de focus existants
  (`pagination.browser.test.ts`, focus sur `[part~="current"]` après activation) — la structure du
  `<span part="current">` change de contenu interne, pas de tabindex/focusabilité.
- **Accessibilité (axe-core, `pagination.a11y.test.ts`)** : suite existante (première/milieu/
  dernière page, avec ellipses) doit rester verte. Ajouter un scénario au palier select
  (`_budget` forcé sous le plancher) pour couvrir ce mode dans le passage axe-core, non couvert
  aujourd'hui.

## Hors scope

- `aria-setsize`/`aria-posinset` (support VoiceOver insuffisant sur notre structure, cf. ci-dessus).
- Nommage distinct du landmark pour plusieurs instances du composant sur une même page.
- Modification du contenu ou du comportement du `<select>` mobile (déjà conforme, labels complets
  livrés dans la PR précédente).
