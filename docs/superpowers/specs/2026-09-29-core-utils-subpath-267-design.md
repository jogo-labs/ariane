# Sous-path `@ariane-ui/core/utils` (#267)

## Problème

`import { whenAllDefined } from '@ariane-ui/core'` passe par le barrel `src/index.ts`, qui
importe les 19 composants pour leur effet de bord (`customElements.define('ar-…')`).

Mesuré (esbuild, minifié, consommateur qui n'importe que `whenAllDefined`) :

| Import                            | Taille    |
| --------------------------------- | --------- |
| barrel `@ariane-ui/core`          | 201 892 o |
| utilitaire seul, depuis la source | 446 o     |

Conséquence plus grave que la taille : en mode headless, un consommateur qui importe
`whenAllDefined` ou `registerTranslation` depuis le barrel enregistre malgré lui les 19 `ar-*`,
ce qui contredit `@ariane-ui/core/headless` (aucun effet de bord). Ce sont précisément les deux
utilitaires que la doc présente à un consommateur (`getting-started/utilisation`, `traductions`).

## Décisions

- **Nouveau sous-path `@ariane-ui/core/utils`** qui exporte uniquement `whenAllDefined`,
  `registerTranslation` et les types `WhenAllDefinedOptions` et `Translation`.
- **Barrel inchangé pour le consommateur** : il réexporte ces symboles depuis
  `src/utils/index.ts` (une seule source, pas de breaking change).
- **Pas de champ `sideEffects`** : les 19 `customElements.define` vivent dans des chunks à nom haché
  (`dist/chunks/chunk-XXXX.js`), qu'aucun pattern ne peut cibler de façon stable ; un
  `"sideEffects": false` global ferait supprimer `import '@ariane-ui/core'` et
  `import '…/components/alert/index.js'`, donc plus aucun composant enregistré.
- **Écartés (YAGNI)** : `announceA11y` et `prefersReducedMotion` (non documentés côté consommateur, à
  ajouter à `./utils` quand la doc les présente : ajouter un export est rétrocompatible, en
  retirer non) ; `HasSlotController`, `LocalizeController`, `AnchoredController` (aucun
  consommateur connu ; un éventuel `./controllers` séparé serait plus juste que `./utils`).

## Changements

- `packages/core/src/utils/index.ts` : le nouveau point d'entrée (pas de `src/utils.ts`, qui
  cohabiterait ambigument avec le dossier `src/utils/`).
- `packages/core/scripts/build-bundles.js` : entrée npm `'utils/index'` (produit
  `dist/utils/index.js`). Pas de bundle CDN.
- `packages/core/package.json` : `exports["./utils"]` avec `types` et `default`.
- `packages/core/src/index.ts` : réexporte depuis `./utils/index.js`.
- Doc : `utilisation.astro` et `traductions.astro` recommandent `@ariane-ui/core/utils` en headless.

## Tests

- Test Vitest de non-régression : bundle `src/utils/index.ts` avec l'API esbuild (`metafile`,
  Lit externe) et vérifie qu'aucun fichier sous `components/` n'entre dans le graphe et qu'aucun
  `customElements.define` n'apparaît dans la sortie. Il fige aussi la liste exacte des exports.
- Vérification manuelle après `build:dev` : bundle d'un consommateur de `@ariane-ui/core/utils`
  et comparaison de taille avec la mesure ci-dessus ; `npm pack --dry-run` pour vérifier que
  `dist/utils/index.js` est publié.
