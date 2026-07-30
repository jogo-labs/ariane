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
(sélecteurs), puis vérifié visuellement (Playwright, viewport mobile 375px, panel dropdown
ouvert) pour le point le plus incertain (puce mobile).

## 1. Nettoyage CSS mort/redondant

Trouvé en comparant le HTML réellement rendu (aucune icône dans un item, un seul `<ol>` actif à
la fois) aux sélecteurs déclarés :

- **`.breadcrumb-text .icon:first-child`, `.breadcrumb-link .icon:first-child`,
  `.breadcrumb-link:visited .icon:first-child`** — supprimées. `ArBreadcrumbItem` n'expose que
  `label`/`href`, aucune icône n'est jamais rendue dans `[part='current']`/`[part='link']`. CSS
  mort, résidu de l'import.
- **`.breadcrumb-item.active { color: var(--ar-breadcrumb-color); ... }`** — la déclaration
  `color` est supprimée (redondante : déjà héritée via `.breadcrumb { color: var(--ar-breadcrumb-color) }`
  → `color: inherit` sur les enfants). Seul `font-weight: 700` reste.
- **`.breadcrumb-desktop .breadcrumb-item + .breadcrumb-item { padding: 0; }`** — supprimée,
  aucune autre règle ne donne de padding à un `<li>` (valeur native déjà 0).
- **`.breadcrumb-mobile { margin: 0; }`** — supprimée, déjà couverte par `.breadcrumb { margin: 0 }`
  (les deux classes sont toujours posées ensemble).
- **`.breadcrumb-mobile .breadcrumb-item { padding: 0; position: relative; }`** — `padding: 0`
  probablement redondant (même raisonnement). `position: relative` semble inutile : rien n'est
  positionné en absolu à l'intérieur d'un item (seul le `<ol>` parent en a besoin, pour son
  connecteur pointillé `:before`). À confirmer empiriquement pendant l'implémentation
  (suppression, puis vérification visuelle avant de merger).

Aucun changement visuel attendu pour ce point — vérification de non-régression en implémentation.

## 2. Puce mobile agrandie — correction du sélecteur `:first-child`

**Constat vérifié visuellement** (Playwright, panel mobile ouvert, démo à 5 niveaux) : le premier
élément du `<ol>` mobile — qui est en réalité le **deuxième** crumb du fil complet, le premier
(« Accueil ») étant rendu séparément hors de cette liste (`listTemplates.slice(1)`) — reçoit une
puce agrandie identique à celle de l'élément courant (dernier). Les éléments intermédiaires ont
une puce plus petite.

**Décision :** la règle `.breadcrumb-mobile .breadcrumb-item:first-child:before` est retirée.
Seule `.breadcrumb-mobile .breadcrumb-item:last-child:before` (élément courant) garde la puce
agrandie + la couleur active. Simplifie la règle et élimine l'ambiguïté — un seul signal visuel
fort (l'élément courant), pas deux dont un dénué de sens depuis le `.slice(1)`.

## 3. Découplage des boutons mobile (`home`/`trigger`) de `button.styles.ts`

**Constat :** `#mobile-home-btn` et `[part='trigger']` portent les classes `.btn.btn-tertiary`
(`.btn-ratio-square` pour le trigger), qui gèrent déjà nativement tous les états
(repos/hover/actif/focus) via les tokens génériques `--ar-button-tertiary-*`. Or les 4 tokens
`--ar-breadcrumb-toggle-bg*` sont déclarés dans `default.css` comme de purs alias 1:1 vers ces
mêmes tokens génériques, puis réappliqués par une règle interne dédiée dans
`breadcrumb.styles.ts` (spécificité ID pour `#mobile-home-btn`) — aucune différence visuelle
possible, redondance garantie par construction.

Décision du mainteneur : plutôt que de supprimer ces tokens pour laisser `.btn-tertiary`
gouverner seul (ce qui maintiendrait une dépendance à `button.styles.ts`), `ar-breadcrumb` doit
au contraire s'**affranchir** de `button.styles.ts` — `button.styles.ts` est perçu comme peu
compatible avec l'esprit headless de la librairie à terme (réflexion séparée, hors scope de ce
lot). Même geste que la refonte du bouton close d'`ar-dialog`/`ar-alert` en lot 3b/3a : un
composant qui a besoin d'un bouton simple réimplémente sa propre surface minimale plutôt que de
dépendre d'une feuille de classes partagée pensée pour un cas plus général.

### Changements

- **Nouveau `part="home"`** sur l'élément actuellement identifié par `#mobile-home-btn` —
  remplace la sélection par ID, cohérent avec `[part='trigger']` déjà existant.
- **Retrait de `.btn`, `.btn-tertiary`, `.btn-ratio-square`** des deux boutons.
- **Structure et états réimplémentés directement dans `breadcrumb.styles.ts`** (`display:
inline-flex`, `align-items: center`, `justify-content: center` pour le trigger carré,
  transition `background-color`), pilotés par les 4 tokens `--ar-breadcrumb-toggle-bg*`
  existants — qui cessent d'être des alias mécaniques : `default.css` peut leur donner
  n'importe quelle valeur (garde le même rendu par défaut si le thème veut, sans obligation
  d'aliaser `--ar-button-tertiary-*`).
