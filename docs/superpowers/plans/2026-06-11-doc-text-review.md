# Revue textes documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la terminologie à la troisième personne (`l'auteur`, `l'intégrateur`) par une adresse directe (`vous`/`votre`) et corriger les descriptions placeholder dans 11 fichiers MDX.

**Architecture:** Éditions directes dans `apps/docs/src/content/components/*.mdx`. Aucune dépendance entre les fichiers — toutes les tâches de modification sont parallélisables. Commit unique en fin de passe.

**Tech Stack:** MDX (YAML frontmatter + Markdown)

---

## Carte des fichiers

| Fichier              | Changements                                                                       |
| -------------------- | --------------------------------------------------------------------------------- |
| `ar-dialog.mdx`      | Titre section : `### À la charge de l'auteur` → `### À votre charge`              |
| `ar-dropdown.mdx`    | Titre section : `### À la charge de l'auteur` → `### À votre charge`              |
| `ar-tab-group.mdx`   | Titre section : `### À la charge de l'auteur` → `### À votre charge`              |
| `ar-tooltip.mdx`     | Titre section : `### À la charge de l'auteur` → `### À votre charge`              |
| `ar-charcounter.mdx` | Titre section + 2 occurrences corps                                               |
| `ar-alert.mdx`       | Titre section + description variant `default`                                     |
| `ar-breadcrumb.mdx`  | Titre section + description variant `default`                                     |
| `ar-stepper.mdx`     | Titre section + descriptions variants `default` et `edit`                         |
| `ar-progressbar.mdx` | Titre section + body text + description top-level + description variant `default` |
| `ar-pagination.mdx`  | Titre section + body text + description top-level + descriptions 4 variants       |
| `ar-spinner.mdx`     | Titre section + description top-level + descriptions 5 variants                   |

---

### Task 1 : Terminologie — fichiers sans descriptions (ar-dialog, ar-dropdown, ar-tab-group, ar-tooltip)

**Files:**

- Modify: `apps/docs/src/content/components/ar-dialog.mdx`
- Modify: `apps/docs/src/content/components/ar-dropdown.mdx`
- Modify: `apps/docs/src/content/components/ar-tab-group.mdx`
- Modify: `apps/docs/src/content/components/ar-tooltip.mdx`

- [ ] **Step 1 : Remplacer le titre dans ar-dialog.mdx**

Chercher et remplacer exactement :

```
### À la charge de l'auteur
```

par :

```
### À votre charge
```

- [ ] **Step 2 : Remplacer le titre dans ar-dropdown.mdx**

Même substitution : `### À la charge de l'auteur` → `### À votre charge`

- [ ] **Step 3 : Remplacer le titre dans ar-tab-group.mdx**

Même substitution : `### À la charge de l'auteur` → `### À votre charge`

- [ ] **Step 4 : Remplacer le titre dans ar-tooltip.mdx**

Même substitution : `### À la charge de l'auteur` → `### À votre charge`

- [ ] **Step 5 : Vérifier**

```bash
grep -r "À la charge de l'auteur" apps/docs/src/content/components/ar-dialog.mdx apps/docs/src/content/components/ar-dropdown.mdx apps/docs/src/content/components/ar-tab-group.mdx apps/docs/src/content/components/ar-tooltip.mdx
```

Résultat attendu : aucune sortie (zéro occurrence).

---

### Task 2 : Terminologie — ar-charcounter.mdx

**Files:**

- Modify: `apps/docs/src/content/components/ar-charcounter.mdx`

- [ ] **Step 1 : Remplacer le titre de section**

Chercher :

```
### `aria-invalid` — à la charge de l'auteur
```

Remplacer par :

```
### `aria-invalid` — à votre charge
```

- [ ] **Step 2 : Remplacer "sans intervention de l'auteur"**

Chercher :

```
sans intervention de l'auteur
```

Remplacer par :

```
sans intervention de votre part
```

- [ ] **Step 3 : Remplacer "permet à l'auteur de styler"**

Chercher :

```
permet à l'auteur de styler
```

Remplacer par :

```
vous permet de styler
```

- [ ] **Step 4 : Vérifier**

```bash
grep -n "l'auteur\|l'intégrateur" apps/docs/src/content/components/ar-charcounter.mdx
```

Résultat attendu : aucune sortie.

---

### Task 3 : Terminologie + descriptions — ar-alert.mdx et ar-breadcrumb.mdx

**Files:**

- Modify: `apps/docs/src/content/components/ar-alert.mdx`
- Modify: `apps/docs/src/content/components/ar-breadcrumb.mdx`

#### ar-alert.mdx

- [ ] **Step 1 : Remplacer le titre de section**

Chercher :

```
### À la charge de l'auteur
```

Remplacer par :

```
### À votre charge
```

- [ ] **Step 2 : Remplacer la description du variant `default`**

Dans le frontmatter YAML, chercher (sous le bloc variant `name: default`) :

```
      description: Rendu par défaut du composant.
```

La ligne se trouve juste après `label: Défaut`. Remplacer par :

