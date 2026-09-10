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

### Sémantiques

Un seul token par rôle, résolu via `light-dark(clair, sombre)` à partir des
primitifs ci-dessus.

| Nom                                 | Formule (`light-dark(clair, sombre)`)                                               | Rôle                                          |
| ----------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------- |
| `--doc-bg` / `--doc-nav-bg`         | `light-dark(paper, vault)`                                                          | Fond de page / nav                            |
| `--doc-text`                        | `light-dark(ink, chalk)`                                                            | Texte principal                               |
| `--doc-text-muted`                  | `light-dark(ink-muted, chalk-muted)`                                                | Texte secondaire                              |
| `--doc-border` / `--doc-nav-border` | `light-dark(line-soft, thread-soft)`                                                | Traits                                        |
| `--doc-accent`                      | `light-dark(#8f5f00, ember)`                                                        | Couleur d'accent (liens, focus texte, icônes) |
| `--doc-accent-hover`                | `light-dark(#805500, ember-hi)`                                                     | Accent au survol                              |
| `--doc-accent-border`               | `light-dark(color-mix(accent 80%, transparent), color-mix(ember 45%, transparent))` | Bordure d'accent                              |
| `--doc-focus`                       | `light-dark(ink, ember)`                                                            | Anneau de focus                               |
| `--doc-link-visited`                | `light-dark(color-mix(ember 60%, black), color-mix(ember 70%, white))`              | Lien visité                                   |
| `--doc-code-block-bg`               | `light-dark(grove-deep, vault-deep)`                                                | Fond des blocs de code                        |
| `--doc-header-bg`                   | `light-dark(rgba(255,255,255,.92), rgba(25,29,46,.92))`                             | Fond de header (flouté)                       |

En mode clair, `--doc-accent` vaut `#8f5f00` — un ambre assombri, distinct du
primitif brut `--doc-ember` (`#ffaa00`), vérifié WCAG AA comme couleur de
texte. `--doc-ember` échoue le contraste en texte sur fond clair (1,9:1, cf.
ci-dessus) ; ne jamais « simplifier » `--doc-accent` vers `var(--doc-ember)`
en mode clair, ça re-casse silencieusement le contraste du texte sur tout le
site.

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
