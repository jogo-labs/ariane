# Design — Exposer le thème en `CSSStyleSheet` + doc shadow DOM applicatif

**Statut :** Validé (en attente de plan d'implémentation)
**Date :** 2026-08-11
**Contexte :** issue [#170](https://github.com/jogo-labs/ariane/issues/170) — suivi identifié en marge de
#168, cas d'un **consommateur** qui encapsule sa propre page dans un web component avec shadow DOM
et y instancie des composants Ariane.

## Contexte

Les tokens (custom properties) traversent la frontière shadow DOM du consommateur par héritage CSS
sans rien faire. `::part()` en revanche ne peut pas atteindre les composants Ariane depuis
`default.css` chargé au niveau document, puisque ce shadow root est une frontière créée par le
consommateur — `default.css` et les composants qu'il cible ne partagent plus le même arbre DOM.
C'est à la charge du consommateur de charger le thème _dans_ son propre shadow root (responsabilité
standard du Shadow DOM), mais on peut lui fournir l'outil le plus simple pour le faire, et
documenter comment.

## Décisions issues du brainstorming

### 1. `default.css` reste structurellement inchangé à la source

`packages/core/src/styles/themes/default.css` (1282 lignes) a déjà une frontière structurelle
propre et existante :

- Lignes 12–664 : blocs de tokens uniquement (`:root { }`, `:root[data-theme='dark'] { }`,
  `@media (prefers-color-scheme: dark) { :root:not(...) { } }`).
- Ligne 671 et suivantes : sélecteurs d'éléments (`ar-datepicker { &::part(panel) { ... } }`, etc.)
  sous le commentaire-bannière existant `THÈME COMPOSANTS`.

Pas de découpage du fichier source en plusieurs fichiers physiques : l'usage `<link>`/`@import` au
niveau document a besoin des deux parties ensemble, et réordonner 1282 lignes maintenues à la main
(avec des contraintes de validation `@cssprop` documentées en tête de fichier) est un risque sans
bénéfice pour ce cas d'usage.

### 2. `default.js` n'embarque que la partie `::part()`, pas les tokens

Raison technique, pas seulement stylistique : **`:root { }` ne matche rien lorsqu'une feuille est
adoptée dans un shadow root imbriqué** — `:root` désigne toujours l'élément racine du document,
jamais un shadow root. Embarquer la partie tokens dans `default.js` serait donc du poids mort :
aucun effet, ni override ni conflit, juste des octets inutiles. Les sélecteurs de la partie
composants (`ar-datepicker { }`, `ar-stepper { }`, etc.) sont des sélecteurs de type classiques :
ils matchent normalement tout élément `<ar-datepicker>` réellement présent dans l'arbre où la
feuille est adoptée, donc fonctionnent tels quels dans un shadow root imbriqué.

Conséquence : `default.js` ne sert que le cas `::part()` — cohérent avec le fait que les tokens
n'ont besoin d'aucune étape supplémentaire (héritage CSS natif).

### 3. Génération : split au build sur l'ancre `THÈME COMPOSANTS`, pas de parsing CSS général

`packages/core/scripts/build-css.js` (déjà responsable de minifier `default.css` vers
`dist/styles/themes/default.css` via esbuild) est étendu :

- Repérer le commentaire-bannière `THÈME COMPOSANTS` dans le CSS **source** (avant minification,
  puisque le commentaire est retiré par la minification) pour déterminer l'offset où commence la
  partie composants, découper la source brute en deux sous-chaînes à cet offset, puis minifier
  séparément la sous-chaîne "composants" via esbuild (`transform`, en mémoire — pas un entry point
  fichier séparé sur disque) pour produire le CSS embarqué dans `default.js`.
- Émettre `dist/styles/themes/default.js` :
    ```js
    export const defaultTheme = new CSSStyleSheet();
    defaultTheme.replaceSync(`...CSS minifié de la partie ::part() uniquement...`);
    ```
- **Échec de build explicite** si l'ancre `THÈME COMPOSANTS` n'est pas trouvée dans le fichier
  source (protection contre un renommage/suppression silencieux du marqueur qui casserait le split
  sans erreur visible).
- Le `.css` complet existant (tokens + composants, minifié) continue d'être généré exactement comme
  aujourd'hui, sans changement de comportement pour les consommateurs `<link>`/`@import`.

Pas de dépendance nouvelle : réutilise esbuild déjà en place. Pas de parsing CSS générique
(brace-counting, AST) — un split sur un marqueur de commentaire fixe et déjà présent dans le
fichier est suffisant et plus robuste qu'un parseur maison pour ce besoin précis.

### 4. Export npm : chemin en miroir du `.css` existant

`packages/core/package.json`, exports map étendue en miroir de l'entrée `.css` existante
(`"./themes/*": "./dist/styles/themes/*.css"`) pour permettre :

```js
import { defaultTheme } from '@ariane-ui/core/themes/default.js';
```

Publié via npm (`dist/` déjà listé dans `files`), donc accessible aussi en CDN direct
(unpkg/jsdelivr servent `dist/` tel quel) sans étape de publication supplémentaire — cohérent avec
le fait que le reste de la lib (composants, autoloader) supporte déjà les deux modes
d'intégration.

### 5. Pas de fallback runtime pour `adoptedStyleSheets`

`CSSStyleSheet` constructible et `adoptedStyleSheets` sont supportés par tous les navigateurs
majeurs actuels (Safari 16.4+, mars 2023). Le `.css` classique reste l'option universelle pour les
consommateurs ayant une contrainte de compatibilité plus large — la piste 1 est un ajout optionnel
à côté, pas un remplacement. La limite est documentée (piste 2), pas compensée par du code.

## Impact

**Build** (`packages/core/scripts/build-css.js`) :

- Pour chaque `.css` sous `src/styles/themes/`, en plus du `.css` minifié déjà produit, génère un
  `.js` jumeau contenant uniquement la partie après l'ancre `THÈME COMPOSANTS`, minifiée, embarquée
  en template string, exportée comme `CSSStyleSheet` déjà peuplé (nom d'export dérivé du nom de
  fichier — `defaultTheme` pour `default.css`).
- Échoue explicitement (message d'erreur clair, exit code non nul) si l'ancre n'est pas trouvée
  dans un fichier thème source.

**Package** (`packages/core/package.json`) :

- Exports map étendue pour couvrir `./themes/*.js` en miroir de `./themes/*.css`.

**Docs** (`apps/docs/`) :

- Nouvelle page `apps/docs/src/pages/getting-started/shadow-dom.astro`, même gabarit que
  `utilisation.astro` (`Layout`, `TableOfContents`, sections avec `id`/`h3`).
- Lien ajouté dans `apps/docs/src/components/SiteNav.astro`, juste après "Utilisation".
- Contenu :
    - Pourquoi les tokens fonctionnent sans rien faire (héritage CSS des custom properties à travers
      la frontière shadow DOM) vs pourquoi `::part()` ne traverse pas cette frontière sans action du
      consommateur.
    - Les deux méthodes de chargement du thème dans le shadow root applicatif : `<link>`/`@import`
      classique (fonctionne partout, un fetch/parse par instance) vs `adoptedStyleSheets` avec
      `defaultTheme` importé de `@ariane-ui/core/themes/default.js` (synchrone, pas de FOUC, une
      seule feuille parsée partageable entre plusieurs shadow roots du consommateur).
    - Précision explicite : `default.js` ne contient que les règles `::part()`, pas les tokens — les
      tokens n'ont besoin d'aucune de ces étapes (rappel, pas une nouvelle info à ce stade de la
      page).
    - Mention du support navigateur (Safari 16.4+ pour `adoptedStyleSheets`).

## Tests

Pas de suite de tests dédiée pour `build-css.js` lui-même — les scripts de build de ce repo
(`build-bundles.js`, `build-css.js`) n'ont pas de tests unitaires ; vérification par exécution du
build et inspection de la sortie (`dist/styles/themes/default.js` existe, contient bien
`defaultTheme`, ne contient aucune règle `:root`). Les scripts `validate-*.js` sous
`packages/core/scripts/` (qui eux ont des tests, ex. `validate-no-hardcoded-tokens.test.js`) sont
un pattern différent (lint/CI gate sur le code source des composants), pas applicable ici.

Doc : suivre le pattern de vérification déjà en place pour les autres pages `getting-started/`
(pas de test automatisé dédié, revue visuelle du build docs).

## Hors scope

- Découpage physique du fichier source `default.css` en plusieurs fichiers.
- Fallback runtime (polyfill, feature-detection avec bascule automatique vers `<link>`) pour les
  navigateurs sans support `adoptedStyleSheets`.
- Le cas d'imbrication interne à la lib (un composant Ariane qui en instancie un autre dans son
  propre shadow root, ex. table-sort/tooltip) — traité séparément dans #168.
- Extension du même mécanisme à d'éventuels thèmes additionnels au-delà de `default.css` — le
  script `build-css.js` est écrit pour généraliser à tout fichier sous `src/styles/themes/`, mais
  aucun autre thème n'existe aujourd'hui à valider contre.
