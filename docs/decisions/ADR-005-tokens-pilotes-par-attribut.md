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
4. Sinon (usage unique, pas de fallback critique) → la propriété n'est pas déclarée dans le
   composant ; `default.css` la stylise directement, sans token scopé intermédiaire ni
   `@cssprop` dédié — via une règle `::part()` si la propriété cible un élément interne portant
   un `part`, via une règle sur le tag lui-même (`ar-<composant> { ... }`) si elle cible `:host`
   (cf. correction ci-dessous — `:host` n'exclut plus la branche 4).

Un token consommé **uniquement** par la propre règle `::part()` de `default.css` (jamais par
le composant) n'est pas une vraie surface d'API — repli direct sur une valeur littérale dans
la règle, pas de token `:root`.

**Correction (2026-07-25)** : une version précédente de cet amendement excluait toute
propriété sur `:host` de la branche 4, au motif que « `::part()` ne peut cibler que des
éléments portant un `part`, jamais `:host` ». C'est vrai mais insuffisant — vérifié
empiriquement (Chromium réel, Playwright) qu'une règle de thème ciblant le tag directement
(`ar-alert { border-radius: 2rem; }`, sans `::part()`) l'emporte elle aussi sur la règle
`:host { border-radius: var(--ar-alert-border-radius); }` interne au composant, **même si le
composant continue de déclarer une valeur sur `:host`** — le même mécanisme « la feuille de
style externe l'emporte sur la règle interne » s'applique, que la cible soit un `[part]` via
`::part()` ou l'hôte lui-même via son nom de tag (l'hôte reste un élément du light DOM,
atteignable sans traverser de frontière shadow). **`:host` n'exclut donc plus la branche 4** —
seules les trois contraintes suivantes restent des exclusions réelles.

**Contraintes techniques** qui limitent la branche 4 :

1. **Valeur dark-mode calibrée indépendamment de son alias clair** (pas une simple variance
   héritée) → prime sur le critère « usage unique », un tel token reste en place plutôt que
   d'être aplati en valeur littérale dans une règle externe, ce qui perdrait sa calibration
   sans dupliquer la règle sous un bloc dark.
2. **Propriété surchargée par une règle d'état interne au composant** (classe posée
   dynamiquement par le composant — `.today`, `.selected`… — ou attribut d'hôte dynamique type
   `[aria-selected]`) → doit rester un token consommé à l'intérieur du composant, jamais migrée
   en externe. Vérifié empiriquement (Chromium réel, Playwright) qu'une règle externe (thème,
   via `::part()` **ou** en ciblant directement le tag pour une propriété `:host`) l'emporte
   systématiquement sur une règle interne au shadow DOM ciblant la même propriété, **même
   quand la règle interne a une spécificité CSS plus élevée**. Concrètement sur
   `ar-datepicker` : `color`/`background-color` de `[part='day']` ont dû rester des tokens
   (`--ar-datepicker-day-color`, `--ar-datepicker-day-bg`) car les règles d'état internes
   (`.today`, `.selected`, `:hover`, `.other-month`) les surchargent — les migrer dans
   `::part(day)` aurait rendu les jours sélectionné/actif/survolé indiscernables des autres
   (régression WCAG), trouvé et corrigé en revue finale de la PR de migration. `font-size`,
   `border-radius` et `border-width` de `[part='day']` n'ont pas ce problème (aucune règle
   interne ne les surcharge) et sont bien restés dans `::part(day)`. Les pseudo-classes
   **natives** (`:hover`, `:focus-visible`, `:active`, `:disabled`…) ne sont pas concernées —
   elles composent normalement avec `::part()`/le tag externe (`ar-x:hover::part(y)`,
   `ar-x:hover { ... }`), seul un état exprimé par une classe/attribut **posé par le
   composant** pose problème.
