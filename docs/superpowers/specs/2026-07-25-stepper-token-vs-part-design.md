# Généralisation token vs `::part()` — lot 1 : `ar-stepper` (#129)

**Statut :** proposé (brainstorming du 2026-07-25, premier lot du chantier de généralisation
décidé après [[project_token_vs_part_generalization_129]])

## Contexte

Suite à `ar-datepicker` (PR #137), le mainteneur a demandé de généraliser le même critère
(ADR-005, amendement du 2026-07-25) aux 17 autres composants, par lots. `ar-stepper` est le
premier lot : 8 candidats identifiés par l'audit initial, tous déjà sur des parts existants
(`trigger`, `panel`). Mais l'audit notait un constat structurel : seuls `trigger` et `panel`
sont exposés comme `part=` dans `stepper.renderer.ts` — tous les éléments de la liste
d'étapes (`.stepper-item`, `.stepper-link`, `.stepper-item-bullet`, `.stepper-item-label`)
n'ont aucun `part`, ce qui exclut d'office ~19 tokens de la migration quel que soit leur
usage. Exposer des parts sur ces éléments est un préalable pour ce lot, pas un choix de
confort.

**Écart doc/code trouvé pendant ce brainstorming** : le JSDoc de `stepper.ts` documente déjà
des `@csspart` (`list`, `step`, `substep`, `step-link`) qui n'existent pas réellement comme
attributs `part=` dans `stepper.renderer.ts` — seuls `nav`, `trigger` et `panel` sont posés.
Ce chantier corrige cet écart en même temps qu'il l'exploite.

## Nouveaux parts à créer dans `stepper.renderer.ts`

- `part="list"` sur les `<ol class="stepper-list">` (desktop, mobile, et sous-listes
  imbriquées) — comble l'écart JSDoc, aucun token ne le consomme pour l'instant.
- `part="step"` sur les `<li class="stepper-item">` de premier niveau, `part="substep"` sur
  les `<li>` de sous-étape (`renderSubStep`) — comble l'écart JSDoc, aucun token ne le
  consomme pour l'instant (`gap`/`substep-gap`/`connector-color` ciblent des `::before`/
  `::after` de ces éléments, non atteignables par `::part()`, cf. contrainte ADR-005).
- `part="step-link"` sur l'ancre `.stepper-link`, posé que l'item soit rendu en `<a>` ou en
  `<div>` (les deux branches de `renderStep`/`renderSubStep`) — comble l'écart JSDoc **et**
  porte 3 tokens migrés (`link-color`, `link-hover-color`, `link-focus-radius`).
- `part="bullet"` (nouveau, absent du JSDoc actuel) sur `.stepper-item-bullet` — porte
  `bullet-radius`.

`nav` (déjà posé sur `<nav>`), `trigger` et `panel` restent inchangés.

## Vérification empirique complémentaire (Playwright, Chromium réel)

Le critère ADR-005 identifie déjà deux garde-fous : état interne (classe dynamique type
`.active`) et pseudo-élément non ciblable. `ar-stepper` introduit un troisième pattern jamais
testé : un état `:hover`/`:focus` posé sur un élément **ancêtre** (`.stepper-link`) qui
modifie le style d'un élément **descendant différent** (`.stepper-item-bullet`), via un
sélecteur `[part='step-link']:hover [part='bullet']`.

