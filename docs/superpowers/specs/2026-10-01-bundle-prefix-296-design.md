# Préfixe de tags honoré par tous les points d'entrée qui enregistrent (#296)

## Problème

La page `/theming/tag-customization` promet le préfixe pour « autoloader ou bundle complet », et la FAQ dit « avec le CDN ». Le contrat de type (`types/ariane-config.d.ts`) ne parle que des tags « générés par l'autoloader CDN ». Seuls `autoloader.ts` et `whenAllDefined` lisent `window.ARIANE_CONFIG.prefix`.

Les 19 fichiers `components/<x>/index.ts` ont tous le même modèle de 13 lignes : `customElements.define('ar-<x>', Classe)` avec un tag en dur et un garde `customElements.get`. Le barrel `src/index.ts` les importe pour leur effet de bord ; c'est le même graphe que le bundle CDN (`cdn/index.js`, `cdn/index.prod.js`) et que l'entrée npm `.`. Chaque page de composant propose aussi un import CDN par composant (`dist/components/<x>/index.js`), qui passe par ces mêmes fichiers.

Mesuré (Chromium) : avec `window.ARIANE_CONFIG = { prefix: 'x' }` puis `cdn/index.js`, `ar-table-sort` et `ar-alert` sont définis, `x-table-sort` et `x-alert` non ; un `<x-alert>` dans la page reste non défini, sans message. Avec l'autoloader, le même test définit bien les tags préfixés.

Le bundle complet est un mode de première classe (démarrage rapide : « Si vous utilisez beaucoup de composants ou souhaitez éviter les imports dynamiques », et README). Un consommateur qui veut un préfixe et un chargement en une requête n'a aujourd'hui aucune voie CDN : `/headless` demande npm et un bundler.

## Décisions

