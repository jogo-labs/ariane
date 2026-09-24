# ar-stepper-item — Contenu riche (`after-label`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner à `ar-stepper-item` son propre shadow DOM (rendu bullet/lien/ARIA, cohérent avec
`ar-dropdown-item`), avec un slot additif `after-label`, et simplifier `ar-stepper` en conséquence
(un seul `<slot>` de projection au lieu de deux arbres reconstruits en parallèle).

**Architecture:** `ar-stepper` reste seul responsable du calcul d'état (`NavigationTreeController`

- `computeNavigationStates`, inchangés) et pousse un `ItemRenderState` calculé sur chaque
  `ArStepperItem` via le registry existant. `ArStepperItem` porte désormais son propre rendu visuel
  (bullet, `<a>`/`<div>`, ARIA, `part="step"`/`"substep"` sur son propre host) et notifie les clics au
  parent via une nouvelle méthode `notifyItemActivated` sur `StepperRegistry` — même mécanique que
  `notifyItemChanged`, pas un `CustomEvent`.

**Tech Stack:** Lit 3, TypeScript, Vitest (happy-dom), Web Test Runner (Playwright/Chromium).

**Spec:** `docs/superpowers/specs/2026-09-18-stepper-item-rich-content-design.md`

## Global Constraints

- Branche existante `feat/stepper-item-rich-content-226` (déjà créée, spec déjà commitée dessus) —
  continuer dessus, pas de nouvelle branche.
- Prettier : 100 caractères, 4 espaces, quotes simples (appliqué automatiquement par le hook
  pre-commit du repo — ne pas s'en préoccuper manuellement).
- `import type` obligatoire pour tout import de type seul.
- Changement cassant sur `::part()` assumé (alpha non utilisée) — pas de couche de compatibilité à
  écrire.
- `label` (attribut `ArStepperItem`) reste l'unique source de texte obligatoire — ne jamais la
  rendre optionnelle ni y substituer le contenu d'`after-label`.
- Après chaque tâche : `npm run test --workspace=packages/core` (unitaires) doit passer avant de
  commit. Les tâches touchant le rendu/clic/focus ajoutent en plus une vérification
  `npx web-test-runner "src/components/stepper*/**/*.browser.test.ts"` (packages/core) avant de
  clore la tâche.

---

## File Structure

| Fichier                                                                                             | Rôle                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/src/types/navigation-nodes.ts`                                                       | Ajoute `item: ArStepperItem` sur `NavigationNode`.                                                                                                                                                          |
| `packages/core/src/context/stepper.context.ts`                                                      | Ajoute `notifyItemActivated` à `StepperRegistry`.                                                                                                                                                           |
| `packages/core/src/controllers/navigation-tree.controller.ts`                                       | Stocke la référence `item` sur chaque `NavigationNode` construit (au lieu de la jeter après `buildFromItems`).                                                                                              |
| `packages/core/src/components/stepper-item/stepper-item.ts`                                         | Shadow DOM, `ItemRenderState`, `BulletState`, rendu bullet/lien/ARIA, slot `after-label`, `notifyItemActivated`, `focusControl()`.                                                                          |
| `packages/core/src/components/stepper-item/stepper-item.styles.ts`                                  | **Nouveau.** Styles déplacés depuis `stepper.styles.ts` (bullet, label, step-link, step/substep, connecteurs).                                                                                              |
| `packages/core/src/components/stepper/stepper.renderer.ts`                                          | Simplifié : `pushItemRenderState()` (calcul, remplace `renderStep`/`renderSubStep`/`renderStepText`/`isGroupCurrent`), `renderDesktop()`/`renderMobile()` réduits au chrome (liste vide + dropdown mobile). |
| `packages/core/src/components/stepper/stepper.ts`                                                   | Retire `onClickLink` (délégation `closest`), branche `notifyItemActivated`, remplace la requête de focus shadow DOM par `item.focusControl()`, appelle `pushItemRenderState()` dans `willUpdate()`.         |
| `packages/core/src/components/stepper/stepper.styles.ts`                                            | Retire les styles déplacés vers `stepper-item.styles.ts`.                                                                                                                                                   |
| `packages/core/src/components/stepper-item/stepper-item.test.ts`                                    | Tests unitaires étendus (render-state, `focusControl`, `notifyItemActivated`).                                                                                                                              |
| `packages/core/src/components/stepper-item/stepper-item.browser.test.ts`                            | **Nouveau.** Tests browser (clic réel, `aria-describedby`, `slotchange`, compteur CSS bullet, `::part()` exposé par l'item).                                                                                |
| `packages/core/src/components/stepper/stepper.test.ts`                                              | Adapté : suppression des assertions sur le HTML reconstruit par `stepper.renderer.ts`, ajout d'assertions sur le render-state poussé.                                                                       |
| `packages/core/src/components/stepper/stepper.browser.test.ts`                                      | Adapté : clic/focus via l'item plutôt que via le shadow DOM d'`ar-stepper`.                                                                                                                                 |
| `apps/docs/src/content/components/ar-stepper-item.mdx` (si existant) ou section stepper dans la doc | Exemple d'usage `after-label`.                                                                                                                                                                              |

---

### Task 1: Types et registry — `ItemRenderState`, `notifyItemActivated`, `NavigationNode.item`

**Files:**

- Modify: `packages/core/src/types/navigation-nodes.ts`
- Modify: `packages/core/src/context/stepper.context.ts`
- Modify: `packages/core/src/controllers/navigation-tree.controller.ts:57-101`
- Test: `packages/core/src/controllers/navigation-tree.controller.test.ts` (créer si absent — vérifier d'abord s'il existe)

**Interfaces:**

- Produces: `NavigationNode.item: ArStepperItem` (nouveau champ, toujours défini) ; `StepperRegistry.notifyItemActivated(item: ArStepperItem, event: MouseEvent): void`.

- [ ] **Step 1: Vérifier l'existence d'un fichier de test pour `NavigationTreeController`**

Run: `ls packages/core/src/controllers/navigation-tree.controller.test.ts 2>&1`

S'il n'existe pas, la Step 2 crée le fichier. S'il existe, y ajouter le test (ne pas écraser le
fichier).

- [ ] **Step 2: Écrire le test qui échoue — chaque `NavigationNode` porte une référence à son item**

```typescript
import { describe, it, expect } from 'vitest';
import { fixture } from '../test-utils.js';
import { NavigationTreeController } from './navigation-tree.controller.js';
import '../components/stepper-item/index.js';
import type { ArStepperItem } from '../components/stepper-item/stepper-item.js';

describe('NavigationTreeController — référence item sur chaque node', () => {
    it('buildFromItems attache la référence ArStepperItem sur chaque NavigationNode', async () => {
        const parent = await fixture<ArStepperItem>(
            '<ar-stepper-item path="a" label="A"><ar-stepper-item path="a-1" label="A.1"></ar-stepper-item></ar-stepper-item>',
        );
        const child = parent.querySelector('ar-stepper-item') as ArStepperItem;

        const host = { requestUpdate: () => {}, addController: () => {} } as never;
        const controller = new NavigationTreeController(host);
        controller.buildFromItems([parent, child]);

        expect(controller.tree[0].item).toBe(parent);
        expect(controller.tree[0].children[0].item).toBe(child);
    });
});
```

- [ ] **Step 3: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run packages/core/src/controllers/navigation-tree.controller.test.ts`
Expected: FAIL — `item` est `undefined` sur les nodes (le champ n'existe pas encore sur le type,
erreur TS ou `undefined` selon le tsconfig test).

- [ ] **Step 4: Ajouter `item` à `NavigationNode`**

Dans `packages/core/src/types/navigation-nodes.ts`, ajouter l'import et le champ :

```typescript
import type { ArStepperItem } from '../components/stepper-item/stepper-item.js';

export interface NavigationNode {
    path: string;
    label: string;
    href?: string | undefined;
    item: ArStepperItem;

    parent?: NavigationNode;
    children: NavigationNode[];

    state: NavigationState;
}
```

- [ ] **Step 5: Stocker la référence dans `NavigationTreeController.buildFromItems`**

Dans `packages/core/src/controllers/navigation-tree.controller.ts`, ligne 66-73, ajouter `item` à
la construction du node :

```typescript
const node: NavigationNode = {
    path: item.path,
    label: item.label,
    href: item.href,
    item,

    children: [],
    state: 'idle',
};
```

(Un seul mot ajouté : `item,` juste après `href: item.href,`.)

- [ ] **Step 6: Lancer le test, vérifier qu'il passe**

Run: `npx vitest run packages/core/src/controllers/navigation-tree.controller.test.ts`
Expected: PASS

- [ ] **Step 7: Ajouter `notifyItemActivated` à `StepperRegistry`**

Dans `packages/core/src/context/stepper.context.ts`, remplacer le fichier entier par :

```typescript
import { createContext } from '@lit/context';
import { type ArStepperItem } from '../components/stepper-item/stepper-item.js';

export type StepperItemAttribute = 'path' | 'label' | 'href';

export interface StepperRegistry {
    registerItem(item: ArStepperItem): void;
    unregisterItem(item: ArStepperItem): void;

    notifyItemChanged(item: ArStepperItem, attribute: StepperItemAttribute): void;
    notifyItemActivated(item: ArStepperItem, event: MouseEvent): void;
}

// Clé unique par instance de module → pas de collision entre composants
export const stepperContext = createContext<StepperRegistry>(Symbol('mt-stepper'));
```

- [ ] **Step 8: Vérifier la compilation TypeScript**

Run: `npm run build --workspace=packages/core 2>&1 | head -50`
Expected: Erreur attendue — `ar-stepper` implémente `_registry: StepperRegistry` sans
`notifyItemActivated` (Task 4 la résout). Si l'erreur porte sur autre chose que
`stepper.ts`/`notifyItemActivated` manquant, investiguer avant de continuer.

- [ ] **Step 9: Commit**

```bash
git add packages/core/src/types/navigation-nodes.ts packages/core/src/context/stepper.context.ts packages/core/src/controllers/navigation-tree.controller.ts packages/core/src/controllers/navigation-tree.controller.test.ts
git commit -m "feat(core): stepper — NavigationNode.item + StepperRegistry.notifyItemActivated (#226)"
```

---

### Task 2: `ArStepperItem` — shadow DOM, rendu propre, `after-label`

**Files:**

- Modify: `packages/core/src/components/stepper-item/stepper-item.ts`
- Create: `packages/core/src/components/stepper-item/stepper-item.styles.ts`
- Test: `packages/core/src/components/stepper-item/stepper-item.test.ts`

**Interfaces:**

- Consumes: `StepperRegistry.notifyItemActivated(item, event)` (Task 1).
- Produces: `ArStepperItem.setRenderState(state: ItemRenderState): void`, `ArStepperItem.focusControl(): void`, `export interface ItemRenderState { bulletState: 'current' | 'completed' | 'default'; isSubstep: boolean; isLink: boolean; showSubsteps: boolean; srLabel: string; }`, `export type BulletState = ItemRenderState['bulletState']`. Ces exports sont consommés par Task 3/4.

- [ ] **Step 1: Écrire le test qui échoue — rendu par défaut (sans render-state, sans after-label)**

Remplacer le contenu de `packages/core/src/components/stepper-item/stepper-item.test.ts` par (les
tests existants sur `path`/`label`/`href`/registry/`notifyItemChanged` sont conservés à l'identique
— seuls les tests ci-dessous sont ajoutés, à la fin du fichier, avant le dernier `});` fermant le
`describe` racine) :

```typescript
describe('rendu shadow DOM', () => {
    it('a un shadow DOM (plus de createRenderRoot() = this)', async () => {
        const el = await fixture<ArStepperItem>(
            '<ar-stepper-item path="a" label="Étape A"></ar-stepper-item>',
        );
        expect(el.shadowRoot).not.toBeNull();
    });

    it('affiche le label en texte par défaut, sans lien (bulletState default)', async () => {
        const el = await fixture<ArStepperItem>(
            '<ar-stepper-item path="a" label="Étape A"></ar-stepper-item>',
        );
        const header = el.shadowRoot!.querySelector('.item-header')!;
        expect(header.tagName).toBe('DIV');
        expect(header.textContent).toContain('Étape A');
    });

    it('setRenderState({ isLink: true }) rend un <a> plutôt qu’un <div>', async () => {
        const el = await fixture<ArStepperItem>(
            '<ar-stepper-item path="a" label="Étape A" href="#a"></ar-stepper-item>',
        );
        el.setRenderState({
            bulletState: 'completed',
            isSubstep: false,
            isLink: true,
            showSubsteps: false,
            srLabel: 'étape 1:',
        });
        await el.updateComplete;

        const header = el.shadowRoot!.querySelector('.item-header')!;
        expect(header.tagName).toBe('A');
        expect(header.getAttribute('href')).toBe('#a');
    });

    it('showSubsteps: true entoure le slot par défaut d’un <ol part="list list--substep">', async () => {
        const el = await fixture<ArStepperItem>(
            '<ar-stepper-item path="a" label="Étape A"></ar-stepper-item>',
        );
        el.setRenderState({
            bulletState: 'current',
            isSubstep: false,
            isLink: false,
            showSubsteps: true,
            srLabel: 'étape 1:',
        });
        await el.updateComplete;

        expect(el.shadowRoot!.querySelector('ol[part~="list--substep"] slot')).not.toBeNull();
    });

    it('isSubstep: true pose part="substep" sur le host, sinon part="step"', async () => {
        const el = await fixture<ArStepperItem>(
            '<ar-stepper-item path="a" label="Étape A"></ar-stepper-item>',
        );
        el.setRenderState({
            bulletState: 'default',
            isSubstep: true,
            isLink: false,
            showSubsteps: false,
            srLabel: 'sous-étape 1:',
        });
        await el.updateComplete;

        expect(el.getAttribute('part')).toBe('substep');
    });

    it('bulletState: "current" pose aria-current="step" sur le host', async () => {
        const el = await fixture<ArStepperItem>(
            '<ar-stepper-item path="a" label="Étape A"></ar-stepper-item>',
        );
        el.setRenderState({
            bulletState: 'current',
            isSubstep: false,
            isLink: false,
            showSubsteps: false,
            srLabel: 'étape 1:',
        });
        await el.updateComplete;

        expect(el.getAttribute('aria-current')).toBe('step');
    });

    it('bulletState !== "current" ne pose pas aria-current', async () => {
        const el = await fixture<ArStepperItem>(
            '<ar-stepper-item path="a" label="Étape A"></ar-stepper-item>',
        );
        el.setRenderState({
            bulletState: 'completed',
            isSubstep: false,
            isLink: true,
            showSubsteps: false,
            srLabel: 'étape 1:',
        });
        await el.updateComplete;

        expect(el.hasAttribute('aria-current')).toBe(false);
    });
});

describe('notifyItemActivated', () => {
    it('appelle registry.notifyItemActivated(this, event) au clic sur le lien', async () => {
        const el = await fixture<ArStepperItem>(
            '<ar-stepper-item path="a" label="Étape A" href="#a"></ar-stepper-item>',
        );
        el.setRenderState({
            bulletState: 'completed',
            isSubstep: false,
            isLink: true,
            showSubsteps: false,
            srLabel: 'étape 1:',
        });
        await el.updateComplete;

        const notifyItemActivated = vi.fn();
        el.setRegistry({
            registerItem: () => {},
            unregisterItem: () => {},
            notifyItemChanged: () => {},
            notifyItemActivated,
        });

        const link = el.shadowRoot!.querySelector('a')!;
        link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

        expect(notifyItemActivated).toHaveBeenCalledOnce();
        expect(notifyItemActivated.mock.calls[0]![0]).toBe(el);
        expect(notifyItemActivated.mock.calls[0]![1]).toBeInstanceOf(MouseEvent);
    });

    it('preventDefault() le clic si href est absent ou "#"', async () => {
        const el = await fixture<ArStepperItem>(
            '<ar-stepper-item path="a" label="Étape A"></ar-stepper-item>',
        );
        el.setRenderState({
            bulletState: 'completed',
            isSubstep: false,
            isLink: true,
            showSubsteps: false,
            srLabel: 'étape 1:',
        });
        await el.updateComplete;
        el.setRegistry({
            registerItem: () => {},
            unregisterItem: () => {},
            notifyItemChanged: () => {},
            notifyItemActivated: () => {},
        });

        const link = el.shadowRoot!.querySelector('a')!;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        link.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(true);
    });
});

describe('focusControl', () => {
    it('déplace le focus sur le .item-header interne', async () => {
        const el = await fixture<ArStepperItem>(
            '<ar-stepper-item path="a" label="Étape A" href="#a"></ar-stepper-item>',
        );
        el.setRenderState({
            bulletState: 'completed',
            isSubstep: false,
            isLink: true,
            showSubsteps: false,
            srLabel: 'étape 1:',
        });
        await el.updateComplete;

        el.focusControl();

        expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('.item-header'));
    });
});
```

Ajouter en tête de fichier (si absent) : `import { vi } from 'vitest';` — vérifier l'import existant
en tête du fichier avant d'ajouter (peut déjà être présent).

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run packages/core/src/components/stepper-item/stepper-item.test.ts`
Expected: FAIL — `setRenderState`/`focusControl` n'existent pas, `el.shadowRoot` est `null`
(`createRenderRoot()` retourne encore `this`).

- [ ] **Step 3: Créer `stepper-item.styles.ts`**

Fichier vide pour l'instant (les styles sont déplacés en Task 5, après que `stepper.test.ts`/
`stepper.browser.test.ts` valident le comportement fonctionnel indépendamment du visuel) :

```typescript
import { css } from 'lit';

export default css``;
```

- [ ] **Step 4: Réécrire `stepper-item.ts`**

Remplacer l'intégralité du fichier par :

```typescript
import { LitElement, html, nothing, type TemplateResult, type CSSResultGroup } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ContextConsumer } from '@lit/context';

