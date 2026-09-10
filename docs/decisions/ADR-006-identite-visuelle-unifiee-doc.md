# ADR-006 : Identité visuelle unifiée pour apps/docs

## Statut

Accepté (2026-09-09)

## Contexte

`HomeLayout.astro` (home, PR #202) et `Layout.astro` (pages de contenu et
composant) définissaient chacun leur propre jeu de tokens `--doc-*`, avec des
noms identiques (`--doc-accent`, `--doc-code-block-bg`) portant des valeurs
incompatibles — pas deux thèmes d'un même système, mais deux systèmes
distincts qui se recouvraient par accident de nommage. `HomeLayout.astro`
n'avait par ailleurs aucun mode sombre, tandis que `Layout.astro` avait un
mode sombre fonctionnel mais sous une palette bleu cobalt sans lien avec
l'identité Rivian de la home.

## Décision

Unifier tout `apps/docs` sous l'identité visuelle Rivian (validée par 2
itérations de design sur la home), dans un fichier de tokens unique
(`apps/docs/src/styles/doc-tokens.css`), structuré en 2 niveaux (primitifs →
sémantique), avec un mode sombre complet ("Voûte", indigo nuit — choisi après
brainstorming visuel comparant 3 directions, cf.
`docs/superpowers/specs/2026-09-09-doc-unification-titres-tokens-110-design.md`).
L'ancien système bleu cobalt de `Layout.astro` est retiré, pas conservé en
parallèle.

## Alternatives écartées

- **Garder les deux systèmes séparés** (home vs reste du site) — écarté :
  perpétue la confusion de nommage, et une home visuellement déconnectée du
  reste du site ne sert pas l'identité de marque.
- **Renommer sans trancher la couleur** (ex. `--doc-home-*`/`--doc-content-*`)
  — écarté : ne résout pas le vrai problème (deux identités visuelles
  concurrentes), juste la collision de nom.

## Conséquences

- Tous les tokens `--doc-*` non-couleur (rayons, easing, typo) sont
  rationalisés sur le vocabulaire de `packages/core/src/styles/themes/default.css`
  (`--ar-border-radius-*`, `--ar-font-size-*`, etc.) — les deux systèmes
  n'ont aucun lien fonctionnel, mais une terminologie alignée facilite la
  lecture pour un mainteneur qui passe de l'un à l'autre.
- Les primitifs de couleur gardent un vocabulaire d'objets/matières propre à
  Ariane (paper/slate/grove/ink/ember côté clair, vault/chalk/thread côté
  sombre) — inspiré de Rivian, pas copié (mots différents).
- Le rework du layout visuel principal (colonnes, positionnement) reste hors
  scope de cette décision — sous-chantier séparé.
