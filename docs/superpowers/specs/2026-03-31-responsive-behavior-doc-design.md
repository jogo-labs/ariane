# Comportement responsive — Documentation composants

## Contexte

Les composants `ar-breadcrumb` et `ar-pagination` ont un comportement adaptatif au viewport
géré automatiquement par le composant. Ce comportement n'est pas documenté dans les pages
de composants du site de doc. La section `## Accessibilité` établie dans PR #49 sert de
modèle pour cette nouvelle section `## Comportement responsive`.

Le composant `ar-stepper` a également un mode mobile, mais il sera exclu de cette PR car
son architecture (prop `version="mobile"` manuelle) doit être refactorisée dans une PR dédiée
avant d'être documentée.

---

## Périmètre

| Fichier                                              | Action                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------- |
| `apps/docs/src/content/components/ar-breadcrumb.mdx` | Raccourcir `description` + ajouter `## Comportement responsive` |
| `apps/docs/src/content/components/ar-pagination.mdx` | Ajouter `## Comportement responsive`                            |
| `apps/docs/CONTRIBUTING.md`                          | Mentionner la convention dans la checklist composant            |

---

## Contenu

### `ar-breadcrumb.mdx`

**`description`** (frontmatter) — remplacer par :

```
Fil d'ariane accessible avec affichage adaptatif mobile/desktop.
```

**Section `## Comportement responsive`** — placée après `## Accessibilité` :

```markdown
## Comportement responsive

En dessous de **768px**, le composant bascule automatiquement vers un affichage condensé :

- Les liens intermédiaires sont masqués derrière un **dropdown**.
- Seul le **premier lien** reste visible, rendu sous forme de bouton "Retour".
- Le dropdown expose son état via `aria-expanded` — le comportement clavier et vocal est géré automatiquement.

Pour observer ce rendu, utiliser les DevTools du navigateur en mode responsive.
```

---

### `ar-pagination.mdx`

**Section `## Comportement responsive`** — placée après `## Accessibilité` :

```markdown
## Comportement responsive

En dessous de **640px**, le composant réduit automatiquement le nombre de pages affichées :

- Seules les pages **précédente**, **active**, **suivante** et les deux voisines directes restent visibles.
- Les autres pages sont masquées — aucune configuration nécessaire.
```

---

### `apps/docs/CONTRIBUTING.md`

Dans la checklist composant, ajouter après la ligne sur `## Accessibilité` :

```
- [ ] Si le composant a un comportement distinct selon le viewport : section `## Comportement responsive`
      après `## Accessibilité`, décrivant le seuil, ce qui change visuellement, et ce qui est automatique.
```

---

## Convention établie

- Nom de section : `## Comportement responsive`
- Position : après `## Accessibilité`
- Condition d'inclusion : uniquement si le composant a un comportement **automatique** distinct selon le viewport
- Style : même structure que `## Accessibilité` — liste de faits, pas d'exemples de code
