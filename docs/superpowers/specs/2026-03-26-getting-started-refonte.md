# Spec — Refonte Getting Started

**Date :** 2026-03-26
**Scope :** `apps/docs/src/pages/getting-started/`, `SiteNav.astro`, `index.astro`

---

## Contexte

Les pages "Bien démarrer" actuelles (`installation.astro` + `utilisation.astro`) mélangent les
modes CDN et npm sans hiérarchie claire. La librairie recommande le CDN comme point d'entrée, mais
rien ne le met en avant. Les prérequis sont en bas de page. La page Utilisation parle d'imports JS
qui appartiennent à l'installation npm.

---

## Structure cible

### Navigation "Bien démarrer"

```
Démarrage rapide   (/getting-started/quickstart)    ← remplace Installation
Utilisation        (/getting-started/utilisation)   ← inchangée dans l'URL
```

`installation.astro` est supprimée. `quickstart.astro` est créée.

---

### Page 1 — Démarrage rapide (`quickstart.astro`)

**TOC :**

1. Prérequis
2. Via CDN _(recommandé)_
    - Autoloader
    - Bundle complet
3. Setup avancé (npm)
    - Installation
    - Import global
    - Import individuel

**Contenu par section :**

#### Prérequis (préambule, avant tout)

- Navigateur moderne supportant les Web Components (Chrome, Firefox, Safari, Edge)
- _Si npm uniquement :_ Node ≥ 22, npm ≥ 10
- Note : aucune dépendance framework — fonctionne avec Vue, React, Svelte, ou HTML pur

#### Via CDN _(recommandé)_ — badge "Recommandé"

Introductif : la méthode la plus rapide, aucun outil requis.

**Sous-section "Autoloader"** (à privilégier) :
Ne charge chaque composant que lorsqu'il est utilisé dans la page. Idéal pour la plupart des
projets CDN.

```html
<script type="module" src="https://unpkg.com/@ariane-ui/core/cdn/autoloader.js"></script>
<link rel="stylesheet" href="https://unpkg.com/@ariane-ui/core/themes/default.css" />
```

> Les deux balises sont requises : le script enregistre les composants, le CSS fournit le thème.
> Exemple d'usage immédiat :

```html
<ar-alert version="success">
    <span slot="title">Succès</span>
    <span slot="content">Opération réussie.</span>
</ar-alert>
```

**Sous-section "Bundle complet"** :
Charge tous les composants en une seule requête. Adapté si vous utilisez beaucoup de composants
ou si vous voulez éviter les imports dynamiques.

```html
<script type="module" src="https://unpkg.com/@ariane-ui/core/cdn/index.js"></script>
<link rel="stylesheet" href="https://unpkg.com/@ariane-ui/core/themes/default.css" />
```

#### Setup avancé (npm) — badge "Avec bundler"

Pour les projets utilisant Vite, Webpack, Rollup ou tout autre bundler.

**Installation :**

```bash
npm install @ariane-ui/core
```

**Import global** (tous les composants) :

```typescript
import '@ariane-ui/core';
import '@ariane-ui/core/themes/default.css';
```

**Import individuel** — badge "Tree-shaking" :

```typescript
import '@ariane-ui/core/dist/components/alert/alert.js';
import '@ariane-ui/core/themes/default.css';
```

---

### Page 2 — Utilisation (`utilisation.astro`)

**Préambule :** "Ces exemples supposent que vous avez suivi le [Démarrage rapide]. Ils
s'appliquent quel que soit le mode d'intégration (CDN ou npm)."

**TOC :**

1. Utiliser les composants
2. Attendre le chargement
3. Personnalisation CSS
4. Design Tokens

**Contenu par section :**

#### Utiliser les composants

Les composants sont des Custom Elements natifs — ils s'utilisent directement en HTML, aucun
framework requis.

```html
<ar-alert version="success">
    <span slot="title">Succès</span>
    <span slot="content">Votre message a bien été envoyé.</span>
</ar-alert>

<ar-spinner></ar-spinner>
```

#### Attendre le chargement

Les Custom Elements s'enregistrent de manière asynchrone. Si votre code JavaScript interagit
avec un composant immédiatement au chargement, attendez qu'il soit défini.

**Un composant individuel :**

```js
await customElements.whenDefined('ar-alert');
const alert = document.querySelector('ar-alert');
alert.setAttribute('version', 'success');
```

**Tous les composants Ariane présents dans la page :**

```js
const tags = [
    ...new Set(
        [...document.querySelectorAll('*')]
            .map((el) => el.localName)
            .filter((name) => name.startsWith('ar-')),
    ),
];
await Promise.all(tags.map((tag) => customElements.whenDefined(tag)));
// Tous les composants ar-* sont prêts
```

> **À venir :** Un helper `whenAllDefined()` sera exporté depuis `@ariane-ui/core` dans une
> prochaine version pour simplifier ce pattern.

#### Personnalisation CSS

Chaque composant expose des CSS Custom Properties pour adapter l'apparence sans surcharger les
styles internes. Les propriétés disponibles sont listées dans la Référence API de chaque composant.

```css
ar-alert {
    --ar-alert-info-bg: #f5f0ff;
    --ar-alert-info-icon: #7c3aed;
}
```

#### Design Tokens

Les valeurs globales (couleurs, espacements, typographie) viennent de `themes/default.css`.
Surcharger via `:root` pour modifier l'ensemble de la librairie.

```css
:root {
    --ar-color-interactive: #7c3aed;
    --ar-border-radius-md: 0.75rem;
}
```

Lien vers la page [Design Tokens] pour la liste complète.

---

## Fichiers à modifier

| Fichier                                                  | Action                                                                                                     |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `apps/docs/src/pages/getting-started/installation.astro` | **Supprimer**                                                                                              |
| `apps/docs/src/pages/getting-started/quickstart.astro`   | **Créer** (avec `currentPath="/getting-started/quickstart"`)                                               |
| `apps/docs/src/pages/getting-started/utilisation.astro`  | **Modifier** (préambule + section whenDefined + retrait imports JS + lien `/installation` → `/quickstart`) |
| `apps/docs/src/components/SiteNav.astro`                 | **Modifier** (`Installation` → `Démarrage rapide`, href mis à jour)                                        |
| `apps/docs/src/pages/index.astro`                        | **Modifier** (bouton CTA → `/getting-started/quickstart`)                                                  |

## Hors scope

- Contenu des pages de composants
- Page Foundations/Tokens
- Style visuel (pas de nouveau CSS)
- Helper `whenAllDefined()` dans le package core (issue séparée à ouvrir)
