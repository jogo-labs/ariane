# Références WCAG inline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un composant Astro `WcagRef` qui rend un lien + tooltip WCAG, puis l'insérer inline dans la section Accessibilité de chaque page de composant.

**Architecture:** Un seul composant `WcagRef.astro` dans `apps/docs/src/components/` reçoit un numéro de critère et un résumé, génère l'ID, construit l'URL WCAG 2.2, et rend un `<a>` + `<ar-tooltip>` côte à côte. Chaque fichier MDX qui en a besoin l'importe explicitement après son frontmatter.

**Tech Stack:** Astro 5 (composant `.astro`), MDX (content collections), `ar-tooltip` (web component Ariane)

---

## Fichiers

| Action   | Chemin                                                                                |
| -------- | ------------------------------------------------------------------------------------- |
| Créer    | `apps/docs/src/components/WcagRef.astro`                                              |
| Modifier | `apps/docs/src/content/components/ar-alert.mdx`                                       |
| Modifier | `apps/docs/src/content/components/ar-breadcrumb.mdx`                                  |
| Modifier | `apps/docs/src/content/components/ar-dialog.mdx`                                      |
| Modifier | `apps/docs/src/content/components/ar-dropdown.mdx`                                    |
| Modifier | `apps/docs/src/content/components/ar-pagination.mdx`                                  |
| Modifier | `apps/docs/src/content/components/ar-progressbar.mdx`                                 |
| Modifier | `apps/docs/src/content/components/ar-spinner.mdx`                                     |
| Modifier | `apps/docs/src/content/components/ar-stepper.mdx`                                     |
| Modifier | `apps/docs/src/content/components/ar-tooltip.mdx`                                     |
| Modifier | `/Users/jon/Code/Active_projects/ariane/.claude/skills/ariane-new-component/SKILL.md` |
| Modifier | `/Users/jon/Code/Active_projects/ariane/.claude/skills/ariane-write-docs/SKILL.md`    |

---

## Task 1 : Composant `WcagRef.astro`

**Files:**

- Create: `apps/docs/src/components/WcagRef.astro`

- [ ] **Step 1 : Créer le composant**

Créer `apps/docs/src/components/WcagRef.astro` avec ce contenu exact :

```astro
---
interface Props {
    criterion: string;
    summary: string;
}

const { criterion, summary } = Astro.props;

const slugs: Record<string, string> = {
    '1.3.1': 'info-and-relationships',
    '1.4.13': 'content-on-hover-or-focus',
    '2.1.1': 'keyboard',
    '2.1.2': 'no-keyboard-trap',
    '2.4.8': 'location',
    '3.2.2': 'on-input',
    '4.1.2': 'name-role-value',
    '4.1.3': 'status-messages',
};

const id = `wcag-${criterion.replace(/\./g, '-')}`;
const slug = slugs[criterion] ?? criterion.replace(/\./g, '-');
const href = `https://www.w3.org/WAI/WCAG22/Understanding/${slug}/`;
---

<a
    {id}
    {href}
    target="_blank"
    rel="noopener"
    style="cursor:help; text-decoration:underline dotted;"
>WCAG {criterion}</a><ar-tooltip for={id}>{summary}</ar-tooltip>
```

> **Note `ar-tooltip` :** `<ar-tooltip>` est un custom element Ariane. Il n'y a pas d'import Astro à écrire — le layout `Layout.astro` charge déjà `/cdn/index.js` qui enregistre tous les composants Ariane globalement sur chaque page. `WcagRef.astro` peut utiliser `<ar-tooltip>` directement dans son template sans script supplémentaire.

> **Note rendu :** Pas d'espace entre `</a>` et `<ar-tooltip>` — évite un espace visible entre le lien et le tooltip dans le rendu HTML.

- [ ] **Step 2 : Vérifier que le dev server démarre sans erreur**

```bash
npm run dev
```

Attendu : compilation sans erreur TypeScript ni Astro. Ouvrir n'importe quelle page composant pour confirmer qu'aucune régression n'est introduite.

- [ ] **Step 3 : Commiter**

```bash
git add apps/docs/src/components/WcagRef.astro
git commit -m "feat(docs): composant WcagRef — lien + tooltip pour critères WCAG"
```

---

## Task 2 : `ar-alert` — critère 4.1.3

**Files:**

- Modify: `apps/docs/src/content/components/ar-alert.mdx`

**Critère :** 4.1.3 Status Messages — les messages de statut doivent être annoncés aux technologies d'assistance sans déplacer le focus.

- [ ] **Step 1 : Ajouter l'import après le frontmatter**

Dans `ar-alert.mdx`, après la ligne `---` qui clôt le frontmatter (ligne ~35), ajouter :

```mdx
import WcagRef from '../../components/WcagRef.astro';
```

Le fichier commence ainsi :

```mdx
---
tagName: ar-alert
...
---