import resetStyles from '../../styles/components/reset.styles.js';
import utilitiesStyles from '../../styles/utilities.styles.js';
import styles from './stepper-item.styles.js';

import { stepperContext, type StepperRegistry } from '../../context/stepper.context.js';

export type BulletState = 'current' | 'completed' | 'default';

export interface ItemRenderState {
    bulletState: BulletState;
    isSubstep: boolean;
    isLink: boolean;
    showSubsteps: boolean;
    srLabel: string;
}

/** Compose la valeur `part=` de la puce d'étape avec sa variante d'état (convention BEM `--`). */
function withBulletStatePart(state: BulletState): string {
    if (state === 'current') return 'bullet indicator bullet--current';
    if (state === 'completed') return 'bullet indicator bullet--completed';
    return 'bullet indicator';
}

/**
 * @summary Représente une étape ou sous-étape individuelle dans un ar-stepper.
 * @parent ar-stepper
 * @display docs
 *
 * @slot after-label - Contenu additif affiché à côté du label (ex. icône de statut) — n'affecte
 *   jamais le texte du label lui-même, toujours lu séparément (voir `aria-describedby`).
 *
 * @csspart step-link  - Le lien de l'étape (présent uniquement quand l'étape est cliquable).
 * @csspart control    - Porté par `step-link`, ou par le conteneur non cliquable : élément interactif générique.
 * @csspart bullet     - La puce numérotée de l'étape.
 * @csspart indicator  - Porté par `bullet` : marqueur/indicateur visuel.
 * @csspart label      - Le texte du label.
 * @csspart label--link - Le texte du label quand l'étape est cliquable (variante d'état de `label`).
 * @csspart bullet--current - La puce numérotée de l'étape courante (variante d'état de `bullet`).
 * @csspart bullet--completed - La puce numérotée d'une étape complétée (variante d'état de `bullet`).
 * @csspart step        - L'étape elle-même (posé sur le host), quand elle est de premier niveau.
 * @csspart substep     - L'étape elle-même (posé sur le host), quand c'est une sous-étape.
 * @csspart list--substep - La liste des sous-étapes, quand cette étape en affiche.
 */
export class ArStepperItem extends LitElement {
    static override styles: CSSResultGroup = [resetStyles, utilitiesStyles, styles];

    private readonly _uid = Math.random().toString(36).slice(2, 9);
    private readonly _afterLabelId = `stepper-item-after-label-${this._uid}`;

