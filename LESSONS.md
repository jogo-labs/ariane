# Lessons — mARIAnne

Expériences et décisions techniques accumulées au fil du développement.
Chaque entrée explique le problème rencontré, la solution retenue, et pourquoi.

---

## Docs site

### Highlight.js plutôt que Shiki pour la coloration syntaxique

**Problème :** Le playground réécrit le DOM après chaque changement de contrôle.
Shiki est 100% serveur (génère du HTML au build), donc impossible de re-coloriser côté client
sans embarquer une librairie supplémentaire. Résultat : la colorisation disparaissait dès
qu'on touchait un contrôle.

**Solution :** Utiliser uniquement highlight.js (CDN cdnjs, thème `github-dark`).
`hljs.highlightAll()` au chargement, `hljs.highlightElement(el)` après chaque mise à jour
du playground (en réinitialisant d'abord l'attribut `data-highlighted`).

**Pourquoi pas les deux ?** Les deux outils utilisent des palettes légèrement différentes
même avec le même thème `github-dark` — les couleurs d'attribut HTML étaient divergentes.
Un seul système = cohérence garantie.

---

### Superposition de l'overlay nav mobile

**Problème :** L'overlay `#nav-overlay` (backdrop du drawer mobile) restait `display: block`
et `opacity: 0` quand la nav était fermée, bloquant les clics sur toute la page.

**Solution :** Ajouter `pointer-events: none` par défaut sur `.nav-overlay`,
et `pointer-events: auto` uniquement quand la classe `.open` est présente.
Ne pas se fier uniquement à `opacity` ou `display` pour bloquer les interactions.

---

### IntersectionObserver double-init (TableOfContents)

**Problème :** `TableOfContents.astro` est monté deux fois sur chaque page composant :
une fois dans le slot `"toc"` (colonne droite desktop) et une fois en mobile inline.
Les deux instances créaient chacune un `IntersectionObserver`, qui se battaient pour
mettre à jour l'état actif des liens.

**Solution :** Guard `window.__tocObserverInit` — seule la première instance crée
l'observer. Les deux instances partagent les mêmes classes CSS `.toc-link`, donc
un seul observer suffit pour les deux.

---

### Sous-composants : `@parent` JSDoc seul suffit — pas de champ MDX

**Problème initial :** `index.astro` filtrait les composants enfants via `mdxByTag[...].data.parent`
(champ MDX), alors que `SiteNav.astro` utilisait déjà `c['x-parent']` (champ CEM issu de `@parent`
JSDoc). Les deux sources étaient redondantes et créaient une obligation de double déclaration.

**Solution :** `index.astro` utilise maintenant `c['x-parent']` directement depuis le CEM,
comme `SiteNav.astro`. Le champ `parent` a été retiré du schéma Zod. L'annotation JSDoc
`@parent mr-<tag>` dans le composant Lit est la seule source de vérité.

---

### Types CEM dupliqués dans plusieurs fichiers

**Problème :** Les interfaces `CemDeclaration`, `CemMember`, `CemAttribute`, etc.
étaient copiées dans `SiteNav.astro`, `Playground.astro`, `ComponentApi.astro` et
`[slug].astro`. Toute modification de l'interface CEM demandait 4 mises à jour.

**Solution :** Extraire tous les types vers `src/utils/cem-types.ts` et y ajouter
les helpers (`getCustomElements`, `buildControls`). Les composants Astro importent
uniquement ce dont ils ont besoin avec `import type`.

---

### Astro scoped styles et imports CSS partagés

**Observation :** Les styles Astro sont scopés au composant par défaut.
Pour partager du CSS entre composants (ex : styles de tableau identiques dans
`ComponentApi.astro` et `tokens.astro`), on utilise `@import` au début d'un bloc `<style>`.
Astro résout les imports relatifs et applique quand même le scoping.

---

### `<script src="..." defer>` vs `<script is:inline src="...">`

**Problème :** Astro interprète tout `<script>` avec des attributs inconnus comme `is:inline`
implicitement, mais émet un warning. De plus, `defer` charge le script après le DOM,
ce qui posait un problème pour `hljs.highlightAll()` qui doit s'exécuter après que
les blocs `<pre><code>` soient dans le DOM.

**Solution :** Utiliser `<script is:inline src="...">` explicitement (chargement synchrone).
highlight.js est suffisamment petit pour être chargé de façon synchrone sans impact perceptible.

---

### Preview de composants indépendante du thème global

**Problème :** En mode sombre, la preview des composants passait aussi en fond sombre,
ce qui mélangeait le rendu réel du composant avec les tokens du thème doc.

**Solution :** Les éléments `.preview` ont leur propre attribut `data-theme="light|dark"`
et redéfinissent les tokens `--mr-color-*` pour créer un contexte CSS isolé.
Un bouton toggle local par preview permet de basculer indépendamment du thème global.

---

## Package core

### `reflect: true` obligatoire pour les attributs HTML

Les propriétés Lit exposées comme attributs HTML doivent toujours utiliser `reflect: true`.
Sans ça, l'attribut n'est pas synchronisé dans le DOM — le playground `outerHTML` affichera
des attributs absents même si la propriété a changé côté JS.

---

### `{ bubbles: true, composed: true }` sur tous les événements custom

Les composants vivent dans un Shadow DOM. Sans `composed: true`, les événements custom
ne traversent pas la frontière shadow et ne sont jamais reçus par les listeners du document.
Sans `bubbles: true`, ils ne remontent pas dans le DOM shadow lui-même.
