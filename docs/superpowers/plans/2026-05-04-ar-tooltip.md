# ar-tooltip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter `ar-tooltip`, un composant accessible déclenché sur hover et focus, avec caret Floating UI et respect de WCAG 1.4.13.

**Architecture:** `ar-tooltip` utilise le `TooltipController` existant (wrappant `Popover` avec `popover="manual"`). Le trigger est référencé par `for` (ID dans le light DOM). Le caret est positionné par le middleware `arrow()` de Floating UI, dont le support est ajouté à `Popover` de façon rétro-compatible. Les délais `show-delay`/`hide-delay` implémentent WCAG 1.4.13 : entrer dans la bulle annule le timer de fermeture.

**Tech Stack:** Lit 3, TypeScript, Floating UI (`arrow()` middleware), `popover="manual"`, Vitest (unit), @web/test-runner + axe (browser/a11y).

---

## Fichiers

| Action | Chemin                                                         |
| ------ | -------------------------------------------------------------- |
| Modify | `packages/core/src/utils/popover.ts`                           |
| Modify | `packages/core/src/controllers/tooltip.controller.ts`          |
| Create | `packages/core/src/components/tooltip/tooltip.test.ts`         |
| Create | `packages/core/src/components/tooltip/tooltip.styles.ts`       |
| Create | `packages/core/src/components/tooltip/tooltip.ts`              |
| Create | `packages/core/src/components/tooltip/tooltip.browser.test.ts` |
| Create | `packages/core/src/components/tooltip/tooltip.a11y.test.ts`    |
| Modify | `packages/core/src/index.ts`                                   |

---

## Task 1 : Branche feature

**Files:** aucun

- [ ] **Créer la branche depuis `dev`**

```bash
git checkout dev && git pull && git checkout -b feat/ar-tooltip
```

Expected: branche `feat/ar-tooltip` active.

---

## Task 2 : Ajouter le support arrow dans `Popover`

**Files:**

- Modify: `packages/core/src/utils/popover.ts`

Le `Popover` ne gère pas encore le caret Floating UI. On ajoute `arrowEl?: HTMLElement` en option et la méthode `setArrow()`. La modification est 100% rétro-compatible : `AnchoredController` (dropdown) n'est pas affecté.

- [ ] **Lire le fichier pour mémoriser le contenu exact**

```bash
cat packages/core/src/utils/popover.ts
```

- [ ] **Modifier l'import Floating UI — ajouter `arrow`**

Dans `packages/core/src/utils/popover.ts`, remplacer la ligne 1 :

```typescript
import { computePosition, flip, hide, offset, shift, autoUpdate } from '@floating-ui/dom';
```

par :

```typescript
import { arrow, computePosition, flip, hide, offset, shift, autoUpdate } from '@floating-ui/dom';
```

- [ ] **Ajouter `arrowEl` à l'interface `PopoverOptions`**

Après `onExternalClose?: () => void;` dans l'interface, ajouter :

```typescript
/** Élément caret positionné par Floating UI arrow(). Optionnel. */
arrowEl?: HTMLElement;
```

- [ ] **Mettre à jour le type de `_opts` pour inclure `arrowEl` comme optionnel**

Remplacer :

```typescript
private _opts: Required<Omit<PopoverOptions, 'onExternalClose'>> & {
    onExternalClose?: () => void;
};
```

par :

```typescript
private _opts: Required<Omit<PopoverOptions, 'onExternalClose' | 'arrowEl'>> & {
    onExternalClose?: () => void;
    arrowEl?: HTMLElement;
};
```

- [ ] **Initialiser `arrowEl` dans le constructeur**

Dans le bloc `this._opts = { ... }` du constructeur, ajouter après la ligne `onExternalClose` :

```typescript
...(options.arrowEl !== undefined && { arrowEl: options.arrowEl }),
```

- [ ] **Ajouter la méthode `setArrow`** (après `setOffset`) :

```typescript
setArrow(el: HTMLElement | null): void {
    this._opts.arrowEl = el ?? undefined;
}
```

- [ ] **Mettre à jour `_position()` — ajouter le middleware et le positionnement**

Remplacer la méthode `_position()` complète par :