import WcagRef from '../../components/WcagRef.astro';

## Accessibilité
```

- [ ] **Step 2 : Insérer la référence dans la bullet `role="alert"`**

Remplacer la première bullet de "Pris en charge automatiquement" :

**Avant :**

```mdx
- `role="alert"` (interruption immédiate) ou `role="status"` (annonce polie) posé sur
  l'hôte selon le variant — `info` → `status`, tous les autres → `alert`.
```

**Après :**

```mdx
- `role="alert"` (interruption immédiate) ou `role="status"` (annonce polie) posé sur
  l'hôte selon le variant — `info` → `status`, tous les autres → `alert` — conforme
    <WcagRef
        criterion="4.1.3"
        summary="Status Messages : les messages de statut doivent être annoncés aux technologies d'assistance sans déplacer le focus."
    />
```

- [ ] **Step 3 : Vérifier visuellement**

Ouvrir `http://localhost:4321/components/alert` dans le navigateur. Vérifier :

- Le texte « WCAG 4.1.3 » apparaît en fin de bullet avec underline pointillé.
- Au survol ou focus : tooltip « Status Messages : … » visible.
- Le lien s'ouvre dans un nouvel onglet vers `https://www.w3.org/WAI/WCAG22/Understanding/status-messages/`.

- [ ] **Step 4 : Commiter**

```bash
git add apps/docs/src/content/components/ar-alert.mdx
git commit -m "docs(alert): référence WCAG 4.1.3 inline dans la section accessibilité"
```

---

## Task 3 : `ar-breadcrumb` — critères 1.3.1 et 2.4.8

**Files:**

- Modify: `apps/docs/src/content/components/ar-breadcrumb.mdx`

- [ ] **Step 1 : Ajouter l'import**

Après le frontmatter de `ar-breadcrumb.mdx` :

```mdx
import WcagRef from '../../components/WcagRef.astro';
```

- [ ] **Step 2 : Insérer 1.3.1 dans la bullet `role="navigation"`**

**Avant :**

```mdx
- `role="navigation"` et `aria-labelledby` posés sur le conteneur — la région est identifiable
  par les lecteurs d'écran sans configuration supplémentaire.
```

**Après :**

```mdx
- `role="navigation"` et `aria-labelledby` posés sur le conteneur — la région est identifiable
  par les lecteurs d'écran sans configuration supplémentaire
  (<WcagRef criterion="1.3.1" summary="Info and Relationships : les relations et structures visuelles doivent être déterminables par programmation ou disponibles en texte." />).
```

- [ ] **Step 3 : Insérer 2.4.8 dans la bullet `aria-current`**

**Avant :**

```mdx
- Le dernier item est automatiquement rendu comme texte (pas de lien), quel que soit son
  attribut `href`. `aria-current="page"` lui est appliqué automatiquement.
```

**Après :**

```mdx
- Le dernier item est automatiquement rendu comme texte (pas de lien), quel que soit son
  attribut `href`. `aria-current="page"` lui est appliqué automatiquement — conforme
    <WcagRef
        criterion="2.4.8"
        summary="Location : l'utilisateur doit pouvoir situer sa position dans un ensemble de pages."
    />
```

- [ ] **Step 4 : Vérifier visuellement**

Ouvrir `http://localhost:4321/components/breadcrumb`. Vérifier les deux références WCAG (1.3.1 et 2.4.8) avec tooltip et lien corrects.

