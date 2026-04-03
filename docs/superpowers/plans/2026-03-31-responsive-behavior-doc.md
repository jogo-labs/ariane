# Comportement responsive — Documentation composants

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une section `## Comportement responsive` dans les MDX de `ar-breadcrumb` et `ar-pagination`, et documenter la convention dans `CONTRIBUTING.md`.

**Architecture:** Modifications purement éditoriales dans 3 fichiers existants. Pas de nouveau composant, pas de code. La section suit le même pattern que `## Accessibilité` établi dans PR #49 : liste de faits, comportements automatiques, seuil de breakpoint.

**Tech Stack:** MDX (YAML frontmatter + Markdown), Astro 6

---

## Fichiers modifiés

| Fichier                                              | Action                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------- |
| `apps/docs/src/content/components/ar-breadcrumb.mdx` | Raccourcir `description` + ajouter `## Comportement responsive` |
| `apps/docs/src/content/components/ar-pagination.mdx` | Ajouter `## Comportement responsive`                            |
| `apps/docs/CONTRIBUTING.md`                          | Ajouter convention + checklist item                             |

---

### Task 1 : `ar-breadcrumb.mdx` — description + section responsive

**Files:**

- Modify: `apps/docs/src/content/components/ar-breadcrumb.mdx`

- [ ] **Step 1 : Raccourcir la `description` dans le frontmatter**

Remplacer la ligne `description:` par :

```yaml
description: Fil d'ariane accessible avec affichage adaptatif mobile/desktop.
```

La description actuelle est :

```
Fil d'ariane accessible avec affichage adaptatif mobile/desktop. En dessous de 768px de largeur de viewport, les liens intermédiaires sont masqués derrière un dropdown. Le premier lien reste visible sous forme d'un bouton "Retour". Pour voir ce comportement, utiliser les DevTools du navigateur (mode responsive).
```

Ce contenu migre dans la nouvelle section ci-dessous.

- [ ] **Step 2 : Ajouter la section `## Comportement responsive` après `## Accessibilité`**

Le fichier se termine actuellement après la section `## Accessibilité`. Ajouter à la fin :

```markdown
## Comportement responsive

En dessous de **768px**, le composant bascule automatiquement vers un affichage condensé :

- Les liens intermédiaires sont masqués derrière un **dropdown**.
- Seul le **premier lien** reste visible, rendu sous forme de bouton "Retour".
- Le dropdown expose son état via `aria-expanded` — le comportement clavier et vocal est géré automatiquement.

Pour observer ce rendu, utiliser les DevTools du navigateur en mode responsive.
```

- [ ] **Step 3 : Vérifier visuellement**

```bash
npm run dev
```

Ouvrir `http://localhost:4321/components/breadcrumb` et vérifier :

- La `description` courte s'affiche sous le titre
- La section "Comportement responsive" apparaît dans le contenu narratif
- La section est présente dans la TOC (entrée "Comportement responsive")

- [ ] **Step 4 : Commit**

```bash
git add apps/docs/src/content/components/ar-breadcrumb.mdx
git commit -m "docs(breadcrumb): section comportement responsive + description raccourcie"
```

---

### Task 2 : `ar-pagination.mdx` — section responsive

**Files:**

- Modify: `apps/docs/src/content/components/ar-pagination.mdx`

- [ ] **Step 1 : Ajouter la section `## Comportement responsive` après `## Accessibilité`**

Le fichier se termine actuellement après la section `## Accessibilité`. Ajouter à la fin :

```markdown
## Comportement responsive

En dessous de **640px**, le composant réduit automatiquement le nombre de pages affichées :

- Seules les pages **précédente**, **active**, **suivante** et les deux voisines directes restent visibles.
- Les autres pages sont masquées — aucune configuration nécessaire.
```

- [ ] **Step 2 : Vérifier visuellement**

```bash
npm run dev
```

Ouvrir `http://localhost:4321/components/pagination` et vérifier :

- La section "Comportement responsive" apparaît dans le contenu narratif
- La section est présente dans la TOC

- [ ] **Step 3 : Commit**

```bash
git add apps/docs/src/content/components/ar-pagination.mdx
git commit -m "docs(pagination): section comportement responsive"
```

---

### Task 3 : `CONTRIBUTING.md` — convention + checklist

**Files:**

- Modify: `apps/docs/CONTRIBUTING.md`

- [ ] **Step 1 : Ajouter la section de convention après `## Convention — Section accessibilité dans les MDX`**

Après le bloc `---` qui clôt la section accessibilité (ligne ~378), ajouter :

```markdown
## Convention — Section comportement responsive dans les MDX

Ajouter une section `## Comportement responsive` **uniquement si le composant a un comportement
automatique distinct selon le viewport** (CSS media queries ou JS détectant le viewport).

La section décrit :

- Le seuil de breakpoint (`768px`, `640px`…)
- Ce qui change visuellement à ce seuil
- Ce qui est géré automatiquement (pas de configuration requise côté auteur)

Elle est placée **après `## Accessibilité`**. Elle suit le même style : liste de faits courts,
pas d'exemples de code.

Voir [ar-breadcrumb.mdx](./src/content/components/ar-breadcrumb.mdx) comme référence.

---
```

- [ ] **Step 2 : Ajouter un item dans la checklist composant**

Dans la section `## Checklist pour ajouter un composant`, après la ligne :

```
- [ ] Ajouter la section `## Accessibilité` dans le MDX (voir convention ci-dessus)
```

Ajouter :

```markdown
- [ ] Si le composant a un comportement adaptatif automatique : ajouter `## Comportement responsive` après `## Accessibilité` (voir convention ci-dessus)
```

- [ ] **Step 3 : Commit**

```bash
git add apps/docs/CONTRIBUTING.md
git commit -m "docs(contributing): convention section comportement responsive"
```

---

### Task 4 : Vérification finale + PR

- [ ] **Step 1 : Vérification build**

```bash
cd /path/to/ariane && npm run build --workspace=apps/docs
```

Expected: build sans erreur.

- [ ] **Step 2 : Ouvrir la PR**

```bash
git push -u origin docs/responsive-behavior
gh pr create \
  --title "docs: section comportement responsive — breadcrumb et pagination" \
  --body "$(cat <<'EOF'
## Summary

- Ajoute `## Comportement responsive` dans `ar-breadcrumb.mdx` (seuil 768px, dropdown automatique)
- Ajoute `## Comportement responsive` dans `ar-pagination.mdx` (seuil 640px, réduction automatique)
- Raccourcit la `description` du breadcrumb (contenu migré dans la nouvelle section)
- Documente la convention dans `CONTRIBUTING.md` + checklist composant

`ar-stepper` exclu : son mode mobile nécessite une refonte préalable du composant (prop `version="mobile"` à repenser).

## Test plan

- [ ] Page `/components/breadcrumb` : description courte, section "Comportement responsive" visible, entrée dans la TOC
- [ ] Page `/components/pagination` : section "Comportement responsive" visible, entrée dans la TOC
- [ ] `npm run build` passe sans erreur

🤖 Generated with [Claude Code](https://claude.ai/code)
EOF
)"
```