```typescript
private async _position(): Promise<void> {
    if (!this._isOpen || !this._trigger || !this._panel) return;
    const arrowEl = this._opts.arrowEl ?? null;
    const { x, y, middlewareData, placement } = await computePosition(
        this._trigger,
        this._panel,
        {
            placement: this._opts.placement,
            strategy: 'absolute',
            middleware: [
                offset({ mainAxis: this._opts.distance, crossAxis: this._opts.offset }),
                flip(),
                ...(arrowEl ? [arrow({ element: arrowEl })] : []),
                shift({ padding: 4 }),
                hide(),
            ],
        },
    );
    // Guard: panel may have been destroyed during the async computePosition call.
    if (!this._panel) return;
    const hidden = middlewareData.hide?.referenceHidden ?? false;
    this._panel.style.visibility = hidden ? 'hidden' : '';
    this._panel.style.transform = `translate(${this._roundByDPR(x)}px, ${this._roundByDPR(y)}px)`;

    if (arrowEl && middlewareData.arrow) {
        const { x: ax, y: ay } = middlewareData.arrow;
        const side = placement.split('-')[0] as 'top' | 'bottom' | 'left' | 'right';
        const staticSide = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[side];
        const halfSize = arrowEl.offsetWidth / 2;
        Object.assign(arrowEl.style, {
            left: ax != null ? `${this._roundByDPR(ax)}px` : '',
            top: ay != null ? `${this._roundByDPR(ay)}px` : '',
            right: '',
            bottom: '',
            [staticSide]: `-${halfSize}px`,
        });
    }
}
```

- [ ] **Vérifier qu'il n'y a pas d'erreur TypeScript**

```bash
cd packages/core && npx tsc --noEmit 2>&1 | head -20
```

Expected: aucune erreur.

- [ ] **Commit**

```bash
git add packages/core/src/utils/popover.ts
git commit -m "feat(popover): support optionnel du caret via arrow() Floating UI"
```

---

## Task 3 : Ajouter `setArrow` dans `TooltipController`

**Files:**

- Modify: `packages/core/src/controllers/tooltip.controller.ts`

- [ ] **Ajouter la méthode `setArrow`** après `setOffset()` :

```typescript
setArrow(el: HTMLElement | null): void {
    this._popover.setArrow(el);
}
```

- [ ] **Vérifier TypeScript**

```bash
cd packages/core && npx tsc --noEmit 2>&1 | head -20
```

Expected: aucune erreur.

- [ ] **Commit**

```bash
git add packages/core/src/controllers/tooltip.controller.ts
git commit -m "feat(tooltip.controller): expose setArrow() pour le caret"
```

---

## Task 4 : Écrire les tests unitaires (Vitest — doivent échouer)

**Files:**

- Create: `packages/core/src/components/tooltip/tooltip.test.ts`

- [ ] **Créer le fichier de tests**

