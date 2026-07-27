# Multiplication des CSS Parts d'état — remplacement de la contrainte 2 d'ADR-005 (#129)

**Statut :** proposé (brainstorming du 2026-07-27)

## Contexte

Le chantier de généralisation token vs `::part()` (issue #129, amendement ADR-005 du
2026-07-24/25) a produit un critère à 4 branches plus 5 contraintes techniques qui priment
sur ce critère. Deux de ces contraintes forcent un token à rester interne dès qu'un état
intervient :

- **Contrainte 2** : propriété surchargée par une règle d'état interne posée par le composant
  lui-même sur le **même élément** (classe dynamique `.active`/`.selected`, attribut d'hôte
  `[aria-selected]`) → reste un token, car une règle externe `::part()` ciblant la base
  écraserait systématiquement la variante d'état (vérifié empiriquement sur `ar-datepicker`).
- **Contrainte 5** : état posé sur un **part ancêtre**, ciblant un **part descendant
  différent** (`[part='step-link']:hover [part='bullet']`) → même raisonnement, vérifié sur
  `ar-stepper`.

En pratique, ces deux contraintes ont forcé un grand nombre de tokens à rester internes
(11 des 18 tokens conservés par le lot 1 stepper, `color`/`background-color` de `[part='day']`
sur le datepicker) — alors que le vrai problème n'est pas l'état en tant que tel, mais le fait
que l'état ne soit pas **exposé** comme cible externe.

Le mainteneur propose (2026-07-27) une piste inspirée des pratiques d'autres librairies de
composants headless : au lieu de garder l'état interne, l'exposer lui-même comme un `part`
supplémentaire sur le même élément (`part="day day-selected"`), ciblable directement par le
thème via `::part(day-selected)`. Les classes internes seraient réservées aux éléments
purement structurels, non destinés à la personnalisation.

## Décision

### Principe général

Toute propriété actuellement forcée en token par la **contrainte 2** d'ADR-005 (état interne
sur le même élément) devient candidate à un **part d'état dédié**, ajouté au `part` existant
de l'élément. Le thème externe (`default.css`) cible cet état via `::part(<élément>-<état>)`.

La **contrainte 5** (hover posé sur un ancêtre, ciblant un part descendant différent) **n'est
pas concernée** par ce remplacement — voir « Limite technique confirmée » ci-dessous. Les 3
autres contraintes (dark-mode calibré indépendamment, pseudo-élément non ciblable,
réutilisation inter-composants) restent également inchangées, elles sont orthogonales à ce
problème.

### Vérification empirique (Chromium réel, Playwright, 2026-07-27)

**Cas résolu — état sur le même élément (contrainte 2)** : composant minimal avec
`part="day day-selected"`, une règle interne `.cell.selected { background-color: green }`
(spécificité plus forte), et deux règles externes `test-el::part(day) { background-color:
blue; color: blue }` puis `test-el::part(day-selected) { background-color: red }` (déclarée
après). Résultat : `background-color` devient rouge (le part d'état, déclaré en second,
l'emporte), `color` reste bleu (seul `::part(day)` le pilote). La règle interne à spécificité
plus forte est totalement neutralisée. **Confirme que le pattern fonctionne exactement comme
prévu par la spec CSS Shadow Parts — c'est l'ordre de déclaration qui départage deux parts de
même spécificité, pas la spécificité elle-même.**

**Cas non résolu — hover sur un ancêtre ciblant un part descendant (contrainte 5)** : tentative
de contournement via `:has()` — `test-el:has(::part(step-link):hover)::part(bullet) {
background-color: red }`. Résultat : la couleur reste bleue (valeur de base) même pendant le
survol du lien testé via `page.hover()`. **`:has()` ne permet pas de répliquer un hover
d'ancêtre sur un part différent.** Sans JS dédié (écouteurs `mouseenter`/`mouseleave` reflétant
un état custom), ce pattern reste irréductible. **Décision : la contrainte 5 reste une
exception permanente d'ADR-005**, pas de tentative de résolution via `CustomStateSet` pour
l'instant (piste notée séparément, cf. `[[project_custom_state_exploration]]`) — ajouter du JS
pour un effet purement cosmétique irait à l'encontre de la philosophie headless (CLAUDE.md).

### Convention de nommage

`part="<élément> <élément>-<état>"` — ex. `part="day day-selected"`, `part="trigger
trigger-active"`. Cohérent avec les parts déjà en kebab-case (`step-link`, `nav-btn`). Un
élément peut cumuler plusieurs parts d'état simultanément si les états sont indépendants
(`part="day day-disabled day-today"`).

### Garde-fou d'ordre CSS

