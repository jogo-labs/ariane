# Charte graphique — apps/docs

> Référence vivante, mise à jour au fil des pages traitées. Décrit l'état
> actuel des tokens visuels du site de documentation, pas une décision
> figée — cf. ADR-006 pour le raisonnement derrière ce choix.

Source de vérité : `apps/docs/src/styles/doc-tokens.css`.

## Palette

### Primitifs clairs

| Nom                                                   | Valeur                            | Rôle                                            |
| ----------------------------------------------------- | --------------------------------- | ----------------------------------------------- |
| `--doc-paper`                                         | `#ffffff`                         | Sol neutre 1                                    |
| `--doc-slate`                                         | `#f5f5f5`                         | Sol neutre 2                                    |
| `--doc-grove` / `--doc-grove-deep`                    | `#313a2e` / `#252826`             | Bandes sombres dédiées (zones clair uniquement) |
| `--doc-ink` / `--doc-ink-muted`                       | `#141414` / `#565656`             | Texte                                           |
| `--doc-line` / `--doc-line-soft`                      | `#141414` / 16%                   | Traits                                          |
| `--doc-ember` / `--doc-ember-hi` / `--doc-ember-wash` | `#ffaa00` / `#ffbd2e` / `#fff3d6` | Accent                                          |

### Primitifs sombres — Voûte (indigo nuit)

| Nom                                  | Valeur                | Rôle   |
| ------------------------------------ | --------------------- | ------ |
| `--doc-vault` / `--doc-vault-deep`   | `#191d2e` / `#10131f` | Sol    |
| `--doc-chalk` / `--doc-chalk-muted`  | `#e8eaf2` / `#a2a7bd` | Texte  |
| `--doc-thread` / `--doc-thread-soft` | ~37% / ~14% opacité   | Traits |

Ratios de contraste vérifiés (AAA) : `chalk`/`vault` 13,91:1, `chalk-muted`/`vault`
7,00:1, `ember`/`vault` 8,76:1. L'ambre (`ember`) est le même primitif dans les
deux modes — inutilisable en texte sur fond clair (1,9:1), il sert de lien et
d'anneau de focus en sombre.

## Typographie

Familles : `--doc-font-display` (Instrument Sans), `--doc-font-body` (Inter).

Échelle de taille : `--doc-font-size-xs/sm/md/lg/xl` (0.75/0.9/1.05/1.25/2rem).
Échelle de graisse : `--doc-font-weight-normal/medium/semibold/bold`
(400/500/600/700).

## Rayons

`--doc-radius-sm/md/lg/xl` : 4/12/20/40px.

## Easing

`--doc-ease` : `cubic-bezier(0.83, 0, 0.17, 1)` — courbe unique pour toute
transition réagissant au pointeur ou au clavier.

## Rythme vertical

`--doc-space-paragraph`/`--doc-space-subsection`/`--doc-space-section` :
1/1.5/2.5rem. Règles :

1. Séparation (avant un titre) et groupement (entre éléments liés) sont deux
   natures d'espacement distinctes.
2. Le `margin-top` d'un titre est toujours strictement supérieur à son
   `margin-bottom`.
3. Le poids de la coupure suit le niveau : section > sous-section.
4. Owl-selector (`:where(...) + *`) plutôt que des `margin-bottom` fixes.
5. Le premier titre après `.page-title` a un espacement réduit.

## Historique

- 2026-09-09 : unification initiale (home + pages de contenu + pages
  composant), mode sombre Voûte ajouté. Cf. issue #110, sous-chantier 1.
