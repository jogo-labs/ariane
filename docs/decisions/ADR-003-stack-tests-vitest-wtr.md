# ADR-003 : Stack de tests dual — Vitest + @web/test-runner

**Statut :** Adopté
**Date :** 2026-02-10

## Contexte

Les composants Lit ont deux types de besoins de test distincts :

1. Tests unitaires rapides (logique, état, attributs) — pas besoin d'un vrai navigateur.
2. Tests d'accessibilité et de comportement Shadow DOM — nécessitent un vrai navigateur
   car happy-dom ne supporte pas correctement certains comportements Shadow DOM.

## Décision

Stack dual :

- **Vitest + happy-dom** pour les tests unitaires (`*.test.ts`). Rapide, pas de navigateur,
  couverture de code native.
- **@web/test-runner + Playwright (Chromium) + @open-wc/testing + axe-core** pour les tests
  browser (`*.browser.test.ts`, `*.a11y.test.ts`). Vrai navigateur, Shadow DOM réel,
  axe-core pour les audits d'accessibilité automatisés.

Les deux sont orchestrés depuis la racine via Turborepo (`test` et `test:browser`).

## Alternatives rejetées

- **Vitest browser mode** — en beta au moment du choix, API instable, support Shadow DOM
  limité pour les tests axe-core.
- **Jest + jsdom** — jsdom supporte encore moins bien le Shadow DOM que happy-dom.
  Moins adapté à l'écosystème ESM/Lit.
- **Migration complète vers WTR** — WTR ne produit pas de rapport de couverture de code
  natif, nécessiterait une consolidation manuelle. Objectif long terme possible.

## Conséquences

- Deux commandes séparées : `npm run test` (Vitest) et `npm run test:browser` (WTR).
- `npm run test:all` depuis la racine lance les deux.
- Les tests browser nécessitent Playwright Chromium installé (géré automatiquement en CI).
- En local, Playwright Chromium doit être installé au premier setup :
  `npx playwright install chromium`.