```
      description: Alerte sans variant explicite (erreur par défaut), avec titre et corps.
```

#### ar-breadcrumb.mdx

- [ ] **Step 3 : Remplacer le titre de section**

Chercher :

```
### À la charge de l'auteur
```

Remplacer par :

```
### À votre charge
```

- [ ] **Step 4 : Remplacer la description du variant `default`**

Dans le frontmatter YAML, chercher (sous le bloc `name: default`) :

```
      description: Rendu par défaut du composant.
```

La ligne se trouve juste après `label: Par défaut`. Remplacer par :

```
      description: Fil d'ariane avec 3 niveaux, le dernier élément actif.
```

- [ ] **Step 5 : Vérifier**

```bash
grep -n "À la charge de l'auteur\|Rendu par défaut du composant" apps/docs/src/content/components/ar-alert.mdx apps/docs/src/content/components/ar-breadcrumb.mdx
```

Résultat attendu : aucune sortie.

---

### Task 4 : Terminologie + descriptions — ar-stepper.mdx

**Files:**

- Modify: `apps/docs/src/content/components/ar-stepper.mdx`

- [ ] **Step 1 : Remplacer le titre de section**

Chercher :

```
### À la charge de l'auteur
```

Remplacer par :

```
### À votre charge
```

- [ ] **Step 2 : Remplacer la description du variant `default`**

Dans le frontmatter YAML, chercher (sous le bloc `name: default`, juste après `label: Par défaut`) :

```
      description: Rendu par défaut du composant.
```

Remplacer par :

```
      description: Stepper à 3 étapes avec sous-étapes, sous-étape « Mes coordonnées » active.
```

- [ ] **Step 3 : Remplacer la description du variant `edit`**

Dans le frontmatter YAML, chercher (sous le bloc `name: edit`, juste après `label: Mode édition`) :

```
      description: Rendu par défaut du composant.
```

Remplacer par :

```
      description: Même structure en mode édition — toutes les étapes passées sont cliquables.
```

- [ ] **Step 4 : Vérifier**

```bash
grep -n "À la charge de l'auteur\|Rendu par défaut du composant" apps/docs/src/content/components/ar-stepper.mdx
```

Résultat attendu : aucune sortie.

---

### Task 5 : Terminologie + descriptions — ar-progressbar.mdx

**Files:**

- Modify: `apps/docs/src/content/components/ar-progressbar.mdx`

- [ ] **Step 1 : Remplacer la description top-level**

Dans le frontmatter YAML, chercher :

```
description: Description du composant ar-progressbar.
```

Remplacer par :

```
description: Barre de progression accessible avec label slotté, affichage optionnel du pourcentage et état indéterminé.
```

- [ ] **Step 2 : Remplacer la description du variant `default`**

Dans le frontmatter YAML, chercher (sous le bloc `name: default`) :

```
      description: Rendu par défaut du composant.
```

Remplacer par :

```
      description: Barre de progression sans attribut — affiche l'état 0 % sans label.
```

- [ ] **Step 3 : Remplacer le titre de section**

Chercher :

```
### À la charge de l'auteur
```

Remplacer par :

```
### À votre charge
```

- [ ] **Step 4 : Remplacer "c'est à l'intégrateur d'incrémenter"**

Chercher :

```
c'est à l'intégrateur d'incrémenter la valeur au rythme réel de l'opération.
```

Remplacer par :

```
c'est à vous d'incrémenter la valeur au rythme réel de l'opération.
```

- [ ] **Step 5 : Vérifier**

```bash
grep -n "À la charge de l'auteur\|l'intégrateur\|Rendu par défaut du composant\|Description du composant" apps/docs/src/content/components/ar-progressbar.mdx
```

Résultat attendu : aucune sortie.

---

### Task 6 : Terminologie + descriptions — ar-pagination.mdx

**Files:**

- Modify: `apps/docs/src/content/components/ar-pagination.mdx`

- [ ] **Step 1 : Remplacer la description top-level**

Dans le frontmatter YAML, chercher :

```
description: Description du composant ar-pagination.
```

Remplacer par :

```
description: Navigation entre pages avec gestion du responsive et annonce accessible du changement de page.
```

- [ ] **Step 2 : Remplacer la description du variant `default`**

Dans le frontmatter YAML, chercher (sous le bloc `name: default`, juste après `label: Par défaut`) :

```
      description: Rendu par défaut du composant.
```

Remplacer par :

```
      description: Pagination sans attributs (valeurs par défaut du composant).
```

- [ ] **Step 3 : Remplacer la description du variant `20-pages`**

Dans le frontmatter YAML, chercher (sous le bloc `name: 20-pages`, juste après `label: 20 pages`) :

```
      description: Rendu par défaut du composant.
```

Remplacer par :

```
      description: Pagination à 20 pages, page 10 active (milieu de la liste).
```

- [ ] **Step 4 : Remplacer la description du variant `20-pages-start`**

Dans le frontmatter YAML, chercher (sous le bloc `name: 20-pages-start`) :

```
      description: Rendu par défaut du composant.
```

Remplacer par :

