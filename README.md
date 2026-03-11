# mARIAnne — Web Components Library

Librairie de web components accessibles.

## Stack

- **Runtime** : [Lit 3](https://lit.dev/) + TypeScript 5
- **Build** : [esbuild](https://esbuild.github.io/) (bundle npm + CDN)
- **Manifest** : [@custom-elements-manifest/analyzer](https://custom-elements-manifest.open-wc.org/)
- **Tests** : [Vitest](https://vitest.dev/) + [happy-dom](https://github.com/capricorn86/happy-dom)
- **Docs** : [Astro 5](https://astro.build/)
- **Monorepo** : npm workspaces + [Turborepo](https://turbo.build/)

## Démarrage rapide

```bash
npm install
npm run build   # Build tout le monorepo
npm run dev     # Dev server
npm run test    # Tests
```

## Créer un composant

```bash
npm run create mr-mon-composant
```

## Structure

```
packages/
  core/          → Lib de composants (@marianne/core)
apps/
  docs/          → Site de documentation (Astro)
```

## Outputs

| Répertoire | Usage |
|---|---|
| `packages/core/dist/` | Bundle npm (lit external, tree-shakeable) |
| `packages/core/cdn/`  | Bundle CDN (auto-contenu, minifié) |
| `packages/core/dist/custom-elements.json` | Manifest CEM (source de vérité pour la doc) |
