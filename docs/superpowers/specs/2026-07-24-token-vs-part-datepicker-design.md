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

**Deux contraintes techniques qui priment sur le critère ci-dessus**, découvertes en
analysant `ar-datepicker` :

- **`::part()` ne peut cibler que des éléments portant un attribut `part` à l'intérieur du
  shadow DOM — jamais l'hôte (`:host`)**. Une propriété appliquée à `:host` (ex.
  `--ar-datepicker-gap`, qui pilote le `gap` du conteneur flex racine) reste donc
  nécessairement un token, quel que soit son nombre d'usages — la branche 4 ne s'applique pas.
- **`::part()` ne peut être suivi que d'un ensemble restreint de pseudo-classes** (`:hover`,
  `:focus-visible`, `:active`, `:disabled`, `:read-only`… — déjà utilisées avec succès dans
  `default.css:789-837` pour `input`/`trigger`). **Il n'est pas établi qu'une classe CSS
  arbitraire posée par le composant (`.today`, `.selected` via `classMap`) puisse être
  chaînée après `::part()`** (`::part(day).today`) — les pseudo-éléments n'acceptent
  généralement pas de sélecteur de classe à leur suite en CSS standard. Les deux tokens
  concernés chez `ar-datepicker` (`day-today-bg`, `day-today-color`) sont donc classés
  **provisoires**, avec deux issues possibles, à trancher à l'implémentation :
    1. **Option préférée — nouveau part dédié.** Le fichier utilise déjà ce pattern ailleurs
       (`part="footer-btn today-btn"` sur le bouton « aujourd'hui » du footer,
       `datepicker.ts:405`) : un attribut `part` multi-valeurs (`part="day today"` sur la
       cellule du jour courant, en plus de `part="day"`). `default.css` cible alors
       `ar-datepicker::part(today)` directement, sans dépendre du chaînage `::part(x).y`. Ne
       nécessite pas de vérification préalable — le mécanisme est déjà prouvé dans ce même
       fichier.
    2. **Repli — rester des tokens scopés** si l'option 1 s'avère indésirable pour une raison
       non anticipée (ex. collision de nommage avec un futur part `today` sur un autre
       composant). Pas bloquant pour le reste du chantier dans tous les cas.

## Application à `ar-datepicker`

Classification complète des 58 tokens actuels, par branche :

| Branche                                           | Nombre                                | Traitement                                                                            |
| ------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------- |
| 1. Fallback WCAG/fonctionnel                      | 15                                    | Inchangé (déjà des tokens avec fallback)                                              |
| 2. Lu en JS                                       | 2 (`distance`, `offset`)              | Inchangé                                                                              |
| 3. Réutilisé ≥2×                                  | 1 (`day-focus-ring-offset`)           | Inchangé                                                                              |
| — Sur `:host` (exclu de la branche 4)             | 1 (`gap`)                             | Inchangé — reste un token                                                             |
| 5. Consommé uniquement par le `::part()` du thème | 2 (`error-color`, `label-gap`)        | Retiré, valeur repliée en clair dans `::part(error)`/`::part(label)` existantes       |
| 4. Candidat `::part()`, via nouveau part dédié    | 2 (`day-today-bg`, `day-today-color`) | `part="day today"` sur la cellule, ciblé via `::part(today)` (repli tokens si écarté) |
| 4. Candidat `::part()`, confirmé                  | 35                                    | Regroupés dans de nouvelles règles `::part()`                                         |

**Total : 18 tokens conservés** (15+2+1) sur 58, soit une réduction d'environ **68%** de la
surface de tokens `:root` d'`ar-datepicker`.

### Nouvelles règles `::part()` à créer dans `default.css`

Regroupement des 35 tokens confirmés (+ 2 via nouveau part `today`) par part, dans le même style que le
bloc `input`/`trigger` déjà existant :

- **`ar-datepicker::part(nav-btn)`** (+ `:hover`, `:active`) : `background`, `border-width`,
  `color`, `border-radius`, `width`/`height` (remplace `nav-btn-size`, utilisé pour les deux
  dimensions). `border-color` et la couleur de l'anneau de focus (`:focus-visible`) restent
  pilotés par les 2 tokens conservés (branche 1).
- **`ar-datepicker::part(footer-btn)`** (+ `:hover`, `:active`) : `background`,
  `border-width`, `color`, `padding`, `border-radius`, `border-color` au survol.
- **`ar-datepicker::part(footer)`** : `background`, `margin`, `padding`.
- **`ar-datepicker::part(header)`** : `background`, `font-size`, `margin`, `padding`,
  `border-radius`.
- **`ar-datepicker [part='grid'] th`** _(pas un `::part()` — sélecteur interne au thème
  existant déjà pour cibler les en-têtes de colonnes)_ : `color`, `font-size`.
- **`ar-datepicker::part(day)`** : `background`, `font-size`, `color`, `border-radius`.
  `border-width`/`border-color` restent pilotés par les tokens conservés (branche 1, cutout
  de focus).
- **`ar-datepicker::part(today)`** _(nouveau part sur la cellule du jour courant, en plus de
  `day`)_ : `background`, `color` — remplace `day-today-bg`/`day-today-color`.
- **`ar-datepicker::part(panel)`** : `width`, `padding`. `max-width` reste piloté par le
  token conservé (branche 1, fallback WCAG 25rem).
- **`ar-datepicker::part(input)`** _(règle existante, amendée)_ : ajoute `border-color` pour
  l'état d'erreur, via `ar-datepicker[has-error]::part(input)` — remplace
  `--ar-datepicker-input-error-border-color`.
- **`ar-datepicker::part(error)`** _(règle existante, amendée)_ : `color` en valeur directe
  (`var(--ar-color-danger-text)`) au lieu de passer par `--ar-datepicker-error-color`.
- **`ar-datepicker::part(label)`** _(règle existante, amendée)_ : `margin-bottom` calculé
  directement à partir d'une valeur littérale au lieu de `--ar-datepicker-label-gap`.

### JSDoc / `@cssprop`

`datepicker.ts` perd les entrées `@cssprop` des 35-37 tokens retirés. Les 18 tokens conservés
gardent leur entrée. Aucune régression de couverture attendue :
`validate-cssprop-defaults.js` ne vérifie qu'une seule direction (tout token présent dans
`default.css` doit avoir une entrée `@cssprop`) — retirer les deux en même temps est sans
risque pour `npm run build:manifest`.

## Tests concernés

`datepicker.test.ts:475-491` (`describe('fonds par défaut du calendrier (thème)')`) vérifie
aujourd'hui, par lecture directe du fichier source, que `default.css` définit
`--ar-datepicker-header-bg`, `-day-bg` et `-footer-bg` comme tokens `:root`. Ce test devient
faux avec ce chantier (ces 3 tokens n'existeraient plus) — à mettre à jour pour vérifier à la
place l'existence des règles `ar-datepicker::part(header)`, `::part(day)`, `::part(footer)`
avec une déclaration `background`. Aucun autre test (unitaire ou navigateur) n'a été trouvé
dépendant des tokens candidats à la suppression (`grep` sur `datepicker.*.test.ts`).

## Breaking change (assumé, alpha)

Même précédent que PR #136 : un consommateur qui surchargeait un des 37 tokens retirés
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