- **Tout ce qui enregistre honore `ARIANE_CONFIG.prefix`** (option A2) : autoloader (déjà fait), bundle complet, barrel npm, imports par composant. Seul `/headless` laisse nommer chaque tag à la main. Écarté : corriger la doc seule (B), qui laisserait le bundle sans option de préfixe ; honorer le préfixe dans le bundle seulement (A1), qui laisserait les imports par composant, documentés page par page, avec une règle à exceptions.
- **Un seul mécanisme** : `defineComponent(defaultTag, Classe)`, dans `src/internal/define-component.ts` (hors de `src/components/`, dont chaque fichier est publié comme entrée npm). Il enregistre `<préfixe>-<nom>` avec le garde `customElements.get`. `<préfixe>` est `window.ARIANE_CONFIG?.prefix`, à défaut le préfixe du tag par défaut reçu en argument ; `<nom>` est ce qui suit le premier `-` du tag par défaut (`ar-table-sort` → `table-sort`).
- **Le tag par défaut est passé en littéral** (`defineComponent('ar-alert', ArAlert)`) : lisible, trouvable par `grep`, cohérent avec `HTMLElementTagNameMap` et avec `config.componentPrefix` de `create-component.js` (un fork qui génère `ft-…` reste cohérent sans paramètre supplémentaire). Contrainte : le préfixe par défaut ne contient pas de tiret (c'est aujourd'hui `ar`). Le préfixe du consommateur, lui, est utilisé tel quel, avec ou sans tiret (`acme-ui`).
- **Pas de validation du préfixe** : un préfixe invalide fait lever à `customElements.define` une erreur native explicite (nom de custom element invalide). L'autoloader ne valide pas non plus.
- **Le manifeste garde ses tags grâce à `@tagname`** : aujourd'hui `tagName` vient uniquement du littéral `customElements.define('ar-alert', …)` de `index.ts` (l'analyseur en tire un export `custom-element-definition`, puis relie la classe), la classe n'a aucune annotation de tag. Sans littéral, la doc perdrait les 19 tags. L'analyseur lit `@tagname` en JSDoc sur la classe (`class-jsdoc.js`), et une classe avec `tagName` est un custom element. Vérifié sur un cas isolé : `@tagname ar-alert` donne `tagName: "ar-alert"` et `customElement: true` sans aucun export de définition. La doc filtre sur `customElement === true`. Les exports `custom-element-definition` disparaissent des `index.ts` : seul `prune-dangling-custom-element-exports` y fait référence, il devient sans effet (conservé).
- **Pas d'API « préfixe par défaut » pour npm** : c'est la responsabilité du consommateur. Avec `/headless`, un `customElements.define(`${PREFIX}-alert`, ArAlert)` par composant est le contrat de cette entrée. Une fonction `registerAll({ prefix })` référencerait les 19 classes et ferait perdre le tree-shaking (#267 : 201 892 o contre 962 o). Une configuration appelée avant l'import souffre du même problème d'ordre que la variable globale. Le barrel et les imports par composant honorent la variable globale pour les utilisateurs de bundler, à condition qu'elle soit posée dans un module importé **avant** la librairie : un module qui pose la variable dans son corps après `import '@ariane-ui/core'` est évalué trop tard (mesuré en Node : `ar-alert`, contre `acme-alert` quand la configuration est dans un module importé en premier). À documenter avec un exemple.
- **Autoloader et `whenAllDefined` inchangés** : ils lisent déjà la configuration. La lecture `window.ARIANE_CONFIG?.prefix ?? 'ar'` apparaîtra à trois endroits ; la factoriser est possible plus tard, sans objet pour #296.
- **Types** : `HTMLElementTagNameMap` décrit les tags par défaut (`ar-*`). Avec un préfixe personnalisé, le typage des tags n'est pas fourni ; à documenter.
- **#295 non concerné** : le tooltip interne d'`ar-table-sort` reste sous son tag privé.

## Changements

- `packages/core/src/internal/define-component.ts` (+ test) : `defineComponent(defaultTag, Classe)`.
- Les 19 `components/<x>/index.ts` : `customElements.define('ar-<x>', …)` et son garde deviennent `defineComponent('ar-<x>', Classe)` ; `HTMLElementTagNameMap` et les exports restent.
- Les 19 classes (`components/<x>/<x>.ts`) : `@tagname ar-<x>` dans le JSDoc de la classe.
- `packages/core/scripts/create-component.js` : le modèle de classe porte `@tagname <tag>` et le modèle d'`index.ts` appelle `defineComponent('<tag>', Classe)` ; `create-component.test.ts` adapté (4 assertions sur le littéral `customElements.define`).
- `packages/core/src/types/ariane-config.d.ts` : le commentaire du préfixe couvre l'autoloader et les points d'entrée qui enregistrent.
- **Inchangés** : `autoloader.ts`, `whenAllDefined`, `headless.ts`, `src/index.ts`, le thème, `cem.config.js`.

## Tests (TDD)

- `internal/define-component.test.ts` (Vitest) : sans configuration, `ar-alert` ; avec `ARIANE_CONFIG.prefix = 'x'`, `x-alert` ; nom à tirets (`ar-table-sort` → `x-table-sort`) ; préfixe à tiret (`acme-ui` → `acme-ui-alert`) ; idempotent (second appel, tag déjà défini : ni redéfinition ni erreur) ; tag par défaut d'un autre préfixe (`ft-tooltip`, sans configuration → `ft-tooltip`).
- Navigateur (WTR), un fichier par page : la configuration est posée, puis `await import('./index.js')` (barrel) → les 19 tags `x-*` sont définis et aucun `ar-*` ne l'est ; même chose avec l'import d'un seul `components/alert/index.js`.
- Cohérence des quatre sources (Vitest, lecture des fichiers sources) : pour chaque `components/*/index.ts`, le tag passé à `defineComponent`, le `@tagname` de la classe, la clé de `HTMLElementTagNameMap` et la clé de `COMPONENT_DEFS` dans l'autoloader (nom sans préfixe) concordent.
- Manifeste : avant et après, la liste des 19 `tagName` est identique (comparaison au build) ; build de la doc, contrôle de build et tests de la doc verts.
- Non-régression : tests de composants et tests navigateur existants (préfixe par défaut) inchangés.
- Mesure sur les vrais bundles : `cdn/index.js` et l'import par composant avec `ARIANE_CONFIG = { prefix: 'x' }` (répétition du test de #296).

## Documentation

- `/theming/tag-customization` : un récapitulatif par mode de chargement (autoloader, bundle complet, import par composant, barrel npm, `/headless`), avec ce que chacun honore ; pour npm, l'exemple d'ordre d'évaluation (module de configuration importé avant la librairie), `/headless` avec un `define` par composant, `whenAllDefined({ prefix: 'acme-' })`, et la précision sur le typage des tags. La section « Composants qui en embarquent un autre » reste.
- FAQ (`/resources/support`, « Puis-je changer le préfixe `ar-` ? ») : alignée sur la page du préfixe.
- `DEVELOPMENT.md` (conventions des fichiers de composant) : un composant s'enregistre dans son `index.ts` par `defineComponent('ar-<x>', Classe)` et porte `@tagname ar-<x>` sur sa classe.

## Hors périmètre

- Une API de préfixe par défaut pour npm (décision ci-dessus).
- La factorisation de la lecture de `ARIANE_CONFIG` (autoloader, `whenAllDefined`, `defineComponent`).
- Le typage de tags préfixés.

## Non vérifié

- Que `custom-element-vs-code-integration` et la génération des données VS Code (`dist/vscode.html-custom-data.json`) restent identiques : ils s'appuient sur les déclarations avec `tagName`, à confirmer par comparaison avant et après.
- L'ordre d'évaluation avec de vrais bundlers (Vite, webpack) : mesuré avec les modules ES de Node seulement.
- Que le générateur du Kitchen Sink (`read-manifest-components.js`) ne dépende pas des exports `custom-element-definition` (la recherche dans le dépôt ne trouve que `cem.config.js` et le script de nettoyage).
- Un préfixe invalide en pratique (comportement natif, non testé).
