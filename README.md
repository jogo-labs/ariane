# Ariane

Bibliothèque de composants web accessibles, construite avec **Lit 3** et **TypeScript**.

```html
<ar-button variant="filled">Valider</ar-button>
<ar-alert variant="success">Opération réussie</ar-alert>
```

---

## Ce que c'est

Ariane est un **Design System** : un ensemble de composants UI réutilisables, autonomes et accessibles.
Les composants sont des **Custom Elements** natifs — ils fonctionnent dans n'importe quel framework
(React, Vue, Angular, Svelte) ou sans framework du tout.

Composants disponibles : `ar-alert`, `ar-breadcrumb`, `ar-button`, `ar-pagination`,
`ar-progressbar`, `ar-spinner`, `ar-stepper` / `ar-stepper-item`.

---

## Structure du monorepo

```
Ariane/
├── packages/
│   └── core/          # @ariane-ui/core — la bibliothèque de composants
└── apps/
    └── docs/          # Site de documentation (Astro 5)
```

Le monorepo est géré par **npm workspaces** et orchestré par **Turborepo**.

---

## Démarrage rapide

### Prérequis

- Node ≥ 20
- npm ≥ 10

### Installation

```bash
git clone https://github.com/jonTravens/Ariane
cd Ariane
npm install
```

### Développement

```bash
npm run dev        # Lance le watch du package core + le serveur Astro en parallèle
```

Le site de documentation est disponible sur `http://localhost:4321`.

> Au premier lancement, le CEM (`custom-elements.json`) doit exister.
> Il est généré automatiquement par `npm run dev`. Si vous partez de zéro,
> lancez d'abord : `cd packages/core && npm run build:manifest`

### Build complet

```bash
npm run build      # Build tous les packages et le site de doc
```

---

## Commandes racine

| Commande                  | Description                                          |
| ------------------------- | ---------------------------------------------------- |
| `npm run dev`             | Mode développement parallèle (core watch + docs dev) |
| `npm run build`           | Build complet (core + docs)                          |
| `npm run test`            | Lance tous les tests                                 |
| `npm run lint`            | ESLint sur tous les packages                         |
| `npm run format`          | Prettier sur tous les fichiers                       |
| `npm run create mr-<nom>` | Scaffold un nouveau composant                        |

---

## Utilisation

### Via CDN (sans bundler)

```html
<script type="module" src="https://unpkg.com/@ariane-ui/core/cdn/index.js"></script>
<link rel="stylesheet" href="https://unpkg.com/@ariane-ui/core/themes/default.css" />

<ar-button>Cliquez-moi</ar-button>
```

### Via npm (avec bundler)

```bash
npm install @ariane-ui/core
```

```typescript
import '@ariane-ui/core'; // enregistre tous les composants
import '@ariane-ui/core/themes/default.css'; // thème par défaut

// ou import individuel (tree-shaking)
import '@ariane-ui/core/dist/components/button/button.js';
```

### Autoloader CDN

Le bundle CDN inclut un autoloader qui ne charge chaque composant que quand il est utilisé :

```html
<script type="module" src="/cdn/autoloader.js"></script>
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

| Outil                                                                                 | Rôle                                         |
| ------------------------------------------------------------------------------------- | -------------------------------------------- |
| [Lit 3](https://lit.dev/)                                                             | Base des composants (Shadow DOM, réactivité) |
| [TypeScript 5](https://www.typescriptlang.org/)                                       | Typage strict                                |
| [esbuild](https://esbuild.github.io/)                                                 | Build rapide — bundles npm et CDN            |
| [@custom-elements-manifest/analyzer](https://custom-elements-manifest.open-wc.org/)   | Génération du manifest CEM depuis la JSDoc   |
| [Vitest](https://vitest.dev/) + [happy-dom](https://github.com/capricorn86/happy-dom) | Tests unitaires                              |
| [Astro 5](https://astro.build/)                                                       | Site de documentation statique               |
| npm workspaces + [Turborepo](https://turbo.build/)                                    | Monorepo                                     |

---

## Contribution

Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour les conventions et le workflow.
Pour modifier le site de documentation, voir [apps/docs/CONTRIBUTING.md](apps/docs/CONTRIBUTING.md).

---

## Licence

MIT