    @property({ type: String }) path = '';
    @property({ type: String }) label = '';
    @property({ type: String }) href?: string;

    @state() private _bulletState: BulletState = 'default';
    @state() private _isSubstep = false;
    @state() private _isLink = false;
    @state() private _showSubsteps = false;
    @state() private _srLabel = '';
    @state() private _hasAfterLabel = false;

    private _registry?: StepperRegistry | undefined;

    protected readonly _consumer = new ContextConsumer(this, {
        context: stepperContext,
        subscribe: true,
        callback: (registry) => this.setRegistry(registry),
    });

    /* ------------------------------------------------ */
    /* PUBLIC API                                       */
    /* ------------------------------------------------ */

    setRegistry(registry: StepperRegistry) {
        if (this._registry) {
            this._registry.unregisterItem(this);
        }
        this._registry = registry;
        registry.registerItem(this);
    }

    /** Poussé par `ar-stepper` à chaque recalcul d'état (currentPath, mode, structure de l'arbre). */
    setRenderState(state: ItemRenderState): void {
        this._bulletState = state.bulletState;
        this._isSubstep = state.isSubstep;
        this._isLink = state.isLink;
        this._showSubsteps = state.showSubsteps;
        this._srLabel = state.srLabel;
    }

    /** Déplace le focus sur le contrôle interne (lien ou conteneur non cliquable). */
    focusControl(): void {
        this.shadowRoot?.querySelector<HTMLElement>('.item-header')?.focus();
    }

    /* ------------------------------------------------ */
    /* LIFECYCLE                                        */
    /* ------------------------------------------------ */

    override disconnectedCallback() {
        this._registry?.unregisterItem(this);
        this._registry = undefined;

        super.disconnectedCallback();
    }

    override updated(changed: Map<string, unknown>) {
        changed.forEach((oldValue, prop) => {
            if (oldValue === undefined) return;

            if (prop === 'path' || prop === 'label' || prop === 'href') {
                this._registry?.notifyItemChanged(this, prop);
            }
        });

        this.setAttribute('part', this._isSubstep ? 'substep' : 'step');
        if (this._bulletState === 'current') {
            this.setAttribute('aria-current', 'step');
        } else {
            this.removeAttribute('aria-current');
        }
    }

    /* ------------------------------------------------ */
    /* EVENTS                                            */
    /* ------------------------------------------------ */

    private _handleClick = (event: MouseEvent): void => {
        // Sans href réel fourni par le consommateur (omis, ou explicitement '#' — la convention
        // documentée pour un item sans navigation propre), l'ancre est purement décorative : la
        // navigation est pilotée par notifyItemActivated, pas par le comportement natif.
        if (this.href === undefined || this.href === '#') {
            event.preventDefault();
        }
        this._registry?.notifyItemActivated(this, event);
    };

    private _handleAfterLabelSlotChange = (event: Event): void => {
        const slot = event.target as HTMLSlotElement;
        this._hasAfterLabel = slot.assignedNodes({ flatten: true }).length > 0;
    };

    /* ------------------------------------------------ */
    /* RENDER                                           */
    /* ------------------------------------------------ */

    override render(): TemplateResult {
        const bulletPart = withBulletStatePart(this._bulletState);
        const labelPart = this._isLink ? 'label label--link' : 'label';
        const describedBy = this._hasAfterLabel ? this._afterLabelId : nothing;

        const headerContent = html`
            <span part=${bulletPart} aria-hidden="true"></span>
            <span class="sr-only">${this._srLabel}</span>
            <span class="item-label" part=${labelPart}>${this.label}</span>
        `;

        return html`
            ${
                this._isLink
                    ? html`
                          <a
                              class="item-header"
                              part="step-link control"
                              aria-describedby=${describedBy}
                              href=${this.href ?? '#'}
                              @click=${this._handleClick}
                          >
                              ${headerContent}
                          </a>
                      `
                    : html`
                          <div
                              class="item-header"
                              part="control"
                              aria-describedby=${describedBy}
                              tabindex="-1"
                          >
                              ${headerContent}
                          </div>
                      `
            }
            <span id=${this._afterLabelId}>
                <slot name="after-label" @slotchange=${this._handleAfterLabelSlotChange}></slot>
            </span>
            ${
                this._showSubsteps
                    ? html`
                          <ol part="list list--substep" class="list-unstyled">
                              <slot></slot>
                          </ol>
                      `
                    : nothing
            }
        `;
    }
}
```

Points notables par rapport à l'existant, à ne pas perdre en review :

- `createRenderRoot()` est **supprimé** (comportement par défaut de `LitElement` = vrai shadow DOM).
- `path`/`label`/`href` et le mécanisme `notifyItemChanged` dans `updated()` sont **inchangés**.
- `@import '../../translations/...'` et `LocalizeController` ne sont **pas** utilisés ici — le texte
  `srLabel` est déjà localisé côté `ar-stepper` avant d'être poussé (voir Task 3).

- [ ] **Step 5: Mettre à jour `index.ts` du composant (vérifier qu'aucun changement n'est nécessaire)**

Run: `cat packages/core/src/components/stepper-item/index.ts`
Vérifier que l'export ne référence que `ArStepperItem` (pas de changement attendu — juste
confirmer qu'aucun import cassé n'apparaît après le Step 4).

- [ ] **Step 6: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run packages/core/src/components/stepper-item/stepper-item.test.ts`
Expected: PASS (tous les tests, existants et nouveaux)

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/components/stepper-item/
git commit -m "feat(core): ar-stepper-item — shadow DOM, rendu propre, slot after-label (#226)"
```

---

### Task 3: `stepper.renderer.ts` — simplification

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.renderer.ts` (réécriture complète du
  fichier — 241 lignes actuelles remplacées)

**Interfaces:**

- Consumes: `ItemRenderState`, `BulletState` (Task 2, importés depuis `../stepper-item/stepper-item.js`), `NavigationNode` (avec `.item`, Task 1).
- Produces: `pushItemRenderState(steps: NavigationNode[], mode: NavigationMode, stepLabel: (order: number, isSubstep: boolean) => string): void`, `renderDesktop(): TemplateResult`, `renderMobile(ctx: MobileRenderContext): TemplateResult` (signatures allégées — `mode`/`onClickLink`/`stepLabel` retirés, plus nécessaires).

- [ ] **Step 1: Écrire le test qui échoue — `pushItemRenderState` pousse le bon état**

Remplacer le contenu de `packages/core/src/components/stepper/stepper.renderer.test.ts` (créer le
fichier s'il n'existe pas) :

```typescript
import { describe, it, expect, vi } from 'vitest';
import { pushItemRenderState } from './stepper.renderer.js';
import type { NavigationNode } from '../../types/navigation-nodes.js';
import type { ArStepperItem, ItemRenderState } from '../stepper-item/stepper-item.js';

function fakeItem(): { item: ArStepperItem; setRenderState: ReturnType<typeof vi.fn> } {
    const setRenderState = vi.fn();
    return { item: { setRenderState } as unknown as ArStepperItem, setRenderState };
}

function fakeNode(overrides: Partial<NavigationNode> = {}): NavigationNode {
    const { item } = fakeItem();
    return {
        path: 'a',
        label: 'A',
        item,
        children: [],
        state: 'idle',
        ...overrides,
    };
}

const stepLabel = (order: number, isSubstep: boolean): string =>
    `${isSubstep ? 'sous-' : ''}étape ${order}:`;

describe('pushItemRenderState', () => {
    it('mode create : étape complétée devient un lien (isLink: true)', () => {
        const { item, setRenderState } = fakeItem();
        const step: NavigationNode = { ...fakeNode(), item, state: 'completed' };

        pushItemRenderState([step], 'create', stepLabel);

        expect(setRenderState).toHaveBeenCalledWith({
            bulletState: 'completed',
            isSubstep: false,
            isLink: true,
            showSubsteps: false,
            srLabel: 'étape 1:',
        } satisfies ItemRenderState);
    });

    it('étape courante : jamais un lien, showSubsteps true si elle a des enfants', () => {
        const { item: subItem, setRenderState: setSubRenderState } = fakeItem();
        const sub: NavigationNode = { ...fakeNode(), item: subItem, path: 'a-1', state: 'idle' };
        const { item, setRenderState } = fakeItem();
        const step: NavigationNode = {
            ...fakeNode(),
            item,
            state: 'current',
            children: [sub],
        };
        sub.parent = step;

        pushItemRenderState([step], 'create', stepLabel);

        expect(setRenderState).toHaveBeenCalledWith({
            bulletState: 'current',
            isSubstep: false,
            isLink: false,
            showSubsteps: true,
            srLabel: 'étape 1:',
        } satisfies ItemRenderState);
        expect(setSubRenderState).toHaveBeenCalledWith({
            bulletState: 'default',
            isSubstep: true,
            isLink: false,
            showSubsteps: false,
            srLabel: 'sous-étape 1:',
        } satisfies ItemRenderState);
    });

    it('mode edit : sous-étape non courante devient un lien même si non complétée', () => {
        const { item: subItem, setRenderState: setSubRenderState } = fakeItem();
        const sub: NavigationNode = { ...fakeNode(), item: subItem, path: 'a-1', state: 'idle' };
        const { item } = fakeItem();
        const step: NavigationNode = { ...fakeNode(), item, state: 'idle', children: [sub] };
        sub.parent = step;

        pushItemRenderState([step], 'edit', stepLabel);

        expect(setSubRenderState).toHaveBeenCalledWith(expect.objectContaining({ isLink: true }));
    });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run packages/core/src/components/stepper/stepper.renderer.test.ts`
Expected: FAIL — `pushItemRenderState` n'existe pas encore.

- [ ] **Step 3: Réécrire `stepper.renderer.ts`**

Remplacer l'intégralité du fichier par :

