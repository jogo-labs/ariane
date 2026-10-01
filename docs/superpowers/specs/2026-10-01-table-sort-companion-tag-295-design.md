# `ar-table-sort` : tag du tooltip déduit du préfixe (#295)

## Problème

`ar-table-sort` dépend volontairement de `ar-tooltip` : `table-sort.ts:11` fait `import '../tooltip/index.js'` (qui appelle `customElements.define('ar-tooltip')`) et la ligne 173 rend `<ar-tooltip for=…>` en dur. C'est le seul composant qui rend un tag `ar-*` en dur ; les autres imports entre composants (`breadcrumb`, `dropdown`, `stepper`) sont des imports de classes, sans enregistrement.

Mesuré :

| Cas                                                          | Résultat                                                                                                                                        |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `dist/headless.js` bundlé avec esbuild, chargé dans Chromium | un seul `customElements.define`, celui de `"ar-tooltip"` ; après import, `ar-tooltip` est défini (`ar-table-sort` et `ar-alert` ne le sont pas) |
| Autoloader avec `window.ARIANE_CONFIG = { prefix: 'x' }`     | `x-table-sort` défini, `ar-tooltip` défini aussi (effet de bord), balise rendue `ar-tooltip` et améliorée, `x-tooltip` jamais défini            |

Deux écarts avec ce que la doc promet : l'entrée `/headless` est censée ne rien enregistrer (`headless.ts` : « sans aucun effet de bord d'enregistrement »), et le préfixe est censé éviter la collision avec une autre librairie (`/theming/tag-customization`), or `ar-tooltip` est défini et rendu quel que soit le préfixe.

**Principe retenu** : avec un préfixe personnalisé, Ariane ne définit ni ne rend de tag `ar-*`.

## Décisions

- **Garder la composition** : `ar-table-sort` reste composé de `ar-tooltip`. Écarté : extraire la logique du tooltip dans un contrôleur pour que `table-sort` rende sa propre bulle. Cela supprimerait la dépendance mais fermerait la porte aux compositions futures (par exemple un `ar-calendar` autonome intégré dans `ar-datepicker`).
- **Un seul préfixe pour les composants composés** : un composant qui en embarque un autre attend son compagnon sous le même préfixe que lui. Les autres composants gardent des noms libres en mode npm. La doc actuelle (« renommer chaque composant individuellement ») est à préciser, pas à retirer.
- **Résolution du tag du compagnon** (utilitaire interne) :
    1. Si le tag de l'hôte se termine par `-table-sort`, on retire ce suffixe (exact, y compris pour un préfixe à plusieurs segments comme `acme-ui`).
    2. Sinon, on prend la partie avant le premier `-` (composant renommé avec un préfixe simple).
    3. Pas de repli sur `ar` : un nom de custom element contient toujours un tiret, donc la règle 2 répond toujours. Une déduction fausse se voit par l'avertissement « compagnon non défini » (qui indique le tag attendu).
- **Entrée `/headless` (option i)** : plus aucun enregistrement. Le consommateur définit `ArTableSort` et `ArTooltip` sous le même préfixe. Écarté : que `table-sort` enregistre le compagnon lui-même au premier usage (`customElements.define` est global et irréversible : si le consommateur définit ensuite le même nom, le second `define` lève `NotSupportedError`, d'où une dépendance à l'ordre des `define`).
- **Compagnon absent** : il est masqué tant qu'il n'est pas défini (règle `:not(:defined)` sur un attribut de marquage, le tag étant dynamique), pour éviter que le libellé s'affiche en clair. Un `warn` unique en dev, après un délai, indique le tag attendu. Le délai est nécessaire : l'autoloader charge le tooltip de façon asynchrone, un test immédiat donnerait de faux avertissements.
- **Utilitaire non exporté publiquement** (YAGNI) : `utils/index.ts` garde ses deux exports (`whenAllDefined`, `registerTranslation`). Il sert de référence pour les compositions futures et pourra être exposé quand un second cas l'exigera.

## Changements

