# Guide de contribution — Site de documentation Ariane

Ce guide explique comment la documentation fonctionne et comment la modifier.
Il est destiné à toute personne qui arrive sur le projet et veut ajouter un composant,
modifier une page ou comprendre l'architecture du site.

---

## Vue d'ensemble

Le site est un **Astro 5 statique** sans framework UI côté client.
Chaque page de composant est générée automatiquement depuis deux sources :

| Source                                   | Rôle                                                 |
| ---------------------------------------- | ---------------------------------------------------- |
| `packages/core/custom-elements.json`     | API du composant (props, events, slots, CSS…)        |
| `apps/docs/src/content/components/*.mdx` | Titre, description, variantes HTML, contenu narratif |

Il n'y a **rien à dupliquer** : ajouter un composant dans le package core le fait apparaître
dans la nav et générer sa page. Le fichier MDX complète uniquement ce que le CEM ne peut pas
fournir (exemples visuels, texte explicatif).

---

## Lancer le site en local

```bash
# Depuis la racine du monorepo
npm run dev
```

> Le site lit `custom-elements.json` au démarrage. Si ce fichier n'existe pas encore,
> générez-le d'abord :
>
> ```bash
> cd packages/core && npm run build:manifest
> ```

---

## Ajouter la page d'un nouveau composant

### 1. Créer le fichier MDX

Créez `apps/docs/src/content/components/mr-<nom>.mdx` :

```yaml
---
tagName: ar-button # doit correspondre exactement au tag name Lit
title: Bouton # titre affiché en haut de la page et dans la nav
description: > # optionnel — phrase courte sous le titre
    Déclenche une action au clic.
playgroundTemplate: default # optionnel — nom de la variante utilisée dans le playground
variants:
    - name: default
      label: Par défaut
      html: '<ar-button>Valider</ar-button>'

    - name: danger
      label: Danger
      description: Utilisé pour les actions destructives.
      html: '<ar-button variant="danger">Supprimer</ar-button>'
---
Texte narratif optionnel en MDX (affiché sous la référence API).
```

C'est tout. La page `/components/button` sera générée automatiquement.

### 2. Champs du frontmatter

| Champ                | Requis | Description                                                                                                |
| -------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| `tagName`            | ✅     | Tag name du composant (`ar-button`). Doit exister dans le CEM.                                             |
| `title`              | ✅     | Titre de la page et libellé dans la nav.                                                                   |
| `description`        | —      | Phrase courte affichée sous le titre.                                                                      |
| `playgroundTemplate` | —      | `name` de la variante dont le HTML initialise le playground. Si absent, la première variante est utilisée. |
| `variants`           | —      | Liste des exemples affichés sur la page (voir ci-dessous).                                                 |

### 3. Structure d'une variante

```yaml
variants:
    - name: default # identifiant unique (utilisé dans les ancres et playgroundTemplate)
      label: Par défaut # libellé affiché comme sous-titre
      description: … # optionnel — texte explicatif en italique
      html: | # HTML brut injecté en preview et dans le bloc code
          <ar-button variant="primary">Valider</ar-button>
```

Le HTML est rendu **côté serveur** via `<Fragment set:html>`. Les custom elements
s'upgradent normalement au chargement du bundle CDN.

---

## Contrôler l'affichage d'une page

Deux modes d'affichage sont disponibles, configurés via la JSDoc du composant Lit :

| Annotation               | Mode   | Affichage                                    |
| ------------------------ | ------ | -------------------------------------------- |
| `@display demo` (défaut) | `demo` | Exemples + Playground + Référence API        |
| `@display docs`          | `docs` | Référence API uniquement (pas de playground) |

```typescript
/**
 * @display docs
 */
@customElement('ar-stepper-item')
export class MrStepperItem extends LitElement { … }
```

### Sous-composants (relation parent / enfant)

L'annotation JSDoc `@parent` dans le composant Lit est **suffisante** — aucun champ MDX supplémentaire n'est nécessaire.
Elle est lue par le CEM analyzer, propagée dans `custom-elements.json` sous la clé `x-parent`,
et utilisée par la nav et la page d'accueil pour masquer automatiquement le sous-composant de la liste principale.