- [ ] **Step 5 : Commiter**

```bash
git add apps/docs/src/content/components/ar-breadcrumb.mdx
git commit -m "docs(breadcrumb): références WCAG 1.3.1 et 2.4.8 inline"
```

---

## Task 4 : `ar-dialog` — critères 2.1.2 et 3.2.2

**Files:**

- Modify: `apps/docs/src/content/components/ar-dialog.mdx`

- [ ] **Step 1 : Ajouter l'import**

Après le frontmatter de `ar-dialog.mdx` :

```mdx
import WcagRef from '../../components/WcagRef.astro';
```

- [ ] **Step 2 : Insérer 2.1.2 dans la bullet focus trap**

**Avant :**

```mdx
- Le focus est déplacé à l'ouverture sur l'élément portant `autofocus`, ou à défaut sur le premier élément focalisable, ou sur le bouton de fermeture si aucun n'est présent.
```

**Après :**

```mdx
- Le focus est déplacé à l'ouverture sur l'élément portant `autofocus`, ou à défaut sur le premier élément focalisable, ou sur le bouton de fermeture si aucun n'est présent — conforme
    <WcagRef
        criterion="2.1.2"
        summary="No Keyboard Trap : le focus clavier peut toujours quitter un composant via les touches standard (Escape, Tab)."
    />
```

- [ ] **Step 3 : Insérer 3.2.2 dans la bullet Escape**

**Avant :**

```mdx
- La touche Escape passe par `ar-dialog-hide` : la fermeture peut donc être interceptée avec `event.preventDefault()`.
```

**Après :**

```mdx
- La touche Escape passe par `ar-dialog-hide` : la fermeture peut donc être interceptée avec `event.preventDefault()` — comportement prévisible conforme
    <WcagRef
        criterion="3.2.2"
        summary="On Input : modifier un composant UI ne doit pas provoquer de changement de contexte inattendu sans en avertir l'utilisateur au préalable."
    />
```

- [ ] **Step 4 : Vérifier visuellement**

Ouvrir `http://localhost:4321/components/dialog`. Vérifier les deux références WCAG.

- [ ] **Step 5 : Commiter**

```bash
git add apps/docs/src/content/components/ar-dialog.mdx
git commit -m "docs(dialog): références WCAG 2.1.2 et 3.2.2 inline"
```

---

## Task 5 : `ar-dropdown` — critères 4.1.2 et 2.1.1

**Files:**

- Modify: `apps/docs/src/content/components/ar-dropdown.mdx`

- [ ] **Step 1 : Ajouter l'import**

Après le frontmatter de `ar-dropdown.mdx` :

```mdx
import WcagRef from '../../components/WcagRef.astro';
```

- [ ] **Step 2 : Insérer 4.1.2 dans la bullet `aria-haspopup`**

**Avant :**

```mdx
- Le trigger reçoit `aria-haspopup="true"` et `aria-expanded` synchronisé à l'état ouvert/fermé.
```

**Après :**

```mdx
- Le trigger reçoit `aria-haspopup="true"` et `aria-expanded` synchronisé à l'état ouvert/fermé —
    <WcagRef
        criterion="4.1.2"
        summary="Name, Role, Value : tout composant UI doit exposer son nom, rôle et valeur (états inclus) aux technologies d'assistance."
    />
```

- [ ] **Step 3 : Insérer 2.1.1 dans la bullet navigation clavier**

**Avant :**

```mdx
- Navigation clavier complète : `↑` `↓` `Home` `End` pour déplacer le focus, `Escape` et `Tab` pour fermer.
```

**Après :**

```mdx
- Navigation clavier complète : `↑` `↓` `Home` `End` pour déplacer le focus, `Escape` et `Tab` pour fermer —
    <WcagRef
        criterion="2.1.1"
        summary="Keyboard : toutes les fonctionnalités doivent être accessibles au clavier sans temporisation spécifique."
    />
```

- [ ] **Step 4 : Vérifier visuellement**

Ouvrir `http://localhost:4321/components/dropdown`. Vérifier les deux références WCAG.