- `packages/core/src/utils/companion-tag.ts` (+ test) : `resolveCompanionTag(hostTag, ownName, companionName)`, fonction pure.
- `packages/core/src/components/table-sort/table-sort.ts` :
    - suppression de `import '../tooltip/index.js'` ;
    - rendu du tooltip avec le tag résolu, via `html` et `unsafeStatic` de `lit/static-html.js`, après validation du nom (`/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/`) ;
    - attribut de marquage sur le compagnon ;
    - `warn` unique en dev si le compagnon n'est pas défini après le délai (minuterie nettoyée à la déconnexion).
- `packages/core/src/components/table-sort/table-sort.styles.ts` : `[data-companion]:not(:defined) { display: none }` (nom de l'attribut à confirmer à l'implémentation).
- `packages/core/src/components/table-sort/index.ts` : ajout de `import '../tooltip/index.js'`. Le fichier qui enregistre `ar-table-sort` enregistre aussi `ar-tooltip`, ce qui préserve les consommateurs qui importent `…/table-sort/index.js` seul (sans cela, ils perdraient l'enregistrement qui venait de l'import supprimé).
- **Inchangés** : le bundle complet (`ar-*` en dur, le préfixe y est le sujet de #296) ; l'autoloader (il observe déjà les shadow roots et charge `<préfixe>-tooltip` à partir de sa table) ; `headless.ts`.

## Tests (TDD)

- `companion-tag.test.ts` : `acme-table-sort` → `acme-tooltip` ; `acme-ui-table-sort` → `acme-ui-tooltip` ; `ar-table-sort` → `ar-tooltip` ; `acme-sort` → `acme-tooltip` (règle 2) ; `my-ds-sort` → `my-tooltip` (limite documentée de la règle 2).
- Mesure du bundle `/headless` (même approche que `utils/index.test.ts`, #267) : aucun `customElements.define` dans le graphe.
- Navigateur, headless avec préfixe `x` : `x-table-sort` et `x-tooltip` définis par le test, le tag rendu est `x-tooltip` et il est amélioré (shadow root).
- Navigateur, autoloader avec préfixe `x` : `x-tooltip` est défini, `ar-tooltip` ne l'est pas.
- Navigateur : compagnon non défini → masqué (`display: none`), avertissement après le délai ; compagnon défini → pas d'avertissement.
- Navigateur : importer `…/table-sort/index.js` seul définit `ar-table-sort` et `ar-tooltip`.
- Non-régression : comportement par défaut inchangé, tests existants de `table-sort` verts (dont `querySelector('ar-tooltip')` avec le préfixe par défaut et le test de graisse de police hérité d'un `<th>`, #168).

## Documentation

- `/theming/tag-customization` : quels modes de chargement honorent le préfixe (le cas du bundle complet attend la décision de #296), la convention `<préfixe>-<nom standard>`, la règle « un composant qui en embarque un autre (aujourd'hui `ar-table-sort` avec `ar-tooltip`) attend son compagnon sous le même préfixe », l'exemple headless avec les deux `customElements.define`, et la précision sur « renommer chaque composant individuellement ».
- `ar-table-sort.mdx` : une phrase sur le compagnon requis, à côté de l'entrée `relatedTokens` existante.
- FAQ (`/resources/support`, « Puis-je changer le préfixe `ar-` ? ») : à aligner avec la page du préfixe une fois #296 tranchée.

## Hors périmètre

- #296 : le bundle complet ignore `ARIANE_CONFIG.prefix`.
- #262 : tag JSDoc `@dependency` et `x-dependencies` dans le manifeste. À rouvrir après coup : la documentation écrite à la main couvre le cas unique.

## Non vérifié

- La règle `:not(:defined)` sur un attribut avec un tag dynamique.
- Que `lit/static-html` accepte tel quel nos liaisons (`for=${…}`, contenu texte) ; seule l'existence du fichier dans le Lit installé est vérifiée. La taille ajoutée aux bundles est à mesurer.
- Le délai du `warn` (valeur à choisir à l'implémentation).
- Qu'un préfixe contenant un tiret fonctionne de bout en bout avec l'autoloader : lu dans le code (`${prefix}-${name}` sans validation), non testé.
- Le comportement d'un consommateur qui a déjà son propre élément portant le tag déduit (le garde-fou `customElements.get` des `index.ts` laisserait le sien).
