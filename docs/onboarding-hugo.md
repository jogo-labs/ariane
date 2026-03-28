# Onboarding — Ariane

Bienvenue sur le projet. Ce document te donne tout ce qu'il faut pour être opérationnel sans avoir besoin d'explorer le repo en aveugle.

---

## C'est quoi Ariane ?

Ariane est une **bibliothèque de Web Components accessibles** construite avec [Lit 3](https://lit.dev/) et TypeScript. Elle se positionne entre deux extrêmes :

- **Web Awesome / Shoelace** — design system complet et opiniaté : tu adoptes le look de la librairie
- **Radix UI / Headless UI** — composants sans style : tu apportes tout le CSS toi-même

**Ariane** : comportement accessible + tokens CSS thémables, aucune opinion visuelle forte. C'est une **fondation** sur laquelle construire son propre design system — pas un design system en soi.

Les composants sont des **Custom Elements natifs** : ils fonctionnent dans n'importe quel framework (React, Vue, Svelte, Angular) ou en HTML pur, sans configuration.

---

## Qu'est-ce qu'un Web Component / Custom Element ?

Un Custom Element est un élément HTML que tu crées toi-même et que le navigateur comprend nativement :

```html
<ar-button variant="filled">Valider</ar-button>
```

Techniquement : une classe JavaScript qui étend `HTMLElement`, enregistrée via `customElements.define('ar-button', ArButton)`. Ariane utilise **Lit 3** pour simplifier ce travail — Lit gère le Shadow DOM, la réactivité des propriétés, et le binding HTML.

**Shadow DOM** : chaque composant Lit encapsule son HTML et son CSS dans un arbre DOM isolé. Ça veut dire que les styles externes n'entrent pas (sauf via CSS custom properties), et les styles internes ne débordent pas.

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

## Architecture du monorepo

```
ariane/
├── packages/
│   └── core/              # La librairie (@ariane-ui/core)
│       └── src/
│           ├── components/ # Un dossier par composant
│           ├── controllers/ # Lit ReactiveControllers réutilisables
│           ├── context/    # Communication parent-enfant (@lit/context)
│           ├── state/      # Logique d'état pure
│           └── index.ts    # Export barrel
├── apps/
│   └── docs/              # Site de documentation (Astro)
└── turbo.json             # Orchestration des builds (Turborepo)
```

npm workspaces + Turborepo : les commandes racine (`npm run dev`, `npm run build`) orchestrent automatiquement les deux packages.

---

## Installer et démarrer

```bash
git clone https://github.com/jogo-labs/ariane
cd ariane
nvm use        # Node 24 via .nvmrc
npm install
npm run dev    # Lance core (watch) + docs (Astro) en parallèle
```

Prérequis : Node ≥ 24, npm ≥ 11.

Le site de doc est accessible sur `http://localhost:4321`.

---

## Commandes essentielles

| Commande                  | Description                                  |
| ------------------------- | -------------------------------------------- |
| `npm run dev`             | Watch + doc en parallèle                     |
| `npm run build`           | Build complet                                |
| `npm run test`            | Tests unitaires (Vitest)                     |
| `npm run test:all`        | Unitaires + tests browser (WTR + Playwright) |
| `npm run lint`            | ESLint                                       |
| `npm run format`          | Prettier                                     |
| `npm run create ar-<nom>` | Scaffold un nouveau composant                |

---

## Anatomie d'un composant

Chaque composant vit dans `packages/core/src/components/<nom>/` :

```
alert/
├── alert.ts          # Classe LitElement principale
├── alert.styles.ts   # CSS (Lit css`` tagged template)
├── alert.test.ts     # Tests unitaires (Vitest + happy-dom)
└── alert.a11y.test.ts # Tests d'accessibilité (WTR + axe-core)
```

**Exemple minimal d'un composant :**

```typescript
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('ar-button')
export class ArButton extends LitElement {
    @property({ reflect: true }) // ← reflect: true est OBLIGATOIRE
    variant: 'filled' | 'outlined' = 'filled';

    override render() {
        return html`<button part="base"><slot></slot></button>`;
    }
}

// Fin de chaque fichier composant — OBLIGATOIRE
declare global {
    interface HTMLElementTagNameMap {
        'ar-button': ArButton;
    }
}
```

---

## Règles importantes à connaître

### `reflect: true` — toujours

Sans `reflect: true`, la propriété JS ne se synchronise pas vers l'attribut HTML. Le playground de la doc afficherait des attributs absents. **Toujours** l'ajouter sur les propriétés exposées.

### Events — toujours `bubbles: true, composed: true`

```typescript
this.dispatchEvent(
    new CustomEvent('ar-change', {
        bubbles: true, // remonte dans le DOM light
        composed: true, // traverse le Shadow DOM
        detail: { value: this.value },
    }),
);
```

Sans `composed: true`, l'événement reste bloqué dans le Shadow DOM — personne ne peut l'écouter de l'extérieur.

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

Les valeurs globales (couleurs, espacements) vivent dans `themes/default.css` et se surchargent via `:root`.

---

## Tests

Ariane a **deux stacks de test** (décision documentée dans `docs/decisions/ADR-003`).

### Vitest + happy-dom (tests unitaires)

Pour tout ce qui ne nécessite pas un vrai navigateur : propriétés, attributs, logique interne.

```bash
npm run test                    # une passe
npm run test:watch --workspace=packages/core  # mode watch
```

**Piège n°1** : `element.textContent` retourne `''` pour les interpolations Lit dans happy-dom. Tester la propriété JS directement (`el.myProp`).

**Piège n°2** : `.ariaCurrent` et autres liaisons ARIA Lit ne reflètent pas en attribut. Tester `(el as any).ariaCurrent`.

### @web/test-runner + Playwright + axe-core (tests browser)

Pour les tests qui nécessitent un vrai Shadow DOM ou de l'accessibilité réelle.

```bash
npm run test:browser --workspace=packages/core
```

Fichiers nommés `*.browser.test.ts` ou `*.a11y.test.ts`.

---

## Le CEM (Custom Elements Manifest)

C'est un fichier JSON généré depuis la JSDoc (`packages/core/dist/custom-elements.json`). Il décrit toutes les propriétés, événements, CSS parts et CSS custom properties de chaque composant. La doc Astro le lit pour générer automatiquement les pages de composants et le playground.

Si tu modifies un composant, regénère-le :

```bash
npm run build:manifest --workspace=packages/core
```

`npm run dev` le fait automatiquement au démarrage.

---

## Le site de documentation

Le site est une app **Astro** custom dans `apps/docs/`. Pas de Starlight, pas d'api-viewer — tout est fait maison.

La page de chaque composant est générée depuis :

1. Un fichier MDX dans `apps/docs/src/content/components/` — fournit le titre, la description, les variantes du playground
2. Le CEM — fournit l'API (propriétés, events, CSS props, parts)

La route dynamique `apps/docs/src/pages/components/[slug].astro` assemble le tout.

---

## Workflow de développement

1. Toutes les contributions passent par une PR sur la branche **`dev`**
2. Commits en **Conventional Commits** (vérifiés automatiquement par commitlint + Husky) :
    ```
    feat(button): ajoute la prop `loading`
    fix(stepper): corrige la navigation clavier
    docs(alert): met à jour les exemples
    test(button): ajoute les cas disabled
    chore(deps): met à jour esbuild
    ```
3. `dev` → review → merge → `main` → release automatique via GitHub Actions

---

## Où trouver quoi

| Information                                       | Fichier                               |
| ------------------------------------------------- | ------------------------------------- |
| Philosophie, positionnement, critères d'inclusion | [CONTRIBUTING.md](../CONTRIBUTING.md) |
| Setup, commandes, patterns de code, tests         | [DEVELOPMENT.md](../DEVELOPMENT.md)   |
| Décisions techniques (choix de stack, trade-offs) | [docs/decisions/](decisions/)         |
| Règles actives que Claude doit appliquer          | [CLAUDE.md](../CLAUDE.md)             |

---

## Ce que tu peux faire pour commencer

1. `npm install && npm run dev` — vérifier que tout démarre
2. Explorer un composant simple : lire `packages/core/src/components/spinner/spinner.ts` + ses tests
3. Explorer un composant complexe : `packages/core/src/components/stepper/` (composition parent-enfant, context Lit)
4. Lire `CONTRIBUTING.md` pour comprendre les critères de décision sur ce qu'on intègre ou non
5. Ouvrir le site de doc en local et jouer avec le playground d'un composant