```typescript
// packages/core/src/components/tooltip/tooltip.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, waitForUpdate, getPart } from '../../test-utils.js';
import type { ArTooltip } from './tooltip.js';
import './tooltip.js';

// happy-dom ne supporte pas l'API Popover — on mock showPopover/hidePopover sur la bulle.
function mockBubblePopover(el: ArTooltip): void {
    const bubble = getPart(el, 'bubble') as HTMLElement | null;
    if (!bubble) return;
    (bubble as any).showPopover = vi.fn();
    (bubble as any).hidePopover = vi.fn();
}

describe('ArTooltip', () => {
    let el: ArTooltip;

    afterEach(() => el?.remove());

    // ── Rendu ──────────────────────────────────────────────────────────────

    describe('rendu', () => {
        beforeEach(async () => {
            document.body.innerHTML = '<button id="btn">x</button>';
            el = await fixture<ArTooltip>('<ar-tooltip for="btn">Aide</ar-tooltip>');
            mockBubblePopover(el);
        });

        it('monte un shadow DOM', () => {
            expect(el.shadowRoot).not.toBeNull();
        });

        it('contient un bubble avec part="bubble"', () => {
            expect(getPart(el, 'bubble')).not.toBeNull();
        });

        it('bubble a role="tooltip"', () => {
            expect(getPart(el, 'bubble')?.getAttribute('role')).toBe('tooltip');
        });

        it('bubble a popover="manual"', () => {
            expect(getPart(el, 'bubble')?.getAttribute('popover')).toBe('manual');
        });

        it('affiche le caret par défaut', () => {
            expect(getPart(el, 'arrow')).not.toBeNull();
        });
    });

    // ── Valeurs par défaut ─────────────────────────────────────────────────

    describe('valeurs par défaut', () => {
        beforeEach(async () => {
            document.body.innerHTML = '<button id="btn">x</button>';
            el = await fixture<ArTooltip>('<ar-tooltip for="btn">Aide</ar-tooltip>');
        });

        it('placement="top"', () => expect(el.placement).toBe('top'));
        it('distance=6', () => expect(el.distance).toBe(6));
        it('offset=0', () => expect(el.offset).toBe(0));
        it('showDelay=300', () => expect(el.showDelay).toBe(300));
        it('hideDelay=150', () => expect(el.hideDelay).toBe(150));
        it('withoutArrow=false', () => expect(el.withoutArrow).toBe(false));
        it('disabled=false', () => expect(el.disabled).toBe(false));
    });

    // ── ARIA ───────────────────────────────────────────────────────────────

    describe('ARIA', () => {
        beforeEach(async () => {
            document.body.innerHTML = '<button id="btn">x</button>';
            el = await fixture<ArTooltip>('<ar-tooltip for="btn">Aide</ar-tooltip>');
        });

        it("pose aria-describedby sur le trigger pointant vers l'id de la bulle", () => {
            const trigger = document.getElementById('btn')!;
            const bubble = getPart(el, 'bubble')!;
            expect(trigger.getAttribute('aria-describedby')).toBe(bubble.id);
        });

        it("l'id de la bulle est non vide", () => {
            expect((getPart(el, 'bubble') as HTMLElement).id).not.toBe('');
        });
    });

    // ── without-arrow ──────────────────────────────────────────────────────

    describe('without-arrow', () => {
        it('omet le caret quand without-arrow est posé', async () => {
            document.body.innerHTML = '<button id="btn">x</button>';
            el = await fixture<ArTooltip>('<ar-tooltip for="btn" without-arrow>Aide</ar-tooltip>');
            expect(getPart(el, 'arrow')).toBeNull();
        });

        it('restitue le caret quand without-arrow est retiré', async () => {
            document.body.innerHTML = '<button id="btn">x</button>';
            el = await fixture<ArTooltip>('<ar-tooltip for="btn" without-arrow>Aide</ar-tooltip>');
            el.withoutArrow = false;
            await waitForUpdate(el);
            expect(getPart(el, 'arrow')).not.toBeNull();
        });
    });

    // ── warn() ─────────────────────────────────────────────────────────────

    describe('warn() — trigger introuvable', () => {
        it("affiche un warn si l'ID est introuvable", async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            el = await fixture<ArTooltip>('<ar-tooltip for="id-qui-nexiste-pas">Aide</ar-tooltip>');
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('id-qui-nexiste-pas'));
            warnSpy.mockRestore();
        });
    });

    // ── Changement de `for` ────────────────────────────────────────────────

    describe('changement de for', () => {
        it("retire aria-describedby de l'ancien trigger", async () => {
            document.body.innerHTML = '<button id="a">a</button><button id="b">b</button>';
            el = await fixture<ArTooltip>('<ar-tooltip for="a">Aide</ar-tooltip>');
            el.for = 'b';
            await waitForUpdate(el);
            expect(document.getElementById('a')!.hasAttribute('aria-describedby')).toBe(false);
        });

        it('pose aria-describedby sur le nouveau trigger', async () => {
            document.body.innerHTML = '<button id="a">a</button><button id="b">b</button>';
            el = await fixture<ArTooltip>('<ar-tooltip for="a">Aide</ar-tooltip>');
            el.for = 'b';
            await waitForUpdate(el);
            const bubble = getPart(el, 'bubble') as HTMLElement;
            expect(document.getElementById('b')!.getAttribute('aria-describedby')).toBe(bubble.id);
        });
    });

    // ── disabled ───────────────────────────────────────────────────────────

    describe('disabled', () => {
        it('ne schedule pas le show si disabled=true', async () => {
            document.body.innerHTML = '<button id="btn">x</button>';
            el = await fixture<ArTooltip>(
                '<ar-tooltip for="btn" disabled show-delay="0">Aide</ar-tooltip>',
            );
            mockBubblePopover(el);
            document.getElementById('btn')!.dispatchEvent(new Event('mouseenter'));
            await new Promise((r) => setTimeout(r, 10));
            expect((getPart(el, 'bubble') as any).showPopover).not.toHaveBeenCalled();
        });
    });
});
```

- [ ] **Vérifier que les tests échouent (composant inexistant)**

```bash
cd packages/core && npm run test -- --reporter=verbose 2>&1 | grep -E "FAIL|Cannot find|tooltip" | head -15
```

Expected: erreur `Cannot find module './tooltip.js'`.

---

## Task 5 : Créer `tooltip.styles.ts`

**Files:**

- Create: `packages/core/src/components/tooltip/tooltip.styles.ts`

- [ ] **Créer le fichier**