```typescript
import { html, type TemplateResult } from 'lit';
import { type NavigationNode, type NavigationMode } from '../../types/navigation-nodes.js';
import type { BulletState } from '../stepper-item/stepper-item.js';

/* ------------------------------------------------ */
/* TYPES                                            */
/* ------------------------------------------------ */

// Contexte nécessaire au rendu mobile, fourni par ar-stepper.
export interface MobileRenderContext {
    currentStepLabel: string | undefined;
    currentSubStepLabel: string | undefined;
    currentStepStatus: string;
    onToggle: () => void;
}

/* ------------------------------------------------ */
/* RENDER-STATE — poussé sur chaque ArStepperItem   */
/* ------------------------------------------------ */

// Un groupe est "courant" si lui-même OU l'un de ses enfants l'est.
// Le state engine aplatit les noeuds en DFS et marque le parent 'completed'
// dès qu'un enfant est current → on ne peut pas se fier uniquement à step.state.
function isGroupCurrent(node: NavigationNode): boolean {
    return node.state === 'current' || node.children.some((child) => child.state === 'current');
}

/**
 * Calcule le render-state de chaque étape/sous-étape depuis l'arbre `NavigationNode` et le pousse
 * directement sur l'instance `ArStepperItem` correspondante (`node.item`). Remplace l'ancienne
 * reconstruction HTML — la logique de calcul (current/completed/lien/sous-étapes visibles) est
 * portée à l'identique depuis l'ancien `renderStep`/`renderSubStep`.
 */
export function pushItemRenderState(
    steps: NavigationNode[],
    mode: NavigationMode,
    stepLabel: (order: number, isSubstep: boolean) => string,
): void {
    steps.forEach((step, index) => {
        const order = index + 1;
        const isCurrent = isGroupCurrent(step);
        const isCompleted =
            !isCurrent && (mode === 'edit' ? step.state !== 'current' : step.state === 'completed');
        const bulletState: BulletState = isCurrent
            ? 'current'
            : step.state === 'completed'
              ? 'completed'
              : 'default';
        const showSubsteps = (isCurrent || mode === 'edit') && step.children.length > 0;

        step.item.setRenderState({
            bulletState,
            isSubstep: false,
            isLink: isCompleted,
            showSubsteps,
            srLabel: stepLabel(order, false),
        });

        step.children.forEach((sub, subIndex) => {
            const subOrder = subIndex + 1;
            const subIsCurrent = sub.state === 'current';
            const subIsCompleted = sub.state === 'completed';
            // La sous-étape courante ne doit jamais être un lien, y compris en mode edit
            // (on ne navigue pas vers la page où l'on se trouve déjà).
            const isEditableLink = mode === 'edit' && !subIsCurrent;
            const subBulletState: BulletState = subIsCurrent
                ? 'current'
                : subIsCompleted
                  ? 'completed'
                  : 'default';

            sub.item.setRenderState({
                bulletState: subBulletState,
                isSubstep: true,
                isLink: subIsCompleted || isEditableLink,
                showSubsteps: false,
                srLabel: stepLabel(subOrder, true),
            });
        });
    });
}

/* ------------------------------------------------ */
/* CHROME — liste (desktop) et dropdown (mobile)    */
/* ------------------------------------------------ */

function renderStepList(cssClass: string): TemplateResult {
    return html`
        <ol part="list" class="list-unstyled ${cssClass}">
            <slot></slot>
        </ol>
    `;
}

export function renderDesktop(): TemplateResult {
    return renderStepList('desktop');
}

export function renderMobile(ctx: MobileRenderContext): TemplateResult {
    const subLabel = ctx.currentSubStepLabel ? ` | ${ctx.currentSubStepLabel}` : '';

    return html`
        <div class="dropdown">
            <button
                type="button"
                part="trigger"
                aria-controls="stepper-dropdown-menu"
                @click=${ctx.onToggle}
            >
                <span> ${ctx.currentStepStatus} </span>
                <span class="text-primary emphasis"> ${ctx.currentStepLabel}${subLabel} </span>
            </button>

            <div id="stepper-dropdown-menu" part="panel">${renderStepList('mobile')}</div>
        </div>
    `;
}
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `npx vitest run packages/core/src/components/stepper/stepper.renderer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/components/stepper/stepper.renderer.ts packages/core/src/components/stepper/stepper.renderer.test.ts
git commit -m "refactor(core): stepper.renderer — pushItemRenderState remplace la reconstruction HTML (#226)"
```

---

### Task 4: `ar-stepper` — branchement complet

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.ts`
- Test: `packages/core/src/components/stepper/stepper.test.ts`

**Interfaces:**

- Consumes: `pushItemRenderState`, `renderDesktop()`, `renderMobile(ctx)` (Task 3) ; `StepperRegistry.notifyItemActivated` (Task 1) ; `ArStepperItem.focusControl()`, `NavigationNode.item` (Tasks 1-2).

- [ ] **Step 1: Écrire le test qui échoue — `notifyItemActivated` pilote la navigation**

Ajouter à `packages/core/src/components/stepper/stepper.test.ts`, dans un nouveau bloc `describe`
en fin de fichier (avant le dernier `});` fermant le describe racine) :

```typescript
describe('notifyItemActivated (registry)', () => {
    it('dispatch ar-stepper-step-change puis met à jour currentPath si non annulé', async () => {
        const el = await fixture<ArStepper>(html`
            <ar-stepper current-path="a">
                <ar-stepper-item path="a" label="A" href="#a"></ar-stepper-item>
                <ar-stepper-item path="b" label="B" href="#b"></ar-stepper-item>
            </ar-stepper>
        `);
        await el.updateComplete;

        const stepChange = vi.fn();
        el.addEventListener('ar-stepper-step-change', stepChange);

        const itemB = el.querySelector('ar-stepper-item[path="b"]') as ArStepperItem;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        // Accès à la registry interne via le mécanisme de contexte n'est pas exposé publiquement :
        // on simule l'appel tel que ArStepperItem._handleClick le ferait.
        (el as unknown as { _registry: StepperRegistry })._registry.notifyItemActivated(
            itemB,
            event,
        );

        expect(stepChange).toHaveBeenCalledOnce();
        const detail = stepChange.mock.calls[0]![0].detail;
        expect(detail).toEqual({ from: 'a', to: 'b' });
    });

    it('preventDefault() sur ar-stepper-step-change annule la navigation et l’event natif', async () => {
        const el = await fixture<ArStepper>(html`
            <ar-stepper current-path="a">
                <ar-stepper-item path="a" label="A" href="#a"></ar-stepper-item>
                <ar-stepper-item path="b" label="B" href="#b"></ar-stepper-item>
            </ar-stepper>
        `);
        await el.updateComplete;
        el.addEventListener('ar-stepper-step-change', (e) => e.preventDefault());

        const itemB = el.querySelector('ar-stepper-item[path="b"]') as ArStepperItem;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        (el as unknown as { _registry: StepperRegistry })._registry.notifyItemActivated(
            itemB,
            event,
        );

        expect(event.defaultPrevented).toBe(true);
    });
});
```

Ajouter les imports nécessaires en tête de fichier si absents : `import type { StepperRegistry }
from '../../context/stepper.context.js';` et `import type { ArStepperItem } from
'../stepper-item/stepper-item.js';` (vérifier d'abord qu'ils ne sont pas déjà importés).

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run packages/core/src/components/stepper/stepper.test.ts -t "notifyItemActivated"`
Expected: FAIL — `notifyItemActivated` n'existe pas encore sur `_registry`.

- [ ] **Step 3: Modifier `stepper.ts`**

3a. Import — remplacer la ligne 21 :

```typescript
import { renderDesktop, renderMobile, pushItemRenderState } from './stepper.renderer.js';
```

3b. Registry — remplacer le bloc `_registry` (lignes 202-219) :

```typescript
    private readonly _registry: StepperRegistry = {
        registerItem: (item) => {
            this.items.add(item);
            this.rebuildTree();
        },
        unregisterItem: (item) => {
            this.items.delete(item);
            this.rebuildTree();
        },
        notifyItemChanged: (_item, attribute) => {
            // label/href → simple re-render suffit, pas besoin de reconstruire l'arbre
            if (attribute === 'label' || attribute === 'href') {
                this.requestUpdate();
            } else {
                this.rebuildTree();
            }
        },
        notifyItemActivated: (item, event) => {
            this.onItemActivated(item, event);
        },
    };
```

3c. `willUpdate()` (lignes 307-320) — ajouter le push de render-state à la fin de la méthode :

```typescript
    protected override willUpdate(changed: PropertyValues<this>) {
        if (changed.has('currentPath') || this.navigation.tree.length) {
            this._currentStepIndex = this.computeCurrentStepIndex();
        }
        if (changed.has('currentPath')) {
            this.navigation.setCurrentPath(this.currentPath);
        }
        if (changed.has('followScroll')) {
            this.scrollFollow.setEnabled(this.followScroll);
        }
        if (changed.has('desktopTarget') || changed.has('desktopFrom')) {
            this.setupResponsiveMode();
        }
        if (this.navigation.tree.length) {
            const stepLabel = (order: number, isSubstep: boolean): string =>
                this.localize.term('stepLabel', order, isSubstep);
            pushItemRenderState(this.navigation.tree, this.mode, stepLabel);
        }
    }
```

3d. `render()` (lignes 324-360) — remplacer entièrement :

```typescript
    protected override render(): TemplateResult {
        const steps = this.navigation.tree;

        // Tant que les items ne se sont pas enregistrés, on rend le slot transparent
        if (!steps.length) {
            return html`<slot></slot>`;
        }

        const content = this._isDesktop
            ? renderDesktop()
            : renderMobile({
                  currentStepLabel: this.getCurrentStepLabel(),
                  currentSubStepLabel: this.getCurrentSubStepLabel(),
                  currentStepStatus: this.localize.term(
                      'currentStepStatus',
                      this._currentStepIndex + 1,
                      steps.length,
                  ),
                  onToggle: this._onDropdownToggle,
              });

        return html` <nav part="stepper" role="navigation" aria-labelledby="label-nav">
            <p id="label-nav" class="sr-only">${this.localize.term('stepperNavLabel')}</p>
            ${content}
        </nav>`;
    }