3. **`::part()` ne peut jamais cibler un pseudo-élément** (`::before`/`::after`) d'un élément
   `part` — `::part(x)::before` n'est pas un sélecteur CSS valide. Un token qui pilote un
   pseudo-élément décoratif reste nécessairement un token, quel que soit son usage (trouvé sur
   `breadcrumb`/`table-sort` lors de l'audit du 2026-07-25).
4. **Réutilisation inter-composants** : un token consommé par le `.styles.ts` d'un _autre_
   composant que celui qui le déclare (ex. `--ar-tab-group-border-*-width`, consommé aussi
   dans `tab.styles.ts` pour compenser visuellement la bordure du groupe parent) doit rester un
   token pour que les deux composants restent synchronisés — cas de réutilisation plus fort que
   le critère 3 (qui ne regarde que le même fichier).
5. **État posé sur un `part` ancêtre, ciblant un `part` descendant différent** (ex.
   `[part='step-link']:hover [part='bullet']`) → doit rester un token consommé à
   l'intérieur du composant, même raisonnement que la contrainte 2 mais sur deux éléments
   distincts plutôt qu'un seul. Vérifié empiriquement (Chromium réel, Playwright) sur
   `ar-stepper` : une règle externe `::part(bullet)` neutralise totalement la règle interne
   ancêtre→descendant, y compris au survol — le descendant reste figé sur la valeur externe
   même quand l'ancêtre est survolé. Concrètement : `--ar-stepper-bullet-hover-bg`,
   `--ar-stepper-link-hover-bullet-color`, `--ar-stepper-link-hover-bullet-text-color` et
   `--ar-stepper-link-hover-label-color` restent des tokens pour cette raison.

**`:host` n'est plus une exclusion en soi** (correction du 2026-07-25 ci-dessus) — une
propriété sur `:host` suit le même critère que les autres, migrée vers une règle externe
ciblant le tag si elle est candidate.

**Application** : `ar-datepicker` (cas d'étude, 2026-07-24), 33 tokens sur 58 migrés vers 8
nouvelles règles `::part()` groupées (`nav-btn`, `footer-btn`, `header`, `footer`, `weekday` —
nouveau part créé pour l'occasion —, `day`, `panel`, `label` amendée). 25 tokens conservés (23
issus du critère initial + 2 réintroduits pour la contrainte 2 ci-dessus). Détail complet :
`docs/superpowers/specs/2026-07-24-token-vs-part-datepicker-design.md`.

**Audit du reste de la librairie (2026-07-25)** : les 17 autres composants (hors datepicker,
hors ceux sans `.styles.ts` dédié) ont été audités selon ce critère. 44 tokens candidats
directs identifiés sur 12 composants (`stepper` 8, `alert` 7, `dialog` 7, `breadcrumb` 5,
`dropdown` 5, `pagination` 5, `tooltip` 5, `table-sort` 2, `collapse` 2, `charcounter` 1,
`progressbar` 1, `tab-group` 1), + 9 tokens nécessitant une vérification empirique
supplémentaire avant décision (`tab` 6, `charcounter` 3 — pattern de surcharge par attribut
d'hôte dynamique combiné à des pseudo-classes natives, jamais testé par la migration
datepicker). Constat structurel notable sur `stepper` : la majorité de ses ~31 tokens sont hors
périmètre de la branche 4 faute de `part` sur les éléments de la liste d'étapes — exposer de
nouveaux parts est un préalable nécessaire à toute réduction sur ce composant, pas seulement un
choix de confort. Migration en cours, par lots, sur `dev`.

**Lot 1 — `ar-stepper` (2026-07-25)** : 12 tokens sur ~30 migrés vers 4 règles `::part()`
groupées (`trigger`, `panel`, `step-link`, `bullet` — 4 nouveaux `part` créés, dont 3
comblaient un écart JSDoc/code préexistant). 18 tokens conservés (fallback WCAG, lecture JS,
pseudo-éléments non ciblables, état interne, et le nouveau garde-fou hover ancêtre→descendant
ci-dessus). Détail complet :
`docs/superpowers/specs/2026-07-25-stepper-token-vs-part-design.md`.

## Amendement (2026-07-27) : parts d'état, remplacement partiel de la contrainte 2

La contrainte 2 (état interne sur le même élément → reste token) est remplacée par un nouveau
pattern : exposer l'état lui-même comme un `part` supplémentaire sur le même élément
(`part="<élément> <élément>-<état>"`, ex. `part="bullet bullet-active"`), ciblable par le
thème via `::part(<élément>-<état>)`. Vérifié empiriquement (Chromium réel, Playwright) : une
règle externe `::part(x-état)` déclarée après `::part(x)` l'emporte sur `background-color`
sans affecter `color` (piloté uniquement par la règle de base), et neutralise totalement une
règle interne à spécificité supérieure ciblant la même propriété — cf. détail complet
`docs/superpowers/specs/2026-07-27-part-state-multiplication-design.md`.

**La contrainte 5 (état posé sur un `part` ancêtre, ciblant un `part` descendant différent)
n'est pas concernée par ce remplacement** — vérifié empiriquement que `:has()` ne permet pas de
répliquer un hover d'ancêtre sur un part différent sans JS dédié. Elle reste une exception
permanente d'ADR-005.

**Nouveau garde-fou d'ordre** : les règles `::part()` de même spécificité se départagent par
ordre de déclaration dans `default.css` — une règle de base doit toujours précéder ses parts
d'état dans le fichier. Vérifié automatiquement par
`packages/core/scripts/validate-part-state-order.js`, branché dans `cem.config.js`.

**Application — `ar-stepper` (2026-07-27)** : `--ar-stepper-active-bullet-bg` et
`--ar-stepper-active-bullet-color` migrés vers `::part(bullet-active)` (nouveau part d'état).
`--ar-stepper-active-label-color`, bien qu'a priori candidat au même traitement, **reste un
token** : une analyse de spécificité a montré qu'en mode `edit`, une sous-étape active est
toujours rendue comme un lien (`renderSubStep` ignore l'état actif dans son choix `<a>`/`<div>`,
contrairement à `renderStep`), donc atteignable par la règle de survol ancêtre→descendant
(`.stepper-link:hover .stepper-item-label`, spécificité `(0,4,0)`) qui l'emporte aujourd'hui sur
`active-label-color` (`(0,3,0)`). Migrer ce token aurait inversé ce résultat (l'externe
l'emporte toujours). Reclassé sous la contrainte 5, au même titre que `--ar-stepper-label-color`
(base).