```typescript
// packages/core/src/components/tooltip/tooltip.styles.ts
import { css, type CSSResultGroup } from 'lit';
import animationsStyles from '../../styles/animations.styles.js';

const tooltipStyles = css`
    :host {
        display: contents;
    }

    [part='bubble'] {
        /* Popover positioning reset */
        position: absolute;
        inset: 0 auto auto 0;
        margin: 0;

        /* Box model */
        box-sizing: border-box;
        padding: var(--ar-tooltip-padding, 0.375rem 0.625rem);
        max-width: var(--ar-tooltip-max-width, 18rem);

        /* Visual */
        background-color: var(--ar-tooltip-bg, #1a1a1a);
        color: var(--ar-tooltip-color, #fff);
        border: none;
        border-radius: var(--ar-tooltip-border-radius, 0.25rem);
        font-size: var(--ar-tooltip-font-size, 0.8125rem);
        line-height: 1.4;
        word-break: break-word;
    }

    [part='bubble']:not(:popover-open) {
        display: none;
    }

    [part='bubble']:popover-open {
        animation: arPanelShow 0.15s ease-out;
    }

    @media (prefers-reduced-motion: reduce) {
        [part='bubble']:popover-open {
            animation: none;
        }
    }

    [part='arrow'] {
        position: absolute;
        width: var(--ar-tooltip-arrow-size, 6px);
        height: var(--ar-tooltip-arrow-size, 6px);
        background-color: var(--ar-tooltip-bg, #1a1a1a);
        transform: rotate(45deg);
        pointer-events: none;
    }
`;

const styles: CSSResultGroup = [animationsStyles, tooltipStyles];
export default styles;
```

---

## Task 6 : Implémenter `tooltip.ts` (rendre les tests unitaires verts)

**Files:**

- Create: `packages/core/src/components/tooltip/tooltip.ts`

- [ ] **Créer le composant**

```typescript
// packages/core/src/components/tooltip/tooltip.ts
import { LitElement, html, nothing, type TemplateResult, type PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { TooltipController } from '../../controllers/tooltip.controller.js';
import type { Placement } from '@floating-ui/dom';
import { warn } from '../../utils/warn.js';
import styles from './tooltip.styles.js';

export type ArTooltipPlacement = Placement;

/**
 * @summary Bulle d'information non-interactive déclenchée sur hover et focus.
 *
 * Implémente WCAG 1.4.13 (Content on Hover or Focus) : la bulle reste
 * accessible quand le pointeur se déplace du trigger vers la bulle.
 *
 * Le contenu doit rester non-interactif (spec ARIA role="tooltip").
 * Pour du contenu riche ou cliquable, utiliser ar-dropdown.
 *
 * @slot - Texte du tooltip.
 *
 * @csspart bubble - Le panel flottant.
 * @csspart arrow  - Le caret directionnel.
 *
 * @cssprop [--ar-tooltip-bg=#1a1a1a]                  - Fond de la bulle.
 * @cssprop [--ar-tooltip-color=#fff]                  - Couleur du texte.
 * @cssprop [--ar-tooltip-border-radius=0.25rem]        - Arrondi.
 * @cssprop [--ar-tooltip-padding=0.375rem 0.625rem]    - Marge interne.
 * @cssprop [--ar-tooltip-font-size=0.8125rem]          - Taille de police.
 * @cssprop [--ar-tooltip-max-width=18rem]              - Largeur maximale.
 * @cssprop [--ar-tooltip-arrow-size=6px]               - Taille du caret.
 */
@customElement('ar-tooltip')
export class ArTooltip extends LitElement {
    static override styles = [styles];

    /** ID du trigger dans le light DOM. Requis. */
    @property({ reflect: true }) for = '';

    /** Placement Floating UI (12 valeurs, ex: "top", "bottom-start"). */
    @property({ reflect: true }) placement: ArTooltipPlacement = 'top';

    /** Espacement trigger→bulle en px. */
    @property({ reflect: true, type: Number }) distance = 6;

    /** Décalage latéral en px. */
    @property({ reflect: true, type: Number }) offset = 0;

    /** Délai avant affichage en ms (WCAG 1.4.13). */
    @property({ attribute: 'show-delay', reflect: true, type: Number }) showDelay = 300;

    /** Délai avant masquage en ms (WCAG 1.4.13). */
    @property({ attribute: 'hide-delay', reflect: true, type: Number }) hideDelay = 150;

    /** Supprime le caret. */
    @property({ attribute: 'without-arrow', reflect: true, type: Boolean }) withoutArrow = false;

    /** Désactive complètement le tooltip. */
    @property({ reflect: true, type: Boolean }) disabled = false;

    @query('[part="bubble"]') private _bubble!: HTMLElement;

    private readonly _tooltip = new TooltipController(this, { placement: 'top', distance: 6 });
    private _trigger: HTMLElement | null = null;
    private _showTimer = 0;
    private _hideTimer = 0;

    override firstUpdated(): void {
        this._attachTrigger();
        const arrowEl = this.shadowRoot?.querySelector<HTMLElement>('[part="arrow"]') ?? null;
        if (arrowEl) this._tooltip.setArrow(arrowEl);
    }

    override updated(changed: PropertyValues<this>): void {
        if (changed.has('for')) {
            this._detachTrigger();
            this._attachTrigger();
        }
        if (changed.has('placement')) this._tooltip.setPlacement(this.placement);
        if (changed.has('distance')) this._tooltip.setDistance(this.distance);
        if (changed.has('offset')) this._tooltip.setOffset(this.offset);
        if (changed.has('disabled') && this.disabled) {
            clearTimeout(this._showTimer);
            clearTimeout(this._hideTimer);
            this._tooltip.hide();
        }
        if (changed.has('withoutArrow')) {
            const arrowEl = this.withoutArrow
                ? null
                : (this.shadowRoot?.querySelector<HTMLElement>('[part="arrow"]') ?? null);
            this._tooltip.setArrow(arrowEl);
        }
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this._detachTrigger();
        clearTimeout(this._showTimer);
        clearTimeout(this._hideTimer);
        document.removeEventListener('keydown', this._handleKeyDown);
    }

    override render(): TemplateResult {
        return html`
            <div
                part="bubble"
                popover="manual"
                role="tooltip"
                @mouseenter=${this._handleBubbleMouseEnter}
                @mouseleave=${this._handleBubbleMouseLeave}
            >
                <slot></slot>
                ${this.withoutArrow ? nothing : html`<div part="arrow"></div>`}
            </div>
        `;
    }

    private _attachTrigger(): void {
        if (!this.for) return;
        const trigger = document.getElementById(this.for);
        if (!trigger) {
            warn('ar-tooltip', `Aucun élément trouvé avec l'id "${this.for}".`);
            return;
        }
        this._trigger = trigger;
        this._tooltip.attach(trigger, this._bubble);
        trigger.addEventListener('mouseenter', this._handleMouseEnter);
        trigger.addEventListener('mouseleave', this._handleMouseLeave);
        trigger.addEventListener('focus', this._handleFocus);
        trigger.addEventListener('blur', this._handleBlur);
    }

    private _detachTrigger(): void {
        if (!this._trigger) return;
        this._trigger.removeEventListener('mouseenter', this._handleMouseEnter);
        this._trigger.removeEventListener('mouseleave', this._handleMouseLeave);
        this._trigger.removeEventListener('focus', this._handleFocus);
        this._trigger.removeEventListener('blur', this._handleBlur);
        this._trigger.removeAttribute('aria-describedby');
        this._trigger = null;
        this._tooltip.hide();
    }

    private _scheduleShow(): void {
        if (this.disabled) return;
        clearTimeout(this._hideTimer);
        this._showTimer = window.setTimeout(() => {
            void this._tooltip.show();
            document.addEventListener('keydown', this._handleKeyDown);
        }, this.showDelay);
    }

    private _scheduleHide(): void {
        clearTimeout(this._showTimer);
        this._hideTimer = window.setTimeout(() => {
            this._tooltip.hide();
            document.removeEventListener('keydown', this._handleKeyDown);
        }, this.hideDelay);
    }

    private readonly _handleMouseEnter = (): void => this._scheduleShow();
    private readonly _handleMouseLeave = (): void => this._scheduleHide();
    private readonly _handleFocus = (): void => this._scheduleShow();
    private readonly _handleBlur = (): void => this._scheduleHide();

    private readonly _handleBubbleMouseEnter = (): void => {
        clearTimeout(this._hideTimer);
    };

    private readonly _handleBubbleMouseLeave = (): void => {
        this._scheduleHide();
    };

    private readonly _handleKeyDown = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') {
            clearTimeout(this._showTimer);
            clearTimeout(this._hideTimer);
            this._tooltip.hide();
            document.removeEventListener('keydown', this._handleKeyDown);
        }
    };
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-tooltip': ArTooltip;
    }
}
```

- [ ] **Lancer les tests unitaires**

```bash
cd packages/core && npm run test -- --reporter=verbose 2>&1 | grep -E "✓|✗|PASS|FAIL|tooltip"
```

Expected: tous les tests `ArTooltip` passent.

- [ ] **Vérifier TypeScript**

```bash
cd packages/core && npx tsc --noEmit 2>&1 | head -20
```

Expected: aucune erreur.

- [ ] **Commit**

```bash
git add packages/core/src/components/tooltip/
git commit -m "feat(tooltip): ar-tooltip — composant, styles et tests unitaires"
```

---

## Task 7 : Tests browser (WTR — comportement réel)

**Files:**

- Create: `packages/core/src/components/tooltip/tooltip.browser.test.ts`

Les tests WTR tournent dans Chromium réel et ont accès à l'API Popover native.

- [ ] **Créer le fichier**

```typescript
/// <reference types="mocha" />
/**
 * tooltip.browser.test.ts
 *
 * Tests nécessitant un vrai navigateur (Chromium via @web/test-runner) :
 *   - API Popover native (:popover-open)
 *   - Show/hide avec délais réels
 *   - WCAG 1.4.13 : hover sur la bulle annule la fermeture
 *   - Fermeture sur Escape
 *   - Positionnement du caret
 */
