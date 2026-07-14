# Audit technique — maturité v1.0-beta

Date : 2026-07-14
Périmètre : 17 composants (`packages/core/src/components/*`), fichiers `*.ts` + `*.styles.ts` uniquement (hors tests, hors doc). Objectif : évaluer si la librairie est mûre pour une release v1.0-beta — solidité technique, cohérence API inter-composants, simplicité d'usage, accessibilité, respect du modèle headless/CSS.

Méthode : audit en 4 lots parallèles (agents indépendants, même grille de lecture), synthèse transversale ci-dessous.

- **Lot A** — couche flottante : `dropdown`+`dropdown-item`, `tooltip`, `dialog`
- **Lot B** — composites multi-parties : `stepper`+`stepper-item`, `tab-group`+`tab`+`tab-panel`
- **Lot C** — navigation/données : `breadcrumb`+`breadcrumb-item`, `pagination`, `table-sort`, `collapse`
- **Lot D** — affichage simple + datepicker : `alert`, `progressbar`, `spinner`, `charcounter`, `datepicker`

---

## Constats transversaux (touchent plusieurs composants/lots)

Ces points ressortent indépendamment dans au moins 2 lots — signe de dérive systémique plutôt que d'un oubli isolé. Priorité à traiter en premier car une correction unique peut couvrir plusieurs composants.

### 1. `console.warn`/`console.error` bruts au lieu de `warn()` (fuite en production)

`warn()` (`utils/warn.ts`) est le pattern établi (gated par `__DEV__`), mais plusieurs points de code y échappent :

- `utils/popover.ts:76,81` — utilisé par dropdown/tooltip/dialog/breadcrumb/datepicker/stepper (tout ce qui passe par `AnchoredController`)
- `alert.ts:195` — `console.error` non gated
- `navigation-tree.controller.ts:61` — `console.warn` brut (utilisé par stepper)
- `datepicker.ts` — unique `console.error` gated en inline plutôt que via l'utilitaire partagé

**Impact** : incohérence de politique de diagnostic, et surtout des warnings qui s'afficheront en production alors que la convention du projet est de les stripper.

### 2. Libellés français codés en dur, sans point d'extension i18n

