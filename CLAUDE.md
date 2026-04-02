# Ariane

Web components library pour patterns UI accessibles, Lit 3 + TypeScript. Monorepo npm workspaces orchestré par Turborepo. Pas un design system — une fondation pour en construire un.

## Key Directories

- `packages/core/src/components/` — composants LitElement (`ar-<name>.ts`, styles, tests)
- `packages/core/src/index.ts` — export barrel
- `apps/docs/` — site documentation Astro + MDX

## Standards

- Prettier : 100 char, 4 spaces, single quotes
- Toujours `import type` pour les imports de types
- Conventional Commits (commitlint + Husky)
- CSS tokens `--doc-*` (`apps/docs/`) ne forcent jamais un ajout dans `packages/core`

## Common Commands

```bash
npm run dev                # Watch core + docs en parallèle
npm run test               # Vitest passe unique (racine)
npm run test:all           # Vitest + WTR browser
npm run create ar-<nom>    # Scaffold nouveau composant
npm run build:manifest     # Regénère custom-elements.json
```

## Git Workflow

- Branches : `feat/<desc>`, `fix/<desc>`, `chore/<desc>` créées depuis `dev`
- PRs vers `dev` — jamais de push direct sur `main`, et sur `dev` demander l'autorisation
- `main` ← PR depuis `dev` uniquement, pour les releases
- Release : tag `vX.Y.Z` → CI publie sur npm + crée la GitHub Release automatiquement
- Tag npm : `-alpha.*` → `alpha`, `-beta.*` → `beta`, stable → `latest`

## Notes

Toujours vérifier la branche active avant de commiter — ne jamais commiter sur `main`, et si `dev` est active, demander confirmation à l'utilsateur.

Dépréciation : `warnDeprecated(tag, member, msg)` depuis `src/utils/deprecated.ts` + `@deprecated` JSDoc — pas nécessaire en alpha.
Si un correctif échoue 3 fois de suite, remettre en cause la demande avant de continuer.
