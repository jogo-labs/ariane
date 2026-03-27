# ADR-002 : Deux workflows CI séparés (core / docs)

**Statut :** Adopté
**Date :** 2026-03-20

## Contexte

Le projet a un monorepo avec deux packages distincts : `packages/core` et `apps/docs`.
Un seul workflow CI lançait tous les jobs à chaque PR, même celles ne touchant qu'un seul package.

## Décision

Deux fichiers de workflow séparés avec filtres `on.pull_request.paths` natifs GitHub :

- `.github/workflows/ci-core.yml` — déclenché uniquement si `packages/core/**` ou les fichiers
  de config racine sont modifiés.
- `.github/workflows/ci-docs.yml` — déclenché uniquement si `apps/docs/**` ou `packages/core/**`
  sont modifiés (la doc dépend du core).

Le lint core est isolé : `npm run lint --workspace=packages/core` (pas `turbo run lint` global).

## Alternatives rejetées

- **`dorny/paths-filter` action** — filtre par job dans un seul workflow. Plus complexe,
  génère des warnings de dépréciation Node 20, et ne réduit pas vraiment les runs CI.
- **`on.pull_request.paths` dans un seul fichier avec jobs conditionnels** — les conditions
  `if:` sur les jobs ne permettent pas de filtrer le déclenchement du workflow lui-même.

## Conséquences

- Les paths filters s'appliquent au niveau `pull_request` seulement — pas sur les `push`
  directs sur les branches protégées.
- GitHub évalue les paths sur l'ensemble du diff PR (pas seulement le dernier commit) :
  si `package.json` est modifié dans un commit antérieur de la PR, les deux workflows
  se déclenchent sur chaque push ultérieur.
