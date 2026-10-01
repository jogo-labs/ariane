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
- **Tag interne privé** : `ar-table-sort` rend un élément interne, instance d'une **sous-classe** de `ArTooltip` enregistrée sous un nom privé. Une sous-classe est nécessaire : une même classe ne peut pas être enregistrée sous deux noms (`NotSupportedError`). Le tag n'est pas une surface de personnalisation : les règles CSS du consommateur n'atteignent pas ce tooltip (tableau ci-dessus), seuls les tokens `--ar-tooltip-*` (hérités, définis sur `:root` dans le thème) le stylent, comme la doc de `table-sort` le dit déjà (`relatedTokens`).
- **Nom fixe** : `ariane-internal-tooltip`, enregistré avec le garde `if (!customElements.get(tag))`. Le nom ne commence pas par `ar-`, donc il n'entre pas en collision avec une autre librairie qui utiliserait ce préfixe, et il n'est pas capté par `whenAllDefined` avec le préfixe par défaut. Écarté : un nom aléatoire par chargement de module (chaque copie d'Ariane resterait autonome si deux versions coexistent sur la page, mais le nom changerait à chaque fois, ce qui complique tests et débogage). Avec un nom fixe, deux copies sur une même page partagent la première classe enregistrée, comme c'est déjà le cas pour les `ar-*`.
- **Enregistrement au premier usage, pas à l'import** : le composant enregistre son élément interne dans `connectedCallback`, via un utilitaire, avant le premier rendu. Cela préserve le contrat de `/headless` (importer ne définit rien) et l'enregistrement d'un nom privé ne peut pas entrer en conflit avec un tag que le consommateur choisit (pas de `NotSupportedError` dépendant de l'ordre des `define`).
- **Aucune obligation pour le consommateur** : en headless, il n'a rien à enregistrer pour le tooltip interne ; en autoloader, le tag privé est ignoré (`loadComponent` sort quand le tag n'est pas dans sa table). Ariane ne définit plus `ar-tooltip` à son insu : le consommateur peut enregistrer `ArTooltip` sous le tag de son choix.
- **Pas de déduction de préfixe ni de contrainte « un préfixe pour les composés »** : écartées, devenues inutiles. Le tag est une constante, le template n'a pas besoin de `lit/static-html`.
- **`customElements.getName()` non utilisé** : l'API existe (Chrome et Edge 117, Firefox 116, Safari 17, toutes au-dessus de nos planchers ; testée dans Chromium, Firefox et WebKit), mais elle ne retrouve que la classe exacte, pas une sous-classe du consommateur, et faire dépendre le tag rendu de ce qui est défini à la première connexion introduirait une dépendance à l'ordre d'exécution. Utilisable plus tard pour un diagnostic en dev si un besoin apparaît (YAGNI).
- **Utilitaire non exporté publiquement** : `utils/index.ts` garde ses deux exports (`whenAllDefined`, `registerTranslation`). L'utilitaire servira de référence pour les compositions futures et pourra être exposé quand un second cas l'exigera.

## Changements

- `packages/core/src/utils/internal-element.ts` (+ test) : `defineInternalElement(tag, BaseClass)` crée `class extends BaseClass {}` et l'enregistre sous `tag` s'il ne l'est pas, de façon idempotente, sans jamais toucher à `BaseClass`.
- `packages/core/src/components/table-sort/table-sort.ts` :
    - remplacement de `import '../tooltip/index.js'` par `import { ArTooltip } from '../tooltip/tooltip.js'` (classe seule, sans enregistrement) ;
    - appel de `defineInternalElement('ariane-internal-tooltip', ArTooltip)` dans `connectedCallback`, avant le premier rendu ;
    - le template rend `<ariane-internal-tooltip for=…>` à la place de `<ar-tooltip for=…>`.
- **Inchangés** : `table-sort/index.ts` (il ne définit que `ar-table-sort`), `headless.ts`, l'autoloader, le bundle complet (le préfixe y est le sujet de #296), le thème (aucune règle ne cible le tooltip interne), `tooltip/index.ts` et le composant `ar-tooltip`.

## Tests (TDD)

- `internal-element.test.ts` : définit une sous-classe sous le tag donné, idempotent (un second appel n'enregistre rien et ne lève pas), la classe de base reste enregistrable sous un autre nom ensuite, l'instance est un `instanceof BaseClass`.
- Navigateur, fichier qui n'importe que `headless.ts` : après import, `customElements.get('ar-tooltip')` est `undefined` et `customElements.define('acme-tooltip', ArTooltip)` ne lève pas.
- Navigateur, headless avec renommage : `ArTableSort` enregistré sous `acme-table-sort`, le tooltip interne est un `ariane-internal-tooltip` amélioré (shadow root), `ar-tooltip` n'est pas défini, et le survol du bouton ouvre bien la bulle (`:popover-open`). Ce test valide le comportement de la sous-classe, que l'étude préalable n'a pas pu mesurer.
- Navigateur : le consommateur peut enregistrer `ArTooltip` sous `acme-tooltip` avant ou après la connexion d'un `table-sort`, sans erreur ; plusieurs `table-sort` n'enregistrent le tag privé qu'une fois.
- Navigateur, autoloader (si les tests existants le permettent) : un `<ar-table-sort>` affiche un tooltip fonctionnel sans que `ar-tooltip` ait été défini.
- Non-régression : tests existants de `table-sort` adaptés au nouveau tag (`querySelector('ar-tooltip')` dans `table-sort.test.ts` et `table-sort.browser.test.ts`, dont le test de graisse de police hérité d'un `<th>`, #168) ; comportement par défaut inchangé.

## Documentation

- `/theming/tag-customization` : une section courte, « Composants qui en embarquent un autre » : certains composants (aujourd'hui `ar-table-sort` avec un tooltip) utilisent un élément interne sous un nom privé ; il n'y a rien à enregistrer, Ariane ne définit pas de tag `ar-*` à votre insu, le préfixe n'est pas concerné, et la personnalisation passe par les tokens (`--ar-tooltip-*`). Pas de contrainte nouvelle sur les noms de tags en mode npm.
- `ar-table-sort.mdx` : reformuler l'entrée `relatedTokens` (« utilise en interne un tooltip, personnalisable via ses tokens `--ar-tooltip-*` »).
- La doc du préfixe sur le bundle complet et la FAQ (« Puis-je changer le préfixe `ar-` ? ») dépendent de #296 et ne sont pas touchées ici.

## Hors périmètre

- #296 : le bundle complet ignore `ARIANE_CONFIG.prefix`.
- #262 (tag JSDoc `@dependency`) : à reconsidérer. L'élément interne n'est plus une dépendance que le consommateur doit connaître ni enregistrer ; la doc écrite à la main couvre le cas.

## Non vérifié

- Que la bulle de la sous-classe s'ouvre au survol dans un vrai `table-sort` (le banc d'essai préalable n'était pas concluant, son témoin `<ar-tooltip>` échouait aussi) : couvert par un test navigateur ci-dessus.
- Le comportement des sélecteurs CSS face au shadow DOM dans Firefox et WebKit (mesuré dans Chromium seulement ; c'est le comportement standard de la spécification).
- Un consommateur qui s'appuierait sur l'enregistrement implicite de `ar-tooltip` par `table-sort` (par exemple en important `…/table-sort/index.js` seul puis en utilisant `<ar-tooltip>` dans son HTML) : non documenté, il devrait désormais importer le tooltip lui-même. À signaler dans le changelog.
- La visibilité du tag privé dans les outils de développement (l'inspecteur montrera `ariane-internal-tooltip`).