Test réalisé : composant minimal à shadow DOM reproduisant exactement ce pattern (règle
interne `[part='step-link']:hover [part='bullet'] { background-color: rouge }` vs règle
externe `test-el::part(bullet) { background-color: bleu }`). Résultat : **la couleur reste
bleue (externe) même au survol** — la règle interne ancêtre→descendant est totalement
neutralisée par la règle externe `::part()`, exactement comme pour le pattern déjà validé
(état interne simple). **Conclusion : tout token piloté par ce pattern doit rester un token
consommé en interne, jamais migré en `::part()`.** Nouvelle règle ajoutée à ADR-005 (à
documenter dans l'amendement) : la contrainte « règle externe l'emporte toujours » s'applique
aussi quand l'état et la cible sont sur deux parts différents liés par un combinateur de
descendance.

## Classification des tokens `--ar-stepper-*`

### Migrés vers `::part()` — 12 tokens

| Token                              | Nouvelle règle `default.css`                                                     | Justification                                                                                                            |
| ---------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `--ar-stepper-trigger-radius`      | `ar-stepper::part(trigger) { border-radius }`                                    | Usage unique, part déjà existant                                                                                         |
| `--ar-stepper-trigger-bg`          | `ar-stepper::part(trigger) { background-color }`                                 | Usage unique, `:hover` natif sur le même élément (pattern déjà validé, cf. `alert`)                                      |
| `--ar-stepper-trigger-bg-hover`    | `ar-stepper::part(trigger):hover { background-color }`                           | idem                                                                                                                     |
| `--ar-stepper-panel-padding`       | `ar-stepper::part(panel) { padding }`                                            | Usage unique                                                                                                             |
| `--ar-stepper-panel-min-width`     | `ar-stepper::part(panel) { min-width }`                                          | Usage unique                                                                                                             |
| `--ar-stepper-panel-max-width`     | `ar-stepper::part(panel) { max-width }`                                          | Usage unique                                                                                                             |
| `--ar-stepper-panel-border-radius` | `ar-stepper::part(panel) { border-radius }`                                      | Usage unique                                                                                                             |
| `--ar-stepper-panel-shadow`        | `ar-stepper::part(panel) { box-shadow }`                                         | Usage unique                                                                                                             |
| `--ar-stepper-link-color`          | `ar-stepper::part(step-link) { color }`                                          | Usage unique, `:hover`/`:focus` natifs sur le lien lui-même (pas un ancêtre) — pattern déjà validé                       |
| `--ar-stepper-link-hover-color`    | `ar-stepper::part(step-link):hover, ar-stepper::part(step-link):focus { color }` | idem                                                                                                                     |
| `--ar-stepper-link-focus-radius`   | `ar-stepper::part(step-link):focus { border-radius }`                            | `:focus` natif sur le lien lui-même                                                                                      |
| `--ar-stepper-bullet-radius`       | `ar-stepper::part(bullet) { border-radius }`                                     | Usage unique, jamais réécrit par un état (seuls `bg`/`color`/`box-shadow` de la puce sont stateful, pas `border-radius`) |

### Restent des tokens — 18 tokens

**Fallback WCAG/fonctionnel (branche 1, inchangé)** :

- `--ar-stepper-panel-bg` (repli `Canvas`), `--ar-stepper-panel-border-color` (repli
  `ButtonBorder`).

**Lus en JS (branche 2, inchangé)** :

- `--ar-stepper-distance`, `--ar-stepper-offset` (`AnchoredController`).

**Réutilisé ≥2× et/ou pilote un `::before`/`::after` non ciblable (branches 3 / contrainte
pseudo-élément)** :

- `--ar-stepper-gap`, `--ar-stepper-substep-gap` (hauteur du connecteur, `::after`/`::before`
  de `.stepper-item`).
- `--ar-stepper-connector-color` (réutilisé 2×, même contrainte pseudo-élément).

**Garde-fou état interne — valeur réécrite par la classe `.active`** :

- `--ar-stepper-active-bullet-bg`, `--ar-stepper-active-bullet-color`,
  `--ar-stepper-active-label-color`. **Périmé — cf. amendement ADR-005 du 2026-07-27** : les 2
  premiers ont depuis migré vers `::part(bullet--current)`, et `--ar-stepper-active-label-color`
  a été re-scopé (un nouveau part `step-link--current` couvre désormais le cas lien, le token ne
  reste que pour le cas `<div>` non cliquable).
- `--ar-stepper-bullet-bg`, `--ar-stepper-bullet-color` (valeur de base réécrite à la fois par
  `.active` et par le hover ancêtre — deux sources d'override).
- `--ar-stepper-bullet-border-color` (pilote un `box-shadow` inset réécrit à `none` par
  `.active` et par le hover ancêtre).
- `--ar-stepper-label-color` (valeur de base réécrite par le hover ancêtre et par `.active`).

**Nouveau garde-fou — hover posé sur un ancêtre, cible un descendant différent (vérifié
empiriquement ci-dessus)** :

- `--ar-stepper-bullet-hover-bg`, `--ar-stepper-link-hover-bullet-color`,
  `--ar-stepper-link-hover-bullet-text-color`, `--ar-stepper-link-hover-label-color`.

## JSDoc / `@cssprop`

`stepper.ts` perd les 12 entrées `@cssprop` des tokens migrés. Les 18 tokens conservés
gardent leur entrée. Le bloc `@csspart` est mis à jour : `list`, `step`, `substep`,
`step-link` passent de « documentés mais absents » à réellement posés (aucun changement de
texte requis, l'écart est résolu par le code) ; `bullet` est ajouté comme nouvelle entrée
`@csspart`.

## Tests concernés

`stepper.test.ts:53-60` vérifie déjà `part="nav"` — inchangé. `stepper.test.ts:572` vérifie
l'absence de `part="trigger"` en mode desktop — inchangé. Aucun test existant n'assert sur les
tokens migrés ni sur l'absence des nouveaux parts (`grep` effectué, aucune dépendance
trouvée). Tests à ajouter : présence de `part="list"`/`"step"`/`"substep"`/`"step-link"`/
`"bullet"` dans le rendu (desktop et mobile), pour éviter une régression silencieuse de ces
nouveaux points d'extension.

## Breaking change (assumé, alpha)

Même précédent que PR #137 : un consommateur qui surchargeait un des 12 tokens migrés doit
migrer vers une règle `::part()` directe. Acceptable sans dépréciation en alpha (cf.
CLAUDE.md).

## Décision d'architecture à documenter

Amendement à ADR-005 : ajout du garde-fou « hover posé sur un ancêtre, cible un descendant
différent » à la liste des contraintes techniques qui priment sur le critère à 4 branches,
avec la vérification empirique ci-dessus comme preuve.

## Périmètre de ce chantier

Seul `ar-stepper` est traité dans cette spec (lot 1 du séquencement acté dans
[[project_token_vs_part_generalization_129]]). Les lots suivants (`alert`+`dialog`,
`breadcrumb`/`dropdown`/`pagination`/`tooltip`, puis le groupe `table-sort`/`charcounter`/
`progressbar`/`tab-group`/`collapse`, et enfin `tab` sous réserve d'une vérification
Playwright dédiée à son propre pattern) restent hors périmètre, à traiter dans des specs
séparées.

## Hors périmètre

- `ar-stepper-item` (pas de `.styles.ts` dédié, exclu de l'audit).
- Réévaluation de `--ar-datepicker-gap` (correction `:host` du 2026-07-25) — demande du
  mainteneur d'embarquer ce token dans un lot ultérieur, pas celui-ci.