```typescript
/**
 * @parent ar-stepper
 */
@customElement('ar-stepper-item')
export class MrStepperItem extends LitElement { … }
```

Après avoir ajouté l'annotation, regénérez le CEM :

```bash
cd packages/core && npm run build:manifest
```

---

## Contrôles du playground

Les contrôles sont **générés automatiquement** depuis les membres publics du composant
tels qu'ils apparaissent dans `custom-elements.json`.

| Type CEM                          | Contrôle généré                     |
| --------------------------------- | ----------------------------------- |
| `'a' \| 'b' \| …`                 | `<select>`                          |
| `'a' \| 'b' \| undefined`         | `<select>` avec option "Par défaut" |
| `boolean`                         | `<input type="checkbox">`           |
| `number` ou `number \| undefined` | `<input type="number">`             |
| autre                             | `<input type="text">`               |

Pour **exclure** un membre des contrôles, annotez-le `@ignore` dans la JSDoc :

```typescript
/** @ignore */
internalState = false;
```

---

## Architecture des fichiers

```
apps/docs/
├── src/
│   ├── components/
│   │   ├── ComponentApi.astro      ← Tables de référence API (attributs, events, slots…)
│   │   ├── Playground.astro        ← Variantes + playground + controls
│   │   ├── SiteNav.astro           ← Navigation gauche (auto-générée depuis CEM + MDX)
│   │   └── TableOfContents.astro   ← TOC sticky droite + collapse mobile
│   ├── content/
│   │   ├── config.ts               ← Schéma Zod du frontmatter MDX
│   │   └── components/             ← Un fichier MDX par composant
│   ├── layouts/
│   │   └── Layout.astro            ← Layout principal + variables CSS --doc-*
│   ├── pages/
│   │   ├── index.astro             ← Page d'accueil (liste des composants)
│   │   ├── components/[slug].astro ← Route dynamique — une page par composant
│   │   ├── getting-started/        ← Pages Installation et Utilisation
│   │   └── foundations/tokens.astro ← Page Design Tokens (auto-extraite du CSS)
│   ├── styles/
│   │   ├── doc-prose.css           ← Typographie partagée (h2→h4, p, pre, badge…)
│   │   └── doc-table.css           ← Tableaux + .doc-section-title
│   └── utils/
│       ├── cem-types.ts            ← Types TypeScript + helpers CEM partagés
│       ├── tag-name.ts             ← getSlug(), getPrefix(), groupByPrefix()
│       └── parse-tokens.ts         ← Parser CSS → catégories de tokens
└── public/
    ├── js/playground.js            ← Copier + manipulation attributs playground
    ├── cdn/                        ← Bundle CDN des composants (généré par core)
    └── themes/default.css          ← Thème CSS (généré par core)
```

### Flux de données par page composant

```
[slug].astro
  ├── manifest (@cem)        → CemDeclaration (API, membres, events…)
  │     └── getCustomElements()  → liste de tous les custom elements
  ├── getCollection('components') → données MDX (titre, variantes, description)
  ├── buildControls()        → contrôles playground depuis les membres CEM
  └── tocEntries[]           → entrées TOC (Exemples > variantes, Playground, API)
        ↓
  Layout.astro (3 colonnes)
    ├── SiteNav.astro        ← nav gauche
    ├── Playground.astro     ← variantes + playground + ComponentApi
    └── TableOfContents      ← TOC droite (slot="toc")
```

---

## Page Design Tokens

La page `/foundations/tokens` est **entièrement auto-générée** depuis
`packages/core/src/styles/themes/default.css`.

Ajouter une variable `--mr-*` dans ce fichier → elle apparaît automatiquement dans la page,
classée par catégorie (Couleurs, Typographie, Espacement, Forme, Focus).

---

## Thème de la documentation

Les variables CSS `--doc-*` contrôlent les couleurs de l'interface de documentation
(pas les composants). Elles sont définies dans `Layout.astro` :