import { fixture, html, expect, aTimeout } from '@open-wc/testing';
import type { ArTooltip } from './tooltip.js';
import './tooltip.js';

function getBubble(el: ArTooltip): HTMLElement {
    const bubble = el.shadowRoot?.querySelector('[part="bubble"]');
    if (!(bubble instanceof HTMLElement)) throw new Error('[part="bubble"] introuvable');
    return bubble;
}

describe('ar-tooltip — browser', () => {
    // ── Show / Hide ────────────────────────────────────────────────────────

    describe('show / hide', () => {
        it('affiche la bulle après show-delay sur mouseenter', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div>
                    <button id="btn">x</button>
                    <ar-tooltip for="btn" show-delay="50">Aide</ar-tooltip>
                </div>
            `);
            const el = wrapper.querySelector<ArTooltip>('ar-tooltip')!;
            const btn = wrapper.querySelector<HTMLElement>('#btn')!;
            btn.dispatchEvent(new MouseEvent('mouseenter'));
            expect(getBubble(el).matches(':popover-open')).to.equal(false);
            await aTimeout(80);
            expect(getBubble(el).matches(':popover-open')).to.equal(true);
        });

        it('masque la bulle après hide-delay sur mouseleave', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div>
                    <button id="btn2">x</button>
                    <ar-tooltip for="btn2" show-delay="0" hide-delay="50">Aide</ar-tooltip>
                </div>
            `);
            const el = wrapper.querySelector<ArTooltip>('ar-tooltip')!;
            const btn = wrapper.querySelector<HTMLElement>('#btn2')!;
            btn.dispatchEvent(new MouseEvent('mouseenter'));
            await aTimeout(20);
            btn.dispatchEvent(new MouseEvent('mouseleave'));
            await aTimeout(80);
            expect(getBubble(el).matches(':popover-open')).to.equal(false);
        });

        it('affiche la bulle au focus du trigger', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div>
                    <button id="btn3">x</button>
                    <ar-tooltip for="btn3" show-delay="0">Aide</ar-tooltip>
                </div>
            `);
            const el = wrapper.querySelector<ArTooltip>('ar-tooltip')!;
            const btn = wrapper.querySelector<HTMLElement>('#btn3')!;
            btn.dispatchEvent(new FocusEvent('focus'));
            await aTimeout(20);
            expect(getBubble(el).matches(':popover-open')).to.equal(true);
        });

        it('masque la bulle au blur du trigger', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div>
                    <button id="btn4">x</button>
                    <ar-tooltip for="btn4" show-delay="0" hide-delay="0">Aide</ar-tooltip>
                </div>
            `);
            const el = wrapper.querySelector<ArTooltip>('ar-tooltip')!;
            const btn = wrapper.querySelector<HTMLElement>('#btn4')!;
            btn.dispatchEvent(new FocusEvent('focus'));
            await aTimeout(20);
            btn.dispatchEvent(new FocusEvent('blur'));
            await aTimeout(20);
            expect(getBubble(el).matches(':popover-open')).to.equal(false);
        });
    });

    // ── WCAG 1.4.13 ────────────────────────────────────────────────────────

    describe('WCAG 1.4.13 — persistance sur hover bulle', () => {
        it('annule la fermeture si le pointeur entre dans la bulle', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div>
                    <button id="btn5">x</button>
                    <ar-tooltip for="btn5" show-delay="0" hide-delay="100">Aide</ar-tooltip>
                </div>
            `);
            const el = wrapper.querySelector<ArTooltip>('ar-tooltip')!;
            const btn = wrapper.querySelector<HTMLElement>('#btn5')!;
            const bubble = getBubble(el);
            btn.dispatchEvent(new MouseEvent('mouseenter'));
            await aTimeout(20);
            btn.dispatchEvent(new MouseEvent('mouseleave'));
            // Pointeur entre dans la bulle avant expiration du hide-delay
            bubble.dispatchEvent(new MouseEvent('mouseenter'));
            await aTimeout(150);
            expect(bubble.matches(':popover-open')).to.equal(true);
        });
    });

    // ── Escape ─────────────────────────────────────────────────────────────

    describe('Escape', () => {
        it('ferme le tooltip sur Escape sans délai', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div>
                    <button id="btn6">x</button>
                    <ar-tooltip for="btn6" show-delay="0">Aide</ar-tooltip>
                </div>
            `);
            const el = wrapper.querySelector<ArTooltip>('ar-tooltip')!;
            const btn = wrapper.querySelector<HTMLElement>('#btn6')!;
            btn.dispatchEvent(new MouseEvent('mouseenter'));
            await aTimeout(20);
            expect(getBubble(el).matches(':popover-open')).to.equal(true);
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            await aTimeout(10);
            expect(getBubble(el).matches(':popover-open')).to.equal(false);
        });
    });

    // ── Caret ──────────────────────────────────────────────────────────────

    describe('caret', () => {
        it('présent dans le DOM par défaut', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div>
                    <button id="btn7">x</button>
                    <ar-tooltip for="btn7">Aide</ar-tooltip>
                </div>
            `);
            const el = wrapper.querySelector<ArTooltip>('ar-tooltip')!;
            expect(el.shadowRoot?.querySelector('[part="arrow"]')).to.not.equal(null);
        });

        it('absent avec without-arrow', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div>
                    <button id="btn8">x</button>
                    <ar-tooltip for="btn8" without-arrow>Aide</ar-tooltip>
                </div>
            `);
            const el = wrapper.querySelector<ArTooltip>('ar-tooltip')!;
            expect(el.shadowRoot?.querySelector('[part="arrow"]')).to.equal(null);
        });

        it('a un style inline positionné après ouverture', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div style="position:relative;padding:100px">
                    <button id="btn9">x</button>
                    <ar-tooltip for="btn9" show-delay="0">Aide</ar-tooltip>
                </div>
            `);
            const el = wrapper.querySelector<ArTooltip>('ar-tooltip')!;
            const btn = wrapper.querySelector<HTMLElement>('#btn9')!;
            btn.dispatchEvent(new MouseEvent('mouseenter'));
            await aTimeout(50);
            const arrowEl = el.shadowRoot?.querySelector<HTMLElement>('[part="arrow"]');
            // Floating UI doit avoir injecté au moins un style (left ou top)
            expect(arrowEl?.style.cssText).to.not.equal('');
        });
    });
});
```

- [ ] **Lancer les tests browser**

```bash
cd packages/core && npm run test:browser 2>&1 | grep -E "✓|✗|passing|failing|tooltip"
```

Expected: tous les tests `ar-tooltip — browser` passent.

- [ ] **Commit**

```bash
git add packages/core/src/components/tooltip/tooltip.browser.test.ts
git commit -m "test(tooltip): tests browser — show/hide, WCAG 1.4.13, Escape, caret"
```

---

## Task 8 : Tests d'accessibilité (WTR)

**Files:**

- Create: `packages/core/src/components/tooltip/tooltip.a11y.test.ts`

- [ ] **Créer le fichier**

```typescript
/// <reference types="mocha" />
/**
 * tooltip.a11y.test.ts
 *
 * Tests d'accessibilité structurels pour ar-tooltip.
 * Vérifie les attributs ARIA attendus selon la spec role="tooltip".
 */
import { fixture, html, expect, aTimeout } from '@open-wc/testing';
import type { ArTooltip } from './tooltip.js';
import './tooltip.js';

function getBubble(el: ArTooltip): HTMLElement {
    const bubble = el.shadowRoot?.querySelector('[part="bubble"]');
    if (!(bubble instanceof HTMLElement)) throw new Error('[part="bubble"] introuvable');
    return bubble;
}

describe('ar-tooltip — accessibilité', () => {
    // ── ARIA trigger ────────────────────────────────────────────────────────

    describe('ARIA trigger', () => {
        it('le trigger a aria-describedby pointant vers la bulle', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div>
                    <button id="help">?</button>
                    <ar-tooltip for="help">Explication</ar-tooltip>
                </div>
            `);
            const el = wrapper.querySelector<ArTooltip>('ar-tooltip')!;
            const trigger = wrapper.querySelector<HTMLElement>('#help')!;
            const bubble = getBubble(el);
            expect(trigger.getAttribute('aria-describedby')).to.equal(bubble.id);
        });

        it('aria-describedby est retiré du trigger quand `for` change', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div>
                    <button id="a">a</button>
                    <button id="b">b</button>
                    <ar-tooltip for="a">Aide</ar-tooltip>
                </div>
            `);
            const el = wrapper.querySelector<ArTooltip>('ar-tooltip')!;
            const btnA = wrapper.querySelector<HTMLElement>('#a')!;
            el.for = 'b';
            await el.updateComplete;
            expect(btnA.hasAttribute('aria-describedby')).to.equal(false);
        });
    });

    // ── ARIA bulle ──────────────────────────────────────────────────────────

    describe('ARIA bulle', () => {
        it('la bulle a role="tooltip"', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div>
                    <button id="btn">x</button>
                    <ar-tooltip for="btn">Aide</ar-tooltip>
                </div>
            `);
            const el = wrapper.querySelector<ArTooltip>('ar-tooltip')!;
            expect(getBubble(el).getAttribute('role')).to.equal('tooltip');
        });

        it('la bulle est masquée visuellement quand fermée (:not(:popover-open))', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div>
                    <button id="btn2">x</button>
                    <ar-tooltip for="btn2">Aide</ar-tooltip>
                </div>
            `);
            const el = wrapper.querySelector<ArTooltip>('ar-tooltip')!;
            expect(getBubble(el).matches(':popover-open')).to.equal(false);
        });

        it('aria-describedby reste valide quand la bulle est fermée (AT lit le contenu au focus)', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div>
                    <button id="btn3">x</button>
                    <ar-tooltip for="btn3">Description accessible</ar-tooltip>
                </div>
            `);
            const el = wrapper.querySelector<ArTooltip>('ar-tooltip')!;
            const trigger = wrapper.querySelector<HTMLElement>('#btn3')!;
            const bubble = getBubble(el);
            // Bulle fermée — aria-describedby doit déjà pointer vers la bulle
            expect(trigger.getAttribute('aria-describedby')).to.equal(bubble.id);
            // Le texte est présent dans la bulle même fermée (dans le slot)
            expect(el.textContent?.trim()).to.equal('Description accessible');
        });
    });

    // ── Escape ne déplace pas le focus ─────────────────────────────────────

    describe('Escape', () => {
        it('ne déplace pas le focus à la fermeture sur Escape', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div>
                    <button id="btn4">x</button>
                    <ar-tooltip for="btn4" show-delay="0">Aide</ar-tooltip>
                </div>
            `);
            const el = wrapper.querySelector<ArTooltip>('ar-tooltip')!;
            const btn = wrapper.querySelector<HTMLElement>('#btn4')!;
            btn.focus();
            btn.dispatchEvent(new MouseEvent('mouseenter'));
            await aTimeout(20);
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            await aTimeout(10);
            expect(document.activeElement).to.equal(btn);
        });
    });
});
```

- [ ] **Lancer les tests a11y**

```bash
cd packages/core && npm run test:browser 2>&1 | grep -E "✓|✗|passing|failing|tooltip"
```

Expected: tous les tests `ar-tooltip — accessibilité` passent.

- [ ] **Commit**

```bash
git add packages/core/src/components/tooltip/tooltip.a11y.test.ts
git commit -m "test(tooltip): tests d'accessibilité ARIA"
```

---

## Task 9 : Export + manifest

**Files:**

- Modify: `packages/core/src/index.ts`

- [ ] **Ajouter l'export dans `index.ts`**

Après la ligne `export { ArDropdownItem } ...`, ajouter :

```typescript
export { ArTooltip } from './components/tooltip/tooltip.js';
export type { ArTooltipPlacement } from './components/tooltip/tooltip.js';
```

- [ ] **Régénérer le manifeste custom-elements**

```bash
cd packages/core && npm run build:manifest
```

Expected: `custom-elements.json` mis à jour sans erreur, `ar-tooltip` présent.

```bash
grep -c "ar-tooltip" packages/core/custom-elements.json
```

Expected: nombre > 0.

- [ ] **Commit**

```bash
git add packages/core/src/index.ts packages/core/custom-elements.json
git commit -m "feat(tooltip): export ArTooltip + màj custom-elements.json"
```

---

## Task 10 : Vérification finale

- [ ] **Lancer la suite complète**

```bash
cd packages/core && npm run test:all 2>&1 | tail -20
```

Expected: tous les tests passent, aucune régression sur dropdown, dialog, stepper.

- [ ] **Vérifier la couverture**

```bash
cd packages/core && npm run test:coverage 2>&1 | grep -E "tooltip|All files|Threshold"
```

Expected: couverture tooltip au-dessus des seuils (lines ≥ 80%, functions ≥ 80%, branches ≥ 70%).

- [ ] **Vérifier TypeScript**

```bash
cd packages/core && npx tsc --noEmit
```

Expected: aucune erreur.