- [ ] **Step 5 : Commiter**

```bash
git add apps/docs/src/content/components/ar-dropdown.mdx
git commit -m "docs(dropdown): références WCAG 4.1.2 et 2.1.1 inline"
```

---

## Task 6 : `ar-pagination` — critère 4.1.2

**Files:**

- Modify: `apps/docs/src/content/components/ar-pagination.mdx`

- [ ] **Step 1 : Ajouter l'import**

Après le frontmatter de `ar-pagination.mdx` :

```mdx
import WcagRef from '../../components/WcagRef.astro';
```

- [ ] **Step 2 : Insérer 4.1.2 dans la bullet `aria-disabled`**

**Avant :**

```mdx
- Les boutons "précédent" et "suivant" ont `aria-disabled` synchronisé avec leur état désactivé.
```

**Après :**

```mdx
- Les boutons "précédent" et "suivant" ont `aria-disabled` synchronisé avec leur état désactivé —
    <WcagRef
        criterion="4.1.2"
        summary="Name, Role, Value : tout composant UI doit exposer son nom, rôle et valeur (états inclus) aux technologies d'assistance."
    />
```

- [ ] **Step 3 : Vérifier visuellement**

Ouvrir `http://localhost:4321/components/pagination`. Vérifier la référence WCAG 4.1.2.

- [ ] **Step 4 : Commiter**

```bash
git add apps/docs/src/content/components/ar-pagination.mdx
git commit -m "docs(pagination): référence WCAG 4.1.2 inline"
```

---

## Task 7 : `ar-progressbar` — critère 4.1.2

**Files:**

- Modify: `apps/docs/src/content/components/ar-progressbar.mdx`

- [ ] **Step 1 : Ajouter l'import**

Après le frontmatter de `ar-progressbar.mdx` :

```mdx
import WcagRef from '../../components/WcagRef.astro';
```

- [ ] **Step 2 : Insérer 4.1.2 dans la bullet `role="progressbar"`**

**Avant :**

```mdx
- `role="progressbar"`, `aria-valuenow`, `aria-valuemin` et `aria-valuemax` posés sur la barre —
  la progression est vocalisée automatiquement par les lecteurs d'écran.
```

**Après :**

```mdx
- `role="progressbar"`, `aria-valuenow`, `aria-valuemin` et `aria-valuemax` posés sur la barre —
  la progression est vocalisée automatiquement par les lecteurs d'écran
  (<WcagRef criterion="4.1.2" summary="Name, Role, Value : tout composant UI doit exposer son nom, rôle et valeur (états inclus) aux technologies d'assistance." />).
```

- [ ] **Step 3 : Vérifier visuellement**

Ouvrir `http://localhost:4321/components/progressbar`. Vérifier la référence WCAG 4.1.2.

- [ ] **Step 4 : Commiter**

```bash
git add apps/docs/src/content/components/ar-progressbar.mdx
git commit -m "docs(progressbar): référence WCAG 4.1.2 inline"
```

---

## Task 8 : `ar-spinner` — critère 4.1.3

**Files:**

- Modify: `apps/docs/src/content/components/ar-spinner.mdx`

- [ ] **Step 1 : Ajouter l'import**

Après le frontmatter de `ar-spinner.mdx` :

```mdx
import WcagRef from '../../components/WcagRef.astro';
```

- [ ] **Step 2 : Insérer 4.1.3 dans la bullet `role="alert"`**

**Avant :**

```mdx
- L'animation SVG est masquée aux lecteurs d'écran (`aria-hidden`). Un `<div role="alert">`
  invisible annonce les changements d'état — le passage "en cours → terminé" est vocalisé
  sans intervention supplémentaire.
```

**Après :**

```mdx
- L'animation SVG est masquée aux lecteurs d'écran (`aria-hidden`). Un `<div role="alert">`
  invisible annonce les changements d'état — le passage "en cours → terminé" est vocalisé
  sans intervention supplémentaire — conforme
    <WcagRef
        criterion="4.1.3"
        summary="Status Messages : les messages de statut doivent être annoncés aux technologies d'assistance sans déplacer le focus."
    />
```

