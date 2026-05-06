---
name: ariane-new-component
description: Conventions spécifiques au projet Ariane pour créer un nouveau composant — naming ar-*, structure fichiers, annotations CEM custom (@display, @parent, @ignore), test helpers maison. À utiliser quand on crée ou scaffold un nouveau composant ar-*.
---

# Créer un nouveau composant Ariane

## Scaffold

```bash
npm run create ar-<nom>   # depuis la racine du monorepo
```

## Structure fichiers

```
components/<nom>/
  <nom>.ts          # Classe LitElement, @customElement('ar-<nom>')
  <nom>.styles.ts   # Styles Lit css`` tagged template
  <nom>.test.ts     # Tests Vitest
  # Composants complexes ajoutent :
  <nom>.renderer.ts # Helpers de rendu (desktop/mobile)
  <nom>.utils.ts    # Fonctions utilitaires pures
```

## Naming

| Élément | Convention | Exemple |
|---|---|---|
| Tag HTML | `ar-<name>` | `ar-stepper` |
| Classe | `Ar<Name>` | `ArStepper` |
| Événements | `ar-<event>` | `ar-step-change` |
| CSS custom properties | `--ar-<component>-<prop>` | `--ar-stepper-gap` |
| CSS parts | `part="base"`, `part="label"`, etc. | |

## Annotations JSDoc CEM

Les annotations standard (`@slot`, `@csspart`, `@cssprop`, `@event`, `@summary`) sont connues. Annotations spécifiques au projet :

| Annotation | Effet |
|---|---|
| `@display demo` | Page doc : exemples + playground + API (défaut) |
| `@display docs` | Page doc : API uniquement, pas de playground |
| `@parent ar-<tag>` | Marque comme sous-composant — nav et home page le lisent via CEM `x-parent` |
| `@ignore` | Exclut un membre des contrôles playground |

## Test helpers (boilerplate maison)

Copier en tête de chaque `.test.ts` — évite les non-null assertions bloquées par `lint-staged --max-warnings=0` :

```typescript
async function fixture<T extends HTMLElement>(html: string): Promise<T> {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstElementChild as T;
    document.body.appendChild(el);
    await (el as any).updateComplete;
    await (el as any).updateComplete;
    return el;
}

async function waitForUpdate(el: HTMLElement): Promise<void> {
    await (el as any).updateComplete;
    await (el as any).updateComplete;
}

function getPart(el: Element, name: string): Element | null {
    return el.shadowRoot?.querySelector(`[part="${name}"]`) ?? null;
}
```

Le double `await updateComplete` est intentionnel — absorbe les cycles déclenchés par `queueMicrotask`.

## Export

Ajouter dans `packages/core/src/index.ts` :

```typescript
export * from './components/<nom>/<nom>.js';
```

## Accessibilité

Avant d'implémenter un composant, identifier les critères WCAG applicables au pattern UI. Documenter dans le plan d'implémentation :

- Le pattern ARIA attendu (rôle, états, propriétés ARIA)
- Les critères WCAG couverts automatiquement par le composant
- Les responsabilités laissées à l'auteur de la page

Critères courants par pattern :

| Pattern UI                                | Critères WCAG clés                            |
| ----------------------------------------- | --------------------------------------------- |
| Disclosure / toggle (dropdown, accordion) | 4.1.2 `aria-expanded`, 2.1.1 keyboard         |
| Navigation landmark                       | 1.3.1 `role="navigation"` + `aria-labelledby` |
| Live region / status                      | 4.1.3 status messages                         |
| Dialog / modal                            | 2.1.2 no keyboard trap                        |
| Item courant (breadcrumb, stepper)        | 2.4.8 `aria-current`                          |
| Contenu au survol / focus                 | 1.4.13 hover/focus persistence                |
| Composant interactif avec état            | 4.1.2 name, role, value                       |

La page "Understanding" correspondante est linkable via le composant `WcagRef` dans la doc (voir skill `ariane-write-docs`).
