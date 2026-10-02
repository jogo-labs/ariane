# Ariane

Web components library pour patterns UI accessibles, Lit 3 + TypeScript. Monorepo npm workspaces orchestré par Turborepo. Utilisable directement, ou comme l'une des fondations d'un design system : tokens, `::part()` et préfixe de tags personnalisable existent pour cette souplesse.

## Key Directories

- `packages/core/src/components/` — composants LitElement (`ar-<name>.ts`, styles, tests)
- `packages/core/src/index.ts` — export barrel
- `apps/docs/` — site documentation Astro + MDX

## Standards

- Prettier : 100 char, 4 spaces, single quotes
- Toujours `import type` pour les imports de types
- Conventional Commits (commitlint + Husky)
- Breaking change : footer `BREAKING CHANGE: <description>` dans le message du commit (ou `!` après le scope), y compris dans le message de squash. `npm run changelog` le reprend sous « Changements incompatibles » ; sans marqueur il n'apparaît pas dans le changelog.
- CSS tokens `--doc-*` (`apps/docs/`) ne forcent jamais un ajout dans `packages/core`
- Un `${expr}` seul contenu d'un élément texte (sr-only, label…) dans un template Lit : si la ligne dépasse 100 caractères, Prettier peut le wrapper d'une façon qui insère des nœuds de texte (espaces) dans le DOM rendu, corrompant `textContent`/le nom accessible. Extraire la valeur en `const` avant le template plutôt que d'inliner un appel long.
- Skill consommateur : si l'API publique d'un composant (attribut, slot, événement, méthode, propriété CSS, part), un comportement ou une règle d'usage change, mettre à jour `packages/core/scripts/skill/content/` (voir son `README.md`). Le tableau d'API généré suit seul le CEM et les MDX ; `npm run check:skill` (inclus dans `build`) échoue sur un composant ajouté sans entrée dans `choosing-components.md`.

## Philosophie de conception

- **Mobile-first** : toute décision d'API, de comportement ou de style part du cas mobile. Le desktop est une amélioration progressive, pas le point de départ. Avant d'ajouter une option, se demander si le comportement par défaut couvre déjà le cas mobile sans configuration.
- **Headless** : aucun fallback cosmétique dans les composants (`var(--token)` sans valeur par défaut). Toutes les valeurs de design vont dans `themes/ariane.css` (liste d'`@import`) et ses fragments sous `themes/ariane/` (`_palette.css`, `_semantic-tokens.css`, `_global-tokens.css`, `shared/`, `components/`). Les fallbacks structurels (0px pour des compensations de layout) sont acceptables.

## Common Commands

```bash
npm run dev                # Watch core + docs en parallèle
npm run test               # Vitest passe unique (racine)
npm run test:all           # Vitest + WTR browser
npm run create ar-<nom>    # Scaffold nouveau composant
npm run build:manifest     # Regénère custom-elements.json
npm run build:skill        # Regénère skills/ariane et llms/ (depuis packages/core)
npm run changelog          # Section de la prochaine release dans CHANGELOG.md (branche release, après bump)
```

## Git Workflow

- Branches : `feat/<desc>`, `fix/<desc>`, `chore/<desc>` créées depuis `dev`
- PRs vers `dev` — jamais de push direct sur `main`
- commit et push depuis `dev` de manière exceptionnelle > demander confirmation
- `main` ← PR depuis `dev` uniquement, pour les releases
- Release : `npm run changelog` sur la branche de release (après le bump, relire la section), puis tag `vX.Y.Z` → CI publie sur npm + crée la GitHub Release automatiquement
- Tag npm : `-alpha.*` → `alpha`, `-beta.*` → `beta`, stable → `latest` ; tant qu'aucune version stable n'existe (pré-v1), `release.yml` publie tout sous `latest`
- Si un composant a changé depuis la dernière release : régénérer la démo et le thème starter-kit (`npm run generate:starter-demo -- --repo <checkout ariane-starter-kit>`) et pousser dans ce repo après relecture du diff. Checkout frère attendu à côté de `ariane` en local.

## Notes

Dépréciation : `warnDeprecated(tag, member, msg)` depuis `src/utils/deprecated.ts` + `@deprecated` JSDoc — pas nécessaire en alpha.
Si un correctif échoue 3 fois de suite, remettre en cause la demande avant de continuer.