- **Icon spacing géré localement** (`margin-right` sur `.icon:first-child` dans le scope du
  composant), plus de dépendance à la règle partagée `.btn .icon`.
- **Border-radius : aucun token, ni interne ni scopé.** Propriété purement cosmétique, à usage
  unique, sur un élément qui porte déjà un `part` → branche 4 pure de l'ADR-005 : ni le
  composant ni `default.css` ne passent par un token intermédiaire, la valeur est déclarée
  directement dans les règles `::part(home)`/`::part(trigger)` de `default.css` (littérale, ex.
  `border-radius: var(--ar-button-border-radius-pill)` si le thème veut réutiliser le token
  primitif existant, ou toute autre valeur — au choix du thème, pas du composant).
- **Focus visible : `outline: 2px solid currentColor; outline-offset: 2px;`** sur
  `:focus-visible`, sans aucun token — même pattern exact que `ar-alert::part(close):focus-visible`.
  Contraste garanti par `currentColor` (couleur déjà definie du bouton), WCAG 2.4.7 sans
  dépendance à `--ar-button-focus-ring-color`.
- **Tests migrés** de `#mobile-home-btn`/`#breadcrumb-dropdown` vers
  `[part='home']`/`[part='trigger']` (cohérent avec le pattern déjà utilisé ailleurs, ex.
  `[data-ar-dismiss]` sur `ar-dialog`) — les deux IDs disparaissent du template, plus utilisés
  ni pour le style ni pour les tests.

## 4. Application du critère token-vs-part (ADR-005) aux tokens restants

19 tokens `default.css` au total, hors ceux couverts par la refonte du point 3.

- **`--ar-breadcrumb-distance`, `--ar-breadcrumb-offset`** — lus en JS par `AnchoredController`
  (`getComputedStyle`) → restent tokens (contrainte 2 de l'ADR).
- **`--ar-breadcrumb-color`** — après le nettoyage du point 1, n'est plus consommé qu'une fois
  (`.breadcrumb { color: ... }`), mais cette classe est partagée par les deux `<ol>`
  (mobile ET desktop) sans qu'aucun des deux ne porte de `part` dédié pour cette propriété côté
  mobile (seul le desktop expose `part="list"`). Reste un token pour ce lot — un passage par
  `nav[part='nav'] { color: ... }` (le `<nav>` expose déjà `part="nav"`, hérite naturellement
  vers les deux listes) est une piste plausible mais touche à la structure de couleur globale du
  composant ; à évaluer séparément plutôt que d'élargir ce lot.
- **`--ar-breadcrumb-separator-color`, `--ar-breadcrumb-bullet-color`,
  `--ar-breadcrumb-bullet-ring-color`, `--ar-breadcrumb-mobile-separator-color`,
  `--ar-breadcrumb-active-bullet-color`** — pilotent toutes des pseudo-éléments `::before`
  (séparateur desktop, puces mobiles, connecteur pointillé) → **restent tokens**, contrainte 3 de
  l'ADR-005 (`::part()` ne peut jamais cibler `::before`/`::after`), déjà identifiée par l'audit
  du 2026-07-25.
- **Famille panel** (`--ar-breadcrumb-panel-*`, 7 tokens) : `[part='panel']` existe déjà.
    - `panel-bg`, `panel-border-color` → **restent tokens** (fallback a11y `Canvas`/`ButtonBorder`
      déjà présent en consommation, mécanisme WCAG-critique sans thème, contrainte 1).
    - `panel-min-width`, `panel-max-width`, `panel-border-radius`, `panel-shadow`,
      `panel-padding` → **candidats confirmés** (les 5 identifiés par l'audit du 2026-07-25),
      migrés vers une règle `::part(panel)` dans `default.css`, sans token scopé intermédiaire.

## Résultat attendu

- 4 tokens `--ar-breadcrumb-toggle-bg*` conservés mais redéfinis (plus des alias morts).
- 5 tokens panel migrés vers `::part(panel)`.
- 9 tokens conservés tels quels (distance, offset, color, 5 tokens `::before`, — la famille
  panel bg/border-color).
- CSS mort/redondant retiré (5 points, section 1).
- 1 correction de comportement visuel (puce mobile, section 2).
- Boutons mobile entièrement découplés de `button.styles.ts`.

## Hors scope

- Réflexion globale sur la valeur de `button.styles.ts` dans une librairie headless — notée
  séparément, pas traitée ici (ne concerne que `ar-breadcrumb` dans ce lot).
- `--ar-breadcrumb-color` migré vers `nav[part='nav']` — piste identifiée, pas retenue pour ce
  lot (nécessite de vérifier l'impact sur toute règle interne qui pourrait déjà en dépendre
  différemment côté mobile vs desktop).
- Lots suivants (`dropdown`, `pagination`, `tooltip`) — hors scope, à traiter séparément.
