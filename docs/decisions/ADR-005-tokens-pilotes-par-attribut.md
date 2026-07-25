# ADR-005 : Tokens pilotés par attribut — pas de valeur littérale dans les composants

**Statut :** Adopté
**Date :** 2026-07-16

## Contexte

ADR-004 pose la répartition en 3 couches (styles internes fixes / tokens `--ar-*` / `::part()`)
mais illustre la couche 2 avec un exemple aujourd'hui dépassé : `color: var(--ar-tab-color, currentColor)`,
un fallback fonctionnel inline dans le composant. Depuis le chantier headless (#47, PR #90), la
pratique a changé : `packages/core/src/styles/themes/default.css` est la seule source de valeurs de
design, sans fallback dans les composants (cf. CLAUDE.md, section « Philosophie de conception »).
Le reste d'ADR-004 (répartition en 3 couches) reste valide — seul cet exemple ponctuel est obsolète.

L'audit de `dialog.styles.ts` (2026-07-16, cf.
`docs/superpowers/specs/2026-07-16-dialog-width-headless-tokens-design.md`) a révélé un cas non
couvert par la règle « aucun fallback cosmétique » : des tokens dont la valeur dépend d'un
attribut du composant (`--ar-dialog-width` piloté par `size`/`mode`), codés en dur directement
sur `:host([size='sm'])` etc. Ce cas n'est pas un fallback au sens d'ADR-004 (pas de
`var(--token, valeur)` inline) mais une violation de même nature : une valeur de design présente
dans le code du composant plutôt que dans `default.css`.

## Décision

Amendement à ADR-004 : l'exemple `var(--ar-tab-color, currentColor)` ne doit plus être suivi —
aucune valeur de repli, fonctionnelle ou cosmétique, ne doit apparaître dans le CSS d'un composant.
Toute valeur de design vit dans `default.css`, consommée via `var(--token)` sans second argument.

Nouvelle règle pour les tokens pilotés par état/attribut : chaque état a son propre token
`default.css`, nommé `--ar-<composant>-<propriété>-<état>` (ex. `--ar-dialog-width-sm`). Le
composant sélectionne la valeur via `var()` dans ses règles d'attribut (`:host([attr='...'])`) —
jamais de valeur littérale, même conditionnelle. Le token « consolidé » que ces règles alimentent
(ex. `--ar-dialog-width`) reste public et documenté (`@cssprop`) s'il sert aussi de point de
surcharge direct pour un consommateur.

Un garde-fou automatique (`packages/core/scripts/validate-no-hardcoded-tokens.js`, branché dans
`cem.config.js`) fait échouer `npm run build:manifest` si une assignation `--ar-*: <valeur littérale>;`
est détectée dans un fichier `*.styles.ts`.

## Exception assumée : l'attribut `size`

`size` (`sm`/`md`/`lg`/`xl`) sort de l'esprit headless, indépendamment de la règle ci-dessus sur
le sourcing des tokens. Le sourcing est conforme (chaque palier vient d'un token `default.css`,
rien n'est codé en dur) — ce qui sort du cadre, c'est l'existence même d'une taxonomie de tailles
imposée par le composant : une librairie headless au sens strict n'a pas d'opinion sur les
paliers de largeur d'un dialog, elle expose juste le point de surcharge (`--ar-dialog-width`) et
laisse le consommateur choisir sa valeur. C'est le choix fait par des libs comparables comme
WebAwesome, qui n'a pas d'attribut `size` sur son dialog.

Ariane assume cette exception plutôt que de la corriger : les paliers apportent une valeur a11y/DX
réelle (évite les dialogs démesurés par défaut, cohérence visuelle immédiate) sans rien retirer au
modèle headless — `--ar-dialog-width` reste un point de surcharge direct, `size` n'est qu'une
commodité au-dessus. C'est aujourd'hui un cas isolé : aucun autre composant de la librairie
n'expose d'attribut de taille équivalent. Un futur composant qui voudrait reproduire ce pattern
doit se reposer la question plutôt que copier `size` par mimétisme — l'exception n'est pas un
précédent générique.

## Conséquences

- `dialog.styles.ts` migré : `--ar-dialog-spacing` et les 8 variantes de `--ar-dialog-width`
  (`sm`/`md`/`lg`/`xl` × `modal`/`drawer`) sourcées depuis `default.css`.
- Tout nouveau composant avec une valeur pilotée par attribut doit suivre ce pattern dès sa
  conception — le garde-fou automatique le rappellera sinon au premier `npm run build:manifest`.
- Pas de convention de nommage pour des tokens véritablement internes/non documentables — écartée
  faute de cas concret (YAGNI), à documenter séparément si un besoin apparaît.

## Amendement (2026-07-22) : fallback d'accessibilité sur les surfaces flottantes

L'interdiction stricte de tout fallback (section « Décision » ci-dessus) suppose implicitement
qu'un thème (`default.css` ou équivalent) est toujours chargé par le consommateur. En pratique,
son absence rend certaines surfaces flottantes avec fond (dropdown/breadcrumb/stepper mobile/
datepicker via `panel.styles.ts`, plus `ar-tooltip`) confuses ou inaccessibles : panel
transparent qui se confond avec la page, texte illisible, cible tactile sous le seuil WCAG 2.5.8.

**Critère retenu :** un token peut recevoir un fallback fonctionnel dans le composant si, et
seulement si, son absence rend le composant confus, cassé ou inaccessible sans thème chargé —
pas juste « moins joli ». Présomption d'éligibilité pour les cas relevant d'un critère WCAG
précis (1.4.3, 1.4.11, 2.4.7, 2.5.8…) ; éligibilité sans présomption pour le reste, à justifier
individuellement.

**Deux mécanismes, jamais un fallback « à nous » choisi arbitrairement :**

1. **Couleur système CSS4** (préféré) : mots-clés (`Canvas`, `CanvasText`, `ButtonBorder`, etc.)
   pour tout ce qui touche au contraste — héritent du thème OS/navigateur, y compris le mode
   contraste élevé.
2. **Valeur littérale justifiée** : pour les dimensions sans équivalent système, un commentaire
   `/* a11y-fallback: <raison> */` sur la ligne précédant la valeur, vérifié automatiquement par
   `validate-no-hardcoded-tokens.js` (`findUnjustifiedFallbacks`, branché dans `cem.config.js`).

`border-radius`, `box-shadow` et le padding générique restent hors exception (purement
cosmétiques). Ce critère devient la règle générale de la librairie ; son application immédiate se
limite aux surfaces flottantes déjà identifiées. L'audit du reste des composants (issue #129,
2026-07-23) a étendu la liste blanche des mots-clés couleur système avec `Highlight`/
`HighlightText` (sémantique dédiée aux états sélectionné/actif) et corrigé des anneaux de focus
cassés, `ar-progressbar` invisible, `ar-dialog` sans surface visible, l'indicateur d'onglet actif
et les états de la grille `ar-datepicker`.

