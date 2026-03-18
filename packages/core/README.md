# @ariane-ui/core

Bibliothèque de composants web accessibles basée sur **Lit 3**.

Fait partie du monorepo [Ariane](../../README.md).

---

## Installation

```bash
npm install @ariane-ui/core
```

## Utilisation rapide

```html
<!-- CDN -->
<script type="module" src="node_modules/@ariane-ui/core/cdn/index.js"></script>
<link rel="stylesheet" href="node_modules/@ariane-ui/core/themes/default.css" />

<ar-button variant="filled">Valider</ar-button>
```

```typescript
// ESM avec bundler (tree-shakeable)
import '@ariane-ui/core';
import '@ariane-ui/core/themes/default.css';
```

---

## Composants

| Composant    | Tag                 | Description                                          |
| ------------ | ------------------- | ---------------------------------------------------- |
| Alert        | `<ar-alert>`        | Message contextuel (info, success, warning, error)   |
| Breadcrumb   | `<ar-breadcrumb>`   | Fil d'ariane de navigation                           |
| Button       | `<ar-button>`       | Bouton accessible, plusieurs variantes et tailles    |
| Pagination   | `<ar-pagination>`   | Navigation entre pages                               |
| Progress Bar | `<ar-progressbar>`  | Barre de progression                                 |
| Spinner      | `<ar-spinner>`      | Indicateur de chargement                             |
| Stepper      | `<ar-stepper>`      | Navigation multi-étapes (desktop + mobile adaptatif) |
| Stepper Item | `<ar-stepper-item>` | Étape individuelle du Stepper                        |

---

## Exports

```typescript
// Enregistre tous les composants
import '@ariane-ui/core';

// Import individuel (tree-shaking)
import '@ariane-ui/core/dist/components/button/button.js';

// Thème CSS
import '@ariane-ui/core/themes/default.css';

// CDN bundle (Lit inclus)
import '@ariane-ui/core/cdn';

// CDN autoloader (charge les composants à la demande)
import '@ariane-ui/core/cdn/autoloader';

// Manifest CEM (outillage et intégrations)
import manifest from '@ariane-ui/core/custom-elements.json';
```

---

## Personnalisation CSS

Chaque composant expose des **CSS Custom Properties** pour la personnalisation sans modifier les sources :

```css
/* Exemple : personnaliser ar-button */
ar-button {
    --ar-button-bg: #7c3aed;
    --ar-button-border-radius: 2rem;
    --ar-button-font-weight: 700;
}
```

Les valeurs par défaut sont définies dans `src/styles/themes/default.css`.
Créez votre propre thème en surchargeant ces variables dans votre CSS global.

### CSS Parts

Les éléments internes sont exposés via `::part()` pour un ciblage CSS précis :

```css
ar-button::part(base) {
    /* l'élément <button> natif */
}
ar-button::part(label) {
    /* le conteneur du label */
}
```

---

## Architecture interne

```
src/
├── components/          # Un répertoire par composant
│   └── button/
│       ├── button.ts          ← LitElement + JSDoc CEM
│       ├── button.styles.ts   ← Styles Lit CSS
│       └── button.test.ts     ← Tests Vitest
├── controllers/         # ReactiveControllers réutilisables
├── context/             # Providers @lit/context (communication parent-enfant)
├── state/               # Moteurs de calcul d'état purs
├── styles/              # CSS partagé
│   ├── themes/          ← Fichiers de thème (default.css…)
│   └── components/      ← Styles utilitaires partagés
├── types/               # Interfaces TypeScript globales
└── index.ts             # Export barrel
```

### Patterns clés

**Propriétés réactives** — toujours `reflect: true` pour synchroniser l'attribut HTML :

```typescript
@property({ reflect: true })
variant: 'filled' | 'outlined' = 'filled';
```

**Événements custom** — toujours `bubbles` + `composed` pour traverser le Shadow DOM :

```typescript
this.dispatchEvent(new CustomEvent('mr-change', { bubbles: true, composed: true }));
```

**Composition parent-enfant** — via `@lit/context` :
Le parent expose un `ContextProvider`, l'enfant souscrit via `ContextConsumer`.
Voir `stepper/` et `stepper-item/` pour un exemple complet.

**Composants sans Shadow DOM** — les composants conteneurs de données (ex : `ar-stepper-item`)
surchargent `createRenderRoot()` pour retourner `this` et éviter l'encapsulation CSS.

---

## Build

```bash
npm run build             # Build complet
npm run build:manifest    # Génère custom-elements.json depuis la JSDoc
npm run build:bundles     # dist/ (npm) + cdn/ (CDN)
npm run build:css         # Thèmes CSS
npm run build:types       # Déclarations TypeScript
```

Le build est orchestré par des scripts esbuild dans `scripts/`.

### Outputs

| Répertoire                          | Contenu                                                |
| ----------------------------------- | ------------------------------------------------------ |
| `dist/`                             | ESM tree-shakeable, Lit en peer dependency             |
| `cdn/`                              | Bundle auto-contenu (Lit inclus), minifié              |
| `dist/custom-elements.json`         | Manifest CEM — source de vérité pour la doc et les IDE |
| `dist/styles/themes/`               | Fichiers CSS de thème prêts à l'emploi                 |
| `dist/vscode.html-custom-data.json` | Autocomplétion HTML VS Code                            |
| `dist/vscode.css-custom-data.json`  | Autocomplétion CSS VS Code                             |

---

## Custom Elements Manifest (CEM)

Le fichier `custom-elements.json` est généré automatiquement par
`@custom-elements-manifest/analyzer` depuis les annotations JSDoc des composants.

### Annotations JSDoc reconnues

```typescript
/**
 * @summary Description courte du composant.
 * @display demo              ← mode d'affichage dans la doc (demo | docs)
 * @parent ar-stepper         ← déclare ce composant comme enfant de ar-stepper
 *
 * @slot                      ← slot par défaut
 * @slot prefix               ← slot nommé
 *
 * @csspart base              ← CSS part exposé
 *
 * @cssprop --mr-btn-bg       ← CSS custom property
 *
 * @event {CustomEvent} mr-click ← événement émis
 */
```

```typescript
/** @ignore */ // exclut ce membre des contrôles du playground
internalState = false;
```

Le CEM est consommé par :

- Le site de documentation (pages composants, playground, référence API)
- Les intégrations IDE VS Code (autocomplétion)
- Potentiellement : wrappers React/Vue générés automatiquement

---

## Tests

```bash
npm run test           # passe unique (CI)
npm run test:watch     # mode interactif (dev)
npm run test:coverage  # rapport de couverture
```

Environnement : **Vitest** + **happy-dom** (DOM léger sans navigateur).

```typescript
async function fixture(html: string): Promise<MrButton> {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstElementChild as MrButton;
    document.body.appendChild(el);
    await (el as any).updateComplete;
    return el;
}
```

---

## Contribuer

Voir [CONTRIBUTING.md](../../CONTRIBUTING.md) pour le workflow complet.