Les règles `::part()` de même spécificité se départagent par ordre de déclaration dans le
fichier — la dernière gagne. Un nouveau script de validation (à l'image de
`validate-no-hardcoded-tokens.js`, branché dans `cem.config.js`) parse `default.css` et fait
échouer `npm run build:manifest` si une règle `::part(x)` apparaît **après** une règle
`::part(x-état)` correspondante pour le même composant (la base doit toujours précéder ses
variantes d'état dans le fichier).

### Critère part vs classe

Toute propriété de design éligible à la branche 4 du critère ADR-005 (couleur, radius,
spacing… usage unique, pas de fallback critique) implique que son élément porteur reçoit un
`part`. Les classes restent réservées aux éléments purement structurels (conteneurs flex,
`sr-only`, wrappers de layout) sans propriété de design associée — pas de changement pour ces
éléments.

## Portée : rétroactive complète

Ce principe s'applique rétroactivement aux deux composants déjà migrés sous l'ancien critère,
en plus des lots restants du chantier #129.

### 1. `ar-stepper` (branche `fix/stepper-token-vs-part-129`, PR #138 ouverte)

Corriger avant de merger — la PR ne doit pas livrer un composant à contre-courant du nouveau
principe. Tokens actuellement conservés par la contrainte 2 (état `.active` sur le même
élément), candidats à un part d'état :

- `--ar-stepper-active-bullet-bg`, `--ar-stepper-active-bullet-color`,
  `--ar-stepper-active-label-color` → nouveaux parts d'état sur `bullet`/le conteneur label
  actif (ex. `part="bullet bullet-active"`).
- `--ar-stepper-bullet-bg`, `--ar-stepper-bullet-color`, `--ar-stepper-bullet-border-color`,
  `--ar-stepper-label-color` → valeurs de base, à réévaluer une fois les parts d'état posés
  (peuvent rester des tokens de base consommés par la règle `::part(bullet)` par défaut, sans
  changement de mécanisme).

Tokens qui **restent** des tokens malgré ce chantier (contrainte 5, confirmée irréductible) :

- `--ar-stepper-bullet-hover-bg`, `--ar-stepper-link-hover-bullet-color`,
  `--ar-stepper-link-hover-bullet-text-color`, `--ar-stepper-link-hover-label-color` (hover du
  lien ancêtre pilotant la puce descendante).

Le détail exact (quel part d'état, quelle règle CSS, quel token disparaît vs reste) est laissé
à un plan d'implémentation dédié, pas à cette spec.

### 2. `ar-datepicker` (déjà mergé sur `dev`, PR dédiée à ouvrir)

`color`/`background-color` de `[part='day']`, actuellement forcés tokens par la contrainte 2
(états `.today`, `.selected`, `.other-month`) → candidats à des parts d'état
(`day-today`, `day-selected`, `day-other-month`). Embarque aussi la correction déjà actée
(`--ar-datepicker-gap`, exclu à tort sous l'ancien critère `:host`, cf.
`[[project_token_vs_part_generalization_129]]`). Plan d'implémentation dédié, hors périmètre de
cette spec.

### 3. Lots 2-6 du chantier #129

Reprise du séquencement d'origine (`alert`+`dialog` → `breadcrumb`/`dropdown`/`pagination`/
`tooltip` → nettoyage `table-sort`/`charcounter`/`progressbar`/`tab-group`/`collapse` → `tab`),
avec ce nouveau principe appliqué dès le départ pour tout token candidat sous la contrainte 2.

## Conséquences

- **ADR-005** : la contrainte 2 est réécrite pour documenter le remplacement (état sur le même
  élément → part d'état, plus token forcé) ; la contrainte 5 est reformulée comme limite
  technique confirmée distincte (hover d'ancêtre sur un part descendant, non résolvable sans
  JS) ; ajout d'un paragraphe sur le nouveau garde-fou d'ordre CSS et son script de validation.
- Un nouveau script `validate-part-state-order.js` (nom provisoire) rejoint
  `validate-no-hardcoded-tokens.js` dans `cem.config.js`.
- Breaking change assumé (alpha, sans dépréciation) pour tout consommateur qui surchargeait un
  des tokens migrés vers un part d'état — même précédent que les lots précédents.
- `ar-stepper` (PR #138) et `ar-datepicker` (nouvelle PR) devront chacun documenter leurs
  nouveaux `@csspart` d'état dans leur JSDoc respectif.

## Hors périmètre

- Le détail exact des parts d'état et des règles `::part()` pour `ar-stepper` et
  `ar-datepicker` — chacun fera l'objet d'un plan d'implémentation dédié (`writing-plans`),
  pas de cette spec de conception.
- L'exploration de `CustomStateSet`/`:state()` pour résoudre la contrainte 5 — notée comme
  piste future séparée (`[[project_custom_state_exploration]]`), pas engagée ici.
- Les lots 2-6 du chantier #129 eux-mêmes — cette spec ne fait qu'acter le principe qu'ils
  devront suivre, pas leur détail (déjà couvert par l'audit dans
  `[[project_token_vs_part_generalization_129]]`).