- [ ] **Step 3 : Vérifier visuellement**

Ouvrir `http://localhost:4321/components/spinner`. Vérifier la référence WCAG 4.1.3.

- [ ] **Step 4 : Commiter**

```bash
git add apps/docs/src/content/components/ar-spinner.mdx
git commit -m "docs(spinner): référence WCAG 4.1.3 inline"
```

---

## Task 9 : `ar-stepper` — critère 1.3.1

**Files:**

- Modify: `apps/docs/src/content/components/ar-stepper.mdx`

- [ ] **Step 1 : Ajouter l'import**

Après le frontmatter de `ar-stepper.mdx` :

```mdx
import WcagRef from '../../components/WcagRef.astro';
```

- [ ] **Step 2 : Insérer 1.3.1 dans la bullet `role="navigation"`**

**Avant :**

```mdx
- `role="navigation"` et `aria-labelledby` posés sur le conteneur — la région est annoncée
  et identifiable par les lecteurs d'écran.
```

**Après :**

```mdx
- `role="navigation"` et `aria-labelledby` posés sur le conteneur — la région est annoncée
  et identifiable par les lecteurs d'écran
  (<WcagRef criterion="1.3.1" summary="Info and Relationships : les relations et structures visuelles doivent être déterminables par programmation ou disponibles en texte." />).
```

- [ ] **Step 3 : Vérifier visuellement**

Ouvrir `http://localhost:4321/components/stepper`. Vérifier la référence WCAG 1.3.1.

- [ ] **Step 4 : Commiter**

```bash
git add apps/docs/src/content/components/ar-stepper.mdx
git commit -m "docs(stepper): référence WCAG 1.3.1 inline"
```

---

## Task 10 : `ar-tooltip` — migration de la référence 1.4.13 vers `WcagRef`

**Files:**

- Modify: `apps/docs/src/content/components/ar-tooltip.mdx`

La référence WCAG 1.4.13 existe déjà dans ce fichier, en deux endroits : une fois dans le frontmatter (description) et une fois dans la section Accessibilité sous forme de bullet. On migre uniquement la bullet narrative vers `WcagRef`. La description du frontmatter et les références dans les variants HTML sont laissées telles quelles (elles ne sont pas du MDX narratif).

- [ ] **Step 1 : Ajouter l'import**

Après le frontmatter de `ar-tooltip.mdx` (après la ligne `---` de fermeture) :

```mdx
import WcagRef from '../../components/WcagRef.astro';
```

- [ ] **Step 2 : Remplacer la bullet WCAG 1.4.13 dans la section Accessibilité**

**Avant (ligne ~75) :**

```mdx
- **WCAG 1.4.13 — Content on Hover or Focus :** déplacer le pointeur du trigger vers la bulle annule le timer de fermeture ; la bulle reste ouverte tant que le pointeur y séjourne.
```

**Après :**

```mdx
- <WcagRef
      criterion="1.4.13"
      summary="Content on Hover or Focus : le contenu affiché au survol ou au focus doit être persistant, escamotable et consultable au pointeur."
  />
  : déplacer le pointeur du trigger vers la bulle annule le timer de fermeture ; la bulle reste
  ouverte tant que le pointeur y séjourne.
```

- [ ] **Step 3 : Vérifier visuellement**

Ouvrir `http://localhost:4321/components/tooltip`. Vérifier :

- La bullet 1.4.13 affiche le lien WCAG + tooltip.
- Les autres occurrences de "WCAG 1.4.13" dans les variants HTML (démo abbr, description des délais) sont inchangées.

- [ ] **Step 4 : Commiter**

```bash
git add apps/docs/src/content/components/ar-tooltip.mdx
git commit -m "docs(tooltip): migration référence WCAG 1.4.13 vers WcagRef"
```

---

## Task 11 : Mettre à jour le skill `ariane-new-component`

**Files:**

- Modify: `.claude/skills/ariane-new-component/SKILL.md`

Ajouter une section **Accessibilité** à la fin du fichier. Cette section guide la réflexion sur les critères WCAG lors de la conception d'un nouveau composant.

