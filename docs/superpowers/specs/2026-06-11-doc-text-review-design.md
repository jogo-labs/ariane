# Spec — Revue des textes de documentation

**Date :** 2026-06-11
**Scope :** `apps/docs/src/content/components/*.mdx` (17 fichiers)
**Approche :** Subagent-driven, agents parallèles par fichier

---

## Objectif

Deux types de corrections dans la même passe :

1. **Terminologie** — remplacer les tournures à la troisième personne (`l'auteur`, `l'intégrateur`) par une adresse directe au lecteur (`vous`, `votre`).
2. **Descriptions placeholder** — remplacer les descriptions top-level et de variants génériques par des descriptions courtes et précises.

Style de référence : Vue.js FR (tutoiement, adresse directe).

---

## Section 1 — Substitutions terminologiques

### 1.1 Titres de section

| Avant                                            | Après                                   | Fichiers                                                                                                                         |
| ------------------------------------------------ | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `### À la charge de l'auteur`                    | `### À votre charge`                    | ar-alert, ar-breadcrumb, ar-dialog, ar-dropdown, ar-pagination, ar-progressbar, ar-spinner, ar-stepper, ar-tab-group, ar-tooltip |
| `### \`aria-invalid\` — à la charge de l'auteur` | `### \`aria-invalid\` — à votre charge` | ar-charcounter                                                                                                                   |

### 1.2 Corps du texte

| Fichier              | Avant                                 | Après                             |
| -------------------- | ------------------------------------- | --------------------------------- |
| `ar-charcounter.mdx` | `sans intervention de l'auteur`       | `sans intervention de votre part` |
| `ar-charcounter.mdx` | `permet à l'auteur de styler`         | `vous permet de styler`           |
| `ar-pagination.mdx`  | `c'est à l'intégrateur d'annoncer`    | `c'est à vous d'annoncer`         |
| `ar-progressbar.mdx` | `c'est à l'intégrateur d'incrémenter` | `c'est à vous d'incrémenter`      |

---

## Section 2 — Descriptions placeholder

### 2.1 Descriptions top-level (frontmatter `description:`)

| Fichier              | Avant                                      | Après                                                                                                        |
| -------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `ar-spinner.mdx`     | `Description du composant ar-spinner.`     | `Indicateur de chargement animé avec annonce aria-live à la résolution, disponible en 5 tailles.`            |
| `ar-pagination.mdx`  | `Description du composant ar-pagination.`  | `Navigation entre pages avec gestion du responsive et annonce accessible du changement de page.`             |
| `ar-progressbar.mdx` | `Description du composant ar-progressbar.` | `Barre de progression accessible avec label slotté, affichage optionnel du pourcentage et état indéterminé.` |

### 2.2 Descriptions de variants (`description: Rendu par défaut du composant.`)

Les agents doivent lire les fichiers de fixture du playground pour vérifier les valeurs réelles avant d'écrire les descriptions. Les propositions ci-dessous sont des approximations à affiner.

#### ar-breadcrumb (1 variant)

| Variant   | Proposition                                              |
| --------- | -------------------------------------------------------- |
| `default` | `Fil d'ariane avec 3 niveaux, le dernier élément actif.` |

#### ar-alert (1 variant)

| Variant   | Proposition                                                     |
| --------- | --------------------------------------------------------------- |
| `default` | `Alerte de type \`error\` avec message et bouton de fermeture.` |

#### ar-stepper (2 variants)

| Variant   | Label        | Proposition                                                             |
| --------- | ------------ | ----------------------------------------------------------------------- |
| `default` | Par défaut   | `Stepper vertical à 4 étapes, étape 2 active.`                          |
| `edit`    | Mode édition | `Stepper en mode édition — toutes les étapes passées sont accessibles.` |

#### ar-progressbar (1 variant)

| Variant   | Proposition                                       |
| --------- | ------------------------------------------------- |
| `default` | `Barre de progression à 65 %, avec label slotté.` |

#### ar-spinner (5 variants)

| Variant   | Label              | Proposition                              |
| --------- | ------------------ | ---------------------------------------- |
| `default` | Par défaut (moyen) | `Spinner de taille md (32 px).`          |
| `xs`      | Très petit         | `Spinner de taille xs (16 px).`          |
| `sm`      | Petit              | `Spinner de taille sm (24 px).`          |
| `lg`      | Grand              | `Spinner de taille lg (48 px).`          |
| `all`     | Toutes les tailles | `Les 4 tailles disponibles côte à côte.` |

#### ar-pagination (4 variants)

| Variant          | Label                       | Proposition                                               |
| ---------------- | --------------------------- | --------------------------------------------------------- |
| `default`        | Par défaut                  | `Pagination à 10 pages, page courante au milieu.`         |
| `20-pages`       | 20 pages                    | `Pagination à 20 pages, page courante au milieu.`         |
| `20-pages-start` | 20 pages (current en début) | `Pagination à 20 pages, page courante en début de liste.` |
| `20-pages-end`   | 20 pages (current en fin)   | `Pagination à 20 pages, page courante en fin de liste.`   |

---

## Périmètre — fichiers non modifiés

Les fichiers suivants n'ont aucune occurrence des patterns ciblés et ne nécessitent pas d'intervention :

- `ar-dropdown-item.mdx`
- `ar-tab.mdx`
- `ar-tab-panel.mdx`
- `ar-stepper-item.mdx`
- `ar-breadcrumb-item.mdx`
- `ar-table-sort.mdx`

---

## Contraintes

- Ne pas modifier le contenu sémantique des sections `### À votre charge` — uniquement les titres et les occurrences listées.
- Les descriptions de variants doivent être vérifiées contre les fichiers de fixture avant commit.
- Commit conventionnel : `docs(components): revue terminologie et descriptions placeholders`.