```

(Le `<slot></slot>` final après `${content}` est supprimé — la projection se fait maintenant à
l'intérieur de `content`, via le `<slot>` de `renderStepList()`.)

3e. `updated()` (lignes 259-290) — remplacer la ligne de focus (ligne 284) :

Avant :

```typescript
if (to === this._pendingFocusPath) {
    this.shadowRoot?.querySelector<HTMLElement>(`[data-path="${to}"]`)?.focus();
}
```

Après :

```typescript
if (to === this._pendingFocusPath) {
    this.navigation.currentNode?.item.focusControl();
}
```

3f. Supprimer entièrement la méthode `onClickLink` (lignes 503-543) et la remplacer par
`onItemActivated` :

```typescript
    private onItemActivated(item: ArStepperItem, event: MouseEvent): void {
        this._pendingFocusPath = item.path;

        const detail: ArStepperStepChangeDetail = { from: this.currentPath, to: item.path };

        const proceed = this.dispatchEvent(
            new CustomEvent('ar-stepper-step-change', {
                bubbles: true,
                composed: true,
                cancelable: true,
                detail,
            }),
        );
        if (!proceed) {
            this._pendingFocusPath = undefined;
            event.preventDefault();
        }

        // Force un cycle de rendu même si aucune propriété réactive ne change : c'est ce
        // cycle qui, dans updated(), valide (ou expire) l'intention de focus — garantit la
        // fenêtre "un seul cycle" même si le consommateur ignore l'event. Placé après le
        // dispatchEvent pour laisser une chance à une mutation synchrone/quasi-synchrone
        // (ex. Vue nextTick) du consommateur d'être planifiée dans le même cycle Lit.
        this.requestUpdate();
    }
```

(Le `preventDefault()` conditionnel sur `node?.href === undefined || node.href === '#'` disparaît
d'ici — il est désormais géré localement par `ArStepperItem._handleClick`, Task 2, sur sa propre
prop `href`.)

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run packages/core/src/components/stepper/stepper.test.ts`
Expected: PASS (y compris les tests existants non listés ici — s'ils échouent à cause de
sélecteurs `[data-path]`/HTML reconstruit obsolètes, voir Task 7 pour les adapter avant de
continuer cette tâche).

- [ ] **Step 5: Compilation TypeScript complète**

Run: `npm run build --workspace=packages/core 2>&1 | head -80`
Expected: Aucune erreur restante liée à `stepper`/`stepper-item`.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/components/stepper/stepper.ts packages/core/src/components/stepper/stepper.test.ts
git commit -m "feat(core): ar-stepper — branche notifyItemActivated, focusControl, slot unique (#226)"
```

---

### Task 5: Déplacement des styles vers `ar-stepper-item`

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.styles.ts`
- Modify: `packages/core/src/components/stepper-item/stepper-item.styles.ts`

**Interfaces:** Aucune — tâche purement visuelle, aucune API TypeScript affectée.

- [ ] **Step 1: Déplacer les blocs `bullet`/`label`/`step-link`/`step`/`substep`/`list--substep`**

Dans `packages/core/src/components/stepper-item/stepper-item.styles.ts`, remplacer le contenu par
(règles déplacées telles quelles depuis `stepper.styles.ts`, sélecteurs `[part=...]` inchangés —
ils continuent de matcher puisque ces parts sont maintenant posées dans **ce** shadow DOM) :

```typescript
import { css } from 'lit';

export default css`
    :host {
        display: contents;
    }

    .item-header {
        display: inline-flex;
        counter-increment: step;
    }

    [part~='bullet'],
    .item-header {
        align-items: center;
        color: var(--ar-stepper-label-color);
    }

    [part~='bullet'] {
        width: 2.25rem;
        height: 2.25rem;
        display: flex;
        flex-shrink: 0;
        justify-content: center;
        margin-inline-end: 0.5rem;
        transform: translateY(1px);
        box-shadow: 0 0 0 1px var(--ar-stepper-bullet-border-color) inset;
        background-color: transparent;
        /* Empêche le soulignement de ::part(step-link) de peindre à travers ce
         * flex-item (le conteneur <a> est en inline-flex, sans cette règle le trait
         * traverse aussi le chiffre du compteur). */
        text-decoration: none;
    }

    [part~='bullet']:before {
        content: counter(step);
        /* Les pseudo-éléments n'héritent pas toujours de façon fiable le
           text-decoration: none posé sur [part~='bullet'] (cf. commentaire
           ci-dessus) — le chiffre lui-même ne doit jamais être souligné. */
        text-decoration: none;
    }

    :host([part='substep']) [part~='bullet'] {
        width: 0.75rem;
        height: 0.75rem;
        margin-inline-start: 0.75rem;
        margin-inline-end: 1.25rem;
        display: block;
        padding-bottom: 0;

        &:before {
            content: '';
        }
    }

    /* [part='step']/[part='substep'] (égalité stricte) ne matche pas "list list--substep" côté
       ar-stepper : ce reset dédié évite que la liste de sous-étapes hérite du compteur "step" du
       parent au lieu de repartir de zéro, ce qui ferait sauter la numérotation des étapes
       principales suivantes. */
    [part~='list--substep'] {
        counter-reset: step;
        margin: 0;
    }

    /* S'applique à toute puce (étape ou sous-étape) dans un lien survolé/focus —
       même mécanisme pour les deux niveaux, aucun traitement spécifique au niveau. */
    [part~='step-link']:is(:hover, :focus) [part~='bullet'] {
        color: var(--ar-stepper-link-hover-bullet-text-color);
        background-color: var(--ar-stepper-bullet-hover-bg);
        box-shadow: none;
    }

    [part~='step-link']:is(:hover, :focus) .item-label {
        color: var(--ar-stepper-link-hover-label-color);
    }

    .item-header:focus-visible {
        outline-offset: 4px;
        outline-color: var(--ar-stepper-link-focus-outline-color);
    }

    :host([aria-current='step']) .item-header {
        color: var(--ar-stepper-current-header-color);
        font-weight: 700;
    }

    :host([part='step']:not(:last-child)):after {
        content: '';
        display: block;
        width: 2.25rem;
        height: var(--ar-stepper-gap);
        background-image: linear-gradient(var(--ar-stepper-connector-color) 25%, transparent 0);
        background-size: 2px 8px;
        background-position: center 3px;
        background-repeat: repeat-y;
    }

    :host([part='substep']):before {
        content: '';
        display: block;
        width: 2.25rem;
        height: var(--ar-stepper-substep-gap);
        background-image: linear-gradient(var(--ar-stepper-connector-color) 25%, transparent 0);
        background-size: 2px 8px;
        background-position: center 4px;
        background-repeat: repeat-y;
    }

    [part~='step-link'] [part~='bullet'] {
        color: var(--ar-stepper-bullet-color);
        background-color: var(--ar-stepper-bullet-bg);
        box-shadow: none;
    }

    :host([reverse-align]) {
        .item-header {
            justify-content: flex-end;
            margin-inline-start: auto;
            text-align: end;
        }

        [part~='bullet'] {
            order: 2;
            margin-inline-end: 0;
            margin-inline-start: 0.5rem;
        }

        :host([part='substep']) [part~='bullet'] {
            margin-inline-start: 1.25rem;
            margin-inline-end: 0.75rem;
        }
    }
`;
```

Points d'attention sur cette conversion (pas une copie mécanique — trois adaptations réelles) :

1. `.item`/`[part='step']:after`/`[part='substep']:before` ciblaient un `<li>` construit par
   `ar-stepper` — remplacés par des sélecteurs `:host([part='step'])`/`:host([part='substep'])`,
   puisque `part` est maintenant posé sur le host lui-même (Task 2).
2. `.current > .item-header` (basé sur une classe `current` posée par l'ancien renderer sur le
   `<li>`) devient `:host([aria-current='step']) .item-header` — `aria-current` est déjà posé sur
   le host par `updated()` (Task 2), pas besoin d'une classe séparée.
3. `:host([reverse-align])` : cet attribut est porté par `ar-stepper`, pas par `ar-stepper-item` —
   **il ne matchera jamais tel quel**. Remplacer par un sélecteur qui traverse la frontière depuis
   l'ancêtre réel : `ar-stepper[reverse-align] &` n'est pas valide en CSS scoped shadow DOM non
   plus (un sélecteur shadow ne peut pas référencer un ancêtre en dehors de son propre host).
   **Correction nécessaire avant de committer cette tâche** : `ar-stepper` doit exposer son état
   `reverse-align` via une CSS custom property héritée (`--ar-stepper-item-align: end` par exemple,
   posée conditionnellement dans `stepper.styles.ts` sur `:host([reverse-align])`, lue ici via
   `var(--ar-stepper-item-align, start)`). Écrire ce mécanisme avant de commit — ne pas laisser
   `:host([reverse-align])` tel quel dans ce fichier, il ne fonctionnera pas.

- [ ] **Step 2: Ajouter le pont `reverse-align` dans `stepper.styles.ts`**