Détail complet du raisonnement, du périmètre et des tokens concernés :
`docs/superpowers/specs/2026-07-22-css-fallback-accessibilite-design.md`.

## Amendement (2026-07-24) : critère token scopé vs `::part()`

La généralisation du scoping systématique (issue #129, PR #136) a produit un volume de
tokens à usage unique difficile à justifier — `ar-datepicker` déclarait 58 tokens `:root`
dont 65% consommés à un seul endroit. Une variable n'est vraiment utile que si elle est
réutilisable ; `::part()` offre déjà un point de surcharge gratuit pour toute propriété d'un
élément interne, sans nécessiter de token dédié.

**Critère retenu**, à appliquer dans l'ordre pour toute propriété CSS consommée via un token
scopé :

1. Mécanisme WCAG/fonctionnel critique sans thème (fallback déjà requis par l'amendement du
   2026-07-22) → reste un token, avec son fallback.
2. Lu en JavaScript (`getComputedStyle`, ex. `AnchoredController`) → reste un token `:root`,
   `::part()` n'est pas lisible en JS.
3. Réutilisé ≥ 2 fois dans le `.styles.ts` du composant (vraie valeur DRY) → reste un token.
4. Sinon (usage unique, propriété d'un élément interne portant un `part`, pas de fallback
   critique) → la propriété n'est pas déclarée dans le composant ; `default.css` la stylise
   directement via une règle `::part()`, sans token scopé intermédiaire ni `@cssprop` dédié.

Un token consommé **uniquement** par la propre règle `::part()` de `default.css` (jamais par
le composant) n'est pas une vraie surface d'API — repli direct sur une valeur littérale dans
la règle, pas de token `:root`.

**Deux contraintes techniques** limitent la branche 4 : `::part()` ne peut cibler que des
éléments portant un `part` (jamais `:host`) — une propriété sur `:host` reste nécessairement
un token quel que soit son usage. Une **valeur dark-mode calibrée indépendamment de son alias
clair** (pas une simple variance héritée) prime aussi sur le critère « usage unique » — un tel
token reste en place plutôt que d'être aplati en valeur littérale dans une règle `::part()`,
ce qui perdrait sa calibration sans dupliquer la règle sous un bloc dark.

**Application** : `ar-datepicker` (cas d'étude), 35 tokens sur 58 migrés vers 8 nouvelles
règles `::part()` groupées (`nav-btn`, `footer-btn`, `header`, `footer`, `weekday` — nouveau
part créé pour l'occasion —, `day`, `panel`, `label` amendée). 23 tokens conservés. Détail
complet : `docs/superpowers/specs/2026-07-24-token-vs-part-datepicker-design.md`. Les 5
autres composants scopés par PR #136 n'ont pas été réaudités sous cet angle — périmètre
volontairement limité au cas d'étude, à généraliser dans un chantier séparé si le critère
fait ses preuves.
