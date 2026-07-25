# Token scopé vs `::part()` — critère de décision + application à `ar-datepicker`

**Statut :** proposé (brainstorming du 2026-07-24, suite à la généralisation du scoping systématique, PR #136)

## Contexte

PR #136 (issue #129, volet architecture) a généralisé le scoping systématique des tokens
sémantiques : tout token consommé directement par un composant devient un token scopé
`--ar-<composant>-<rôle>`, aliasé par défaut dans `default.css`. Après application, le
mainteneur a fait une observation : cette généralisation, poussée à son terme, produit un
volume de tokens à usage unique difficile à justifier. Exemple concret : `ar-datepicker`
déclare **58 tokens `:root`** dans `default.css`, dont **38 (65%) ne sont consommés qu'à un
seul endroit** dans `datepicker.styles.ts` — un token, une propriété CSS, un seul call site.

Le principe rappelé par le mainteneur : une variable (CSS ou autre langage) n'est vraiment
utile que si elle est _réutilisable_. Un token à usage unique n'apporte aucune valeur DRY —
sa seule fonction est d'offrir un point de surcharge. Or `::part()` offre déjà ce point de
surcharge, gratuitement, pour n'importe quelle propriété CSS d'un élément interne, sans
qu'un token dédié soit nécessaire. Le risque identifié : la prolifération de tokens rend
`default.css` — censé être un exemple pédagogique de ce qu'un consommateur ferait pour son
propre design system (cf. `project_scoped_tokens_vs_part_principle`) — confus plutôt
qu'exemplaire.

**Précédent déjà existant dans le repo** : `default.css` stylise déjà entièrement les parts
`input`/`trigger`/`label`/`hint`/`error` d'`ar-datepicker` via des règles `::part()` pures,
consommant des tokens globaux directement (`--ar-color-border`, `--ar-color-interactive`,
`--ar-focus-ring-color`…), **sans aucun token scopé intermédiaire** ni entrée `@cssprop`
dédiée (`default.css:757-838`). Ce chantier étend ce pattern déjà éprouvé au reste du
composant (`nav-btn`, `footer-btn`, `day`, `header`, `footer`, `weekday`), qui utilise
aujourd'hui l'approche « un token par propriété ».

## Décision : critère à 4 branches

Pour chaque propriété CSS qu'un composant consomme aujourd'hui via un token scopé, appliquer
dans l'ordre :

1. **Mécanisme WCAG/fonctionnel critique sans thème** (le composant porte déjà — ou devrait
   porter — un fallback `var(--token, <valeur>)`, cf. critère déjà acté dans l'amendement
   ADR-005 du 2026-07-22 : « son absence rend le composant confus, cassé ou inaccessible sans
   thème chargé »). → **Reste un token scopé dans le composant**, avec son fallback. Aucun
   changement — c'est le cas déjà couvert par l'audit #129/PR #133.
2. **Lu en JavaScript** (`getComputedStyle`, ex. `AnchoredController._readCssVar` pour
   `distance`/`offset`). → **Reste un token `:root`** : `::part()` n'est pas lisible en JS,
   aucune alternative possible.
3. **Réutilisé ≥ 2 fois dans le `.styles.ts` du composant** (vraie valeur DRY — un seul point
   de surcharge change plusieurs propriétés de façon cohérente ; dupliquer la valeur dans
   plusieurs règles `::part()` séparées introduirait un risque de drift). → **Reste un token**.
4. **Sinon** (usage unique, propriété d'un élément interne portant un `part`, pas de fallback
   critique) → **Ne pas déclarer la propriété dans le composant**. Le composant nu reste
   fonctionnel/accessible pour cette propriété (dégrade silencieusement — mêmes conséquences
   déjà acceptées pour `border-radius`/`box-shadow` dans l'audit #129). `default.css` stylise
   directement la part concernée via une règle `::part()`, valeur littérale ou token global
   aliasé en clair — aucun token scopé intermédiaire, aucune entrée `@cssprop` dédiée.

**Cas particulier (branche 5)** : un token aujourd'hui scopé mais consommé **uniquement** par
la propre règle `::part()` de `default.css` (jamais par le composant lui-même) n'est pas une
vraie surface d'API — c'est un détail interne du thème qui s'est retrouvé exposé par
mimétisme. Repli direct sur une valeur littérale/aliasée à l'intérieur de la règle `::part()`
existante ; pas de token `:root`.

**Trois contraintes techniques qui priment sur le critère ci-dessus**, découvertes en
analysant `ar-datepicker` :

- **`::part()` ne peut cibler que des éléments portant un attribut `part` à l'intérieur du
  shadow DOM — jamais l'hôte (`:host`)**. Une propriété appliquée à `:host` (ex.
  `--ar-datepicker-gap`, qui pilote le `gap` du conteneur flex racine) reste donc
  nécessairement un token, quel que soit son nombre d'usages — la branche 4 ne s'applique pas.
- **`::part()` ne peut être suivi que d'un ensemble restreint de pseudo-classes** (`:hover`,
  `:focus-visible`, `:active`, `:disabled`, `:read-only`… — déjà utilisées avec succès dans
  `default.css:789-837` pour `input`/`trigger`), pas de sélecteur de classe arbitraire posé
  par le composant (`::part(day).today` n'est pas un sélecteur CSS standard valide). Ce point
  s'est révélé sans conséquence une fois la contrainte suivante appliquée : les deux tokens
  concernés (`day-today-bg`, `day-today-color`) restent de toute façon des tokens, donc aucun
  chaînage ni nouveau part n'est resté nécessaire pour ce cas précis.
- **Une valeur dark-mode indépendante (pas une simple variance héritée de l'alias) prime sur
  le critère « usage unique ».** Vérification systématique des blocs dark de `default.css`
  pour les 38 candidats initiaux de la branche 4 : trois tokens (`error-color`,
  `input-error-border-color`, `day-today-color`) ont leur **propre** valeur dark, calibrée
  indépendamment de leur alias clair. Exemple : `error-color` alias `--ar-color-danger-text`
  en clair, mais dévie vers `--ar-color-red-40` en sombre au lieu du `--ar-color-danger-70`
  qu'aurait donné le simple suivi de l'alias — calibrage AA spécifique au composant, cf.
  commentaire `default.css:544` (« calibré pour le contraste AA sur texte (axe-core) »).
  Aplatir ces tokens en valeur littérale dans une règle `::part()` perdrait cette calibration
  dark, sauf à dupliquer la règle sous un bloc dark séparé — jugé plus fragile que de
  simplement les garder en tokens. `day-today-bg` (pas de valeur dark propre, mais forme une
  paire avec `day-today-color`) est gardé pour la même raison, par cohérence : scinder le
  traitement de deux propriétés d'un même état visuel entre deux mécanismes différents
  (token vs `::part()`) ajouterait de la confusion pour un gain marginal (1 seul token).

## Application à `ar-datepicker`

Classification complète des 58 tokens actuels, par branche :

| Branche                                             | Nombre                                                                           | Traitement                                                     |
| --------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1. Fallback WCAG/fonctionnel                        | 15                                                                               | Inchangé (déjà des tokens avec fallback)                       |
| 2. Lu en JS                                         | 2 (`distance`, `offset`)                                                         | Inchangé                                                       |
| 3. Réutilisé ≥2×                                    | 1 (`day-focus-ring-offset`)                                                      | Inchangé                                                       |
| — Sur `:host` (exclu de la branche 4)               | 1 (`gap`)                                                                        | Inchangé — reste un token                                      |
| — Valeur dark-mode indépendante (exclu branche 4/5) | 4 (`error-color`, `input-error-border-color`, `day-today-bg`, `day-today-color`) | Inchangé — reste un token, cf. justification ci-dessus         |
| 5. Consommé uniquement par le `::part()` du thème   | 1 (`label-gap`)                                                                  | Retiré, valeur repliée en clair dans `::part(label)` existante |
| 4. Candidat `::part()`, confirmé                    | 34                                                                               | Regroupés dans de nouvelles règles `::part()`                  |

**Total : 23 tokens conservés** (15+2+1+1+4) sur 58, soit une réduction d'environ **60%** de
la surface de tokens `:root` d'`ar-datepicker`.

> **Correction post-implémentation (revue finale de la PR de migration) :** cette
> classification initiale n'anticipait pas une contrainte technique supplémentaire, trouvée et
> vérifiée empiriquement (Chromium réel, via Playwright) en revue finale : **une règle
> `::part()` déclarée dans le thème (feuille de style externe) l'emporte sur une règle interne
> au shadow DOM du composant ciblant la même propriété, même quand la règle interne a une
> spécificité CSS plus élevée.** `--ar-datepicker-day-color` et `--ar-datepicker-day-bg`
> avaient été classés candidats branche 4 (cf. `::part(day)` ci-dessous) — à tort, car les
> règles d'état internes du composant (`.today`, `.selected`, `:hover`, `.other-month`)
> surchargent ces deux propriétés par classe CSS, un mécanisme que `::part()` ne peut pas
> reproduire depuis l'extérieur (pas de chaînage de classe après `::part()`). Les migrer aurait
> rendu les jours sélectionné/actif/survolé indiscernables des autres — régression WCAG.
> **Ces deux tokens ont été réintroduits** : le total réel est donc **25 tokens conservés**
> (33 migrés, pas 35). Détail : `ADR-005`, amendement du 2026-07-24 (section mise à jour).
> Nouvelle contrainte ajoutée au critère : une propriété surchargée par une règle d'état
> interne au composant (classe) doit rester un token consommé dans le composant, jamais migrée
> en `::part()` du thème.

### Nouvelles règles `::part()` à créer dans `default.css`

Regroupement des 34 tokens confirmés par part, dans le même style que le bloc
`input`/`trigger` déjà existant :

- **`ar-datepicker::part(nav-btn)`** (+ `:hover`, `:active`) : `background`, `border-width`,
  `color`, `border-radius`, `width`/`height` (remplace `nav-btn-size`, utilisé pour les deux
  dimensions). `border-color` et la couleur de l'anneau de focus (`:focus-visible`) restent
  pilotés par les 2 tokens conservés (branche 1).
- **`ar-datepicker::part(footer-btn)`** (+ `:hover`, `:active`) : `background`,
  `border-width`, `color`, `padding`, `border-radius`, `border-color` au survol.
- **`ar-datepicker::part(footer)`** : `background`, `margin`, `padding`.
- **`ar-datepicker::part(header)`** : `background`, `font-size`, `margin`, `padding`,
  `border-radius`.
- **`ar-datepicker::part(weekday)`** _(nouveau part — les `<th>` d'en-tête de colonne n'ont
  aujourd'hui **aucun** attribut `part` ; un sélecteur de thème ne peut pas traverser la
  frontière du shadow DOM sans `::part()`, donc un `part="weekday"` doit être ajouté sur le
  `<th>` dans `datepicker.ts`)_ : `color`, `font-size`.
- **`ar-datepicker::part(day)`** : `font-size`, `border-radius`. `border-width`/`border-color`
  restent pilotés par les tokens conservés (branche 1, cutout de focus). `color` et
  `background-color` restent **également** des tokens (`--ar-datepicker-day-color`/`-day-bg`)
  — cf. correction post-implémentation ci-dessus, ces propriétés sont surchargées par les
  règles d'état internes du composant. Les propriétés spécifiques à l'état « aujourd'hui »
  (`day-today-bg`/`day-today-color`) restent aussi des tokens, cf. contrainte dark-mode
  ci-dessus.
- **`ar-datepicker::part(panel)`** : `width`, `padding`. `max-width` reste piloté par le
  token conservé (branche 1, fallback WCAG 25rem).
- **`ar-datepicker::part(label)`** _(règle existante, amendée)_ : `margin-bottom` calculé
  directement à partir d'une valeur littérale au lieu de `--ar-datepicker-label-gap`.

`--ar-datepicker-error-color` et `--ar-datepicker-input-error-border-color` ne sont **pas**
touchés par ce chantier (cf. contrainte dark-mode) — `::part(error)` et `::part(input)`
restent inchangés.

### JSDoc / `@cssprop`

`datepicker.ts` perd les entrées `@cssprop` des 32 tokens retirés (+ `label-gap`, 33 au
total — `day-color`/`day-bg` réintroduits en revue finale, cf. correction post-implémentation
plus haut). Les 25 tokens conservés gardent leur entrée. Aucune régression de couverture
attendue : `validate-cssprop-defaults.js` ne vérifie qu'une seule direction (tout token
présent dans `default.css` doit avoir une entrée `@cssprop`) — retirer les deux en même temps
est sans risque pour `npm run build:manifest`.

## Tests concernés

`datepicker.test.ts:475-491` (`describe('fonds par défaut du calendrier (thème)')`) vérifie
aujourd'hui, par lecture directe du fichier source, que `default.css` définit
`--ar-datepicker-header-bg`, `-day-bg` et `-footer-bg` comme tokens `:root`. Ce test devient
faux avec ce chantier (ces 3 tokens n'existeraient plus) — à mettre à jour pour vérifier à la
place l'existence des règles `ar-datepicker::part(header)`, `::part(day)`, `::part(footer)`
avec une déclaration `background`. Aucun autre test (unitaire ou navigateur) n'a été trouvé
dépendant des tokens candidats à la suppression (`grep` sur `datepicker.*.test.ts`).

## Breaking change (assumé, alpha)

Même précédent que PR #136 : un consommateur qui surchargeait un des 33 tokens retirés
(ex. `--ar-datepicker-nav-btn-radius`) doit migrer vers une règle `::part()` directe
(`ar-datepicker::part(nav-btn) { border-radius: ... }`) — mécanisme déjà disponible
aujourd'hui même pour les composants qui exposent un token (`::part()` n'a jamais été
bloqué par l'existence d'un token concurrent), donc aucune capacité n'est perdue, seule la
route « documentée et à usage unique » disparaît au profit de la route déjà générale.
Acceptable sans dépréciation en alpha (cf. CLAUDE.md).

## Décision d'architecture à documenter

Amendement à **ADR-005** (nouvelle section datée, même format que l'amendement du
2026-07-22) : le critère à 4 branches ci-dessus devient la référence pour toute future
décision token scopé vs `::part()`, pas seulement pour `ar-datepicker`.

## Périmètre de ce chantier

**Seul `ar-datepicker` est migré dans ce plan** — le cas d'étude demandé explicitement par le
mainteneur. Les 5 autres composants scopés en PR #136 (`alert`, `breadcrumb`, `stepper`,
`tab`, `pagination`) ne sont **pas** réaudités ici : ils ont beaucoup moins de tokens chacun
(1 à 4), donc un potentiel de réduction bien plus faible, et le risque de rouvrir un chantier
tout juste refermé n'est pas justifié sans une demande explicite. Si le critère fait ses
preuves sur `ar-datepicker`, une généralisation aux autres composants (et aux 13 restants
jamais audités sous cet angle) pourra être envisagée dans un ticket séparé.

## Hors périmètre

- Les 4 items déjà en veille sur #129 (`ar-charcounter` warning/error) ne sont pas concernés.
- Aucun changement visuel par défaut (thème chargé) : chaque règle `::part()` reprend
  exactement la valeur du token qu'elle remplace.