Dans `packages/core/src/components/stepper/stepper.styles.ts`, ajouter (ne pas encore retirer
`:host([reverse-align]) .desktop { ... }` — Step 3 s'en charge) :

```css
:host([reverse-align]) {
    --ar-stepper-item-align: flex-end;
    --ar-stepper-item-bullet-order: 2;
    --ar-stepper-item-bullet-margin-end: 0;
    --ar-stepper-item-bullet-margin-start: 0.5rem;
}
```

Puis, dans `stepper-item.styles.ts`, remplacer le bloc `:host([reverse-align]) { ... }` de la
Step 1 par :

```css
.item-header {
    justify-content: var(--ar-stepper-item-align, flex-start);
    margin-inline-start: var(--ar-stepper-item-align, unset);
    text-align: var(--ar-stepper-item-text-align, start);
}

[part~='bullet'] {
    order: var(--ar-stepper-item-bullet-order, 0);
    margin-inline-end: var(--ar-stepper-item-bullet-margin-end, 0.5rem);
    margin-inline-start: var(--ar-stepper-item-bullet-margin-start, 0);
}
```

(Les valeurs par défaut dans `var(..., défaut)` reproduisent le comportement `align-items:
flex-start`/`text-align: start` normal quand `reverse-align` n'est pas posé — `ar-stepper` n'a
besoin de définir les custom properties QUE dans son bloc `:host([reverse-align])`.)

- [ ] **Step 3: Retirer les blocs déplacés de `stepper.styles.ts`**

Supprimer de `packages/core/src/components/stepper/stepper.styles.ts` : `.item-header`,
`[part~='bullet']` et son `:before`, `.item`, `[part~='step-link']:is(:hover, :focus) ...` (les
deux règles), `.item-header:focus-visible`, `.current > .item-header`, `[part='step']:after` (les
deux règles liées), `[part='substep']` et son `:before`, `[part='substep'] [part~='bullet']`,
`[part~='list--substep']`, et le contenu de `:host([reverse-align]) .desktop { .item {...} ...}`
sauf la partie déjà remplacée par le pont de custom properties (Step 2). Conserver : `:host(.loading)`,
`.dropdown`, `[part='trigger']` et son `@media`, `[part='list']` (le `counter-reset: step` racine),
`.desktop`, et le nouveau bloc `:host([reverse-align]) { --ar-stepper-item-* }` de la Step 2.

- [ ] **Step 4: Vérification visuelle manuelle**

Cette tâche n'a pas de test automatisé fiable pour du CSS visuel — lancer le site de doc et
comparer visuellement avant/après :

```bash
npm run dev --workspace=apps/docs
```

Ouvrir `/components/stepper`, vérifier : numérotation des puces correcte (1, 2, 3…), puce courante
mise en évidence, connecteurs pointillés entre étapes, `reverse-align` (si une démo l'illustre) —
alignement à droite avec puces à droite du texte.

- [ ] **Step 5: Lancer la suite de tests complète**

Run: `npm run test --workspace=packages/core`
Expected: PASS — CSS ne devrait rien casser fonctionnellement, mais confirme l'absence de
régression sur les tests déjà adaptés dans les tâches précédentes.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/components/stepper/stepper.styles.ts packages/core/src/components/stepper-item/stepper-item.styles.ts
git commit -m "refactor(core): stepper — déplace les styles bullet/label/step vers ar-stepper-item (#226)"
```

---

### Task 6: Tests — unitaires cassés (stepper.test.ts, autoloader.test.ts) + browser

**Ruling du contrôleur (2026-09-18), consigné dans le ledger SDD** : le plan initial ne prévoyait
d'adapter que `stepper.browser.test.ts` — un trou de couverture, découvert par l'implémenteur de la
Task 4, qui a laissé 28 tests cassés dans `stepper.test.ts` (unitaires, Vitest) + 1 dans
`autoloader.test.ts`, tous cassés par le même changement structurel (rendu délégué à
`ar-stepper-item`, `data-path` supprimé). Cette tâche est étendue pour les couvrir — c'est la même
famille de correctif que celui déjà prévu pour les tests browser, appliqué au même changement de
cause racine.

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.test.ts`
- Modify: `packages/core/src/autoloader.test.ts`
- Create: `packages/core/src/components/stepper-item/stepper-item.browser.test.ts`
- Modify: `packages/core/src/components/stepper/stepper.browser.test.ts`

**Interfaces:** Aucune nouvelle — valide ce que Tasks 2-4 ont construit.

- [ ] **Step 0a: Ajouter des helpers de requête dans `stepper.test.ts`**

`data-path` a été supprimé de `ar-stepper-item` (Task 2) — plus aucun sélecteur `[data-path]` ne
matche quoi que ce soit. Les parts (`bullet`, `label`, `step-link`, `control`, `list--substep`)
vivent maintenant dans le shadow DOM de l'`ar-stepper-item` concerné, pas celui d'`ar-stepper`, et
`part="step"`/`part="substep"` sont posés sur l'HOST de l'item (light DOM d'`ar-stepper`), pas dans
un `<li>` construit par `ar-stepper`.

Ajouter, juste après la fonction `requireQuery` existante (ligne 24-28) :

```typescript
/** Retrouve l'ar-stepper-item (léger DOM) portant ce path. */
function itemOf(el: ArStepper, path: string): ArStepperItem {
    return requireQuery<ArStepperItem>(el, `ar-stepper-item[path="${path}"]`);
}

/** Résout un sélecteur DANS le shadow DOM de l'item portant ce path (bullet, label, step-link…). */
function itemPart<T extends Element = HTMLElement>(
    el: ArStepper,
    path: string,
    selector: string,
): T {
    return requireQuery<T>(shadow(itemOf(el, path)), selector);
}

/** Le contrôle interne (<a> ou <div>) de l'item portant ce path. */
function itemHeader(el: ArStepper, path: string): HTMLElement {
    return itemPart<HTMLElement>(el, path, '.item-header');
}
```

- [ ] **Step 0b: Réécrire les 9 tests du bloc `describe('rendu', ...)` (lignes 50-295)**

Remplacements exacts, un test à la fois (les fixtures/structure de chaque `it` restent identiques
sauf mention contraire — seules les assertions changent) :

`'step-link porte aussi le rôle transverse "control"'` (ligne 72) — remplacer :

```typescript
const link = shadow(el).querySelector('a[part~="step-link"]');
expect(link?.getAttribute('part')?.split(/\s+/)).toContain('control');
```

par :

```typescript
const link = itemPart(el, '/a', 'a[part~="step-link"]');
expect(link.getAttribute('part')?.split(/\s+/)).toContain('control');
```

(Le lien cliquable apparaît sur l'étape non courante en mode edit — ici `/a`, puisque `current-path="/b"`.)

`'bullet porte aussi le rôle transverse "indicator"'` (ligne 85) — remplacer :

```typescript
const bullet = shadow(el).querySelector('[part~="bullet"]');
expect(bullet?.getAttribute('part')?.split(/\s+/)).toContain('indicator');
```

par :

```typescript
const bullet = itemPart(el, '/a', '[part~="bullet"]');
expect(bullet.getAttribute('part')?.split(/\s+/)).toContain('indicator');
```

`'rend part="step" sur un item de premier niveau et part="substep" sur une sous-étape'` (ligne 106)
— remplacer le corps entier après la fixture par :

```typescript
const topLevel = el.querySelectorAll(':scope > ar-stepper-item[part="step"]');
expect(topLevel.length).toBeGreaterThan(0);
const nested = el.querySelectorAll('ar-stepper-item ar-stepper-item[part="substep"]');
expect(nested.length).toBe(2);
// La sous-liste imbriquée vit dans le shadow DOM du parent ("/a"), pas celui d'ar-stepper.
const nestedList = shadow(itemOf(el, '/a')).querySelector('[part~="list--substep"]');
expect(nestedList?.getAttribute('part')).toBe('list list--substep');
```

`'rend part="step-link" sur le lien d\'une étape complétée, jamais sur une étape non cliquable'`
(ligne 125) — remplacer :

```typescript
const link = shadow(el).querySelector('a[part~="step-link"]');
expect(link?.getAttribute('part')).toBe('step-link control');
const currentItemInner = shadow(el).querySelector('div.item-header');
expect(currentItemInner?.hasAttribute('part')).toBe(false);
```

par :

```typescript
const link = itemPart(el, '/a', 'a[part~="step-link"]');
expect(link.getAttribute('part')).toBe('step-link control');
const currentItemInner = itemHeader(el, '/b');
expect(currentItemInner.tagName.toLowerCase()).toBe('div');
```

(`/b` est l'étape courante : son contrôle interne est un `<div>`, jamais un `<a>`, donc jamais de
`part="step-link"` dessus — l'ancien test vérifiait "pas de `part`" sur ce `<div>`, mais Task 2 pose
`part="control"` dessus même non cliquable ; vérifier plutôt que ce n'est pas un `<a>`, ce qui est
la garantie réellement voulue par ce test.)

`'rend part="bullet" sur la puce de chaque étape'` (ligne 140) — remplacer :

```typescript
expect(shadow(el).querySelector('[part~="bullet"]')).not.toBeNull();
```

par :

```typescript
expect(itemPart(el, '/a', '[part~="bullet"]')).toBeTruthy();
```

`'rend le part d'état "bullet--current" uniquement sur la puce de l'étape courante'` (ligne 150) —
lire les ~15 lignes suivantes dans le fichier réel (non reproduites ici) et remplacer chaque
`shadow(el).querySelectorAll('[part="list"] > li[part="step"]')`/`requireQuery(steps[i], ...)` par
`el.querySelectorAll(':scope > ar-stepper-item[part="step"]')` pour la liste des items top-level, et
`itemPart(el, path, '[part~="bullet"]')` pour chaque puce individuelle (remplacer l'indexation
`steps[0]`/`steps[1]` par un accès direct via le `path` de chaque étape de la fixture).

Pour les 2 tests restants du bloc `rendu` non listés individuellement ci-dessus (chercher
`grep -n "it(" packages/core/src/components/stepper/stepper.test.ts` entre les lignes 50 et 295
pour les repérer précisément) : appliquer le même principe — toute requête `shadow(el)` ciblant
`bullet`/`step-link`/`label`/`list--substep` devient `itemPart(el, path, ...)` ; toute requête
ciblant `part="step"`/`part="substep"` sur un `<li>` devient une requête `el.querySelectorAll(...)`
en light DOM sur `ar-stepper-item[part=...]`.

- [ ] **Step 0c: Réécrire le test `'construit l'arbre depuis les items enfants'`**

Chercher `grep -n "construit l'arbre depuis les items enfants" packages/core/src/components/stepper/stepper.test.ts`,
lire le test, et remplacer toute assertion sur la structure HTML reconstruite (`li.item`,
`[data-path]`) par une assertion équivalente sur la présence/l'imbrication des `ar-stepper-item`
dans le light DOM (`el.querySelectorAll('ar-stepper-item')`, `.getAttribute('path')`) — la donnée
vérifiée (l'arbre est bien construit) reste identique, seule la façon de l'observer change.

- [ ] **Step 0d: Réécrire le bloc `describe('événements', ...)` (6 tests, à partir de la ligne 298)**

Chaque occurrence de `requireQuery<HTMLAnchorElement>(shadow(el), 'a[data-path="/a"]')` devient
`itemPart<HTMLAnchorElement>(el, '/a', 'a')` (l'item `/a` n'a qu'un seul `<a>` dans son shadow DOM
quand il est cliquable — pas besoin de préciser `[part~="step-link"]` en plus, `a` suffit et reste
robuste si la structure interne change). Exemple complet, premier test du bloc (ligne 300-318) :

```typescript
it('émet ar-stepper-step-change au clic sur un lien, avec { from, to }', async () => {
    const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);

    const handler = vi.fn();
    el.addEventListener('ar-stepper-step-change', handler);

    const link = itemPart<HTMLAnchorElement>(el, '/a', 'a');
    link.click();

    expect(handler).toHaveBeenCalledOnce();
    const event = handler.mock.calls[0][0] as CustomEvent<ArStepperStepChangeDetail>;
    expect(event.detail).toEqual({ from: '/b', to: '/a' });

    el.removeEventListener('ar-stepper-step-change', handler);
});
```

Appliquer la même substitution (`shadow(el)` + `[data-path="..."]` → `itemPart(el, path, 'a')`) aux
5 autres tests du bloc, sans changer leur logique d'assertion par ailleurs.

- [ ] **Step 0e: Réécrire `'met à jour l'état courant quand currentPath change'`**

Chercher le test dans le bloc `describe('mise à jour de currentPath', ...)` — même substitution que
Step 0d/0b selon ce qu'il interroge (`a[data-path]` → `itemPart(..., 'a')`, ou `[part=...]` → même
principe).

- [ ] **Step 0f: Réécrire le bloc `describe("focus après activation d'un lien", ...)` (5 tests, à partir de la ligne 541)**

`data-path` est supprimé : `shadow(el).activeElement` doit devenir `shadow(itemOf(el, path))
.activeElement` (le focus atterrit dans le shadow DOM de l'ITEM concerné, pas celui d'`ar-stepper`
— cf. `focusControl()`, Task 2/4). Exemple complet pour les 2 premiers tests (lignes 542-578) :

```typescript
it("porte un <div> comme contrôle interne pour l'étape courante", async () => {
    const el = await fixtureWithItems(`
                    <ar-stepper current-path="/b">
                        <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                        <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                    </ar-stepper>
                `);

    const currentHeader = itemHeader(el, '/b');
    expect(currentHeader.tagName.toLowerCase()).toBe('div');
});

it("focalise le contrôle de l'étape cliquée quand le consommateur répond en mettant à jour currentPath", async () => {
    const el = await fixtureWithItems(`
                    <ar-stepper current-path="/b">
                        <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                        <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                    </ar-stepper>
                `);

    const linkA = itemPart<HTMLAnchorElement>(el, '/a', 'a');
    linkA.click();

    el.currentPath = '/a';
    await waitForUpdate(el);

    const newCurrentHeader = itemHeader(el, '/a');
    expect(newCurrentHeader.tagName.toLowerCase()).toBe('div');
    expect(shadow(itemOf(el, '/a')).activeElement).toBe(newCurrentHeader);
    expect(newCurrentHeader.getAttribute('tabindex')).toBe('-1');
});
```

(Le premier test perd son assertion `data-path` — devenue impossible à vérifier puisque l'attribut
n'existe plus ; le titre est légèrement reformulé ci-dessus en conséquence, garde l'assertion sur le
tag `<div>` qui reste la garantie réellement testée.)

Pour les 3 tests restants du bloc (`ne vole pas le focus...`, `n'affecte plus le focus...`,
`focalise le <div> de la SOUS-étape cliquée...`) : même substitution —
`shadow(el).activeElement`/`shadow(el).querySelector('[data-path="..."]')` deviennent
respectivement `shadow(itemOf(el, path)).activeElement` et `itemHeader(el, path)`.

- [ ] **Step 0g: Réécrire le bloc `describe('annonces a11y', ...)` (3 tests, à partir de la ligne ~1000)**

Chercher `grep -n "describe('annonces a11y'" packages/core/src/components/stepper/stepper.test.ts`,
lire les 3 tests. Ceux qui déclenchent un clic pour amorcer l'annonce utilisent la même substitution
que Step 0d (`shadow(el)` + `[data-path]` → `itemPart(el, path, 'a')`) ; l'assertion finale
(`expect(announceA11ySpy)...`) ne change pas, elle ne dépend pas de la structure DOM.

- [ ] **Step 0h: Réécrire `'lang="en" traduit le label sr-only de chaque étape'` (ligne 1092)**

Le texte `sr-only` (`.sr-only` dans `renderStepText`, désormais dans le shadow DOM de l'item) —
remplacer toute requête `shadow(el).querySelector('.sr-only')`/similaire ciblant le sr-only d'une
étape par `itemPart(el, path, '.sr-only')`. Les 2 autres tests du bloc `traduction`
(`stepperNavLabel`, `currentStepStatus` du dropdown mobile) ne sont **pas** dans la liste des 28
échecs — ne pas y toucher, ils continuent de cibler le shadow DOM d'`ar-stepper` lui-même (chrome
mobile, inchangé).

- [ ] **Step 0i: Corriger `autoloader.test.ts`**

Dans `packages/core/src/autoloader.test.ts`, remplacer (ligne ~156) :

```typescript
const nestedSubstep = stepper.shadowRoot?.querySelector('li.item [part~="list"] li.item');
expect(nestedSubstep).not.toBeNull();
```

par :

```typescript
// Preuve équivalente sous la nouvelle architecture : l'item "B" porte part="substep" sur
// son propre host (posé par ArStepperItem.updated() — Task 2), ET le parent "A" a bien
// construit le wrapper <ol part="list list--substep"> dans son propre shadow DOM (posé
// uniquement quand showSubsteps est vrai, Task 3/4) — les deux ne sont vrais que si
// buildFromItems() a correctement retrouvé le lien parent/enfant via closestInstanceOf().
const itemA = stepper.querySelector('acme-stepper-item[path="/a"]') as HTMLElement & {
    shadowRoot: ShadowRoot | null;
};
const itemB = stepper.querySelector('acme-stepper-item[path="/a/b"]');
expect(itemA.shadowRoot?.querySelector('[part~="list--substep"]')).not.toBeNull();
expect(itemB?.getAttribute('part')).toBe('substep');
```

- [ ] **Step 0j: Lancer la suite unitaire complète, vérifier 0 échec**

Run: `npm run test --workspace=packages/core`
Expected: PASS intégral (0 échec) — les 28 tests de `stepper.test.ts` + le test d'`autoloader.test.ts`
listés dans le rapport de Task 4 (`.superpowers/sdd/2026-09-18-stepper-item-rich-content/task-4-report.md`)
doivent tous passer désormais. Si un test échoue encore après application des Steps 0a-0i, relire
son intitulé exact dans cette liste et vérifier qu'aucune substitution n'a été oubliée — ne pas
supprimer ni skip un test pour faire passer la suite.

- [ ] **Step 0k: Commit intermédiaire**

```bash
git add packages/core/src/components/stepper/stepper.test.ts packages/core/src/autoloader.test.ts
git commit -m "test(core): stepper — adapte les tests unitaires au rendu délégué à ar-stepper-item (#226)"
```

- [ ] **Step 1: Créer les tests browser d'`ar-stepper-item`**

```typescript
/// <reference types="mocha" />
import { expect, fixture, html } from '@open-wc/testing';
import type { ArStepper } from '../stepper/stepper.js';
import '../stepper/index.js';

describe('ar-stepper-item — browser', () => {
    let el: ArStepper;

    afterEach(() => el?.remove());

    it('after-label peuplé pose aria-describedby sur le contrôle de l’étape', async () => {
        el = await fixture(html`
            <ar-stepper current-path="a">
                <ar-stepper-item path="a" label="Étape A" href="#a">
                    <span slot="after-label">note</span>
                </ar-stepper-item>
                <ar-stepper-item path="b" label="Étape B" href="#b"></ar-stepper-item>
            </ar-stepper>
        `);
        await el.updateComplete;

        const itemA = el.querySelector('ar-stepper-item[path="a"]')!;
        const control = itemA.shadowRoot!.querySelector('.item-header')!;
        const describedBy = control.getAttribute('aria-describedby');

        expect(describedBy).to.not.equal(null);
        const target = itemA.shadowRoot!.getElementById(describedBy!);
        expect(target?.textContent?.trim()).to.equal('note');
    });

    it('sans after-label, aucun aria-describedby n’est posé', async () => {
        el = await fixture(html`
            <ar-stepper current-path="a">
                <ar-stepper-item path="a" label="Étape A" href="#a"></ar-stepper-item>
                <ar-stepper-item path="b" label="Étape B" href="#b"></ar-stepper-item>
            </ar-stepper>
        `);
        await el.updateComplete;

        const itemB = el.querySelector('ar-stepper-item[path="b"]')!;
        const control = itemB.shadowRoot!.querySelector('.item-header')!;

        expect(control.hasAttribute('aria-describedby')).to.equal(false);
    });

    it('clic réel sur le lien d’une étape déclenche ar-stepper-step-change avec le bon detail', async () => {
        el = await fixture(html`
            <ar-stepper current-path="a">
                <ar-stepper-item path="a" label="Étape A" href="#a"></ar-stepper-item>
                <ar-stepper-item path="b" label="Étape B" href="#b"></ar-stepper-item>
            </ar-stepper>
        `);
        await el.updateComplete;

        let detail: { from: string; to: string } | undefined;
        el.addEventListener('ar-stepper-step-change', (e) => {
            detail = (e as CustomEvent).detail;
        });

        const itemB = el.querySelector('ar-stepper-item[path="b"]')!;
        const link = itemB.shadowRoot!.querySelector('a')!;
        link.click();

        expect(detail).to.deep.equal({ from: 'a', to: 'b' });
    });

    it('la numérotation des puces (compteur CSS) reste correcte à travers le shadow DOM des items', async () => {
        el = await fixture(html`
            <ar-stepper current-path="a">
                <ar-stepper-item path="a" label="Étape A"></ar-stepper-item>
                <ar-stepper-item path="b" label="Étape B"></ar-stepper-item>
                <ar-stepper-item path="c" label="Étape C"></ar-stepper-item>
            </ar-stepper>
        `);
        await el.updateComplete;

        const items = [...el.querySelectorAll('ar-stepper-item')];
        const bullets = items.map(
            (item) => item.shadowRoot!.querySelector('[part~="bullet"]') as HTMLElement,
        );
        const values = bullets.map((bullet) =>
            getComputedStyle(bullet, '::before').getPropertyValue('content'),
        );

        // content résolu contient le chiffre littéral (pas "counter(step)") une fois peint —
        // vérifié via un screenshot serait plus fiable mais indisponible en environnement WTR ;
        // on vérifie au minimum que la valeur spécifiée référence bien le compteur "step" et que
        // les trois puces sont bien dans le même contexte de comptage (host ar-stepper commun).
        values.forEach((v) => expect(v).to.include('counter(step)'));
        expect(
            new Set(bullets.map((b) => b.closest('ar-stepper-item')?.getAttribute('path'))).size,
        ).to.equal(3);
    });
});
```

- [ ] **Step 2: Lancer les tests browser du nouveau fichier**

Run (depuis `packages/core`) : `npx web-test-runner "src/components/stepper-item/stepper-item.browser.test.ts"`
Expected: PASS. Si le dernier test (compteur CSS) échoue parce que `getComputedStyle(...,
'::before').content` ne résout pas la valeur (limite connue des navigateurs sur les pseudo-éléments
non rendus) — remplacer par une vérification par capture d'écran comparée pixel à pixel n'est pas
justifié ici : simplifier le test pour vérifier uniquement que `content` référence `counter(step)`
(déjà fait) et retirer l'assertion sur la valeur résolue si elle n'est pas fiable en CI.

- [ ] **Step 3: Adapter `stepper.browser.test.ts`**

Toutes les occurrences ci-dessous ciblent des parts (`bullet`, `list`, `data-path`) qui vivent
maintenant dans le shadow DOM d'`ar-stepper-item`, pas celui d'`ar-stepper` — remplacements exacts,
ligne par ligne (numéros de ligne avant modification) :

**Lignes 106-143 — bloc `describe('focus après activation (#154)', ...)`**, remplacer le corps du
`it` (lignes 113-142) par :

```typescript
it('focalise le nouvel élément data-path courant et :focus-visible matche après activation', async () => {
    el = await fixture<ArStepper>(html`
        <ar-stepper current-path="/b" desktop-from="0">
            <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
            <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
        </ar-stepper>
    `);
    await elementUpdated(el);
    await elementUpdated(el);

    el.addEventListener('ar-stepper-step-change', (event: Event) => {
        el.currentPath = (event as CustomEvent<{ from: string; to: string }>).detail.to;
    });

    const itemA = el.querySelector('ar-stepper-item[path="/a"]')!;
    const linkA = itemA.shadowRoot!.querySelector('.item-header') as HTMLElement;
    linkA.focus();
    linkA.click();
    await elementUpdated(el);

    const newCurrent = itemA.shadowRoot!.querySelector('.item-header') as HTMLElement;
    expect(newCurrent.tagName.toLowerCase()).to.equal('div');
    expect(itemA.shadowRoot!.activeElement).to.equal(newCurrent);
    expect(newCurrent.matches(':focus-visible')).to.equal(true);
});
```

**Lignes 145-193 — bloc `describe('propriétés logiques par défaut (RTL)', ...)`** : les deux
fixtures créées par `desktopStepper()` ont respectivement une étape simple et une étape avec une
sous-étape — remplacer les trois occurrences de `el.shadowRoot?.querySelector<HTMLElement>(...)` :

Ligne 164 (`[part~="bullet"]` — bullet de l'étape 1) :

```typescript
const item = el.querySelector('ar-stepper-item')!;
const bullet = item.shadowRoot?.querySelector<HTMLElement>('[part~="bullet"]');
```

Ligne 173 (`[part='substep'] [part~='bullet']` — bullet de la sous-étape) :

```typescript
const subItem = el.querySelector('ar-stepper-item ar-stepper-item')!;
const subBullet = subItem.shadowRoot?.querySelector<HTMLElement>('[part~="bullet"]');
```

Ligne 188 (`[part="list"]` — reste sur `ar-stepper`, **aucun changement**, `list` n'a pas migré).

**Lignes 195-246 — bloc `describe('reverse-align × dir', ...)`**, les 4 occurrences de
`el.shadowRoot?.querySelector<HTMLElement>('[part~="bullet"]')` (lignes 214, 221, 228, 240) —
même remplacement à chacune des 4 occurrences :

```typescript
const item = el.querySelector('ar-stepper-item')!;
const bullet = item.shadowRoot?.querySelector<HTMLElement>('[part~="bullet"]');
```

Les lignes 18, 24, 80 (`[part="trigger"]`, `#stepper-dropdown-menu`, `[part="panel"]`) **ne
changent pas** — ces parts restent portées par `ar-stepper` (chrome du dropdown mobile, non
affecté par ce chantier).

- [ ] **Step 4: Lancer toute la suite browser du stepper, y compris le test a11y**

Run: `npx web-test-runner "src/components/stepper*/**/*.{browser,a11y}.test.ts"`
Expected: PASS — `stepper.a11y.test.ts` ne nécessite aucune modification de code (il vérifie
`expect(el).to.be.accessible()` sur l'élément entier, axe-core traverse les shadow DOM imbriqués
nativement), mais doit être explicitement lancé ici pour confirmer que l'imbrication d'un nouveau
niveau de shadow DOM par item (ids générés aléatoirement pour `after-label`/`_uid`) n'introduit
aucune violation (ex. id dupliqués entre instances).

- [ ] **Step 5: Lancer la suite browser complète du package**

Run: `npx web-test-runner`
Expected: PASS — confirme l'absence de régression sur les autres composants (aucun changement
attendu ailleurs, mais `stepper-item.styles.ts`/`stepper.styles.ts` sont des fichiers partagés
potentiellement importés ailleurs — vérifier qu'aucun autre composant n'importe
`stepper.styles.ts` avant de conclure, via `grep -rn "stepper.styles" packages/core/src/components/`).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/components/stepper-item/stepper-item.browser.test.ts packages/core/src/components/stepper/stepper.browser.test.ts
git commit -m "test(core): stepper — tests browser clic/focus/aria-describedby/compteur CSS (#226)"
```

---

### Task 7: Documentation — JSDoc et exemple `after-label`

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.ts` (JSDoc de classe, lignes 41-104)
- Modify: `apps/docs/src/content/components/ar-stepper.mdx` (vérifier le nom exact du fichier)

**Interfaces:** Aucune — documentation uniquement.

- [ ] **Step 1: Nettoyer le JSDoc de `ArStepper`**

Dans `packages/core/src/components/stepper/stepper.ts`, retirer du bloc JSDoc (lignes 56-70) les
`@csspart` qui ont migré vers `ArStepperItem` (Task 2 les documente déjà là-bas — ne pas les
dupliquer) : `step`, `substep`, `step-link`, `control`, `bullet`, `indicator`, `label`,
`label--link`, `bullet--current`, `bullet--completed`. Conserver uniquement :

```typescript
 * @csspart stepper - Racine du composant.
 * @csspart list    - La liste des étapes.
 * @csspart trigger - Le bouton d'ouverture du panel mobile.
 * @csspart panel   - Le panel mobile flottant.
```

- [ ] **Step 2: Régénérer le manifest CEM et vérifier la doc générée**

Run: `npm run build:manifest --workspace=packages/core`
Run: `npm run dev --workspace=apps/docs` (en arrière-plan), puis vérifier `/components/stepper` et
`/components/stepper-item` — la section CSS Parts de chaque page doit refléter la nouvelle
répartition (stepper : `stepper`/`list`/`trigger`/`panel` ; stepper-item : le reste).

- [ ] **Step 3: Localiser le fichier MDX du composant stepper**

Run: `find apps/docs/src/content/components -iname "*stepper*"`

- [ ] **Step 4: Ajouter un exemple `after-label` à la doc**

Repérer dans le fichier MDX trouvé un exemple existant avec sous-étapes (probablement proche de la
structure `etape-1`/`etape-1-1`/`etape-1-2` utilisée dans la spec). Ajouter, dans le bloc
d'exemple le plus proche d'une démonstration "sous-étapes", un `<span slot="after-label">` sur une
étape, avec un commentaire ou une phrase d'accompagnement expliquant l'usage (contenu additif, pas
un remplacement du label) — reprendre la formulation de la section « Contrat de slot » de la spec
comme base de rédaction, adaptée au format doc (moins technique, orienté consommateur).

- [ ] **Step 5: Vérification visuelle**

Ouvrir la page dans le navigateur (serveur déjà lancé au Step 2), confirmer que l'exemple
`after-label` s'affiche correctement, sans erreur console.

- [ ] **Step 6: Arrêter le serveur de dev et lancer `npx astro check`**

Run: `pkill -f "astro dev"` puis `cd apps/docs && npx astro check`
Expected: 0 erreur.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/components/stepper/stepper.ts apps/docs/src/content/components/
git commit -m "docs(core): stepper — nettoie le JSDoc parts, exemple after-label (#226)"
```

---

### Task 8: Vérification finale et PR

**Files:** Aucun changement de code — validation complète avant ouverture de la PR.

- [ ] **Step 1: Suite de tests complète (unitaires + browser)**

Run: `npm run test --workspace=packages/core`
Run (depuis `packages/core`) : `npx web-test-runner`
Expected: PASS intégral, aucune régression sur les autres composants.

- [ ] **Step 2: Build complet du monorepo**

Run: `npm run build`
Expected: 0 erreur TypeScript, `custom-elements.json` régénéré sans warning.

- [ ] **Step 3: Vérifier manuellement le scénario complet dans le navigateur**

Run: `npm run dev` (core + docs en parallèle)
Sur `/components/stepper` : naviguer au clavier (Tab, Entrée) à travers les étapes et sous-étapes,
vérifier l'annonce vocale (lecteur d'écran ou au minimum l'attribut `aria-current` qui se déplace
correctement dans les devtools), vérifier le mode `edit` (accès direct à toutes les étapes), et
vérifier le mode mobile (réduire la fenêtre sous le breakpoint `desktop-from`, ouvrir le dropdown).

- [ ] **Step 4: Ouvrir la PR**

```bash
git push -u origin feat/stepper-item-rich-content-226
gh pr create --base dev --head feat/stepper-item-rich-content-226 \
  --title "feat(core): ar-stepper-item — contenu riche after-label (#226)" \
  --body "Voir docs/superpowers/specs/2026-09-18-stepper-item-rich-content-design.md pour le détail de conception. Closes #226."
```

(Ne pas merger sans confirmation explicite de l'utilisateur — règle permanente du projet.)
