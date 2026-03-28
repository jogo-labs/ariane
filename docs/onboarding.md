# Onboarding — Ariane

Ce document te donne tout ce qu'il faut pour être opérationnel rapidement.

---

## C'est quoi Ariane ?

Ariane est une **bibliothèque de Web Components accessibles** construite avec [Lit 3](https://lit.dev/) et TypeScript. Elle se positionne entre deux extrêmes :

- **Web Awesome / Shoelace** — design system complet et opiniaté : tu adoptes le look de la librairie
- **Radix UI / Headless UI** — composants sans style : tu apportes tout le CSS toi-même

**Ariane** : comportement accessible + tokens CSS thémables, aucune opinion visuelle forte. C'est une **fondation** sur laquelle construire son propre design system — pas un design system en soi.

Les composants sont des **Custom Elements natifs** : ils fonctionnent dans n'importe quel framework (React, Vue, Svelte, Angular) ou en HTML pur, sans configuration.

**Lit 3** est le framework utilisé pour les écrire. Il remplace l'enregistrement manuel (`customElements.define`) et la gestion du cycle de vie par des decorators TypeScript (`@customElement`, `@property`), et fournit un système de templating réactif via `html\`\``. Si tu connais les Custom Elements natifs, Lit est simplement du sucre syntaxique par-dessus.

---

## Architecture du monorepo

```text
ariane/
├── packages/
│   └── core/              # La librairie (@ariane-ui/core)
│       └── src/
│           ├── components/ # Un dossier par composant
│           ├── controllers/ # Lit ReactiveControllers réutilisables
│           ├── context/    # Providers @lit/context (communication parent → enfant sans props drilling)
│           ├── state/      # Moteurs de calcul d'état purs (pas de DOM, testables unitairement)
│           └── index.ts    # Export barrel (réexporte tous les composants en un seul import)
├── apps/
│   └── docs/              # Site de documentation (Astro)
└── turbo.json             # Orchestration des builds (Turborepo)
```

npm workspaces + Turborepo : les commandes racine (`npm run dev`, `npm run build`) orchestrent automatiquement les deux packages dans le bon ordre.

---

## Composants disponibles

| Composant    | Tag                                        | Description                                            |
| ------------ | ------------------------------------------ | ------------------------------------------------------ |
| Alert        | `<ar-alert>`                               | Messages informatifs / succès / erreur / avertissement |
| Breadcrumb   | `<ar-breadcrumb>` + `<ar-breadcrumb-item>` | Fil d'Ariane                                           |
| Button       | `<ar-button>`                              | Bouton avec variantes et états                         |
| Pagination   | `<ar-pagination>`                          | Navigation paginée                                     |
| Progress bar | `<ar-progressbar>`                         | Barre de progression                                   |
| Spinner      | `<ar-spinner>`                             | Indicateur de chargement                               |
| Stepper      | `<ar-stepper>` + `<ar-stepper-item>`       | Assistant multi-étapes                                 |

Un composant intègre Ariane s'il satisfait l'un de ces critères : complexité a11y non triviale, absent des projets par difficulté d'implémentation, ou extension d'un natif insuffisant. On ne réplique pas les natifs qui fonctionnent bien (`<button>`, `<input>`).

---

## Installer et démarrer

Prérequis : Node ≥ 24, npm ≥ 11, [nvm](https://github.com/nvm-sh/nvm) recommandé.

```bash
git clone https://github.com/jogo-labs/ariane
cd ariane
nvm use        # active Node 24 via .nvmrc
npm install
npm run dev    # lance core (watch) + docs (Astro) en parallèle
```

Le site de doc est accessible sur `http://localhost:4321`.

---

## Commandes essentielles

| Commande                  | Description                                     |
| ------------------------- | ----------------------------------------------- |
| `npm run test`            | Tests unitaires (Vitest)                        |
| `npm run test:all`        | Unitaires + tests browser (WTR + Playwright)    |
| `npm run lint`            | ESLint                                          |
| `npm run format`          | Prettier                                        |
| `npm run create -- <nom>` | Scaffold un nouveau composant (voir ci-dessous) |

**`npm run create`** génère automatiquement les 4 fichiers du composant (`.ts`, `.styles.ts`, `.test.ts`, `.mdx`), met à jour le barrel (`index.ts`) et l'autoloader. C'est le point d'entrée recommandé pour tout nouveau composant.

```bash
npm run create -- button       # génère ar-button
npm run create -- ar-button    # identique (prefix non doublé)
```

---

## Anatomie d'un composant

Chaque composant vit dans `packages/core/src/components/<nom>/` :

```text
alert/
├── alert.ts              # Classe LitElement principale
├── alert.styles.ts       # CSS (Lit css`` tagged template)
├── alert.test.ts         # Tests unitaires (Vitest + happy-dom)           — optionnel
├── alert.browser.test.ts # Tests dans un vrai navigateur (WTR + Playwright) — optionnel
└── alert.a11y.test.ts    # Tests d'accessibilité axe-core                  — optionnel
```

Les trois fichiers de test correspondent à des besoins différents et ne sont pas tous obligatoires. La structure des stacks de test est détaillée dans la section [Tests](#tests) plus bas.

**Exemple minimal :**

```typescript
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

// @customElement remplace customElements.define('ar-button', ArButton)
@customElement('ar-button')
export class ArButton extends LitElement {
    // @property déclare une propriété réactive + son attribut HTML
    // reflect: true synchronise la propriété JS → l'attribut HTML (OBLIGATOIRE chez nous)
    @property({ reflect: true })
    variant: 'filled' | 'outlined' = 'filled';

    override render() {
        // part="base" expose cet élément via ::part(base) pour le styling externe
        return html`<button part="base"><slot></slot></button>`;
    }
}

// Typage VS Code + TypeScript — obligatoire en fin de fichier
declare global {
    interface HTMLElementTagNameMap {
        'ar-button': ArButton;
    }
}
```

---

## Règles importantes

### `reflect: true` — toujours

Sans `reflect: true`, la propriété JS ne se synchronise pas vers l'attribut HTML. Le playground de la doc afficherait des attributs absents. **Toujours** l'ajouter sur les propriétés exposées.

### Events — toujours `bubbles: true, composed: true`

```typescript
this.dispatchEvent(
    new CustomEvent('ar-change', {
        bubbles: true, // remonte dans le DOM light
        composed: true, // traverse le Shadow DOM (sans ça, l'event reste bloqué)
        detail: { value: this.value },
    }),
);
```

### CSS parts

`part="base"` dans le template expose cet élément au styling externe via `::part()`. C'est le seul moyen pour l'utilisateur de styler l'intérieur du Shadow DOM sans CSS custom properties.

### Nommage — cohérence stricte

| Élément          | Convention                | Exemple          |
| ---------------- | ------------------------- | ---------------- |
| Tag HTML         | `ar-<name>`               | `ar-button`      |
| Classe           | `Ar<Name>`                | `ArButton`       |
| Événements       | `ar-<event>`              | `ar-alert-close` |
| CSS custom props | `--ar-<composant>-<prop>` | `--ar-button-bg` |
| CSS parts        | `part="base"`             | `part="label"`   |

### Thémabilité

Les aspects visuels sont exposés via CSS custom properties. Les utilisateurs personnalisent via :

```css
ar-button {
    --ar-button-bg: #7c3aed;
}
```

Les valeurs globales (couleurs, espacements, typographie) vivent dans `packages/core/src/styles/themes/default.css` et se surchargent via `:root`.

---

## Tests

Ariane a **deux stacks de test** (décision documentée dans `docs/decisions/ADR-003`) :

### Vitest + happy-dom (tests unitaires)

Pour tout ce qui ne nécessite pas un vrai navigateur : propriétés, attributs, logique interne.

```bash
npm run test                                          # une passe
npm run test:watch --workspace=packages/core          # mode watch
npm run test:coverage --workspace=packages/core       # avec rapport
```

**Piège n°1** : `element.textContent` retourne `''` pour les interpolations Lit dans happy-dom. Tester la propriété JS directement (`el.myProp`).

**Piège n°2** : `.ariaCurrent` et autres liaisons ARIA Lit ne reflètent pas en attribut. Tester `(el as any).ariaCurrent`.

### @web/test-runner (WTR) + Playwright + axe-core (tests browser)

Pour les tests qui nécessitent un vrai Shadow DOM ou de l'accessibilité réelle.

```bash
npm run test:browser --workspace=packages/core
```

Fichiers nommés `*.browser.test.ts` ou `*.a11y.test.ts`.

---

## Le CEM (Custom Elements Manifest)

Fichier JSON généré depuis la JSDoc (`packages/core/dist/custom-elements.json`). Il décrit toutes les propriétés, événements, CSS parts et CSS custom properties de chaque composant. La doc Astro le lit pour générer automatiquement les pages de composants et le playground.

`npm run dev` le regénère automatiquement au démarrage. Si tu travailles hors mode watch :

```bash
npm run build:manifest --workspace=packages/core
```

---

## Le site de documentation

Site **Astro** custom dans `apps/docs/` — pas de Starlight, tout est fait maison. Astro génère du HTML statique au build ; les composants Ariane s'upgradent côté client via le bundle CDN chargé dans le layout.

La page de chaque composant est générée depuis :

1. Un fichier MDX dans `apps/docs/src/content/components/` — titre, description, variantes playground
2. Le CEM — API (propriétés, events, CSS props, parts)

La route dynamique `apps/docs/src/pages/components/[slug].astro` assemble le tout.

Pour modifier le site de doc, voir [apps/docs/CONTRIBUTING.md](../apps/docs/CONTRIBUTING.md).

---

## Workflow de développement

1. Toutes les contributions passent par une PR sur la branche **`dev`**
2. Commits en **Conventional Commits**, vérifiés automatiquement par commitlint + Husky :

    ```text
    feat(button): ajoute la prop `loading`
    fix(stepper): corrige la navigation clavier
    docs(alert): met à jour les exemples
    test(button): ajoute les cas disabled
    chore(deps): met à jour esbuild
    ```

    > Un message non conforme bloque le `git commit` avec une erreur commitlint.

3. `dev` → review → merge → `main` → release automatique via GitHub Actions

---

## Où trouver quoi

| Information                                       | Fichier                                                   |
| ------------------------------------------------- | --------------------------------------------------------- |
| Philosophie, positionnement, critères d'inclusion | [CONTRIBUTING.md](../CONTRIBUTING.md)                     |
| Setup, commandes, patterns de code, tests         | [DEVELOPMENT.md](../DEVELOPMENT.md)                       |
| Modifier le site de documentation                 | [apps/docs/CONTRIBUTING.md](../apps/docs/CONTRIBUTING.md) |
| Décisions techniques (choix de stack, trade-offs) | [docs/decisions/](decisions/)                             |
| Règles actives que Claude doit appliquer          | [CLAUDE.md](../CLAUDE.md)                                 |

---

## Par où commencer

1. `npm run dev` — vérifier que le site démarre sur `http://localhost:4321`
2. Lire un composant simple : `packages/core/src/components/spinner/spinner.ts` + ses tests
3. Lire un composant complexe : `packages/core/src/components/stepper/` (composition parent-enfant, `@lit/context`)
4. Lire `CONTRIBUTING.md` pour comprendre les critères de décision sur ce qu'on intègre ou non
5. Jouer avec le playground d'un composant dans la doc locale