| Variable           | Rôle                                     |
| ------------------ | ---------------------------------------- |
| `--doc-bg`         | Fond de la page                          |
| `--doc-text`       | Texte principal                          |
| `--doc-text-muted` | Texte secondaire / labels                |
| `--doc-nav-bg`     | Fond de la nav et des entêtes de tableau |
| `--doc-nav-border` | Bordure de la nav                        |
| `--doc-border`     | Bordures génériques                      |
| `--doc-header-bg`  | Fond du header                           |
| `--doc-header-h`   | Hauteur du header (défaut : `3.25rem`)   |

Le switch Light / Auto / Dark en haut à droite enregistre le choix dans
`localStorage('marianne-theme')` et applique `data-theme="light|dark"` sur `<html>`.

---

## Coloration syntaxique

La coloration est assurée par **highlight.js** chargé depuis le CDN cdnjs,
thème `github-dark`. Elle s'applique automatiquement à tous les `<pre><code class="language-html">`.

Le playground re-colore le bloc code après chaque changement de contrôle via
`hljs.highlightElement(codeEl)` (voir `public/js/playground.js`).

---

## Convention CSS

### Fichiers partagés

Ne jamais dupliquer du CSS entre fichiers `.astro`. Avant d'écrire une règle, vérifier si elle existe déjà dans un fichier partagé.

| Fichier                    | Contenu                                                                         | Utilisé par                                           |
| -------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `src/styles/doc-prose.css` | Typographie de contenu : titres, paragraphes, listes, liens, blocs code, badges | Pages getting-started et toute future page de contenu |
| `src/styles/doc-table.css` | Tableaux + `.doc-section-title`                                                 | `ComponentApi.astro`, `tokens.astro`                  |

Usage dans un `<style>` Astro :

```css
<style>
    @import '../styles/doc-prose.css';

    /* Styles spécifiques à cette page uniquement */
    .ma-classe { … }
</style>
```

### Variables CSS `--doc-*`

**Jamais de couleurs hexadécimales** dans les fichiers de la doc. Utiliser exclusivement les variables `--doc-*` définies dans `Layout.astro` (voir section "Thème de la documentation").

### Espacement entre sections

Utiliser `display: flex; flex-direction: column; gap: Xrem` sur le conteneur parent plutôt que des `margin-bottom` sur chaque enfant. La classe `.page-content` (dans `doc-prose.css`) applique ce pattern pour les pages de contenu.

### Nouvelle page de contenu

1. Utiliser `Layout.astro` avec `showNav={true}`
2. Ajouter `@import '../styles/doc-prose.css';` dans le `<style>`
3. Envelopper les sections dans `<div class="page-content">`
4. Ajouter la page dans `SiteNav.astro`

---

## Règle de mise à jour de la documentation

**Toute évolution de l'architecture du site doit être reflétée dans ce fichier.**

Lors d'une PR qui modifie l'un des éléments ci-dessous, mettre à jour la section correspondante de ce `CONTRIBUTING.md` :

- Ajout ou suppression d'un fichier CSS partagé → mettre à jour le tableau "Fichiers partagés"
- Ajout d'une nouvelle page ou section → mettre à jour l'arborescence "Architecture des fichiers"
- Changement dans le flux de données CEM → mettre à jour le schéma "Flux de données par page composant"
- Nouvelle convention ou pattern CSS → documenter dans "Convention CSS"

---

## Checklist pour ajouter un composant

- [ ] Créer `packages/core/src/components/<nom>/<nom>.ts` avec les annotations JSDoc
- [ ] Régénérer le CEM : `cd packages/core && npm run build:manifest`
- [ ] Créer `apps/docs/src/content/components/mr-<nom>.mdx` avec au moins une variante
- [ ] Lancer `npm run dev` et vérifier la page `/components/<nom>`
- [ ] Si sous-composant : ajouter uniquement `@parent mr-<parent>` dans la JSDoc (aucun champ MDX supplémentaire)

## Checklist pour modifier l'architecture du site

- [ ] La modification est-elle testée visuellement en light **et** dark mode ?
- [ ] Les couleurs utilisées sont-elles des variables `--doc-*` (pas de hex hardcodé) ?
- [ ] Le CSS ajouté existe-t-il déjà dans `doc-prose.css` ou `doc-table.css` ?
- [ ] Ce `CONTRIBUTING.md` est-il à jour avec les changements apportés ?
