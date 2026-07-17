# Sync auto des `@cssprop` default depuis `default.css`

**Contexte** : item 2 de [#111](https://github.com/jogo-labs/ariane/issues/111). L'item 1 (mutualisation `ToggleController`) est livré ([PR #113](https://github.com/jogo-labs/ariane/pull/113)).

## Problème

Les valeurs par défaut affichées dans les tags `@cssprop [--token=valeur]` (JSDoc des composants) sont dupliquées à la main depuis `packages/core/src/styles/themes/default.css`. Ces deux sources peuvent driver : constaté concrètement pendant la PR #98 (passe style v1), où 4 tokens ajoutés dans `default.css` n'ont pas été répercutés dans le JSDoc correspondant.

Ces valeurs sont réellement consommées par `apps/docs/src/components/ComponentApi.astro` (colonne "Défaut" + swatch couleur via `resolveColor(prop.default, tokenMap)`) — pas question de les supprimer sans remplacement. L'intégration VS Code (`vscode.css-custom-data.json`, généré via `custom-element-vs-code-integration`) n'utilise en revanche jamais ce champ (seulement `name` + `description`) — aucun impact de ce côté.

## Solution retenue

`default.css` devient la seule source de vérité pour les tokens qu'il définit. Le manifest CEM (`packages/core/dist/custom-elements.json`) dérive automatiquement `cssProperties[].default` depuis ce fichier au build, au lieu de le lire tel quel dans le JSDoc.

### 1. Mécanisme de dérivation

Nouvelle étape dans le hook `packageLinkPhase` existant de `packages/core/cem.config.js` (qui fait déjà du post-traitement du manifest complet — résolution de type aliases, extraction d'options d'enum) :

- Lecture unique de `packages/core/src/styles/themes/default.css` (`readFileSync`).
- Extraction de toutes les paires `--ar-xxx: valeur;` via une regex globale appliquée sur le contenu brut du fichier, sans tenir compte du nesting (`@layer ariane.theme { :root { ... } }`) :
    ```js
    const TOKEN_RE = /(--ar[\w-]+)\s*:\s*([^;]+)/g;
    ```
    Ce pattern reprend celui déjà éprouvé de `apps/docs/src/utils/parse-tokens.ts::buildTokenMap` (utilisé côté docs pour construire la table des tokens et résoudre les couleurs). Il est **dupliqué localement** dans `cem.config.js` plutôt qu'importé depuis `apps/docs` — `packages/core` ne doit pas dépendre d'`apps/docs` (mauvais sens de dépendance dans le monorepo).
    - Nettoyage de la valeur capturée : retirer un éventuel commentaire `/* oklch(...) */` en fin de ligne (même logique que `cleanValue()` côté docs), garder le reste tel quel — y compris une référence `var(--autre-token)` non résolue (cf. décision ci-dessous).
- Construction d'une `Map<string, string>` nom de token → valeur nettoyée.
- Pour chaque déclaration du manifest, pour chaque entrée de `cssProperties[]` : si `cssProperties[i].name` existe dans la map, écraser (ou poser si absent) `cssProperties[i].default` avec la valeur trouvée. Si absent de la map, ne pas toucher au champ existant (cas des props hors thème, cf. point 3).

### 2. Résolution des références `var()`

Les tokens qui référencent un autre token (ex. `--ar-pagination-bg: var(--ar-button-tertiary-bg);`) affichent la référence brute `var(--ar-button-tertiary-bg)`, **pas** la valeur finale résolue.

**Pourquoi** : plus simple à implémenter (pas de suivi de chaîne, pas de gestion de boucles/tokens introuvables), et cohérent avec le mécanisme déjà en place côté docs — `resolveColor()`/`tokenMap` dans `ComponentApi.astro` sait déjà résoudre ces références à l'affichage pour générer le swatch couleur.

### 3. Props hors thème (absentes de `default.css`)

Certaines CSS custom properties publiques sont définies directement sur `:host` dans le composant, jamais dans `default.css` (ex. `--ar-dialog-width`, `--ar-dialog-spacing-block`, `--ar-datepicker-panel-width`). Pour celles-ci, le JSDoc reste la seule source de vérité : le mécanisme de dérivation ne les touche pas (elles n'apparaissent pas dans la map extraite de `default.css`), donc leur `@cssprop [--token=valeur]` ou `@cssprop --token` (sans valeur, quand aucun défaut pertinent n'existe) écrit à la main est conservé tel quel.

### 4. Nettoyage du JSDoc existant

Sur les 15 fichiers composants qui portent des `@cssprop` (`alert`, `breadcrumb`, `charcounter`, `collapse`, `datepicker`, `dialog`, `dropdown`, `pagination`, `progressbar`, `spinner`, `stepper`, `tab-group`, `tab`, `table-sort`, `tooltip`) : retirer le `=valeur` de chaque tag `@cssprop` dont le token est présent dans `default.css` (la valeur affichée dans la doc sera désormais dérivée automatiquement au build). Les tags dont le token est hors thème (point 3) gardent leur `=valeur` (ou l'absence de valeur) inchangée.

Exemple (`pagination.ts`) :

```diff
- * @cssprop [--ar-pagination-radius=var(--ar-border-radius-lg)] - Arrondi du conteneur de pagination.
+ * @cssprop --ar-pagination-radius - Arrondi du conteneur de pagination.
```

Ça aligne tous les composants sur la convention déjà utilisée par `datepicker.ts` pour ses props hors thème (aucune valeur affichée dans le JSDoc source).

### 5. Garde-fou anti-régression

Si un `@cssprop` a malgré tout un `=valeur` écrit à la main pour un token qui existe _aussi_ dans `default.css` (cas d'un futur contributeur qui recopierait l'ancienne convention par réflexe), le hook émet un `console.warn` au build — même pattern que l'avertissement déjà existant dans `cem.config.js` pour un `@display` manquant. La valeur dérivée de `default.css` écrase quand même le champ (comportement correct garanti dans tous les cas), le warning sert uniquement à signaler que le `=valeur` manuel est désormais superflu et peut être retiré.

Pas de check CI bloquant : cohérent avec le reste du fichier qui n'utilise que des avertissements non bloquants.

## Hors scope

- Résolution récursive des `var()` jusqu'à une valeur concrète (couleur ou autre) — la référence brute suffit, la résolution finale reste un problème de la couche docs.
- Mécanisme de synchronisation pour les props hors thème — le JSDoc en reste la seule source, pas de nouvelle convention à inventer pour ce cas.
- Nouvelle issue GitHub — ce chantier reste dans le périmètre de [#111](https://github.com/jogo-labs/ariane/issues/111) (item 2), pas de split.

## Vérification attendue

- `npm run build:manifest` régénère `packages/core/dist/custom-elements.json` avec des `cssProperties[].default` identiques à ce qu'ils étaient avant le nettoyage JSDoc, pour tous les tokens présents dans `default.css` — à vérifier composant par composant (ou par un diff du manifest avant/après sur le champ `default`).
- Vérification manuelle de `apps/docs` (page composant, colonne "Défaut" + swatch) sur au moins un composant avec des tokens couleur (ex. `alert` ou `pagination`) pour confirmer que l'affichage ne change pas.
- `tsc --noEmit` + lint clean sur `cem.config.js` et les fichiers composants modifiés.
- Vitest core (pas de composant ne dépend du JSDoc à l'exécution, donc pas de régression de test attendue — à confirmer par une passe complète).
