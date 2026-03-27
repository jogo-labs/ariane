# Guide de développement

> **Philosophie et positionnement du projet → [CONTRIBUTING.md](CONTRIBUTING.md)**
> Lis-le avant de démarrer si ce n'est pas déjà fait.

---

## Prérequis

- Node ≥ 24 (LTS)
- npm ≥ 11
- [nvm](https://github.com/nvm-sh/nvm) recommandé

## Setup

```bash
git clone https://github.com/jogo-labs/ariane
cd ariane
nvm use          # active Node 24 via .nvmrc
npm install
```

## Commandes racine

| Commande                  | Description                                       |
| ------------------------- | ------------------------------------------------- |
| `npm run dev`             | Watch core + docs en parallèle (pré-build le CEM) |
| `npm run build`           | Build complet (core + docs)                       |
| `npm run test`            | Tests unitaires Vitest                            |
| `npm run test:all`        | Tests unitaires + tests browser (Vitest + WTR)    |
| `npm run lint`            | ESLint sur tous les packages                      |
| `npm run format`          | Prettier sur tous les fichiers                    |
| `npm run create ar-<nom>` | Scaffold un nouveau composant                     |

## Commandes par workspace

### `packages/core`

| Commande                 | Description                       |
| ------------------------ | --------------------------------- |
| `npm run build:manifest` | Génère `custom-elements.json`     |
| `npm run build:bundles`  | esbuild → `dist/` (npm) + `cdn/`  |
| `npm run build:css`      | Thèmes CSS                        |
| `npm run build:types`    | Déclarations TypeScript           |
| `npm run test`           | Vitest, passe unique              |
| `npm run test:watch`     | Vitest interactif                 |
| `npm run test:coverage`  | Vitest avec rapport de couverture |
| `npm run test:browser`   | @web/test-runner + Chromium       |
| `npm run lint`           | ESLint                            |

---

## Architecture du monorepo

```text
packages/core/src/
  components/   # Un répertoire par composant (ex: button/, stepper/)
  controllers/  # Lit ReactiveControllers réutilisables
  context/      # @lit/context providers (communication parent-enfant)
  state/        # Moteurs de calcul d'état purs
  styles/       # CSS partagé (reset, utilitaires, animations, thèmes)
  types/        # Interfaces TypeScript
  index.ts      # Export barrel
apps/docs/      # Site de documentation Astro
```

## Conventions fichiers composant

Chaque composant dans `components/<name>/` :

- `<name>.ts` — classe LitElement, `@customElement('ar-<name>')`
- `<name>.styles.ts` — styles Lit `css` tagged template
- `<name>.test.ts` — tests Vitest

Composants complexes ajoutent :

- `<name>.renderer.ts` — helpers de rendu (desktop/mobile)
- `<name>.utils.ts` — fonctions utilitaires

## Conventions de nommage

| Élément               | Convention                | Exemple          |
| --------------------- | ------------------------- | ---------------- |
| Tag HTML              | `ar-<name>`               | `ar-button`      |
| Classe                | `Ar<Name>`                | `ArButton`       |
| Événements custom     | `ar-<event>`              | `ar-alert-close` |
| CSS custom properties | `--ar-<component>-<prop>` | `--ar-button-bg` |
| CSS parts             | `part="base"`             | `part="label"`   |

---

## Patterns de code

### Propriétés — toujours `reflect: true`

Sans `reflect: true`, l'attribut HTML n'est pas synchronisé avec la propriété JS.
Le `outerHTML` du playground afficherait des attributs absents.

```typescript
@property({ reflect: true })
variant: 'filled' | 'outlined' = 'filled';

@property({ type: Boolean, reflect: true })
disabled = false;
```

### Événements custom — toujours `bubbles + composed`

Sans `composed: true`, l'événement ne traverse pas le Shadow DOM.
Sans `bubbles: true`, il ne remonte pas dans le DOM light.

```typescript
this.dispatchEvent(
    new CustomEvent('ar-change', {
        bubbles: true,
        composed: true,
        detail: { value: this.value },
    }),
);
```

### Global type declaration (fin de chaque fichier composant)

```typescript
declare global {
    interface HTMLElementTagNameMap {
        'ar-<name>': Ar<Name>;
    }
}
```

### Composition parent-enfant

Utiliser `@lit/context` — le parent expose un `ContextProvider`, l'enfant s'abonne via `ContextConsumer`. Voir `stepper/` pour référence.

### Composants sans Shadow DOM

Les composants conteneurs de données overrident `createRenderRoot()` :

```typescript
override createRenderRoot() {
    return this;
}
```

---

## JSDoc CEM — annotations obligatoires

Le CEM (`custom-elements.json`) est généré depuis la JSDoc. Toujours documenter :

```typescript
/**
 * @summary Description courte (une phrase).
 * @display demo
 *
 * @slot              - Slot par défaut.
 * @slot prefix       - Icône avant le contenu.
 *
 * @csspart base      - L'élément racine du composant.
 *
 * @cssprop --ar-mon-composant-bg - Couleur de fond.
 *
 * @event {CustomEvent} ar-change - Émis lors d'un changement.
 */
```

| Annotation         | Effet                                           |
| ------------------ | ----------------------------------------------- |
| `@display demo`    | Page doc : exemples + playground + API (défaut) |
| `@display docs`    | Page doc : API uniquement                       |
| `@parent ar-<tag>` | Marque comme sous-composant                     |
| `@ignore`          | Exclut un membre des contrôles playground       |

---

## Tests unitaires (Vitest + happy-dom)

### Pattern standard

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import type { ArAlert } from './alert.js';

async function fixture<T extends HTMLElement>(html: string): Promise<T> {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstElementChild as T;
    document.body.appendChild(el);
    await (el as any).updateComplete;
    await (el as any).updateComplete; // double await pour les queueMicrotask
    return el;
}

async function waitForUpdate(el: HTMLElement): Promise<void> {
    await (el as any).updateComplete;
    await (el as any).updateComplete;
}

function getPart(el: Element, name: string): Element | null {
    return el.shadowRoot?.querySelector(`[part="${name}"]`) ?? null;
}

describe('ArAlert', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('affiche le message', async () => {
        const el = await fixture<ArAlert>('<ar-alert>Texte</ar-alert>');
        expect(el.getAttribute('role')).toBe('alert');
    });
});
```

### Pièges courants happy-dom

- **`textContent` des interpolations Lit** : retourne `''`. Tester la propriété JS directement (`el.myProp`) plutôt que `el.textContent`.
- **Propriétés ARIA via liaison Lit** (`.ariaCurrent`, `.ariaExpanded`) : `getAttribute('aria-current')` retourne `null`. Tester `(el as any).ariaCurrent` directement.
- **`MediaQueryList` mock** : toujours inclure `addEventListener` et `removeEventListener` :
    ```typescript
    { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList
    ```
- **`queueMicrotask` dans le rendu** : `await updateComplete` deux fois pour absorber le cycle initial + le cycle du microtask.

## Tests browser (web-test-runner + Playwright + axe-core)

Fichiers nommés `*.browser.test.ts` ou `*.a11y.test.ts`.

```typescript
import { expect, fixture, html } from '@open-wc/testing';
import { checkAccessibility } from '../../test-utils.js';

describe('ArAlert a11y', () => {
    it('passe axe-core', async () => {
        const el = await fixture(html`<ar-alert>Message</ar-alert>`);
        await checkAccessibility(el);
    });
});
```

---

## Build outputs

| Répertoire                  | Usage                                        |
| --------------------------- | -------------------------------------------- |
| `dist/`                     | Bundle npm — Lit en peer dep, tree-shakeable |
| `cdn/`                      | Bundle CDN — Lit bundlé, avec autoloader     |
| `dist/custom-elements.json` | Manifest CEM — consommé par la doc           |
| `dist/styles/themes/`       | Fichiers CSS de thème                        |

---

## Intégration IDE (VS Code)

Référencer dans `.vscode/settings.json` du projet consommateur :

```json
{
    "html.customData": ["./node_modules/@ariane-ui/core/dist/vscode.html-custom-data.json"],
    "css.customData": ["./node_modules/@ariane-ui/core/dist/vscode.css-custom-data.json"]
}
```
