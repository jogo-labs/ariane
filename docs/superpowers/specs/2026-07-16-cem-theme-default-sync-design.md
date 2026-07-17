# Validation `@cssprop` default vs `default.css`

**Contexte** : item 2 de [#111](https://github.com/jogo-labs/ariane/issues/111). L'item 1 (mutualisation `ToggleController`) est livré ([PR #113](https://github.com/jogo-labs/ariane/pull/113)).

## Problème

Les valeurs par défaut affichées dans les tags `@cssprop [--token=valeur]` (JSDoc des composants) sont dupliquées à la main depuis `packages/core/src/styles/themes/default.css`. Ces deux sources peuvent driver : constaté concrètement pendant la PR #98 (passe style v1), où 4 tokens ajoutés dans `default.css` n'ont pas été répercutés dans le JSDoc correspondant.

Ces valeurs sont réellement consommées par `apps/docs/src/components/ComponentApi.astro` (colonne "Défaut" + swatch couleur via `resolveColor(prop.default, tokenMap)`) — pas question de les supprimer. L'intégration VS Code (`vscode.css-custom-data.json`) n'utilise en revanche jamais ce champ (seulement `name` + `description`) — aucun impact de ce côté.

## Solution retenue

**Révision post-discussion** : la première version de ce spec proposait de faire de `default.css` la source de vérité et de dériver automatiquement `cssProperties[].default` au build, en retirant le `=valeur` du JSDoc. Après recherche, ce n'est pas la convention observée dans l'écosystème `custom-elements-manifest` — Shoelace et la doc officielle de l'analyzer documentent `@cssprop [--nom=valeur] - description` entièrement à la main, **dans un seul et même endroit** (le JSDoc du composant), sans dérivation automatique depuis un fichier de thème séparé. Éclater description (JSDoc) et valeur (`default.css`) entre deux fichiers casserait cette convention et introduirait une friction contributeur (« où est-ce que je documente quoi ? ») sans bénéfice suffisant.

**Approche retenue** : garder la convention standard telle quelle — `@cssprop [--nom=valeur] - description` reste entièrement à la main dans le JSDoc, `default.css` reste la définition CSS réelle. On ajoute uniquement une **validation** qui compare les deux et fait échouer le build en cas de désaccord, sans rien déplacer ni générer.

### 1. Mécanisme de validation

Nouvelle étape dans le hook `packageLinkPhase` existant de `packages/core/cem.config.js` (qui fait déjà du post-traitement du manifest complet — résolution de type aliases, extraction d'options d'enum), exécutée après la résolution des type aliases :

- Lecture unique de `packages/core/src/styles/themes/default.css` (`readFileSync`).
- Extraction de toutes les paires `--ar-xxx: valeur;` via une regex globale appliquée sur le contenu brut du fichier, sans tenir compte du nesting (`@layer ariane.theme { :root { ... } }`) :
    ```js
    const TOKEN_RE = /(--ar[\w-]+)\s*:\s*([^;]+)/g;
    ```
    Ce pattern reprend celui déjà éprouvé de `apps/docs/src/utils/parse-tokens.ts::buildTokenMap` (utilisé côté docs pour construire la table des tokens et résoudre les couleurs). Il est **dupliqué localement** dans `cem.config.js` plutôt qu'importé depuis `apps/docs` — `packages/core` ne doit pas dépendre d'`apps/docs` (mauvais sens de dépendance dans le monorepo).
    - Nettoyage de la valeur capturée : retirer un éventuel commentaire `/* oklch(...) */` en fin de ligne (même logique que `cleanValue()` côté docs), garder le reste tel quel — y compris une référence `var(--autre-token)` non résolue (cf. point 2).
- Construction d'une `Map<string, string>` nom de token → valeur nettoyée.
- Pour chaque déclaration du manifest, pour chaque entrée de `cssProperties[]` qui a un `default` renseigné (donc un `=valeur` écrit dans le JSDoc) : si le nom du token existe dans la map, comparer la valeur du manifest à la valeur trouvée dans `default.css`. En cas de désaccord, accumuler une erreur (nom du composant, nom du token, valeur JSDoc, valeur `default.css`).
- À la fin du parcours de toutes les déclarations, si la liste d'erreurs n'est pas vide, `throw new Error(...)` avec le détail de chaque désaccord — fait échouer `cem analyze` et donc `npm run build:manifest`.

**Pourquoi un throw et pas un `console.warn`** (contrairement au warning existant pour `@display` manquant) : `npm run build:manifest` est une dépendance de `npm run build` dans `turbo.json`, lui-même exécuté en CI sur `packages/core` (`.github/workflows/*.yml`) — un throw y bloque effectivement la CI et empêche le merge d'un token désynchronisé. Un simple warning se perd dans la sortie de build et ne préviendrait pas la régression qu'on cherche à éliminer.

### 2. Pas de résolution des références `var()`

La comparaison se fait sur la valeur brute des deux côtés : si `default.css` définit `--ar-pagination-bg: var(--ar-button-tertiary-bg);`, le JSDoc doit écrire `@cssprop [--ar-pagination-bg=var(--ar-button-tertiary-bg)]` (déjà le cas aujourd'hui). Pas de suivi de chaîne jusqu'à une valeur finale — une comparaison de chaînes après nettoyage suffit, et reste cohérente avec la façon dont `pagination.ts`/`dialog.ts` écrivent déjà leurs `@cssprop` aujourd'hui.

### 3. Props hors thème (absentes de `default.css`)

Certaines CSS custom properties publiques sont définies directement sur `:host` dans le composant, jamais dans `default.css` (ex. `--ar-dialog-width`, `--ar-dialog-spacing-block`, `--ar-datepicker-panel-width`). Pour celles-ci, le token n'existe pas dans la map extraite de `default.css` : la validation ne fait donc rien, `=valeur` (ou son absence) dans le JSDoc reste la seule information disponible, sans vérification possible — inchangé par rapport à aujourd'hui.

### 4. Aucun nettoyage de JSDoc

Contrairement à la version précédente de ce spec, **aucun fichier composant n'est modifié** par ce chantier : les `@cssprop [--nom=valeur] - description` existants restent tels quels dans les 15 fichiers concernés. Le chantier consiste uniquement à ajouter la validation ; les éventuels désaccords qu'elle révèle (s'il y en a, au-delà des 4 déjà corrigés lors de la PR #98) seront corrigés au fil de l'eau quand la validation échouera dessus.

## Hors scope

- Dérivation/génération automatique de `cssProperties[].default` — abandonnée, cf. section "Solution retenue".
- Résolution récursive des `var()` jusqu'à une valeur concrète — la comparaison en chaîne brute suffit.
- Mécanisme de validation pour les props hors thème — pas de source externe à comparer, rien à valider.
- Nouvelle issue GitHub — ce chantier reste dans le périmètre de [#111](https://github.com/jogo-labs/ariane/issues/111) (item 2), pas de split.

## Vérification attendue

- `npm run build:manifest` (`packages/core`) passe sans erreur sur l'état actuel du repo — confirme qu'il n'y a pas de désaccord existant non détecté jusqu'ici (au-delà des 4 déjà corrigés en PR #98).
- Test délibéré de la détection : désynchroniser temporairement un `@cssprop` (ou une valeur `default.css`) dans une branche de test, vérifier que `npm run build:manifest` échoue avec un message clair (composant, token, les deux valeurs en désaccord), puis annuler le changement.
- `tsc --noEmit` + lint clean sur `cem.config.js`.
- `npm run build` (racine) reste vert en CI, confirmant que la validation s'intègre bien dans le pipeline existant sans casser `build:bundles`/`build:types`/`build:css` qui en dépendent (`turbo.json`).
