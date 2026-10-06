# Thème de la documentation et démos neutres (#304, #307)

**Date :** 2026-10-06
**Statut :** Spec à valider
**Issues :** #304 (starter-kit base de thème documentée), #307 (relecture README et `DEVELOPMENT.md`). #306 (articulation `ariane.css` / Kitchen Sink) est tranchée par ce document. #305 (entrées CDN des utilitaires) reste séparée.

## Contexte et décisions

- `ariane.css` est le thème **de la documentation**. Il reste complet (14 composants) dans le paquet. Il n'est plus présenté comme la base recommandée aux utilisateurs. Qui l'aime peut le récupérer, sans engagement de notre part.
- Le **starter-kit** (PR #258, dépôt `jogo-labs/ariane-starter-kit`) est la base de thème documentée : un thème neutre, copié depuis `ariane.css` (palette, échelle de rayons, texte du bouton primaire neutralisés), à copier et personnaliser.
- Les **démos de la documentation** doivent montrer le thème que l'utilisateur copiera, donc le starter, pas `ariane.css`. Le chrome de la doc (menu de thème, onglets de `ComponentApi`, alertes, tooltips, dialog de recherche) reste en `ariane.css`.
- Deux thèmes ne se chargent pas proprement dans une même page : tokens sur `:root`, couche `ariane.theme` commune, règles de composants globales. Le dernier chargé l'emporte propriété par propriété.
- Écartés : générer `ariane.css` à partir du starter (complexité, dérive), qualifier `ariane.css` par une classe (transformation d'`ariane.css`, casse l'export `ariane.js`), `@scope` (récent), iframe par démo, shadow root par démo (tokens à réécrire en `:host`), styliser tout le chrome par le CSS de la doc (plan B si le mécanisme retenu échoue).

## Mécanisme retenu : le starter imbriqué sous `.doc-demo`

Un conteneur existant de chaque démo reçoit la classe `doc-demo`. Une feuille générée au build du site contient le thème du starter imbriqué sous `.doc-demo`. `ariane.css` n'est pas modifié et reste le thème global.

Transformation, sur le CSS déjà bundlé du starter :

1. Envelopper tout le texte : `.doc-demo { … }`.
2. Remplacer `:root` par `&` (un `:root` imbriqué est invalide).
3. Aplatir avec Lightning CSS, cible Chrome 125 (plancher du projet). Une cible plus basse convertit `oklch` en `lab` : même couleur, mais cela fausse les comparaisons.

Pourquoi ça marche, vérifié par un spike jetable (Chromium, clair et sombre, 106 nœuds, shadow DOM inclus, 21 propriétés calculées) :

- Dans `.doc-demo`, les styles calculés sont identiques à ceux du starter seul : 0 écart.
- Hors conteneur, ils sont identiques à `ariane.css` seul : 0 écart. Aucune fuite.
- Une règle imbriquée `.doc-demo ar-x` a une priorité supérieure d'une classe à la règle globale `ar-x`, dans la même couche. Le thème ne contient aucun `!important`.
- Les tokens du conteneur remplacent les tokens hérités. Les tokens posés sur un tag sont remplacés par les mêmes sélecteurs côté starter : le starter doit donc définir tout ce que définit `ariane.css` (vrai par construction, vérifié par un test, voir plus bas).
- Le mode sombre ne pose pas de difficulté : les tokens utilisent `light-dark()` piloté par `color-scheme`, qui s'hérite.
- Dropdown et dialog (couche supérieure) restent descendants du conteneur dans l'arbre DOM : ils sont couverts. Alert, tab-group, bouton avec preset `.ar-btn` aussi.

## Périmètre

### 1. Feuille générée des démos

- Fonction `buildDocDemoTheme(srcThemesDir)` dans `scripts/starter-kit/` : `syncStarterTheme` vers un répertoire temporaire, bundle esbuild de `ariane-starter.css`, puis les trois étapes ci-dessus. Tests unitaires (motifs `:root`, `:root[data-theme]`, `@layer`, imbrication, cible Chrome 125).
- Servie sous `/themes/doc-demo.css` : à la volée en développement (invalidation sur la date de modification des sources), écrite par `generateBundle` au build, via le plugin déjà présent dans `apps/docs/astro.config.mjs`. Pas de fichier versionné.
- `lightningcss` devient une dépendance directe de développement. Il n'est aujourd'hui que transitif (`minify-literals`).
- Chargée dans `Layout.astro` et `HomeLayout.astro` après `ariane.css`.

### 2. Marquage des démos

- Pages composant : `div.preview` de `Playground.astro` (deux occurrences).
- Page d'accueil : `div.try-preview-stage` (trois occurrences). Les onglets `try-tabs` restent hors du conteneur, stylés individuellement. Les démos qu'ils contiennent (dropdown, dialog) passent au thème du starter : le rendu de la page d'accueil change, c'est voulu.
- Démos vivantes dans la prose des pages getting-started (`utilisation`, `frameworks`, `traductions`) : un conteneur existant, ou un wrapper minimal si aucun n'existe. À inventorier au plan.

### 3. Tests et contrôles

- Test unitaire : tout sélecteur de règle de composant présent dans `ariane.css` bundlé a son équivalent dans le starter (garde-fou de « starter ⊇ ariane »).
- Test Playwright de non-régression dans `apps/docs/tests`, reprenant le spike : composants dans et hors `.doc-demo`, clair et sombre, styles calculés comparés au starter seul et à `ariane.css` seul.
- `apps/docs/scripts/check-build.js` : la feuille `/themes/doc-demo.css` existe et contient `.doc-demo`.

### 4. Script JavaScript pour le consommateur

Le thème JavaScript (`CSSStyleSheet` à adopter dans un shadow DOM applicatif) n'est pas livré pour le starter. Le consommateur personnalise son thème, puis le génère : le script est un outil, pas un artefact.

- Script écrit et testé dans ce dépôt (`scripts/starter-kit/`), copié dans le dépôt du starter-kit par `generate-starter-demo`, avec un `package.json` minimal et une commande npm.
- Entrée : un fichier CSS de thème (liste d'`@import` incluse). Sortie : un module exportant un `CSSStyleSheet` (nom configurable).
- Découpage par parseur CSS (Lightning CSS) : on retire les règles `:root` et `[data-theme]`, car les tokens traversent déjà le shadow DOM par héritage. Pas d'ancre en commentaire : le thème d'un utilisateur n'en a pas. Les règles restent dans la couche `ariane.theme`, comme le fait aujourd'hui `ariane.js`.
- L'export `arianeTheme` de `ariane.js` n'est pas modifié dans cette spec. Il n'est plus documenté pour les consommateurs. Son retrait éventuel est une issue séparée.

### 5. Documentation, README et skill (#304, #307)

- `README.md` et `packages/core/README.md` : le quickstart ne charge plus `ariane.css` ; il explique comment obtenir un thème (copier le starter-kit, ou écrire le sien). Compléter : états personnalisés en personnalisation, architecture à jour.
- `DEVELOPMENT.md` : liste des commandes npm vérifiée contre les `package.json`. Ajouter la nouvelle commande.
- Vérifications factuelles : l'import individuel `dist/components/alert/alert.js` (README) enregistre-t-il le tag, alors que la skill cite `index.js` ; la phrase « label seul : texte vocalisé » d'`ar-breadcrumb.mdx` ligne 58.
- Site de doc :
    - Page d'accueil : le commentaire d'import du snippet `codeInstall` dit d'où vient le thème (thème de la documentation) et renvoie au starter-kit pour le sien.
    - `theming/appliquer-un-theme` : le Kitchen Sink est présenté comme point de départ ; `ariane.css` comme thème de la documentation ; le lien de téléchargement mène au dépôt du starter-kit, dans un nouvel onglet (`target="_blank"`, `rel="noopener"`) ; la section « Créer un thème » est mise à jour avec les états personnalisés (`:state()`, parts d'état).
    - `theming/shadow-dom` : réécrite autour du script du starter ; `arianeTheme` n'y apparaît plus comme recette.
    - `ar-alert.mdx` : reformuler « presets fournis par `ariane.css` ».
- Skill (`content/`) : `theming.md`, `installation.md` et `SKILL.md` renvoient au starter-kit ; `ariane.css` n'y est plus recommandé ; la structure de fragments décrite est celle du starter (même arbre). `check:skill` doit continuer de passer.
- Limite connue à documenter : pas de feuille de thème versionnée par unpkg ; l'utilisateur CDN copie les fichiers depuis GitHub.

## Hors périmètre

- Déplacer `ariane.css` hors du paquet, ou retirer `ariane.js` : issues séparées si besoin.
- Corriger le README du dépôt starter-kit (il cite encore `autoloader.prod.js`, URL d'avant #300) : autre dépôt, sur accord explicite avant de pousser.
- Entrées CDN `utils` : #305.
- Marquer le chrome de la doc par une classe de thème : non retenu.

## Risques et inconnues

- Le spike a couvert Chromium seulement. À vérifier au plan : Firefox et WebKit (les tests de la doc tournent-ils sur les trois ?).
- Non couverts par le spike : `::backdrop` du dialog, `ar-datepicker`, interaction avec le CSS non couché de la doc, tooltip (identique dans les deux thèmes avec les propriétés mesurées, donc non discriminant).
- Un composant qui déplacerait des nœuds hors du conteneur (portail) casserait le scoping. Aucun cas connu ; dropdown et dialog n'en font pas.
- La page d'accueil change d'aspect pour les démos du dropdown et du dialog.
- Contrainte à maintenir : le starter doit rester synchronisé avec `ariane.css` à chaque release (déjà vrai pour le Kitchen Sink).

## Ordre d'exécution envisagé

1. Feuille générée, tests, marquage des démos (le gros de la valeur, vérifiable visuellement).
2. Script JavaScript du starter et sa copie dans le dépôt du starter-kit.
3. Documentation, README, `DEVELOPMENT.md`, skill (#304, #307).

Une PR par groupe, ou une seule PR en commits séparés si la revue le permet : à trancher au plan.