```
      description: Pagination à 20 pages, page 5 active (début de la liste).
```

- [ ] **Step 5 : Remplacer la description du variant `20-pages-end`**

Dans le frontmatter YAML, chercher (sous le bloc `name: 20-pages-end`) :

```
      description: Rendu par défaut du composant.
```

Remplacer par :

```
      description: Pagination à 20 pages, page 18 active (fin de la liste).
```

- [ ] **Step 6 : Remplacer le titre de section**

Chercher :

```
### À la charge de l'auteur
```

Remplacer par :

```
### À votre charge
```

- [ ] **Step 7 : Remplacer "c'est à l'intégrateur d'annoncer"**

Chercher :

```
c'est à l'intégrateur d'annoncer le nouveau contenu chargé
```

Remplacer par :

```
c'est à vous d'annoncer le nouveau contenu chargé
```

- [ ] **Step 8 : Vérifier**

```bash
grep -n "À la charge de l'auteur\|l'intégrateur\|Rendu par défaut du composant\|Description du composant" apps/docs/src/content/components/ar-pagination.mdx
```

Résultat attendu : aucune sortie.

---

### Task 7 : Terminologie + descriptions — ar-spinner.mdx

**Files:**

- Modify: `apps/docs/src/content/components/ar-spinner.mdx`

- [ ] **Step 1 : Remplacer la description top-level**

Dans le frontmatter YAML, chercher :

```
description: Description du composant ar-spinner.
```

Remplacer par :

```
description: Indicateur de chargement animé avec annonce aria-live à la résolution, disponible en 5 tailles.
```

- [ ] **Step 2 : Remplacer la description du variant `default`**

Dans le frontmatter YAML, chercher (sous le bloc `name: default`, juste après `label: Par défaut (moyen)`) :

```
      description: Rendu par défaut du composant.
```

Remplacer par :

```
      description: Spinner sans attribut size (taille md par défaut).
```

- [ ] **Step 3 : Remplacer la description du variant `xs`**

Dans le frontmatter YAML, chercher (sous le bloc `name: xs`, juste après `label: Très petit`) :

```
      description: Rendu par défaut du composant.
```

Remplacer par :

```
      description: Spinner avec size="xs".
```

- [ ] **Step 4 : Remplacer la description du variant `sm`**

Dans le frontmatter YAML, chercher (sous le bloc `name: sm`, juste après `label: Petit`) :

```
      description: Rendu par défaut du composant.
```

Remplacer par :

```
      description: Spinner avec size="sm".
```

- [ ] **Step 5 : Remplacer la description du variant `lg`**

Dans le frontmatter YAML, chercher (sous le bloc `name: lg`, juste après `label: Grand`) :

```
      description: Rendu par défaut du composant.
```

Remplacer par :

```
      description: Spinner avec size="lg".
```

- [ ] **Step 6 : Remplacer la description du variant `all`**

Dans le frontmatter YAML, chercher (sous le bloc `name: all`, juste après `label: Toutes les tailles`) :

```
      description: Rendu par défaut du composant.
```

Remplacer par :

```
      description: Les 4 tailles disponibles affichées côte à côte (xs, sm, md, lg).
```

- [ ] **Step 7 : Remplacer le titre de section**

Chercher :

```
### À la charge de l'auteur
```

Remplacer par :

```
### À votre charge
```

- [ ] **Step 8 : Vérifier**

```bash
grep -n "À la charge de l'auteur\|Rendu par défaut du composant\|Description du composant" apps/docs/src/content/components/ar-spinner.mdx
```

Résultat attendu : aucune sortie.

---

### Task 8 : Vérification globale et commit

**Files:** tous les fichiers modifiés dans les tâches 1–7

- [ ] **Step 1 : Vérification globale**

```bash
grep -rn "À la charge de l'auteur\|l'intégrateur\|Rendu par défaut du composant\|Description du composant ar-" apps/docs/src/content/components/
```

Résultat attendu : aucune sortie.

- [ ] **Step 2 : Vérifier que les nouveaux textes sont bien en place**

```bash
grep -rni "votre charge" apps/docs/src/content/components/
```

Résultat attendu : 11 occurrences (10 × `### À votre charge` + 1 × `### \`aria-invalid\` — à votre charge` dans ar-charcounter).

- [ ] **Step 3 : Commit**

```bash
git add apps/docs/src/content/components/ar-alert.mdx \
        apps/docs/src/content/components/ar-breadcrumb.mdx \
        apps/docs/src/content/components/ar-charcounter.mdx \
        apps/docs/src/content/components/ar-dialog.mdx \
        apps/docs/src/content/components/ar-dropdown.mdx \
        apps/docs/src/content/components/ar-pagination.mdx \
        apps/docs/src/content/components/ar-progressbar.mdx \
        apps/docs/src/content/components/ar-spinner.mdx \
        apps/docs/src/content/components/ar-stepper.mdx \
        apps/docs/src/content/components/ar-tab-group.mdx \
        apps/docs/src/content/components/ar-tooltip.mdx
git commit -m "docs(components): revue terminologie et descriptions placeholders"
```
