---
name: ariane-new-component
description: Conventions spécifiques au projet Ariane pour créer un nouveau composant — naming ar-*, structure fichiers, base class ArianeElement/ArianeFormElement, annotations CEM custom (@display, @parent, @ignore, @internal, @cssState), test helpers maison. À utiliser quand on crée ou scaffold un nouveau composant ar-*.
---

# Créer un nouveau composant Ariane

## Scaffold

```bash
npm run create ar-<nom>   # depuis la racine du monorepo
```

## Structure fichiers

```
components/<nom>/
  <nom>.ts          # Classe extends ArianeElement, @customElement('ar-<nom>')
  <nom>.styles.ts   # Styles Lit css`` tagged template
  <nom>.test.ts     # Tests Vitest
  # Composants complexes ajoutent :
  <nom>.renderer.ts # Helpers de rendu (desktop/mobile)
  <nom>.utils.ts    # Fonctions utilitaires pures
```

## Base class : ArianeElement / ArianeFormElement

Tout composant étend `ArianeElement` (`packages/core/src/base/ariane-element.ts`), jamais
`LitElement` directement — le scaffold le génère déjà. `ArianeElement` attache
`ElementInternals` en `connectedCallback()` et expose, sans indirection (inspiré de
[`WebAwesomeElement`](https://github.com/shoelace-style/webawesome/blob/next/packages/webawesome/src/internal/webawesome-element.ts)) :

- `this.internals: ElementInternals | undefined` — accès direct, typé, pour tout besoin natif
  (form participation, etc.).
- `this.toggleState(name, active)` — pose ou retire un `:state()` CSS, cumulatif à un
  attribut/propriété déjà reflété (ex. `:state(open)` en plus de `open`), jamais un
  remplacement. Documenter avec `@cssState` (voir plus bas).

Appliqué à tous les composants même sans `:state()` aujourd'hui : `attachInternals()` non
exploité n'a aucun effet de bord, et ça évite une taxonomie à deux niveaux à re-justifier à
chaque nouveau composant (cf. #253 pour le raisonnement complet).

**Composant qui participe à un `<form>` natif** (ex. `ar-datepicker`) : `extends
ArianeFormElement` à la place (`packages/core/src/base/ariane-form-element.ts`) —
`formAssociated = true` est hérité automatiquement, pas besoin de le redéclarer. Utiliser
`this.internals?.setFormValue(...)`/`this.internals?.setValidity(...)` directement, sans
wrapper : `this.internals` est déjà pleinement typé et découvrable. `happy-dom` (Vitest)
n'implémente pas `attachInternals()` — `this.internals` y reste `undefined` ; un test qui a
besoin de l'exerciser l'injecte temporairement sur `HTMLElement.prototype` (cf.
`datepicker.test.ts`, `describe('setValidity / required')`), ou passe par un
`*.browser.test.ts` (Playwright réel) pour `:state()`.

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
| `@cssState <name> - <description>` | Documente un `:state()` posé via `this.toggleState()` (`ArianeElement`) — reconnu **nativement** par l'analyzer (comme `@cssprop`), génère l'onglet doc « CSS Custom States » automatiquement |

`@internal` sur une classe (pas un membre) est une convention TSDoc reconnue **nativement** par `@custom-elements-manifest/analyzer` (pas un ajout maison) : sa déclaration et son export sont retirés automatiquement du manifest publié — utile pour un mini custom element purement interne, jamais utilisé seul par un consommateur (ex. exporté uniquement via `::part()`). Si son `customElements.define()` vit dans un fichier séparé (pattern `index.ts`, comme les composants publics), `pruneDanglingCustomElementExports` (`cem.config.js`) nettoie le résidu ; aucune action supplémentaire requise.

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
