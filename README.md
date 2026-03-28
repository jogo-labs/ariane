# Ariane

Bibliothèque de composants web accessibles, construite avec **Lit 3** et **TypeScript**.

```html
<ar-button variant="filled">Valider</ar-button>
<ar-alert version="success">
    <span slot="title">Succès</span>
    <span slot="content">Opération réussie.</span>
</ar-alert>
```

---

## Ce que c'est

Ariane est une **librairie de composants web accessibles** — une fondation sur laquelle construire un design system,
pas un design system en soi. Les composants sont des **Custom Elements** natifs : ils fonctionnent dans n'importe
quel framework (React, Vue, Angular, Svelte) ou sans framework du tout.

Composants disponibles : `ar-alert`, `ar-breadcrumb`, `ar-button`, `ar-pagination`,
`ar-progressbar`, `ar-spinner`, `ar-stepper` / `ar-stepper-item`.

---

## Installation

### Via CDN — Autoloader _(recommandé)_

Ne charge chaque composant que lorsqu'il est utilisé dans la page. Aucun outil requis.

```html
<script type="module" src="https://unpkg.com/@ariane-ui/core/cdn/autoloader.js"></script>
<link rel="stylesheet" href="https://unpkg.com/@ariane-ui/core/themes/default.css" />
```

### Via CDN — Bundle complet

Charge tous les composants en une seule requête.

```html
<script type="module" src="https://unpkg.com/@ariane-ui/core/cdn/index.js"></script>
<link rel="stylesheet" href="https://unpkg.com/@ariane-ui/core/themes/default.css" />
```

### Via npm _(avec bundler)_

```bash
npm install @ariane-ui/core
```

```typescript
import '@ariane-ui/core';
import '@ariane-ui/core/themes/default.css';

// ou import individuel (tree-shaking)
import '@ariane-ui/core/dist/components/button/button.js';
```

---

## Personnalisation

Les composants exposent des **CSS Custom Properties** pour la personnalisation :

```css
ar-button {
    --ar-button-bg: #7c3aed;
    --ar-button-border-radius: 2rem;
}
```

Les valeurs par défaut viennent du fichier de thème (`themes/default.css`).
Consultez la page **Design Tokens** du site de documentation pour la liste complète.

---

## Stack technique

| Outil                                                                                                                                                             | Rôle                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| [Lit 3](https://lit.dev/)                                                                                                                                         | Base des composants (Shadow DOM, réactivité) |
| [TypeScript 6](https://www.typescriptlang.org/)                                                                                                                   | Typage strict                                |
| [esbuild](https://esbuild.github.io/)                                                                                                                             | Build rapide — bundles npm et CDN            |
| [@custom-elements-manifest/analyzer](https://custom-elements-manifest.open-wc.org/)                                                                               | Génération du manifest CEM depuis la JSDoc   |
| [Vitest](https://vitest.dev/) + [happy-dom](https://github.com/capricorn86/happy-dom)                                                                             | Tests unitaires                              |
| [@web/test-runner](https://modern-web.dev/docs/test-runner/overview/) + [Playwright](https://playwright.dev/) + [axe-core](https://github.com/dequelabs/axe-core) | Tests browser et a11y                        |
| [Astro 6](https://astro.build/)                                                                                                                                   | Site de documentation statique               |
| npm workspaces + [Turborepo](https://turbo.build/)                                                                                                                | Monorepo                                     |

---

## Contribution

Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour la philosophie et le workflow de contribution.
Pour le setup et les commandes de développement, voir [DEVELOPMENT.md](DEVELOPMENT.md).

---

## Licence

MIT
