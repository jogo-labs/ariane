# `ar-table-sort` : tooltip interne sous un tag privé (#295)

## Problème

`ar-table-sort` dépend volontairement de `ar-tooltip` : `table-sort.ts:11` fait `import '../tooltip/index.js'` (qui appelle `customElements.define('ar-tooltip')`) et la ligne 173 rend `<ar-tooltip for=…>` en dur. C'est le seul composant qui rend un tag `ar-*` en dur ; les autres imports entre composants (`breadcrumb`, `dropdown`, `stepper`) sont des imports de classes, sans enregistrement.

Mesuré :

| Cas                                                                                                                      | Résultat                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dist/headless.js` bundlé avec esbuild, chargé dans Chromium                                                             | un seul `customElements.define`, celui de `"ar-tooltip"` ; après import, `ar-tooltip` est défini (`ar-table-sort` et `ar-alert` ne le sont pas)                            |
| Même page, puis `customElements.define('acme-tooltip', ArTooltip)`                                                       | **`NotSupportedError`** : `this constructor has already been used with this registry`. Un consommateur headless ne peut pas enregistrer `ArTooltip` sous son propre tag    |
| Autoloader avec `window.ARIANE_CONFIG = { prefix: 'x' }`                                                                 | `x-table-sort` défini, `ar-tooltip` défini aussi (effet de bord), balise rendue `ar-tooltip` et améliorée, `x-tooltip` jamais défini                                       |
| Règles CSS globales `ar-tooltip { … }`, `ar-tooltip::part(tooltip) { … }` et `ar-table-sort ar-tooltip { … }` (Chromium) | s'appliquent au tooltip placé dans la page, **pas** à celui du shadow DOM de `table-sort` ; seule une variable CSS (`--ar-tooltip-bg` posée sur `ar-table-sort`) l'atteint |

Écarts avec ce que la doc promet : l'entrée `/headless` est censée ne rien enregistrer (`headless.ts` : « sans aucun effet de bord d'enregistrement ») et laisser le consommateur choisir ses tags ; le préfixe est censé éviter la collision avec une autre librairie (`/theming/tag-customization`), or `ar-tooltip` est défini et rendu quel que soit le préfixe.

**Principe retenu** : avec un préfixe personnalisé, Ariane ne définit ni ne rend de tag `ar-*` pour son fonctionnement interne, et un composant qui en embarque un autre reste autosuffisant quel que soit le mode de chargement.

## Décisions

- **Garder la composition** : `ar-table-sort` reste composé de `ar-tooltip`. Écarté : extraire la logique du tooltip dans un contrôleur pour que `table-sort` rende sa propre bulle. Cela supprimerait la dépendance mais fermerait la porte aux compositions futures (par exemple un `ar-calendar` autonome intégré dans `ar-datepicker`).
- **Tag interne privé** : `ar-table-sort` rend un élément interne, instance d'une **classe nommée** `ArTooltipInternal extends ArTooltip`, enregistrée sous un nom privé. Une sous-classe est nécessaire : une même classe ne peut pas être enregistrée sous deux noms (`NotSupportedError`). Écarté : créer la classe à la volée (`class extends base {}` dans un utilitaire générique). La console affichait alors `class extends base {}`, et l'analyseur de manifeste ne sait pas masquer une classe créée dans une fonction (il ne lit `@internal` que sur une classe de premier niveau du fichier), ce qui imposait une exclusion dans `cem.config.js`. Une vraie classe est déclarative, commentable et annotable `@internal`. Le tag n'est pas une surface de personnalisation, il est **non contractuel** (il peut changer sans rupture) : les règles CSS du consommateur n'atteignent pas ce tooltip (tableau ci-dessus), seuls les tokens `--ar-tooltip-*` (hérités, définis sur `:root` dans le thème) le stylent, comme la doc de `table-sort` le dit déjà (`relatedTokens`). Un token posé sur l'hôte (`ar-table-sort { --ar-tooltip-bg: … }`) personnalise le tooltip interne d'une instance précise (mesuré).
- **Nom fixe** : `ariane-internal-tooltip`, enregistré avec le garde `if (!customElements.get(tag))`. Le nom ne commence pas par `ar-`, donc il n'entre pas en collision avec une autre librairie qui utiliserait ce préfixe, et il n'est pas capté par `whenAllDefined` avec le préfixe par défaut. Écarté : un nom aléatoire par chargement de module (chaque copie d'Ariane resterait autonome si deux versions coexistent sur la page, mais le nom changerait à chaque fois, ce qui complique tests et débogage). Avec un nom fixe, deux copies sur une même page partagent la première classe enregistrée, comme c'est déjà le cas pour les `ar-*`.
- **Enregistrement au premier usage, pas à l'import** : le composant enregistre son élément interne dans `connectedCallback`, via un utilitaire, avant le premier rendu. Cela préserve le contrat de `/headless` (importer ne définit rien) et l'enregistrement d'un nom privé ne peut pas entrer en conflit avec un tag que le consommateur choisit (pas de `NotSupportedError` dépendant de l'ordre des `define`).
- **Aucune obligation pour le consommateur** : en headless, il n'a rien à enregistrer pour le tooltip interne ; en autoloader, le tag privé est ignoré (`loadComponent` sort quand le tag n'est pas dans sa table). Ariane ne définit plus `ar-tooltip` à son insu : le consommateur peut enregistrer `ArTooltip` sous le tag de son choix.
- **Pas de déduction de préfixe ni de contrainte « un préfixe pour les composés »** : écartées, devenues inutiles. Le tag est une constante, le template n'a pas besoin de `lit/static-html`.
- **`customElements.getName()` non utilisé** : l'API existe (Chrome et Edge 117, Firefox 116, Safari 17, toutes au-dessus de nos planchers ; testée dans Chromium, Firefox et WebKit), mais elle ne retrouve que la classe exacte, pas une sous-classe du consommateur, et faire dépendre le tag rendu de ce qui est défini à la première connexion introduirait une dépendance à l'ordre d'exécution. Utilisable plus tard pour un diagnostic en dev si un besoin apparaît (YAGNI).
- **Parts du tooltip non exportées** : pas d'`exportparts` maintenant. Aucune régression (ces parts sont inatteignables aujourd'hui, mesuré), ajouter des parts exportées plus tard n'est pas une rupture alors que les retirer ou les renommer en est une, et une valeur se définit en token ou en part, jamais les deux (#171). La cohérence entre toutes les instances passe par des **tokens** : une seule déclaration sur `:root` atteint les instances directes et imbriquées, alors qu'une règle `::part()` en demande une par hôte. Le manque identifié (`max-width`, réglable uniquement par `::part(tooltip)`) est traité par un token dédié dans #297 (`--ar-tooltip-max-width`, sur le modèle de `--ar-panel-max-width`), hors de #295.
- **Rien d'exporté publiquement** : ni `ArTooltipInternal` ni `defineInternalTooltip` ne figurent dans `headless.ts`, dans `utils/index.ts` ni dans le manifeste (tous deux `@internal`). Pas d'utilitaire générique : chaque composition future déclare sa propre classe interne, plus verbeux mais plus explicite (un seul cas aujourd'hui).

## Changements

- `packages/core/src/internal/tooltip-internal.ts` (+ test) : `ArTooltipInternal extends ArTooltip` (annotée `@internal`) et `defineInternalTooltip()`, qui enregistre `ariane-internal-tooltip` s'il ne l'est pas, de façon idempotente, sans jamais toucher à `ArTooltip`. Le dossier `src/internal/` est volontairement hors de `src/components/` : `build-bundles.js` fait de chaque fichier `.ts` de `components/` (hors tests et styles) une entrée publiée, importable via `exports["./dist/*"]`, ce que cette classe ne doit pas être. La classe et son `customElements.define` restent dans le même fichier : c'est la condition pour que `@internal` masque la classe et la définition dans le manifeste. Les deux sont masqués ; le module n'apparaît pas dans `custom-elements.json` (aucune exclusion dans `cem.config.js`).
- `packages/core/src/components/table-sort/table-sort.ts` :
    - remplacement de `import '../tooltip/index.js'` par `import { defineInternalTooltip } from '../tooltip/tooltip-internal.js'` (aucun enregistrement à l'import) ;
    - appel de `defineInternalTooltip()` dans `connectedCallback`, avant le premier rendu ;
    - le template rend `<ariane-internal-tooltip for=…>` à la place de `<ar-tooltip for=…>`.
- **Inchangés** : `table-sort/index.ts` (il ne définit que `ar-table-sort`), `headless.ts`, l'autoloader, le bundle complet (le préfixe y est le sujet de #296), le thème (aucune règle ne cible le tooltip interne), `tooltip/index.ts` et le composant `ar-tooltip`.

## Tests (TDD)

- `tooltip-internal.test.ts` : l'import n'enregistre rien ; `ArTooltipInternal` est une sous-classe distincte d'`ArTooltip` ; `defineInternalTooltip()` l'enregistre sous le tag privé (qui ne commence pas par `ar-`) ; idempotent ; `ArTooltip` reste enregistrable sous un autre nom ensuite.
- Navigateur, fichier qui n'importe que `headless.ts` : après import, `customElements.get('ar-tooltip')` est `undefined` et `customElements.define('acme-tooltip', ArTooltip)` ne lève pas.
- Navigateur, headless avec renommage : `ArTableSort` enregistré sous `acme-table-sort`, le tooltip interne est un `ariane-internal-tooltip` amélioré (shadow root), `ar-tooltip` n'est pas défini, et le survol du bouton ouvre bien la bulle (`:popover-open`). Ce test valide le comportement de la sous-classe, que l'étude préalable n'a pas pu mesurer.
- Navigateur : le consommateur peut enregistrer `ArTooltip` sous `acme-tooltip` avant ou après la connexion d'un `table-sort`, sans erreur ; plusieurs `table-sort` n'enregistrent le tag privé qu'une fois.
- Navigateur, autoloader (si les tests existants le permettent) : un `<ar-table-sort>` affiche un tooltip fonctionnel sans que `ar-tooltip` ait été défini.
- Non-régression : tests existants de `table-sort` adaptés au nouveau tag (`querySelector('ar-tooltip')` dans `table-sort.test.ts` et `table-sort.browser.test.ts`, dont le test de graisse de police hérité d'un `<th>`, #168) ; comportement par défaut inchangé.

## Documentation

- `/theming/tag-customization` : une section courte, « Composants qui en embarquent un autre » : certains composants (aujourd'hui `ar-table-sort` avec un tooltip) utilisent un élément interne sous un nom privé ; il n'y a rien à enregistrer, Ariane ne définit pas de tag `ar-*` à votre insu, le préfixe n'est pas concerné, et la personnalisation passe par les tokens (`--ar-tooltip-*`). Pas de contrainte nouvelle sur les noms de tags en mode npm.
- `ar-table-sort.mdx` : reformuler l'entrée `relatedTokens` (« utilise en interne un tooltip, personnalisable via ses tokens `--ar-tooltip-*`, sur `:root` pour toutes les instances ou sur `ar-table-sort` pour une instance »). L'encart existant renvoie déjà vers les tokens de `ar-tooltip` ; ils ne sont pas des `@cssprop` de `table-sort`, dont le `.styles.ts` ne les consomme pas.
- Le tag privé est présenté comme non contractuel dans la section de `/theming/tag-customization`.
- La doc du préfixe sur le bundle complet et la FAQ (« Puis-je changer le préfixe `ar-` ? ») dépendent de #296 et ne sont pas touchées ici.

## Conventions pour les compositions futures

Un composant qui en embarque un autre (par exemple un `ar-calendar` autonome dans `ar-datepicker`) suit les mêmes règles, sans rupture :

1. Les tokens de l'enfant sont valorisés sur `:root` dans le thème, jamais derrière un sélecteur de tag (un sélecteur de tag ne traverse pas la frontière shadow du parent). État du thème fourni : les 14 fichiers `themes/ariane/components/_*.css` ont chacun un bloc `:root`, et `_tooltip.css` n'a aucun sélecteur de tag.
2. L'élément enfant est une classe nommée `Ar<X>Internal extends Ar<X>`, annotée `@internal`, placée dans `src/internal/` (jamais dans `src/components/`, dont chaque fichier est publié), déclarée dans le même fichier que sa fonction d'enregistrement (`define<X>Internal()`, idempotente), appelée au premier usage (`connectedCallback`), jamais à l'import. Le tag privé ne commence pas par `ar-`.
3. Avant d'instancier un enfant dans le shadow DOM du parent, regarder s'il peut être slotté (principe de #171).
4. Si le consommateur doit pouvoir styler l'intérieur par règle CSS, exporter les parts **explicitement**, avec `exportparts` (par exemple `exportparts="day:calendar-day"`), des noms préfixés pour éviter les collisions avec les parts du parent, et un `@csspart` documenté. Vérifié dans Chromium, Firefox et WebKit : le relais par `exportparts` fonctionne, `::part(a)::part(b)` ne fonctionne pas, et `::part(b)` sans export n'atteint rien. Ces noms sont publics : ils sont décidés au cas par cas, à la demande, jamais par précaution.
5. Documenter les tokens de l'enfant sur la page du parent (`relatedTokens`).

Ce qui est public (donc une rupture si modifié) : tags `ar-*`, attributs, propriétés, événements, slots, tokens, noms de parts, y compris exportées. Ce qui ne l'est pas : le nom du tag privé, la structure interne, le fait qu'un composant en embarque un autre.

## Hors périmètre

- #296 : le bundle complet ignore `ARIANE_CONFIG.prefix`.
- #297 : token `--ar-tooltip-max-width` (parité de personnalisation de `max-width` sur toutes les instances du tooltip).
- #262 (tag JSDoc `@dependency`) : à reconsidérer. L'élément interne n'est plus une dépendance que le consommateur doit connaître ni enregistrer ; la doc écrite à la main couvre le cas.

## Non vérifié

- Que la bulle de la sous-classe s'ouvre au survol dans un vrai `table-sort` (le banc d'essai préalable n'était pas concluant, son témoin `<ar-tooltip>` échouait aussi) : couvert par un test navigateur ci-dessus.
- Le comportement des sélecteurs CSS face au shadow DOM dans Firefox et WebKit (mesuré dans Chromium seulement ; c'est le comportement standard de la spécification).
- Un consommateur qui s'appuierait sur l'enregistrement implicite de `ar-tooltip` par `table-sort` (par exemple en important `…/table-sort/index.js` seul puis en utilisant `<ar-tooltip>` dans son HTML) : non documenté, il devrait désormais importer le tooltip lui-même. À signaler dans le changelog.
- La visibilité du tag privé dans les outils de développement (l'inspecteur montrera `ariane-internal-tooltip`).