Présent dans `alert` (aria-label close), `pagination` (4 libellés), `table-sort` (labels d'action/état), `breadcrumb` (2 libellés), `stepper` (3 libellés), `datepicker` (6 aria-label de navigation — alors même que ce composant expose déjà `locale`). À l'inverse, `tab-group`, `collapse`, `dropdown`, `tooltip`, `dialog` (sauf son titre par défaut) n'ont aucun texte en dur ou exposent des props overridables (`closeLabel`, `todayLabel`, `loading-label`...).

**Impact** : dette i18n hétérogène — certains composants sont prêts pour le futur chantier i18n (#80), d'autres nécessiteront une refonte de leur API publique. Le cas `datepicker` est le plus notable : le composant a déjà l'infrastructure `locale` mais ses aria-label de navigation n'en profitent pas.

### 3. Conventions d'events incohérentes sans justification apparente

- **Suffixe** : `ar-stepper-step-changed` (`-changed`) vs `ar-tab-group-change` (`-change`)
- **Forme du detail** : `ar-dialog` fournit `{ id }` sur tous ses events, `ar-dropdown` n'a aucun detail, `ar-stepper` utilise `{ path }`, `ar-tab-group` utilise `{ active }`
- **Cancelable** : `ar-collapse-show/hide` sont `cancelable`, `ar-breadcrumb-open/close` et `ar-table-sort-change` ne le sont pas
- **Absence totale d'events** : `ar-tooltip` n'émet aucun `CustomEvent` de cycle de vie, contrairement à `ar-dropdown`/`ar-dialog` (pattern show/shown/hide/hidden)

**Impact** : un consommateur qui apprend l'API d'un composant ne peut pas transférer cette connaissance aux autres. C'est le point le plus structurant pour la "cohérence API" demandée dans cette passe.

### 4. `aria-disabled` : deux conventions concurrentes

`pagination.ts` pose à la fois `.ariaDisabled` (propriété IDL) et `aria-disabled=` (attribut manuel) sur le même élément ; `table-sort.ts` ne pose que l'attribut. Un seul pattern devrait être choisi pour toute la librairie.

### 5. Résolution du trigger externe (`for`) : bug de régression dropdown vs tooltip

`ar-tooltip` résout `for` via `getRootNode().getElementById()` (fonctionne en shadow DOM, correctif déjà appliqué historiquement). `ar-dropdown` utilise encore `document.getElementById()` — casse silencieusement si le dropdown est instancié dans le shadow DOM d'un autre composant. Les deux composants partagent le même pattern d'API (`for`) et devraient partager la même robustesse.

### 6. `aria-controls` trigger→panel : incohérent entre les deux mécanismes de disclosure

`ar-collapse` (`_syncTriggerAria`) pose `aria-controls` sur son trigger. `AnchoredController` (utilisé par `dropdown`, `tooltip`, `breadcrumb`, `datepicker`, `stepper`) ne le fait jamais, alors que `Popover.attach()` génère pourtant un id de panel exploitable.

### 7. Documentation `@cssprop` incomplète ou tokens non définis dans le thème

- `dropdown.ts` — `--ar-dropdown-color` utilisé et défini dans le thème mais absent du JSDoc
- `charcounter.ts` — 3 tokens utilisés/définis mais absents du JSDoc, format JSDoc différent des autres composants (pas de notation `[--ar-x=default]`)
- **`datepicker.styles.ts`** — `--ar-datepicker-header-bg`, `-day-bg`, `-footer-bg` sont **consommés mais jamais définis** dans `themes/default.css` ni documentés → bug de rendu réel (pas de fallback, modèle headless), pas seulement un oubli de doc

### 8. Préfixage des custom properties : rupture de convention sur `ar-dialog`

Tous les tokens du lot A sont namespacés `--ar-<composant>-*`, sauf `--width`, `--spacing`, `--spacing-block`, `--spacing-inline` sur `ar-dialog` — noms génériques, risque de collision avec d'autres custom properties globales du consommateur.

---

## Constats bloquants pour la beta (par composant)

Classés par impact utilisateur, à traiter avant toute release beta.

| Composant       | Constat                                                                                                                                                                                                                                                          | Référence                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `ar-alert`      | Survoler/focuser (sans cliquer) le bouton close déclenche `transitionend` composé → `_finishHide` s'exécute et vole le focus vers `next-focus` sans que rien ne soit fermé. Régression clavier, WCAG 3.2.1/3.2.2.                                                | `alert.ts:101,172-201`                             |
| `ar-pagination` | `total` négatif fait planter `render()` (`RangeError: Invalid array length`) — le garde-fou `warn()` s'exécute après coup, ne protège pas le rendu.                                                                                                              | `pagination.ts:74-97`, `pagination.utils.ts:10`    |
| `ar-table-sort` | Dépend de `<ar-tooltip>` sans l'importer — cassé en import headless isolé (élément anonyme, tooltip jamais positionné).                                                                                                                                          | `table-sort.ts:186`                                |
| `ar-stepper`    | Fallback `href` incohérent (`#` vs `javascript:;`) et `onClickLink` n'appelle jamais `preventDefault()` → clic sur item sans `href` déclenche une vraie navigation (scroll-to-top intempestif).                                                                  | `stepper.renderer.ts:67,104`, `stepper.ts:451-469` |
| `ar-tab`        | Désactiver `tab.disabled` à chaud ne notifie jamais le registry (`tab-group._syncAll` jamais réinvoqué) → `aria-disabled`/`tabindex` restent obsolètes alors que la navigation clavier, elle, exclut correctement l'onglet. État ARIA et comportement divergent. | `tab.ts` (absence de hook `updated()`)             |
| `ar-dropdown`   | `for` résolu via `document.getElementById` — casse en shadow DOM (régression vs le correctif déjà appliqué sur `ar-tooltip`).                                                                                                                                    | `dropdown.ts:154`                                  |
| `ar-datepicker` | 3 tokens de fond (header/day/footer) consommés mais jamais définis dans le thème — rendu par défaut cassé (transparent, pas de fallback headless).                                                                                                               | `datepicker.styles.ts:53,144,217`                  |

---

## Constats "à corriger" notables (hors transversaux ci-dessus)

- **`pagination.utils.ts:38`** — export nommé `mrPaginationUtils` (préfixe `mr`, reliquat de copier-coller, pas `ar`)
- **`pagination.ts:107,134`** / historique Bootstrap-era — `href="javascript:;"` sur liens de navigation, potentiellement bloqué par CSP stricte
- **`table-sort.ts`** — pas de `disconnectedCallback()` : `aria-sort`/`scope` posés sur le `<th>` parent ne sont jamais retirés si le composant est démonté
- **`breadcrumb.ts:75,82,86`** — `_items: Set<>` peuplé mais jamais lu (code mort, `_orderedItems` fait le vrai travail)
- **`stepper.renderer.ts`** — ne gère que 2 niveaux de profondeur alors que `navigation-tree.controller.ts` construit un arbre arbitraire — items à 3+ niveaux silencieusement absents du rendu
- **`stepper.ts`** — double dispatch non documenté : `step-changed` (interne mais `composed:true`, donc visible hors shadow DOM) en plus de `ar-stepper-step-changed` (documenté)
- **`tab-group.ts:45`** — id généré via `Math.random().toString(36)` plutôt que `crypto.randomUUID()` (déjà utilisé ailleurs dans la lib)
- **`dialog.ts:34`** — `DEFAULT_DIALOG_LABEL = 'Dialogue'` sans prop d'override équivalente à `closeLabel`/`preventedMessage`
- **`progressbar.ts:61`** — le "clamp défensif" commenté ne clampe pas `NaN` → `aria-valuenow="NaN"` et `width: NaN%` possibles malgré le `warn()`
- **`progressbar.ts:71`** — classe utilitaire Bootstrap-era `d-inline-flex` redondante, reliquat isolé (seul composant du lot D à utiliser `utilities.styles.ts`)
- **`calendar.controller.ts:60-69`** — la grille du calendrier démarre toujours le lundi, indépendamment de la `locale` (incohérent avec les noms de jours, eux, bien localisés)
- **`datepicker.ts:197-207`** — `_show()` asynchrone / `_hide()` synchrone, pas de garde équivalent à celui d'`AnchoredController` contre un toggle rapide

---

## Dette notée (non urgente, à garder en tête)

- Commentaires/`Symbol` résiduels d'un renommage incomplet (`ft-stepper`/`mt-stepper`) dans `stepper-item.ts`, `stepper.renderer.ts`, `stepper.context.ts`
- `stepper.ts` cumule beaucoup de responsabilités dans une seule classe (téléportation DOM, media query, popover, scroll-follow, arbre de navigation) — charge cognitive élevée
- Tailles de `spinner` et dimensions de `progressbar` codées en dur (non tokenisées), alors que les couleurs le sont
- `ArAlertConfig` (classe exportée dans `alert.ts`) semble être du code mort, référencée seulement en commentaire dans `autoloader.ts`
- Annotation `// @ignore` (convention CEM) appliquée de façon incohérente entre composants du lot D
- `datepicker` : ordinal "1er" en dur pour les locales `fr*` uniquement, pas de couverture pour d'autres locales à ordinaux

---

## Points positifs relevés

- `ar-collapse` : composant le plus solide de l'audit — cycle de vie symétrique, gestion fine des races d'animation, headless strict, aucun texte en dur
- `ar-dialog` : cycle de vie robuste (focus trap natif, scroll-lock symétrique, pile multi-dialog correcte, fallback anti-race sur les animations)
- `ar-tab-group` : pattern clavier conforme WAI-ARIA APG Tabs (roving tabindex, wrap-around, Home/End, activation manuelle/automatique) sans réserve
- Coordination parent/enfant (`stepper`/`tab-group`, pattern `@lit/context` + registre) : socle solide et cohérent entre les deux composites, nettoyage correct en `disconnectedCallback`
- Distinction ARIA dropdown (`aria-haspopup`/`aria-expanded`) vs tooltip (`aria-describedby`) : bon choix sémantique différencié

---

## Recommandation de priorisation

1. **Transversaux #1, #3, #5, #6** — un seul correctif chacun peut couvrir plusieurs composants ; #3 (conventions d'events) est le plus structurant pour la "cohérence API" visée par cette passe et mérite une décision explicite avant toute correction ponctuelle.
2. **Bloquants beta** (tableau ci-dessus) — 7 constats, tous à fort impact utilisateur (crash, vol de focus, navigation cassée, état ARIA incohérent, rendu cassé).
3. **i18n (#2)** — décision de fond déjà actée en amont (traiter conjointement au chantier #80) : cette passe fournit l'inventaire précis des libellés concernés, pas une raison de rouvrir la décision de scope.
4. **"À corriger" et dette notée** — au fil de l'eau, une fois les deux premiers points traités.
