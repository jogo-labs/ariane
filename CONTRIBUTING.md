# Contributing to mARIAnne

Ce guide couvre le workflow de contribution pour le **package core** (`@marianne/core`).
Pour modifier le site de documentation, voir [apps/docs/CONTRIBUTING.md](apps/docs/CONTRIBUTING.md).

---

## Prérequis

- Node ≥ 20, npm ≥ 10
- Lire [README.md](README.md) pour comprendre la structure du monorepo

---

## Workflow général

```bash
git clone https://github.com/jonTravens/mARIAnne
cd mARIAnne
npm install
npm run dev          # watch core + docs en parallèle
```

Toutes les contributions passent par une **Pull Request** sur `main`.

---

## Conventions de commit

Les commits suivent la spécification **Conventional Commits**, vérifiée automatiquement
par commitlint + Husky au moment du `git commit`.

```
<type>(<scope>): <description courte>

feat(button): ajoute la prop `loading`
fix(stepper): corrige la navigation au clavier
docs(alert): met à jour les exemples MDX
refactor(core): extrait les types CEM dans cem-types.ts
test(button): ajoute les cas disabled
```

Types autorisés : `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `ci`.

---

## Créer un nouveau composant

### Via le scaffolder

```bash
npm run create ar-mon-composant
```

Le script génère automatiquement la structure dans `packages/core/src/components/mon-composant/` :

```
mon-composant/
├── mon-composant.ts           ← Classe LitElement
├── mon-composant.styles.ts    ← Styles Lit CSS
└── mon-composant.test.ts      ← Tests Vitest
```

### Conventions à respecter dans le fichier `.ts`

**JSDoc obligatoire** — le CEM et la documentation sont générés depuis ces annotations :

```typescript
/**
 * @summary Description courte (une phrase).
 * @display demo
 *
 * @slot             - Slot par défaut.
 * @slot prefix      - Icône avant le contenu.
 *
 * @csspart base     - L'élément racine du composant.
 *
 * @cssprop --ar-mon-composant-bg - Couleur de fond.
 *
 * @event {CustomEvent} ar-change - Émis lors d'un changement.
 */
@customElement('ar-mon-composant')
export class ArMonComposant extends LitElement { … }
```

**Annotations JSDoc spéciales :**

| Annotation         | Effet                                           |
| ------------------ | ----------------------------------------------- |
| `@display demo`    | Page doc : exemples + playground + API (défaut) |
| `@display docs`    | Page doc : API uniquement, pas de playground    |
| `@parent ar-<tag>` | Marque comme sous-composant de `<tag>`          |
| `@ignore`          | Exclut un membre des contrôles du playground    |

**Propriétés :**

```typescript
// Toujours reflect: true pour que l'attribut HTML reste synchronisé
@property({ reflect: true })
variant: 'filled' | 'outlined' = 'filled';

// Boolean
@property({ type: Boolean, reflect: true })
disabled = false;
```

**Événements custom :**

```typescript
// Toujours bubbles: true + composed: true pour traverser le Shadow DOM
this.dispatchEvent(new CustomEvent('ar-change', { bubbles: true, composed: true }));
```

**Global type declaration** (à la fin de chaque fichier) :

```typescript
declare global {
    interface HTMLElementTagNameMap {
        'ar-mon-composant': ArMonComposant;
    }
}
```

### Sous-composants (parent / enfant)

Utilisez `@parent` dans la JSDoc du composant enfant — c'est la seule déclaration nécessaire :

```typescript
/**
 * @parent ar-stepper
 * @display docs
 */
@customElement('ar-stepper-item')
export class ArStepperItem extends LitElement { … }
```

Cela suffit pour que le sous-composant soit :

- masqué de la liste principale de la doc
- imbriqué sous son parent dans la navigation

---

## Tests

```bash
cd packages/core
npm run test           # passe unique
npm run test:watch     # mode interactif
npm run test:coverage  # rapport de couverture
```

### Pattern de test

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ArAlert } from './alert.js';

async function fixture(html: string): Promise<ArAlert> {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstElementChild as ArAlert;
    document.body.appendChild(el);
    await (el as any).updateComplete;
    return el;
}

describe('ArAlert', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it("est dismissible quand l'attribut next-focus est présent", async () => {
        const el = await fixture('<ar-alert next-focus="btn">Alerte</ar-alert>');
        expect(el.getAttribute('next-focus')).toBe('btn');
    });
});
```

---

## Mise à jour du Custom Elements Manifest

Après avoir modifié les annotations JSDoc ou la structure d'un composant :

```bash
cd packages/core
npm run build:manifest    # regénère custom-elements.json
```

Le CEM est la source de vérité pour la documentation et les intégrations IDE.
Il est regénéré automatiquement lors d'un `npm run dev` ou `npm run build`.

---

## Build

```bash
cd packages/core
npm run build             # tout : manifest + bundles + CSS + types

npm run build:manifest    # custom-elements.json uniquement
npm run build:bundles     # dist/ (npm) + cdn/ (CDN auto-contenu)
npm run build:css         # thèmes CSS
npm run build:types       # déclarations TypeScript (.d.ts)
```

### Outputs

| Répertoire                  | Usage                                                  |
| --------------------------- | ------------------------------------------------------ |
| `dist/`                     | Bundle npm — Lit en peer dependency, tree-shakeable    |
| `cdn/`                      | Bundle CDN — Lit bundlé, auto-contenu, avec autoloader |
| `dist/custom-elements.json` | Manifest CEM — consommé par la documentation           |
| `dist/styles/themes/`       | Fichiers CSS de thème                                  |

---

## Lint et formatage

```bash
npm run lint      # ESLint (depuis la racine ou packages/core)
npm run format    # Prettier — s'applique à tout le monorepo
```

Le pre-commit hook (lint-staged) lance automatiquement ESLint + Prettier sur les fichiers stagés.

---

## Intégration IDE (VS Code)

Le build génère `dist/vscode.html-custom-data.json` et `dist/vscode.css-custom-data.json`.
Ces fichiers permettent l'autocomplétion des composants et propriétés CSS dans VS Code.

Pour les activer dans votre projet consommateur, référencez-les dans `.vscode/settings.json` :

```json
{
    "html.customData": ["./node_modules/@marianne/core/dist/vscode.html-custom-data.json"],
    "css.customData": ["./node_modules/@marianne/core/dist/vscode.css-custom-data.json"]
}
```
