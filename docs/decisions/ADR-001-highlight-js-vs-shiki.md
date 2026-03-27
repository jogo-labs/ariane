# ADR-001 : Highlight.js plutôt que Shiki pour la coloration syntaxique

**Statut :** Adopté
**Date :** 2026-01-15

## Contexte

Le site de documentation affiche des blocs de code avec coloration syntaxique.
Le playground interactif régénère le HTML de ces blocs côté client après chaque
changement de contrôle — il faut donc pouvoir re-coloriser à la demande.

## Décision

Utiliser **highlight.js** via CDN (thème `github-dark`, chargé via `is:inline`).
Appeler `hljs.highlightAll()` au chargement initial, et `hljs.highlightElement(el)`
après chaque mise à jour du playground (après avoir réinitialisé `data-highlighted`).

Le script highlight.js est chargé dans `<head>` avec `is:inline` et le code
enveloppé dans `DOMContentLoaded` pour éviter que les `querySelectorAll` retournent
zéro éléments (le script s'exécute avant le parsing du `<body>`).

## Alternatives rejetées

- **Shiki** — 100% serveur. Impossible de re-coloriser côté client après que le
  playground ait réécrit le DOM. Éliminé d'emblée.

## Conséquences

- La coloration syntaxique est uniforme sur toute la doc (même outil, même thème).
- Ne pas mélanger Shiki et highlight.js — leurs palettes divergent même avec le
  même nom de thème.