- [ ] **Step 1 : Ajouter la section à la fin du fichier**

Ouvrir `.claude/skills/ariane-new-component/SKILL.md` et ajouter après la section `## Export` :

```markdown
## Accessibilité

Avant d'implémenter un composant, identifier les critères WCAG applicables au pattern UI. Documenter dans le plan d'implémentation :

- Le pattern ARIA attendu (rôle, états, propriétés ARIA)
- Les critères WCAG couverts automatiquement par le composant
- Les responsabilités laissées à l'auteur de la page

Critères courants par pattern :

| Pattern UI                                | Critères WCAG clés                            |
| ----------------------------------------- | --------------------------------------------- |
| Disclosure / toggle (dropdown, accordion) | 4.1.2 `aria-expanded`, 2.1.1 keyboard         |
| Navigation landmark                       | 1.3.1 `role="navigation"` + `aria-labelledby` |
| Live region / status                      | 4.1.3 status messages                         |
| Dialog / modal                            | 2.1.2 no keyboard trap                        |
| Item courant (breadcrumb, stepper)        | 2.4.8 `aria-current`                          |
| Contenu au survol / focus                 | 1.4.13 hover/focus persistence                |
| Composant interactif avec état            | 4.1.2 name, role, value                       |

La page "Understanding" correspondante est linkable via le composant `WcagRef` dans la doc (voir skill `ariane-write-docs`).
```

- [ ] **Step 2 : Commiter**

```bash
git add .claude/skills/ariane-new-component/SKILL.md
git commit -m "docs(skills): section accessibilité WCAG dans ariane-new-component"
```

---

## Task 12 : Mettre à jour le skill `ariane-write-docs`

**Files:**

- Modify: `.claude/skills/ariane-write-docs/SKILL.md`

Ajouter une section **Références WCAG** qui explique comment utiliser `WcagRef` dans les fichiers MDX de composants.

- [ ] **Step 1 : Ajouter la section à la fin du fichier**

Ouvrir `.claude/skills/ariane-write-docs/SKILL.md` et ajouter après la dernière section existante :

````markdown
## Références WCAG

La section "Pris en charge automatiquement" de chaque composant doit référencer les critères WCAG implémentés via le composant `WcagRef`.

### Import

Ajouter après le frontmatter de chaque fichier MDX qui utilise des références WCAG :

```mdx
import WcagRef from '../../components/WcagRef.astro';
```

### Usage inline

Placer `<WcagRef>` directement dans la bullet qui décrit le comportement couvert. Une référence par comportement distinct.

```mdx
- `role="alert"` conforme
    <WcagRef
        criterion="4.1.3"
        summary="Status Messages : les messages de statut doivent être annoncés aux technologies d'assistance sans déplacer le focus."
    />
```

### Props

| Prop        | Type     | Exemple                   |
| ----------- | -------- | ------------------------- |
| `criterion` | `string` | `"4.1.2"`                 |
| `summary`   | `string` | `"Name, Role, Value : …"` |

Le composant (`apps/docs/src/components/WcagRef.astro`) génère l'ID automatiquement et construit l'URL vers la page "Understanding" WCAG 2.2. `ar-tooltip` est disponible globalement via le layout — aucun import supplémentaire n'est nécessaire.

### Critères déjà mappés

Voir la table `slugs` dans `WcagRef.astro` pour la liste des critères supportés : 1.3.1, 1.4.13, 2.1.1, 2.1.2, 2.4.8, 3.2.2, 4.1.2, 4.1.3.
````

- [ ] **Step 2 : Commiter**

```bash
git add .claude/skills/ariane-write-docs/SKILL.md
git commit -m "docs(skills): instructions WcagRef dans ariane-write-docs"
```

---

## Vérification finale

- [ ] Lancer `npm run build` depuis la racine du monorepo et vérifier qu'il n'y a aucune erreur TypeScript ni Astro.

```bash
npm run build
```

Attendu : build complet sans erreur. Toute erreur TypeScript sur `WcagRef.astro` (props manquants, mauvais types) sera signalée ici.
