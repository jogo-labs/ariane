# Design — Infrastructure i18n pour `@ariane-ui/core`

**Statut :** Validé (en attente de plan d'implémentation)
**Date :** 2026-08-14
**Contexte :** issue [#80](https://github.com/jogo-labs/ariane/issues/80) — prochain chantier après
la clôture de #181 (vocabulaire `::part()`)

## Contexte

`ar-table-sort` embarque des labels accessibles en français hardcodés (labels de tri, annonces
aria-live contextualisées). `ar-datepicker` expose `today-label`/`close-label` en props séparées,
également en français par défaut. D'autres composants futurs auront le même besoin — pas de
mécanisme i18n générique dans la lib pour l'instant.

Un design initial avait été brainstormé le 2026-06-02 pendant l'implémentation d'`ar-table-sort` :
`setLocale(obj)` exporté depuis le package, appelé une fois au bootstrap, cache module-level
partagé via un singleton ES module, fichiers `locales/fr.js`/`en.js`, fallback
`window.ARIANE_I18N` pour les usages CDN sans import ES module (spec de référence :
`docs/superpowers/specs/2026-06-02-ar-table-sort-design.md`).

Une mise à jour de l'issue le 2026-08-12 invitait à évaluer `@shoelace-style/localize` (utilisée
par Shoelace et WebAwesome) avant de valider ce design initial. Ce document remplace le design de
juin suite à cette évaluation.

## Décisions issues du brainstorming

### 1. Adoption de `@shoelace-style/localize`, abandon du modèle `setLocale()` global

La lib (MIT, zero-dependency, ~35 Ko non compressé) fournit un `LocalizeController`
(`ReactiveController` Lit) par composant, branché sur l'attribut `lang` plutôt que sur un appel de
bootstrap global. Elle gère nativement l'interpolation et les pluriels via des termes-fonctions
typés :

```ts
const translation: Translation = {
    $code: 'fr',
    $name: 'Français',
    $dir: 'ltr',

    upload: 'Envoyer', // terme simple
    greetUser: (name: string) => `Bonjour, ${name} !`, // interpolation
    numFilesSelected: (count: number) => {
        // pluriel géré à la main
        if (count === 0) return 'Aucun fichier sélectionné';
        if (count === 1) return '1 fichier sélectionné';
        return `${count} fichiers sélectionnés`;
    },
};
```

Ceci résout le principal point d'incertitude soulevé en revue : TypeScript force le consommateur
qui écrit sa propre traduction à respecter la signature de chaque terme, pas juste une string —
plus robuste qu'un système générique de placeholders.

Un `MutationObserver` interne à la lib détecte les changements de `lang`/`dir` sur `<html>` et sur
chaque composant, et déclenche un re-render des composants concernés — pas de traversée DOM
coûteuse à chaque render.

**Limite assumée et documentée par la lib elle-même** (README `@shoelace-style/localize`) : les
attributs `lang` sur des éléments ancestraux intermédiaires sont ignorés, pour des raisons de
performance (« there isn't an efficient way to detect the "current language" of an arbitrary
element [...] I consider this a gap in the platform »). Seuls `<html lang>` (langue par défaut) et
le `lang` posé directement sur le composant (surcharge) sont lus. Un `<div lang="es">` autour d'un
composant Ariane n'aura donc aucun effet — à documenter clairement plutôt qu'à laisser découvrir en
production.

**`window.ARIANE_I18N` abandonné** : le mécanisme prévu dans le design initial pour couvrir les
usages CDN sans bundler n'est plus nécessaire. Le modèle WebAwesome fonctionne nativement via
modules ES chargés en `<script type="module" src=".../translations/fr.js">`, chaque fichier
s'auto-enregistrant à l'import — déjà la pratique du projet pour `@ariane-ui/core` sur
unpkg/jsDelivr.

**Suppression de la réservation obsolète `ArianeConfig.i18n`** (`src/types/ariane-config.d.ts`) :
cette propriété anticipait une forme `Record<string, Record<string, string>>` incompatible avec des
termes-fonctions (interpolation/pluriel). Elle n'est lue par aucun code — retrait plutôt que
retypage, pour ne pas garder un contrat public trompeur.

### 2. Organisation des fichiers

- **`src/translations/fr.ts`** — traduction par défaut (fallback), `$code: 'fr'` sans variante
  régionale (conformément à la doc de la lib : le fallback doit être générique pour couvrir les
  codes régionaux non supportés, ex. `fr-CA`).
- **`src/translations/en.ts`** — traduction de référence, sert de contrat typé de base pour un
  consommateur qui veut composer sa propre traduction.
- **`src/translations/` ne contient que ces fichiers de traduction** — pas le type ni le
  controller, pour rester un dossier à vocation unique.
- **`src/types/translation.ts`** — interface `Translation` du projet (étend celle de la lib), un
  seul type plat regroupant les termes de tous les composants concernés par cette livraison (pas
  d'augmentation par composant — même modèle que Shoelace/WebAwesome : un fichier central par
  langue). Rejoint `src/types/navigation-nodes.ts`, `src/types/ariane-config.d.ts` déjà en place.
- **`src/controllers/localize.controller.ts`** — ré-export/wrapper léger du `LocalizeController` de
  la lib, cohérent avec `AnchoredController`, `HasSlotController` déjà présents dans
  `src/controllers/`.
- `registerTranslation(fr, en)` appelé au chargement de `translations/fr.ts`/`en.ts`
  (l'enregistrement se déclenche à l'import, comme les fichiers d'exemple WebAwesome).
- Export public depuis `src/index.ts` : `LocalizeController`, `registerTranslation`, le type
  `Translation`, `fr`, `en`.

### 3. Migration `ar-table-sort`

Remplacement de `ACTION_LABELS`, `APPLIED_LABELS` et `getActionLabel()` (constantes FR hardcodées,
`table-sort.ts:17-46`) par des termes typés :

```ts
sortAscending: (type: 'alpha' | 'numeric' | 'date') => string;
sortDescending: (type: 'alpha' | 'numeric' | 'date') => string;
sortReset: (type: 'alpha' | 'numeric' | 'date') => string;
sortPending: string;
sortApplied: (columnLabel: string, order: 'none' | 'asc' | 'desc') => string;
sortFailed: (columnLabel: string) => string;
```

Chaque terme `sortAscending`/`sortDescending`/`sortReset` prend `type` en paramètre plutôt que
d'avoir trois clés distinctes par type — la fonction gère la branche en interne, comme
`numFilesSelected` dans l'exemple du README de la lib.

Le composant appelle `this.localize.term('sortApplied', this._getColumnLabel(), newOrder)` etc. à
la place des concaténations manuelles actuelles (`table-sort.ts:103,110,121`).
`private localize = new LocalizeController(this)` ajouté au composant ; `table-sort/index.ts`
importe `../../translations/fr.js` et `../../translations/en.js` pour garantir l'enregistrement
avant le premier rendu.

### 4. Migration `ar-datepicker`

Retrait des props `today-label`/`close-label` (`datepicker.ts:145,147`, valeurs FR hardcodées) au
profit de deux termes :

```ts
today: string;
close: string;
```

`this.localize.term('today')` / `this.localize.term('close')` remplacent `this.todayLabel` /
`this.closeLabel`. Breaking change à documenter dans le CHANGELOG — acceptable en alpha, pas de
`warnDeprecated()` nécessaire selon les notes du projet.

**Alignement du fallback de `locale`** (`datepicker.ts:225`, actuellement
`this.locale || navigator.language`) :

```ts
this.locale || this.localize.lang();
```

`locale` garde la priorité explicite (peut différer de la langue UI — ex. format de date US avec
UI en français). `this.localize.lang()` fournit le fallback intermédiaire — vérifié dans le code
source de la lib, cette méthode résout déjà `this.lang || document.documentElement.lang ||
navigator.language`, donc pas de raison de dupliquer cette chaîne à la main.

**`.date()`/`.number()` de la lib non adoptés pour le formatage interne du calendrier** — évalué et
écarté après lecture du code source :

- `date(dateToFormat, options)` résout toujours la locale via `this.lang()` en interne, sans
  paramètre pour lui passer un `locale` explicite différent — incompatible avec la priorité de
  `locale` sur `lang` actée ci-dessus.
- Pas de cache interne, contrairement à `_getFormatter()`/`_formatterCache`/`_dayNamesCache`
  (`datepicker.ts:539` et environs), qui évitent de reconstruire un `Intl.DateTimeFormat` à chaque
  cellule de la grille calendrier (jusqu'à ~35 par rendu).
- Le format/parse du champ texte (`dd/MM/yyyy`, `date-parser.ts`) est un parsing par tokens custom,
  sans rapport avec `Intl.DateTimeFormat` — hors du périmètre de `.date()` de toute façon.

Seule `this.localize.lang()` est réutilisée (résolution de la locale par défaut) ; `.date()`,
`.number()`, `.dir()` ne sont pas utilisés dans ce lot.

### 5. Attribution

- **`packages/core/README.md`** — section crédits/dépendances mentionnant `@shoelace-style/localize`
  (MIT) comme dépendance directe du mécanisme i18n.
- Mention de WebAwesome comme référence générale du projet (déjà une pratique établie dans Ariane,
  pas spécifique à l'i18n) — à formuler dans le README/doc en cohérence avec cette portée plus
  large plutôt que de la limiter à ce chantier.

## Impact

**Composants** :

- `packages/core/src/components/table-sort/table-sort.ts` — voir section 3.
- `packages/core/src/components/table-sort/index.ts` — imports des traductions.
- `packages/core/src/components/datepicker/datepicker.ts` — voir section 4.
- `packages/core/src/components/datepicker/index.ts` — imports des traductions.

**Infrastructure** :

- Nouveau `packages/core/src/translations/{fr,en}.ts`.
- Nouveau `packages/core/src/types/translation.ts`.
- Nouveau `packages/core/src/controllers/localize.controller.ts`.
- `packages/core/src/types/ariane-config.d.ts` — retrait de `ArianeConfig.i18n`.
- `packages/core/src/index.ts` — nouveaux exports publics.
- `packages/core/package.json` — nouvelle dépendance `@shoelace-style/localize`.

**Docs** :

- `packages/core/README.md` — section crédits (voir section 5).
- `apps/docs/` — nouvelle page i18n : mécanisme `lang`, `registerTranslation()`, comment fournir sa
  propre traduction en partant de `en.ts` comme référence typée, limite documentée sur
  l'héritage `lang` (pas de propagation via un ancêtre intermédiaire), lien vers
  `@shoelace-style/localize` et vers WebAwesome comme référence générale du projet.
- **Revu après la revue finale (2026-08-14)** : pas de table des termes dupliquée dans la doc —
  décision inversée après un premier essai (`i18n.astro`, corrigé en revue finale puis retiré sur
  demande explicite). La liste exacte vit dans `src/translations/fr.ts`/`en.ts`, groupée par
  composant via des commentaires (`// ar-<nom>`) — éviter une doc qui se désynchronise à chaque
  composant migré plutôt que la dupliquer.

**Tests** :

- Nouveau test vérifiant que `fr` et `en` implémentent tous les termes requis par `Translation`
  (garde-fou explicite en plus du typage statique).
- `table-sort.test.ts`/`datepicker.test.ts` — assertions sur les libellés mises à jour (sortie FR
  inchangée par défaut, vérifiée via le terme plutôt que la constante).
- Au moins un test `lang="en"` sur un composant migré (table-sort ou datepicker), pour valider
  concrètement le changement de langue via l'attribut, pas seulement le fallback FR par défaut.

## Hors scope (ce lot)

- Contribution communautaire de traductions (modèle WebAwesome, PR pour ajouter des langues) —
  issue de suivi séparée, pas dans #80.
- **Lot 2, toujours dans #80, PR dédiée après la livraison de ce lot** — autres composants
  identifiés avec des chaînes FR hardcodées lors de l'audit du 2026-08-14 :
    - `ar-pagination` — "Page précédente/suivante (page X sur Y)", "Page X sur Y" (label + select),
      "Aller à la page", annonce `Page ${current} sur ${total}`.
    - `ar-spinner` — `loading-label`/`done-label` (`DEFAULT_LOADING_LABEL`/`DEFAULT_DONE_LABEL`),
      même pattern que `today-label`/`close-label` sur `ar-datepicker` avant migration — même
      décision de retrait de props à trancher.
    - `ar-stepper` — `"Étapes du formulaire"` hardcodé (label sr-only de la nav,
      `stepper.ts:348`).
    - `ar-charcounter` — prop `label` avec syntaxe de pluriel maison
      (`'caractère restant|caractères restants'`, séparateur `\|`) via un util `pluralize()`
      local (`charcounter.ts:9`) — à réconcilier avec le modèle pluriel-par-fonction de la lib
      (probable retrait de ce mécanisme maison au profit d'un terme fonction, comme fait pour
      `today`/`close` dans ce lot).
    - `ar-progressbar` — audité, **écarté** : le label vient entièrement du slot fourni par le
      consommateur, aucune chaîne FR hardcodée dans le composant.
- **Trouvé lors de la revue finale de branche (2026-08-14), pas de l'audit initial** — chaînes FR
  hardcodées supplémentaires, manquées par le brainstorming original :
    - ~~`ar-datepicker` lui-même (au-delà de `today`/`close`)~~ — **traité dans ce lot**, pas
      reporté en lot 2 : `openCalendar`, `selectDate`, `previousYear`, `previousMonth`,
      `nextMonth`, `nextYear`, `daySelected` ajoutés à `Translation`
      (`packages/core/src/types/translation.ts`) et migrés dans `datepicker.ts`. Le texte du hint
      par défaut (`_rangeText`/`_formatOrdinalDate`, "Format attendu :", plage min/max) reste hors
      scope — déjà couvert par le mécanisme de slot `hint` existant, documenté comme tel.
    - `ar-dialog` — `packages/core/src/components/dialog/dialog.ts` :
      `DEFAULT_DIALOG_LABEL = 'Dialogue'` (ligne 34) et le défaut de la prop `closeLabel = 'Fermer'`
      (ligne 178). À noter : `apps/docs/src/content/components/ar-dialog.mdx` documente encore
      `close-label` comme prop de traduction manuelle par instance — le même anti-pattern retiré
      d'`ar-datepicker` dans ce lot (`today-label`/`close-label`). Décision à trancher en lot 2 :
      retirer la prop `ar-dialog` de la même façon, ou choisir explicitement de la garder et
      documenter pourquoi.
    - `ar-alert` — `packages/core/src/components/alert/alert.ts` :
      `aria-label="Fermer l'alerte"` (ligne 205).
    - `ar-breadcrumb` — `packages/core/src/components/breadcrumb/breadcrumb.ts` :
      `Vous êtes ici` (ligne 219), `Afficher le fil d'ariane` (ligne 228).
