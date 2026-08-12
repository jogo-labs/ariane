# Design — `ar-pagination` : mode compact (prev/next + label)

**Statut :** Validé (en attente de plan d'implémentation)
**Date :** 2026-08-12
**Contexte :** issue [#180](https://github.com/jogo-labs/ariane/issues/180), née pendant la revue de
la démo « Header avancé » d'`ar-dialog` (#145, PR #179)

## Reconceptualisation du vocabulaire existant

Point tranché en amont, car il détermine le nom disponible pour la suite. Le comportement actuel
de repli automatique en `<select>` (piloté par `ResizeObserver`, cf.
`2026-08-10-pagination-select-fallback-design.md`) était jusqu'ici informellement appelé
« compact » dans les échanges (PR #179). Ce nom est **libéré** : le repli auto redevient
simplement le comportement par défaut du composant — sans attribut, sans nom d'API dédié,
documenté comme « adaptatif » en interne/doc si besoin de le désigner. `compact` devient le nom du
nouveau mode explicite décrit ci-dessous.

Alternative écartée : un attribut `mode="compact"` façon `ar-dialog` (`mode="modal"|"drawer"`).
Écarté par YAGNI — ni `ar-pagination` ni `ar-dialog` n'ont aujourd'hui de second mode identifié qui
justifierait la syntaxe extensible `mode="..."`. Un attribut booléen simple suffit à l'unique
distinction connue (numéroté adaptatif vs compact). Si un vrai second mode apparaît un jour (ici ou
sur `ar-dialog`), la migration vers `mode="compact"` sera un changement mineur, acceptable en
alpha.

## API publique

Nouvelle propriété :

```ts
@property({ reflect: true, type: Boolean })
compact: boolean = false;
```

- `compact=false` (défaut) : comportement actuel inchangé — numérotation avec repli automatique en
  `<select>` selon l'espace disponible.
- `compact=true` : nouveau rendu — uniquement prev/next + un label de position non cliquable
  (`Page X / Y`), **identique en mobile et desktop**, pas de bascule responsive.
- Pas de mécanisme i18n pour le texte du label : cohérent avec le reste du composant, dont tous les
  textes/`aria-label` sont déjà en dur en français, sans infrastructure i18n dans Ariane à ce jour.
  Hors scope de #180.

## DOM / rendu

Le squelette `<nav part="nav"><ul part="list">` est conservé pour les deux modes — seul le contenu
de la liste change. En mode compact, `<ul>` contient 3 `<li>` :

```html
<nav part="nav" role="navigation" aria-labelledby="ar-pagination">
    <p id="ar-pagination" class="sr-only">Pagination, page X sur Y</p>
    <ul part="list">
        <li part="item page-label">
            <span part="label" aria-hidden="true">Page X / Y</span>
        </li>
        <li part="item">
            <a part="prev nav-btn..." href="javascript:;" aria-disabled="...">…</a>
        </li>
        <li part="item">
            <a part="next nav-btn..." href="javascript:;" aria-disabled="...">…</a>
        </li>
    </ul>
</nav>
```

- **Ordre DOM `label, prev, next`** (validé) : le label en premier positionne naturellement le
  contenu au début du flow logique (gauche en LTR, droite en RTL), sans CSS `order` ni logique
  supplémentaire. Alternative écartée : `prev, label, next` — aurait nécessité un repositionnement
  CSS pour respecter l'exigence de l'issue (label à gauche/début), sans bénéfice identifié.
- Les parts `prev`/`next`/`nav-btn`/`nav-btn--disabled` sont **strictement identiques** entre les
  deux modes — un thème stylant `::part(nav-btn)` fonctionne sans changement en mode compact.
  `aria-disabled` calculé exactement comme aujourd'hui (`current <= 1` / `current >= total`).
- Nouveaux `csspart` : **`page-label`** (le `<li>` englobant, sur le modèle de `page-select`) et
  **`label`** (le `<span>` interne, sur le modèle de `select`).
- `total === 1` : prev et next tous deux désactivés, label affiche « Page 1 / 1 » — cohérent avec
  le comportement actuel en mode numéroté.

## Accessibilité

- Le `<p id="ar-pagination">` sr-only existant (« Pagination, page X sur Y ») et les `aria-label`
  « Page précédente (page X sur Y) » / « Page suivante » déjà posés sur prev/next restent
  **inchangés** et portent toute l'information nécessaire au lecteur d'écran.
- Le `<span part="label">` visible porte donc **`aria-hidden="true"`** : sans ce marquage, le
  lecteur d'écran lirait le texte « Page X / Y » en plus du `<p>` sr-only déjà mis à jour à chaque
  changement de page — double annonce. Ce pattern (séparer texte visible `aria-hidden` et
  équivalent sr-only) est déjà celui de `renderPageLabel()` pour les numéros de page en mode
  adaptatif.
- Aucune annonce dédiée supplémentaire n'est nécessaire : `_announcePageChange()` (existant, `role`
  polite) continue de couvrir le changement de page dans les deux modes.

## Comportement / cycle de vie

- **Court-circuit total** du calcul de largeur en mode compact (validé — alternative « observer
  conservé mais ignoré » écartée pour éviter un travail de mesure inutile et un état interne plus
  difficile à raisonner) :
    - `connectedCallback`/`firstUpdated` ne montent pas le `ResizeObserver` si `compact === true`.
    - `_recalculateBudget()` n'est jamais appelé, `_budget`/`_calculatePages` ne sont pas utilisés
      pour le rendu.
- **Toggle runtime** de `compact` géré dans `updated()` via `changed.has('compact')` :
    - passage à `true` → `this._resizeObserver?.disconnect()`.
    - passage à `false` (si `_initialized`) → `this._setupResizeObserver()`.
    - Cas limite peu probable en usage réel, mais gratuit à couvrir puisque
      `_setupResizeObserver()`/`disconnect()` existent déjà.
- `render()` bifurque tôt : `this.compact ? this.renderCompact(...) : <rendu existant>`. Les
  calculs `previousPageNumber`/`nextPageNumber`/`isPreviousDisabled`/`isNextDisabled`, déjà en tête
  de `render()`, restent communs aux deux branches.
- `_onPreviousPage`/`_onNextPage`/`_requestPageChange`/`_emitChanged`/`_announcePageChange` :
  **inchangés**, réutilisés tels quels. Les événements `ar-pagination-page-change`/
  `ar-pagination-page-changed` se comportent identiquement dans les deux modes (modèle contrôlé
  préservé, cf. `2026-08-10-pagination-controlled-current-design.md`).
- Pas de gestion de `_pendingFocusPage` en mode compact : comme aujourd'hui pour prev/next (seul le
  clic sur un numéro de page pose ce flag), le focus reste naturellement sur le bouton prev/next
  cliqué — aucun changement de comportement de focus à implémenter.

## Style / thème

- `--ar-pagination-btn-size` et `--ar-pagination-transition-duration` s'appliquent identiquement
  aux deux modes (mêmes parts `prev`/`next`/`nav-btn`).
- Nouveau part `label` : token de couleur/typo à définir dans `themes/default.css` au moment du
  plan d'implémentation, après relecture de `pagination.styles.ts` pour rester cohérent avec les
  tokens déjà exposés par le composant plutôt que d'en inventer un nouveau à l'aveugle (headless —
  pas de fallback cosmétique dans `pagination.styles.ts`, cf. philosophie du projet).
- Aucun style spécifique au mode compact n'est imposé par le composant pour l'agencement visuel
  prev/next (absence de gap, coins internes non arrondis, etc.) : **hors scope**, laissé au
  consommateur via `ar-pagination[compact]::part(prev)` / `::part(next)`. Le composant reste
  headless sur ce point, comme sur le reste de son style.

## Tests

- **Unit** (`pagination.test.ts`) : rendu du label avec le texte attendu selon `current`/`total`,
  `aria-hidden` posé sur `part="label"`, absence d'instanciation de `ResizeObserver` en mode
  compact, `disabled` correct sur prev/next aux bornes (`current=1`, `current=total`, `total=1`),
  toggle runtime de `compact` (attache/détache l'observer).
- **A11y** (`pagination.a11y.test.ts`) : passage axe-core sur le rendu compact, vérification de
  l'absence de double annonce (le `<p>` sr-only porte l'info, le label visible est `aria-hidden`).
- **Browser** (`pagination.browser.test.ts`) : navigation clavier/clic prev/next en mode compact,
  focus après clic reste sur le bouton actionné.
- **Doc** (`apps/docs/src/content/components/ar-pagination.mdx`) : nouvelle démo mode compact, mise
  à jour du tableau des attributs (`compact`) et des csspart (`page-label`, `label`).

## Hors scope

- Attribut `mode="compact"` extensible — écarté par YAGNI, cf. section « Reconceptualisation ».
- i18n du texte du label et des `aria-label` prev/next — cohérent avec l'absence d'infrastructure
  i18n dans le reste du composant/projet.
- Style par défaut du composant pour l'agencement visuel prev/next en mode compact (gap, arrondis
  internes) — laissé au consommateur via `::part()`, le composant reste headless.
- Navigation directe à une page arbitraire en mode compact — l'issue #180 précise explicitement une
  navigation strictement séquentielle ; pas de saut de page dans ce mode.
