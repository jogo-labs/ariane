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
`:host { border-radius: var(--ar-alert-border-radius); }` (depuis migré — cf. « Application —
`ar-alert` » ci-dessous) interne au composant, **même si le
composant continue de déclarer une valeur sur `:host`** — le même mécanisme « la feuille de
style externe l'emporte sur la règle interne » s'applique, que la cible soit un `[part]` via
`::part()` ou l'hôte lui-même via son nom de tag (l'hôte reste un élément du light DOM,
atteignable sans traverser de frontière shadow). **`:host` n'exclut donc plus la branche 4** —
seules les contraintes suivantes restent des exclusions réelles.

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
   composant** pose problème. **Amendée le 2026-07-27** : quand l'élément concerné porte déjà
   un `part`, cette contrainte est remplacée par le pattern « part d'état » (convention `--`,
   cf. amendement dédié en fin de fichier) — elle ne s'applique plus telle quelle que si
   l'élément ne porte aucun `part`.
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
6. **Propriété annulée par une garde interne sous `@media` (ex. `prefers-reduced-motion:
reduce`)** → doit rester un token consommé à l'intérieur du composant, même raisonnement
   que la contrainte 2 mais pour une règle interne conditionnée par un media query plutôt
   qu'un état posé par le composant. Vérifié empiriquement (Chromium réel, Playwright) sur
   `ar-alert` : une règle externe `::part(close) { transition: ... }` déclarée dans le thème
   l'emporte sur la garde interne `@media (prefers-reduced-motion: reduce) { [part='close']
{ transition: none; } }`, même quand le media query correspond — la transition externe
   reste active, ce qui casserait l'accessibilité motion. `--ar-alert-close-transition-duration`
   reste un token pour cette raison (en plus d'être réutilisé 2× dans le composant, critère 3).

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

## Amendement (2026-07-27) : parts d'état (convention BEM `--`), remplacement partiel de la contrainte 2

La contrainte 2 ci-dessus (état interne sur le même élément → reste token) est **remplacée**
pour tout élément qui porte déjà un `part` : au lieu de garder la propriété en token interne,
l'état lui-même devient un `part` supplémentaire sur le même élément, nommé
`<élément>--<état>` (double tiret, convention BEM — ex. `part="bullet bullet--current"`),
ciblable par le thème via `::part(<élément>--<état>)`.

**Pourquoi un double tiret et pas un simple tiret** : la première version de cet amendement
utilisait un simple tiret (`bullet-active`). Un garde-fou d'ordre (voir ci-dessous) a immédiatement
produit un faux positif sur `ar-datepicker` : `footer-btn` a été confondu avec une variante
d'état de `footer` par simple préfixe, alors que ce sont deux éléments sans rapport. Le double
tiret distingue syntaxiquement un part d'état de tout autre part dont le nom partage un
préfixe (`step` / `step-link` ne sont _pas_ liés — un seul tiret — alors que `bullet` /
`bullet--current` le sont), éliminant cette classe de faux positifs plutôt que de la
contourner au cas par cas.

**Mécanique vérifiée empiriquement** (Chromium réel, Playwright) : une règle externe
`::part(x--état)` déclarée après `::part(x)` l'emporte sur toute propriété qu'elle déclare,
sans affecter les propriétés que seule `::part(x)` pilote, et neutralise totalement une règle
interne ciblant la même propriété — **par déclaration directe l'emportant sur l'héritage ou
sur une règle interne, jamais par un calcul de spécificité entre les deux règles `::part()`**.
Entre deux règles externes de même spécificité, c'est l'ordre de déclaration qui départage
(cf. garde-fou ci-dessous). Détail complet :
`docs/superpowers/specs/2026-07-27-part-state-multiplication-design.md`.

**La contrainte 5 (état posé sur un `part` ancêtre, ciblant un `part` descendant différent)
n'est pas concernée par ce remplacement** — vérifié empiriquement que `:has()` ne permet pas de
répliquer un hover d'ancêtre sur un part différent sans JS dédié. Elle reste une exception
permanente d'ADR-005.

**Nouveau garde-fou d'ordre** : les règles `::part()` de même spécificité se départagent par
ordre de déclaration dans `default.css` — une règle de base doit toujours précéder ses parts
d'état dans le fichier. Vérifié automatiquement par
`packages/core/scripts/validate-part-state-order.js` (heuristique fondée sur le délimiteur
`--`), branché dans `cem.config.js`.

**Terminologie** : le terme retenu pour l'état est `current` (`bullet--current`,
`step-link--current`) — et non `active`, déjà pris par la pseudo-classe CSS `:active`, ni
`selected`, réutilisé par `ar-datepicker` pour un concept différent (une date choisie par
clic, alors que l'étape courante du stepper résulte de la navigation, pas d'une sélection).
Cohérent avec `aria-current="step"`, déjà posé par le composant sur le même élément.

**Application — `ar-stepper` (2026-07-27)** : `--ar-stepper-active-bullet-bg` et
`--ar-stepper-active-bullet-color` migrés vers `::part(bullet--current)` (nouveau part
d'état). Un second cas, plus profond que prévu, a été trouvé en revue finale de branche : la
couleur du lien d'étape active (`--ar-stepper-active-label-color`) était déjà rendue inerte par
le lot 1 pour toute étape active **rendue comme lien** — pas seulement au survol comme
initialement supposé, mais au repos aussi. En cause : le lot 1 a migré
`--ar-stepper-link-color` vers `::part(step-link)`, qui cible le **même élément** que
`.stepper-item.active > .stepper-item-inner` ; une règle externe l'emportant toujours sur une
règle interne (contrainte 2), la couleur active du lien était déjà silencieusement remplacée
par la couleur de lien de base dès qu'une étape active était rendue comme lien — cas fréquent
en mode `edit`, où la quasi-totalité des étapes sont simultanément actives et rendues comme
liens. Corrigé en exposant `part="step-link step-link--current"` sur le lien actif et une
règle `::part(step-link--current) { color: var(--ar-color-interactive); }` déclarée après
`::part(step-link)`. `--ar-stepper-active-label-color` reste un token, mais désormais
correctement scopé à son seul cas d'usage réel restant : l'étape active rendue comme élément
non cliquable (`<div>`, sans `part`), pour laquelle il n'existe pas d'autre point d'extension.

## Amendement (2026-07-27) : le pattern part d'état ne débloque pas les tokens calibrés en dark mode

**Application — `ar-datepicker` (2026-07-27)**, deuxième composant traité après `ar-stepper`.
Constat en creusant les candidats identifiés dans l'audit du 2026-07-25 (`day-color`, `day-bg`,
et la famille `day-*` en général) : **la contrainte 1 (calibration dark-mode indépendante)
prime sur le pattern part d'état**, même quand ce dernier résoudrait par ailleurs le problème
d'état interne. Sur `ar-datepicker`, `--ar-datepicker-day-today-color`,
`--ar-datepicker-day-hover-bg`/`-color`, `--ar-datepicker-day-selected-bg`/`-color` et
`--ar-datepicker-input-error-border-color` sont tous redéclarés indépendamment sous
`:root[data-theme='dark']`/`@media (prefers-color-scheme: dark)` — migrer leur règle vers un
`::part()` externe littéral leur ferait perdre cette calibration, sauf à dupliquer la règle
sous les blocs dark (option déjà écartée par la contrainte 1 elle-même, pour ne pas introduire
de duplication à maintenir manuellement).

Plus profond que la contrainte 1 seule : sur `[part='day']`, la base (`day-color`/`day-bg`,
elle-même non calibrée dark) est surchargée par **quatre états combinables indépendamment**
(`.today`, `.selected`, `.other-month`, `:hover`), départagés par un ordre de cascade interne
précis (ex. une cellule à la fois `.selected` et `.other-month` — cas réel et atteignable,
un jour sélectionné réapparaissant en case grisée d'un mois adjacent). Migrer la base seule
casserait ces surcharges (règle externe > toute règle interne, quel que soit l'état) ; migrer
la base _et_ tous les états ensemble nécessiterait de dupliquer chaque état sous les blocs
dark — la même limite que ci-dessus, à une échelle plus large. **Conclusion : toute la famille
`day-*` reste interne**, y compris `day-color`/`day-bg`, alors qu'ils auraient été candidats
sous le seul critère « état interne » sans la contrainte dark-mode.

**Principe retenu pour trancher ce type de cas** (formulé par le mainteneur) : le thème pilote
les aspects visuels (couleur, fond, bordure) de façon simple via les tokens internes, y compris
leur déclinaison dark/light. Un consommateur qui a besoin d'aller plus loin dispose déjà des
`part` exportés (`day`, `weekday`, `header`, `footer`…) pour surcharger directement — mais s'il
choisit de surcharger un aspect gouverné par un token interne (donc de le contourner), il prend
la responsabilité de gérer lui-même la cohérence dark/light de sa surcharge. Le thème n'a pas à
prévoir une règle externe pour chaque combinaison possible.

**Application concrète** : seules 3 valeurs, jamais bloquées par la contrainte dark-mode ni par
un état interne concurrent, ont été trouvées migrables — toutes trois jamais tokenisées avant
(oubliées de l'audit initial du 2026-07-25, qui n'examinait que les tokens déjà nommés, pas les
valeurs littérales jamais externalisées) :

- `[part='weekday']` : `text-align`, `font-weight`, `padding-block`, `text-transform` — règle
  interne entièrement supprimée (plus rien à styliser en interne sur cet élément), migrée dans
  `::part(weekday)` déjà existant. Le sélecteur interne redondant `[part='grid'] th` (le `<th>`
  porte déjà `part='weekday'` directement) disparaît avec elle.
- `[part='header']`/`[part='footer']` : `gap` (0.25rem / 0.5rem), migré dans les règles
  `::part(header)`/`::part(footer)` déjà existantes ; le reste (`display`, `align-items`,
  `justify-content`) reste interne, structurel.

**Correction (même jour)** : `--ar-datepicker-gap` avait d'abord été conservé comme token (sous
le nom `--ar-datepicker-field-gap`), au motif d'une réutilisation DRY entre le `gap` du `:host`
et un `calc()` déjà présent dans la règle `::part(label)` de `default.css`
(`margin-bottom: calc(0.5rem - var(--ar-datepicker-field-gap))`). Revu à la remarque du
mainteneur : cette « réutilisation » n'est pas une exigence du composant (qui n'a besoin de la
valeur qu'à un seul endroit, le `gap` du `:host`) mais un choix d'auteur propre à `default.css`
— un thème est un exemple de personnalisation, pas une spécification que le composant doit
servir. Rien n'empêche un autre thème de faire le même calcul avec sa propre variable locale ;
le composant n'a pas à garantir qu'ajuster une valeur en rééquilibre une autre dans un thème
donné. **`--ar-datepicker-gap` migré**, sans devenir un token public : `ar-datepicker { }`
déclare une variable **locale à ce bloc thème** (`--field-gap: 0.35rem;`, pas de préfixe
`--ar-datepicker-*`), consommée à la fois par `gap` et par le `calc()` de `::part(label)`.
Vérifié empiriquement (Playwright) que cette variable s'hérite normalement à travers la
frontière shadow DOM jusqu'à l'élément `[part='label']` interne — même mécanisme que n'importe
quel `var(--ar-*)` consommé dans une règle `::part()`. Le couplage reste garanti
techniquement (pas qu'un commentaire), sans figurer dans l'API publique du composant ni dans sa
documentation `@cssprop` — et sert au passage d'exemple concret pour un thème qui voudrait
reproduire la même technique avec sa propre variable.

**Application — `ar-alert` (2026-07-28)**, troisième composant traité (lot 3a, `ar-dialog`
reste à traiter séparément). 5 tokens migrés : `--ar-alert-padding`, `--ar-alert-border-radius`,
`--ar-alert-border-width`, `--ar-alert-border-style` (propriétés `:host`, migrées vers une
règle `ar-alert { }` ciblant directement le tag) et `--ar-alert-close-radius` (migré vers
`ar-alert::part(close)`). `--ar-alert-close-size` reste un token (réutilisé 2× dans le
composant pour `width`/`height`, critère 3) mais gagne un fallback WCAG 2.5.8 manquant
(`var(--ar-alert-close-size, 2rem)`), sur le modèle de `--ar-datepicker-day-size`.
`--ar-alert-close-transition-duration` reste un token — nouvelle contrainte 6 découverte à
cette occasion (garde `prefers-reduced-motion` défaite par une règle externe, cf.
ci-dessus). Les 12 tokens sémantiques (fond/bordure/icône des 4 variants) restent tokens,
hors périmètre de cette migration (fallback WCAG de contraste + calibration dark-mode
indépendante sur les bordures). Détail complet :
`docs/superpowers/plans/2026-07-28-alert-token-vs-part-129.md`.

**Deuxième passe (même jour)** : audit élargi aux valeurs jamais tokenisées et à une
recatégorisation. `column-gap` du `:host` (jamais tokenisé) migré en littéral dans
`ar-alert { }`. `--ar-alert-close-bg`/`--ar-alert-close-hover-bg` — laissés tokens par erreur
de catégorisation lors de la première passe (supposés sémantiques comme les couleurs de
variant, sans revérifier les critères) — migrés en littéral dans `ar-alert::part(close)`/
`::part(close):hover`, même pattern que `nav-btn`/`footer-btn` de `ar-datepicker`. `opacity`/
`position`/`top`/`right` de `[part='close']` migrés de la même façon ; `:focus-visible`
(`outline: currentColor`) reste interne (contraste du focus ring contre les 4 fonds de
variant, probable exigence WCAG 2.4.7). `font-size` de `[part='icon']` migré vers
`::part(icon)`. La durée d'animation de sortie (`0.33s`, jamais tokenisée) devient
`--ar-alert-hide-transition-duration`, consommée en interne uniquement (bloquée en externe
par la contrainte 6 — même garde `prefers-reduced-motion` que `close-transition-duration`).
Les valeurs finales de l'état `[hiding]` (`opacity: 0`/`transform: scale(0.75)`) migrées vers
`ar-alert[hiding] { }` — **nouveau cas vérifié empiriquement** : un sélecteur d'attribut
externe conditionné sur le même attribut qu'une règle `:host` interne l'emporte
purement et simplement sur cette dernière, exactement le même mécanisme « l'externe
l'emporte toujours » que `::part()` ou une règle de tag non conditionnée — ce n'est pas le
cascade CSS normal (spécificité/ordre) qui joue ici. Cette migration reste sûre non pas parce
que le cascade se comporte normalement, mais parce que la règle externe ne matche que
conditionnellement (absente quand l'attribut est absent) et parce que la propriété
`transition` elle-même reste interne, ce qui préserve la garde reduced-motion. `position:
relative` mort sur `:host` retiré (aucun descendant n'en dépendait). Trou de documentation
préexistant comblé : `@csspart icon-svg` (SVG de l'icône de variant, jamais documenté depuis
l'origine du composant). **Leçon généralisable** : externaliser les valeurs d'état final
animées d'un élément implique que la logique de complétion propre au composant (tout ce qui
dépend de `transitionend`) ne peut plus supposer qu'une transition aura toujours lieu — elle
doit se prémunir contre une durée calculée nulle (absence de thème chargé), comme le fait déjà
`ar-collapse` via `_shouldAnimate()`. `ar-alert` a été corrigé dans le même esprit après cette
migration (garde JS `_shouldAnimate()` avant `_hide()`, cf. issue #129).

**Correctif du correctif (même jour)** : la garde `_shouldAnimate()` ci-dessus lisait
`getComputedStyle(this).transitionDuration` juste après avoir posé `this.hiding = true`, de
façon synchrone. Or Lit ne reflète une propriété `@property({ reflect: true })` vers son
attribut qu'au tour de microtâche suivant (dans `update()`), pas au moment du setter — donc
l'attribut `hiding` n'existait pas encore dans le DOM au moment de la lecture, `:host([hiding])`
ne matchait jamais, et la transition restait mesurée à `0s` **même thème chargé** : l'animation
de sortie ne se déclenchait plus du tout en pratique (mesuré à ~3ms au lieu de ~330ms). Contrairement à
`ar-collapse`, dont la transition est inconditionnelle sur `:host`, celle d'`ar-alert` est
conditionnée par l'attribut que la garde vient elle-même de poser — la garde doit donc attendre
que la réflexion ait eu lieu (`await this.updateComplete`) avant de lire `getComputedStyle`,
sans quoi une transition pilotée par attribut n'a jamais la chance de matcher avant d'être
évaluée. Cette réparation ayant rendu le chemin animé de nouveau atteignable en usage réel, une
revue a également relevé et corrigé un bug d'idempotence préexistant dans `_finishHide` : le
thème animant `opacity` et `transform` simultanément, `transitionend` se déclenche deux fois (une
par propriété) — sans reset de `hiding` dans `_finishHide`, le second appel repassait la garde et
ré-émettait `ar-alert-close` / redonnait le focus une seconde fois.

**Clarification de la contrainte 2 (même jour)** : la vérification de cette deuxième passe a
mis au jour une régression réelle sur le bouton de fermeture d'`ar-alert`. La tâche 3 avait
migré la valeur au repos `opacity: 0.75` vers une règle externe (`ar-alert::part(close)`),
mais laissé inchangées en interne les règles `&:hover { opacity: 1; }` et
`&:focus-visible { opacity: 1; ... }` — cassant le hover/focus (opacity bloquée à 0.75),
confirmé par Playwright. Corrigé en externalisant aussi la gestion hover/focus de l'opacité
(`&::part(close):hover`/`&::part(close):focus-visible` dans le thème), ne laissant en interne
que `outline`/`outline-offset` (critique pour l'accessibilité). Le texte de la contrainte 2
dit que les pseudo-classes natives (`:hover`, `:focus-visible`, etc.) « composent normalement »
avec une règle externe `::part()`/tag, ce qui peut se lire à tort comme « toujours sûr de
laisser une règle de pseudo-classe native en interne ». Ce cas prouve cette lecture fausse :
ce n'est sûr que lorsque la règle de la pseudo-classe elle-même, pour cette même propriété,
est **aussi** externe. Si le base d'une propriété est migré en externe mais qu'une surcharge
de pseudo-classe native pour cette même propriété reste interne, le base externe défait quand
même la surcharge interne (même mécanisme « l'externe l'emporte toujours » que le cas de l'état
posé par le composant dans la contrainte 2 d'origine) — l'exemption des pseudo-classes natives
s'applique à la façon dont elles composent avec un base externe (par exemple
`ar-x:hover { color: red }` se combine sans problème avec une règle de base externe séparée),
pas au fait de laisser une surcharge d'état seule en interne une fois que son base a quitté le
composant.
