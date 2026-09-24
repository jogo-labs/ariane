# ar-collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter `ar-collapse`, un composant de panneau pliable/dépliable accessible avec dual trigger (interne `slot="trigger"` + externe `for`), mode accordéon via attribut `name`, et animation de hauteur pilotée par JS.

**Architecture:** Composant unique `ar-collapse` suivant le pattern `ar-dropdown` — dual trigger, propriété `open` avec reflect, méthodes `show()`/`hide()`. L'animation repose sur `height: 0 → scrollHeight` géré en JS + `transitionend`, `overflow: hidden` dans les styles structurels. Le mode accordéon coordonne les panels via `document.querySelectorAll`.

**Tech Stack:** Lit 3, TypeScript, Vitest (unit), @web/test-runner (browser + a11y), axe-core.

**Spec:** `docs/superpowers/specs/2026-06-11-ar-collapse-design.md`

---

## Task 0 : Créer la branche de travail

- [ ] **Step 1 : Créer et basculer sur la branche feature**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout -b feat/ar-collapse
```

Expected: branche `feat/ar-collapse` créée depuis `dev`.

---

## Fichiers créés / modifiés

| Fichier                                                          | Action                     |
| ---------------------------------------------------------------- | -------------------------- |
| `packages/core/src/components/collapse/collapse.ts`              | Créé (scaffold → remplacé) |
| `packages/core/src/components/collapse/collapse.styles.ts`       | Créé (scaffold → remplacé) |
| `packages/core/src/components/collapse/collapse.test.ts`         | Créé (scaffold → remplacé) |
| `packages/core/src/components/collapse/collapse.browser.test.ts` | Créé manuellement          |
| `packages/core/src/components/collapse/collapse.a11y.test.ts`    | Créé manuellement          |
| `packages/core/src/index.ts`                                     | Modifié par scaffold       |
| `apps/docs/src/content/components/ar-collapse.mdx`               | Créé (scaffold → remplacé) |

---

## Task 1 : Scaffold + styles structurels

**Files:**

- Create: `packages/core/src/components/collapse/collapse.ts` (via scaffold)
- Create: `packages/core/src/components/collapse/collapse.styles.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1 : Lancer le scaffold depuis la racine du projet**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run create ar-collapse
```

Expected: fichiers générés dans `packages/core/src/components/collapse/`, entrée ajoutée dans `src/index.ts` et `src/autoloader.ts`.

- [ ] **Step 2 : Remplacer le contenu de `collapse.styles.ts`**

```typescript
// packages/core/src/components/collapse/collapse.styles.ts
import { css } from 'lit';

export default css`
    :host {
        display: block;
    }

    [part='base'] {
        display: flex;
        flex-direction: column;
    }

    [part='panel'] {
        overflow: hidden;
    }

    [part='panel'][hidden] {
        display: none;
    }
`;
```

`overflow: hidden` est structurel (nécessaire au clipping pendant l'animation). `display: none` via `[hidden]` est l'état stable fermé.

- [ ] **Step 3 : Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add packages/core/src/components/collapse/ packages/core/src/index.ts packages/core/src/autoloader.ts apps/docs/src/content/components/ar-collapse.mdx
git commit -m "chore(collapse): scaffold ar-collapse"
```

---

## Task 2 : Shell du composant — propriétés, render, types

**Files:**

- Modify: `packages/core/src/components/collapse/collapse.ts`

- [ ] **Step 1 : Remplacer entièrement `collapse.ts` par le shell complet**

```typescript
// packages/core/src/components/collapse/collapse.ts
import { LitElement, html, type TemplateResult, type PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { warn } from '../../utils/warn.js';
import { prefersReducedMotion } from '../../utils/media.js';
import styles from './collapse.styles.js';

export type ArCollapseEvents =
    | 'ar-collapse-show'
    | 'ar-collapse-shown'
    | 'ar-collapse-hide'
    | 'ar-collapse-hidden';

/**
 * @summary Panneau pliable/dépliable accessible avec animation de hauteur.
 * @display demo
 *
 * @slot trigger - Élément déclencheur (ignoré si `for` est défini).
 * @slot         - Contenu collapsible.
 *
 * @csspart base              - Conteneur racine.
 * @csspart trigger-container - Wrapper du slot trigger.
 * @csspart panel             - Zone animée (overflow hidden, height 0 → auto).
 * @csspart content           - Wrapper interne du contenu.
 *
 * @cssprop [--ar-collapse-duration=0s]  - Durée de la transition height.
 * @cssprop [--ar-collapse-easing=ease]  - Easing de la transition height.
 *
 * @event {CustomEvent} ar-collapse-show   - Avant l'ouverture. Annulable.
 * @event {CustomEvent} ar-collapse-shown  - Après la fin de l'animation d'ouverture.
 * @event {CustomEvent} ar-collapse-hide   - Avant la fermeture. Annulable.
 * @event {CustomEvent} ar-collapse-hidden - Après la fin de l'animation de fermeture.
 */
@customElement('ar-collapse')
export class ArCollapse extends LitElement {
    static override styles = [styles];
    static readonly NAME = 'ArCollapse';
    private static _idCounter = 0;

    /** Ouvre ou ferme le panel. */
    @property({ reflect: true, type: Boolean }) open = false;

    /**
     * ID d'un élément déclencheur externe (light DOM).
     * Quand défini, le slot `trigger` est ignoré.
     */
    @property({ reflect: true }) for = '';

    /** Groupe accordéon — les panels partageant le même `name` se ferment mutuellement. */
    @property({ reflect: true }) name = '';

    /**
     * Position du slot trigger par rapport au contenu dans le DOM.
     * `before` (défaut) : trigger avant le panel. `after` : trigger après le panel.
     * L'ordre DOM reflète l'ordre visuel — pas de CSS `order` — pour respecter WCAG 2.4.3.
     */
    @property({ attribute: 'trigger-position', reflect: true })
    triggerPosition: 'before' | 'after' = 'before';

    /** Désactive le composant — le trigger ne répond plus aux clics. */
    @property({ reflect: true, type: Boolean }) disabled = false;

    @query('[part="panel"]') private _panel!: HTMLElement;

    private _animating = false;
    private _initialized = false;
    private _externalTrigger: HTMLElement | null = null;

    override connectedCallback(): void {
        super.connectedCallback();
        if (!this.id) {
            this.id = `ar-collapse-${++ArCollapse._idCounter}`;
        }
    }

    override firstUpdated(): void {
        if (this.for) {
            this._warnIfBothTriggers();
            this._attachExternalTrigger();
        }
        this._syncTriggerAria();
        // État initial sans animation — updated() gère les changements ultérieurs.
        if (this.open) {
            this._panel.removeAttribute('hidden');
            this._panel.style.height = 'auto';
        }
        this._initialized = true;
    }

    override updated(changed: PropertyValues<this>): void {
        // firstUpdated gère le premier rendu ; updated ne traite que les changements suivants.
        if (!this._initialized) return;
        if (changed.has('for')) {
            this._detachExternalTrigger();
            if (this.for) {
                this._warnIfBothTriggers();
                this._attachExternalTrigger();
            }
        }
        if (changed.has('open')) {
            if (this.open) this._show();
            else this._hide();
        }
        if (changed.has('disabled')) {
            this._syncTriggerDisabled();
        }
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this._detachExternalTrigger();
    }

    override render(): TemplateResult {
        const trigger = html`
            <slot
                name="trigger"
                part="trigger-container"
                @slotchange=${this._handleTriggerSlotChange}
            ></slot>
        `;
        const panel = html`
            <div part="panel" hidden>
                <div part="content">
                    <slot></slot>
                </div>
            </div>
        `;
        return html`
            <div part="base">
                ${this.triggerPosition === 'after'
                    ? html`${panel}${trigger}`
                    : html`${trigger}${panel}`}
            </div>
        `;
    }

    /** Ouvre le panel. No-op si déjà ouvert, en cours d'animation, ou disabled. */
    show(): void {
        if (this.open || this._animating || this.disabled) return;
        this.open = true;
    }

    /** Ferme le panel. No-op si déjà fermé ou en cours d'animation. */
    hide(): void {
        if (!this.open || this._animating) return;
        this.open = false;
    }

    private _warnIfBothTriggers(): void {
        if (!this.for) return;
        const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]');
        if (slot?.assignedElements({ flatten: true }).length) {
            warn(
                'ar-collapse',
                'for et slot="trigger" sont tous les deux définis — for prend la priorité.',
            );
        }
    }

    private _attachExternalTrigger(): void {
        const el = document.getElementById(this.for);
        if (!el) {
            warn('ar-collapse', `Aucun élément trouvé avec l'id "${this.for}".`);
            return;
        }
        this._externalTrigger = el;
        el.addEventListener('click', this._handleTriggerClick);
        this._syncTriggerAria();
    }

    private _detachExternalTrigger(): void {
        if (!this._externalTrigger) return;
        this._externalTrigger.removeEventListener('click', this._handleTriggerClick);
        this._externalTrigger.removeAttribute('aria-expanded');
        this._externalTrigger.removeAttribute('aria-controls');
        this._externalTrigger = null;
    }

    private _handleTriggerSlotChange(): void {
        if (this.for) {
            this._warnIfBothTriggers();
            return;
        }
        const trigger = this._resolvedTrigger;
        if (!trigger) return;
        trigger.addEventListener('click', this._handleTriggerClick);
        this._syncTriggerAria();
        this._syncTriggerDisabled();
    }

    private readonly _handleTriggerClick = (): void => {
        if (this.disabled) return;
        this.open = !this.open;
    };

    private get _resolvedTrigger(): HTMLElement | null {
        if (this.for) return this._externalTrigger;
        const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]');
        return (slot?.assignedElements({ flatten: true })[0] as HTMLElement | undefined) ?? null;
    }

    private _syncTriggerAria(): void {
        const trigger = this._resolvedTrigger;
        if (!trigger) return;
        trigger.setAttribute('aria-expanded', String(this.open));
        trigger.setAttribute('aria-controls', this.id);
    }

    private _syncTriggerDisabled(): void {
        if (this.for) return;
        const trigger = this._resolvedTrigger;
        if (!trigger) return;
        if (this.disabled) {
            trigger.setAttribute('disabled', '');
            trigger.setAttribute('aria-disabled', 'true');
        } else {
            trigger.removeAttribute('disabled');
            trigger.removeAttribute('aria-disabled');
        }
    }

    private _closeGroupSiblings(): void {
        if (!this.name) return;
        document.querySelectorAll<ArCollapse>(`ar-collapse[name="${this.name}"]`).forEach((el) => {
            if (el !== this && el.open) el.hide();
        });
    }

    private _shouldAnimate(): boolean {
        // transitionend ne se déclenche pas si duration=0s (défaut headless sans thème).
        // On vérifie la durée calculée pour éviter que _animating reste bloqué à true.
        const d = parseFloat(getComputedStyle(this._panel).transitionDuration) || 0;
        return !prefersReducedMotion() && d > 0;
    }

    private _show(): void {
        const ev = this._emit('ar-collapse-show');
        if (ev.defaultPrevented) {
            this.open = false;
            return;
        }
        this._closeGroupSiblings();
        this._syncTriggerAria();
        this._animating = true;
        const panel = this._panel;
        panel.style.height = '0px';
        panel.removeAttribute('hidden');
        const targetH = panel.scrollHeight;
        void panel.offsetHeight; // force reflow
        if (!this._shouldAnimate()) {
            panel.style.height = 'auto';
            this._animating = false;
            this._emit('ar-collapse-shown');
            return;
        }
        panel.style.height = `${targetH}px`;
        panel.addEventListener(
            'transitionend',
            () => {
                this._animating = false;
                panel.style.height = 'auto';
                this._emit('ar-collapse-shown');
            },
            { once: true },
        );
    }

    private _hide(): void {
        const ev = this._emit('ar-collapse-hide');
        if (ev.defaultPrevented) {
            this.open = true;
            return;
        }
        this._syncTriggerAria();
        this._animating = true;
        const panel = this._panel;
        panel.style.height = `${panel.scrollHeight}px`;
        void panel.offsetHeight; // force reflow
        if (!this._shouldAnimate()) {
            this._animating = false;
            panel.setAttribute('hidden', '');
            panel.style.height = '';
            this._emit('ar-collapse-hidden');
            return;
        }
        panel.style.height = '0px';
        panel.addEventListener(
            'transitionend',
            () => {
                this._animating = false;
                panel.setAttribute('hidden', '');
                panel.style.height = '';
                this._emit('ar-collapse-hidden');
            },
            { once: true },
        );
    }

    private _emit(name: ArCollapseEvents): CustomEvent {
        const e = new CustomEvent(name, { bubbles: true, composed: true, cancelable: true });
        this.dispatchEvent(e);
        return e;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-collapse': ArCollapse;
    }
}
```

- [ ] **Step 2 : Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add packages/core/src/components/collapse/collapse.ts packages/core/src/components/collapse/collapse.styles.ts
git commit -m "feat(collapse): shell ar-collapse — propriétés, render, types"
```

---

## Task 3 : Tests unitaires Vitest — render + props + trigger interne

**Files:**

- Modify: `packages/core/src/components/collapse/collapse.test.ts`

Les tests Vitest tournent sous happy-dom qui ne déclenche pas les transitions CSS. On mocke `prefersReducedMotion` → `true` pour que `show()`/`hide()` s'exécutent de façon synchrone (branch reduced-motion).

- [ ] **Step 1 : Remplacer entièrement `collapse.test.ts`**

```typescript
// packages/core/src/components/collapse/collapse.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, waitForUpdate, getPart, requirePart } from '../../test-utils.js';
import type { ArCollapse } from './collapse.js';
import './collapse.js';

// happy-dom ne déclenche pas transitionend — prefersReducedMotion=true
// fait passer show/hide dans la branche synchrone.
vi.mock('../../utils/media.js', () => ({ prefersReducedMotion: () => true }));

describe('ArCollapse', () => {
    let el: ArCollapse;

    afterEach(() => {
        el?.remove();
        document.body.innerHTML = '';
    });

    // ── Valeurs par défaut ────────────────────────────────────────────────────

    describe('valeurs par défaut', () => {
        beforeEach(async () => {
            el = await fixture('<ar-collapse></ar-collapse>');
        });

        it('open=false', () => expect(el.open).toBe(false));
        it('for=""', () => expect(el.for).toBe(''));
        it('name=""', () => expect(el.name).toBe(''));
        it('triggerPosition="before"', () => expect(el.triggerPosition).toBe('before'));
        it('disabled=false', () => expect(el.disabled).toBe(false));
    });

    // ── Reflect attributs ─────────────────────────────────────────────────────

    describe('reflect', () => {
        beforeEach(async () => {
            el = await fixture('<ar-collapse></ar-collapse>');
        });

        it('open reflète en attribut', async () => {
            el.show();
            await waitForUpdate(el);
            expect(el.hasAttribute('open')).toBe(true);
        });

        it('for reflète en attribut', async () => {
            el.for = 'btn';
            await waitForUpdate(el);
            expect(el.getAttribute('for')).toBe('btn');
        });

        it('name reflète en attribut', async () => {
            el.name = 'group-a';
            await waitForUpdate(el);
            expect(el.getAttribute('name')).toBe('group-a');
        });

        it('trigger-position reflète en attribut', async () => {
            el.triggerPosition = 'after';
            await waitForUpdate(el);
            expect(el.getAttribute('trigger-position')).toBe('after');
        });

        it('disabled reflète en attribut', async () => {
            el.disabled = true;
            await waitForUpdate(el);
            expect(el.hasAttribute('disabled')).toBe(true);
        });
    });

    // ── Rendu shadow DOM ──────────────────────────────────────────────────────

    describe('rendu shadow DOM', () => {
        beforeEach(async () => {
            el = await fixture('<ar-collapse></ar-collapse>');
        });

        it('contient part="base"', () => expect(getPart(el, 'base')).not.toBeNull());
        it('contient part="trigger-container"', () =>
            expect(getPart(el, 'trigger-container')).not.toBeNull());
        it('contient part="panel"', () => expect(getPart(el, 'panel')).not.toBeNull());
        it('contient part="content"', () => expect(getPart(el, 'content')).not.toBeNull());
        it('panel a hidden au départ', () => {
            expect(requirePart(el, 'panel').hasAttribute('hidden')).toBe(true);
        });
    });

    // ── id auto-généré ─────────────────────────────────────────────────────────

    describe('id auto-généré', () => {
        it('génère un id sur le host si absent', async () => {
            el = await fixture('<ar-collapse></ar-collapse>');
            expect(el.id).toMatch(/^ar-collapse-\d+$/);
        });

        it("ne remplace pas un id fourni par l'auteur", async () => {
            el = await fixture('<ar-collapse id="mon-id"></ar-collapse>');
            expect(el.id).toBe('mon-id');
        });
    });

    // ── show() / hide() ───────────────────────────────────────────────────────

    describe('show() / hide()', () => {
        beforeEach(async () => {
            el = await fixture('<ar-collapse></ar-collapse>');
        });

        it('show() passe open à true', async () => {
            el.show();
            await waitForUpdate(el);
            expect(el.open).toBe(true);
        });

        it('show() retire hidden du panel', async () => {
            el.show();
            await waitForUpdate(el);
            expect(requirePart(el, 'panel').hasAttribute('hidden')).toBe(false);
        });

        it('hide() passe open à false et repose hidden', async () => {
            el.show();
            await waitForUpdate(el);
            el.hide();
            await waitForUpdate(el);
            expect(el.open).toBe(false);
            expect(requirePart(el, 'panel').hasAttribute('hidden')).toBe(true);
        });

        it('show() est no-op si déjà open', async () => {
            el.show();
            await waitForUpdate(el);
            let count = 0;
            el.addEventListener('ar-collapse-show', () => count++);
            el.show();
            await waitForUpdate(el);
            expect(count).toBe(0);
        });

        it('hide() est no-op si déjà fermé', async () => {
            let count = 0;
            el.addEventListener('ar-collapse-hide', () => count++);
            el.hide();
            await waitForUpdate(el);
            expect(count).toBe(0);
        });
    });

    // ── Événements ────────────────────────────────────────────────────────────

    describe('événements', () => {
        beforeEach(async () => {
            el = await fixture('<ar-collapse></ar-collapse>');
        });

        it('show() émet ar-collapse-show puis ar-collapse-shown', async () => {
            const order: string[] = [];
            el.addEventListener('ar-collapse-show', () => order.push('show'));
            el.addEventListener('ar-collapse-shown', () => order.push('shown'));
            el.show();
            await waitForUpdate(el);
            expect(order).toEqual(['show', 'shown']);
        });

        it('hide() émet ar-collapse-hide puis ar-collapse-hidden', async () => {
            el.show();
            await waitForUpdate(el);
            const order: string[] = [];
            el.addEventListener('ar-collapse-hide', () => order.push('hide'));
            el.addEventListener('ar-collapse-hidden', () => order.push('hidden'));
            el.hide();
            await waitForUpdate(el);
            expect(order).toEqual(['hide', 'hidden']);
        });

        it("annuler ar-collapse-show empêche l'ouverture", async () => {
            el.addEventListener('ar-collapse-show', (e) => e.preventDefault());
            el.show();
            await waitForUpdate(el);
            expect(el.open).toBe(false);
        });

        it('annuler ar-collapse-hide empêche la fermeture', async () => {
            el.show();
            await waitForUpdate(el);
            el.addEventListener('ar-collapse-hide', (e) => e.preventDefault());
            el.hide();
            await waitForUpdate(el);
            expect(el.open).toBe(true);
        });
    });

    // ── Trigger interne + ARIA ────────────────────────────────────────────────

    describe('trigger interne (slot)', () => {
        it('pose aria-expanded=false sur le trigger au départ', async () => {
            el = await fixture(`
                <ar-collapse>
                    <button slot="trigger">Toggle</button>
                </ar-collapse>
            `);
            const btn = el.querySelector('button')!;
            await waitForUpdate(el);
            expect(btn.getAttribute('aria-expanded')).toBe('false');
        });

        it("met à jour aria-expanded=true à l'ouverture", async () => {
            el = await fixture(`
                <ar-collapse>
                    <button slot="trigger">Toggle</button>
                </ar-collapse>
            `);
            const btn = el.querySelector('button')!;
            el.show();
            await waitForUpdate(el);
            expect(btn.getAttribute('aria-expanded')).toBe('true');
        });

        it("pose aria-controls pointant vers l'id du host", async () => {
            el = await fixture(`
                <ar-collapse id="my-collapse">
                    <button slot="trigger">Toggle</button>
                </ar-collapse>
            `);
            const btn = el.querySelector('button')!;
            await waitForUpdate(el);
            expect(btn.getAttribute('aria-controls')).toBe('my-collapse');
        });

        it('un clic sur le trigger ouvre le panel', async () => {
            el = await fixture(`
                <ar-collapse>
                    <button slot="trigger">Toggle</button>
                </ar-collapse>
            `);
            const btn = el.querySelector<HTMLButtonElement>('button')!;
            btn.click();
            await waitForUpdate(el);
            expect(el.open).toBe(true);
        });

        it('un clic sur le trigger ferme le panel si ouvert', async () => {
            el = await fixture(`
                <ar-collapse open>
                    <button slot="trigger">Toggle</button>
                </ar-collapse>
            `);
            const btn = el.querySelector<HTMLButtonElement>('button')!;
            btn.click();
            await waitForUpdate(el);
            expect(el.open).toBe(false);
        });
    });

    // ── Trigger externe (for) ─────────────────────────────────────────────────

    describe('trigger externe (for)', () => {
        it('pose aria-expanded et aria-controls sur le bouton externe', async () => {
            document.body.innerHTML = '<button id="ext-btn">Toggle</button>';
            el = await fixture('<ar-collapse id="panel-1" for="ext-btn"></ar-collapse>');
            const btn = document.getElementById('ext-btn')!;
            expect(btn.getAttribute('aria-expanded')).toBe('false');
            expect(btn.getAttribute('aria-controls')).toBe('panel-1');
        });

        it('un clic sur le bouton externe ouvre le panel', async () => {
            document.body.innerHTML = '<button id="ext-btn2">Toggle</button>';
            el = await fixture('<ar-collapse for="ext-btn2"></ar-collapse>');
            document.getElementById('ext-btn2')!.click();
            await waitForUpdate(el);
            expect(el.open).toBe(true);
        });

        it("émet un warn si l'id est introuvable", async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            el = await fixture('<ar-collapse for="inexistant"></ar-collapse>');
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('inexistant'));
            spy.mockRestore();
        });

        it('émet un warn si for et slot trigger sont tous les deux définis', async () => {
            document.body.innerHTML = '<button id="ext-btn3">Btn</button>';
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            el = await fixture(`
                <ar-collapse for="ext-btn3">
                    <button slot="trigger">Slot btn</button>
                </ar-collapse>
            `);
            await waitForUpdate(el);
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('for'));
            spy.mockRestore();
        });

        it('retire aria-controls du trigger externe lors du changement de for', async () => {
            document.body.innerHTML = '<button id="ext-btn4">Btn</button>';
            el = await fixture('<ar-collapse for="ext-btn4"></ar-collapse>');
            const btn = document.getElementById('ext-btn4')!;
            expect(btn.getAttribute('aria-controls')).not.toBeNull();
            el.for = '';
            await waitForUpdate(el);
            expect(btn.getAttribute('aria-controls')).toBeNull();
        });
    });

    // ── Accordéon (name) ──────────────────────────────────────────────────────

    describe('accordéon (name)', () => {
        let el2: ArCollapse;
        let el3: ArCollapse;

        afterEach(() => {
            el2?.remove();
            el3?.remove();
        });

        it('ouvrir un item ferme les autres du même groupe', async () => {
            el = await fixture('<ar-collapse name="faq"></ar-collapse>');
            el2 = await fixture('<ar-collapse name="faq"></ar-collapse>');
            el.show();
            await waitForUpdate(el);
            expect(el.open).toBe(true);
            el2.show();
            await waitForUpdate(el2);
            await waitForUpdate(el);
            expect(el2.open).toBe(true);
            expect(el.open).toBe(false);
        });

        it("ne ferme pas les panels d'un groupe différent", async () => {
            el = await fixture('<ar-collapse name="group-a"></ar-collapse>');
            el2 = await fixture('<ar-collapse name="group-b"></ar-collapse>');
            el.show();
            await waitForUpdate(el);
            el2.show();
            await waitForUpdate(el2);
            expect(el.open).toBe(true);
            expect(el2.open).toBe(true);
        });

        it('sans name, plusieurs panels peuvent être ouverts', async () => {
            el = await fixture('<ar-collapse></ar-collapse>');
            el2 = await fixture('<ar-collapse></ar-collapse>');
            el.show();
            el2.show();
            await waitForUpdate(el);
            await waitForUpdate(el2);
            expect(el.open).toBe(true);
            expect(el2.open).toBe(true);
        });
    });

    // ── disabled ──────────────────────────────────────────────────────────────

    describe('disabled', () => {
        it('show() est no-op quand disabled=true', async () => {
            el = await fixture('<ar-collapse disabled></ar-collapse>');
            el.show();
            await waitForUpdate(el);
            expect(el.open).toBe(false);
        });

        it('pose disabled et aria-disabled sur le trigger interne', async () => {
            el = await fixture(`
                <ar-collapse disabled>
                    <button slot="trigger">Toggle</button>
                </ar-collapse>
            `);
            const btn = el.querySelector('button')!;
            await waitForUpdate(el);
            expect(btn.hasAttribute('disabled')).toBe(true);
            expect(btn.getAttribute('aria-disabled')).toBe('true');
        });

        it('retire disabled et aria-disabled quand disabled passe à false', async () => {
            el = await fixture(`
                <ar-collapse disabled>
                    <button slot="trigger">Toggle</button>
                </ar-collapse>
            `);
            const btn = el.querySelector('button')!;
            el.disabled = false;
            await waitForUpdate(el);
            expect(btn.hasAttribute('disabled')).toBe(false);
            expect(btn.getAttribute('aria-disabled')).toBeNull();
        });

        it("un clic ne déclenche pas l'ouverture quand disabled", async () => {
            el = await fixture(`
                <ar-collapse disabled>
                    <button slot="trigger">Toggle</button>
                </ar-collapse>
            `);
            el.querySelector<HTMLButtonElement>('button')!.click();
            await waitForUpdate(el);
            expect(el.open).toBe(false);
        });
    });

    // ── trigger-position ──────────────────────────────────────────────────────

    describe('trigger-position', () => {
        it('trigger-position="before" : trigger avant panel dans le DOM', async () => {
            el = await fixture(`
                <ar-collapse trigger-position="before">
                    <button slot="trigger">T</button>
                </ar-collapse>
            `);
            const base = requirePart(el, 'base');
            const children = Array.from(base.children);
            const triggerIdx = children.findIndex(
                (c) => c.getAttribute('part') === 'trigger-container',
            );
            const panelIdx = children.findIndex((c) => c.getAttribute('part') === 'panel');
            expect(triggerIdx).toBeLessThan(panelIdx);
        });

        it('trigger-position="after" : panel avant trigger dans le DOM', async () => {
            el = await fixture(`
                <ar-collapse trigger-position="after">
                    <button slot="trigger">T</button>
                </ar-collapse>
            `);
            const base = requirePart(el, 'base');
            const children = Array.from(base.children);
            const triggerIdx = children.findIndex(
                (c) => c.getAttribute('part') === 'trigger-container',
            );
            const panelIdx = children.findIndex((c) => c.getAttribute('part') === 'panel');
            expect(panelIdx).toBeLessThan(triggerIdx);
        });
    });
});
```

- [ ] **Step 2 : Lancer les tests — ils doivent passer**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test -- --reporter=verbose collapse.test
```

Expected: tous les tests passent (le composant est déjà implémenté en Task 2).

Si des tests échouent, corriger `collapse.ts` avant de continuer.

- [ ] **Step 3 : Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add packages/core/src/components/collapse/collapse.test.ts
git commit -m "test(collapse): tests unitaires Vitest — render, props, ARIA, events, accordion, disabled, trigger-position"
```

---

## Task 4 : Tests browser (WTR) — animation height + transitionend

**Files:**

- Create: `packages/core/src/components/collapse/collapse.browser.test.ts`

Ces tests tournent dans un vrai navigateur (Chromium) via `@web/test-runner`. Ils vérifient l'animation réelle de hauteur et les événements `transitionend`.

- [ ] **Step 1 : Créer `collapse.browser.test.ts`**

```typescript
// packages/core/src/components/collapse/collapse.browser.test.ts
/// <reference types="mocha" />
import { fixture, html, expect, aTimeout } from '@open-wc/testing';
import type { ArCollapse } from './collapse.js';
import './collapse.js';

const ANIM_MS = 400; // durée max d'attente après transition

// La transition est sur ::part(panel) dans le thème consommateur.
// On l'injecte globalement pour que _shouldAnimate() retourne true.
let styleEl: HTMLStyleElement;
before(() => {
    styleEl = document.createElement('style');
    styleEl.textContent = 'ar-collapse::part(panel) { transition: height 100ms ease; }';
    document.head.appendChild(styleEl);
});
after(() => styleEl.remove());

function getPanel(el: ArCollapse): HTMLElement {
    const p = el.shadowRoot?.querySelector<HTMLElement>('[part="panel"]');
    if (!p) throw new Error('panel introuvable');
    return p;
}

describe('ar-collapse — browser', () => {
    let el: ArCollapse;

    afterEach(() => el?.remove());

    // ── Ouverture avec animation ───────────────────────────────────────────────

    describe('ouverture', () => {
        beforeEach(async () => {
            el = await fixture(html`
                <ar-collapse>
                    <button slot="trigger">Toggle</button>
                    <p>Contenu</p>
                </ar-collapse>
            `);
        });

        it('retire hidden du panel', async () => {
            el.show();
            await aTimeout(10);
            expect(getPanel(el).hasAttribute('hidden')).to.equal(false);
        });

        it('émet ar-collapse-shown après transitionend', async () => {
            let fired = false;
            el.addEventListener('ar-collapse-shown', () => {
                fired = true;
            });
            el.show();
            await aTimeout(ANIM_MS);
            expect(fired).to.equal(true);
        });

        it('height est "auto" après la fin de l\'animation', async () => {
            el.show();
            await aTimeout(ANIM_MS);
            expect(getPanel(el).style.height).to.equal('auto');
        });

        it('_animating bloque un double appel', async () => {
            let count = 0;
            el.addEventListener('ar-collapse-shown', () => count++);
            el.show();
            el.show(); // second appel immédiat
            await aTimeout(ANIM_MS);
            expect(count).to.equal(1);
        });
    });

    // ── Fermeture avec animation ──────────────────────────────────────────────

    describe('fermeture', () => {
        beforeEach(async () => {
            el = await fixture(html`
                <ar-collapse open>
                    <button slot="trigger">Toggle</button>
                    <p>Contenu</p>
                </ar-collapse>
            `);
            await aTimeout(ANIM_MS); // attendre fin ouverture initiale
        });

        it('émet ar-collapse-hidden après transitionend', async () => {
            let fired = false;
            el.addEventListener('ar-collapse-hidden', () => {
                fired = true;
            });
            el.hide();
            await aTimeout(ANIM_MS);
            expect(fired).to.equal(true);
        });

        it('repose hidden sur le panel après fermeture', async () => {
            el.hide();
            await aTimeout(ANIM_MS);
            expect(getPanel(el).hasAttribute('hidden')).to.equal(true);
        });

        it('height inline est vidé après fermeture', async () => {
            el.hide();
            await aTimeout(ANIM_MS);
            expect(getPanel(el).style.height).to.equal('');
        });
    });
});
```

- [ ] **Step 2 : Lancer les browser tests**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test:browser -- collapse.browser.test
```

Expected: tous les tests passent.

- [ ] **Step 3 : Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add packages/core/src/components/collapse/collapse.browser.test.ts
git commit -m "test(collapse): browser tests WTR — animation height, transitionend"
```

---

## Task 5 : Tests a11y (WTR + axe-core)

**Files:**

- Create: `packages/core/src/components/collapse/collapse.a11y.test.ts`

- [ ] **Step 1 : Créer `collapse.a11y.test.ts`**

```typescript
// packages/core/src/components/collapse/collapse.a11y.test.ts
/// <reference types="mocha" />
import { fixture, html, expect } from '@open-wc/testing';
import type { ArCollapse } from './collapse.js';
import './collapse.js';

describe('ar-collapse — accessibilité', () => {
    let el: ArCollapse;

    afterEach(() => {
        el?.remove();
        document.body.innerHTML = '';
    });

    // ── Pas de violations axe-core ────────────────────────────────────────────

    describe('axe-core', () => {
        it('panel fermé — aucune violation', async () => {
            el = await fixture(html`
                <ar-collapse>
                    <button slot="trigger">Voir plus</button>
                    <p>Contenu</p>
                </ar-collapse>
            `);
            await expect(el).to.be.accessible();
        });

        it('panel ouvert — aucune violation', async () => {
            el = await fixture(html`
                <ar-collapse open>
                    <button slot="trigger">Voir plus</button>
                    <p>Contenu</p>
                </ar-collapse>
            `);
            await expect(el).to.be.accessible();
        });
    });

    // ── Trigger interne ───────────────────────────────────────────────────────

    describe('trigger interne', () => {
        it('aria-expanded="false" sur le trigger au départ', async () => {
            el = await fixture(html`
                <ar-collapse>
                    <button slot="trigger">Toggle</button>
                </ar-collapse>
            `);
            expect(el.querySelector('button')!.getAttribute('aria-expanded')).to.equal('false');
        });

        it("aria-controls pointe vers l'id du host", async () => {
            el = await fixture(html`
                <ar-collapse id="acc-1">
                    <button slot="trigger">Toggle</button>
                </ar-collapse>
            `);
            const ctrl = el.querySelector('button')!.getAttribute('aria-controls');
            expect(ctrl).to.equal('acc-1');
            expect(document.getElementById(ctrl!)).to.equal(el);
        });
    });

    // ── Trigger externe ───────────────────────────────────────────────────────

    describe('trigger externe (for)', () => {
        it('aria-expanded et aria-controls posés sur le bouton natif', async () => {
            document.body.innerHTML = '<button id="ext-a11y">Btn</button>';
            el = await fixture(html`<ar-collapse id="panel-a11y" for="ext-a11y"></ar-collapse>`);
            const btn = document.getElementById('ext-a11y')!;
            expect(btn.getAttribute('aria-expanded')).to.equal('false');
            expect(btn.getAttribute('aria-controls')).to.equal('panel-a11y');
        });
    });
});
```

- [ ] **Step 2 : Lancer les tests a11y**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test:browser -- collapse.a11y.test
```

Expected: tous les tests passent, aucune violation axe.

- [ ] **Step 3 : Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add packages/core/src/components/collapse/collapse.a11y.test.ts
git commit -m "test(collapse): tests a11y axe-core — trigger interne et externe"
```

---

## Task 6 : Documentation MDX

**Files:**

- Modify: `apps/docs/src/content/components/ar-collapse.mdx`

- [ ] **Step 1 : Remplacer le stub par la doc complète**

````mdx
---
tagName: ar-collapse
title: Collapse
description: Panneau pliable/dépliable accessible — animation de hauteur, trigger interne ou externe, mode accordéon via attribut name.
playgroundTemplate: default
variants:
    - name: default
      label: Standalone
      description: |
          Collapse simple avec un trigger interne via `slot="trigger"`.
          L'animation de hauteur est activée via `--ar-collapse-duration`.
      html: |
          <ar-collapse style="--ar-collapse-duration:200ms;--ar-collapse-easing:ease">
              <button slot="trigger" class="btn btn-secondary">Voir plus</button>
              <div style="padding:1rem 0">
                  <p>Contenu qui se révèle à l'ouverture. Peut contenir n'importe quel HTML.</p>
              </div>
          </ar-collapse>
    - name: open
      label: Ouvert par défaut
      description: L'attribut `open` ouvre le panel sans animation au chargement.
      html: |
          <ar-collapse open style="--ar-collapse-duration:200ms">
              <button slot="trigger" class="btn btn-secondary">Fermer</button>
              <div style="padding:1rem 0">
                  <p>Contenu visible dès le chargement.</p>
              </div>
          </ar-collapse>
    - name: accordion
      label: Accordéon (name)
      description: |
          Tous les `ar-collapse` partageant le même attribut `name` forment un groupe accordéon :
          ouvrir un item ferme automatiquement les autres.
      html: |
          <div style="display:flex;flex-direction:column;gap:0.5rem">
              <ar-collapse name="faq" style="--ar-collapse-duration:200ms">
                  <button slot="trigger" class="btn btn-secondary" style="width:100%;text-align:left">Question 1</button>
                  <div style="padding:0.75rem 0"><p>Réponse à la question 1.</p></div>
              </ar-collapse>
              <ar-collapse name="faq" style="--ar-collapse-duration:200ms">
                  <button slot="trigger" class="btn btn-secondary" style="width:100%;text-align:left">Question 2</button>
                  <div style="padding:0.75rem 0"><p>Réponse à la question 2.</p></div>
              </ar-collapse>
              <ar-collapse name="faq" style="--ar-collapse-duration:200ms">
                  <button slot="trigger" class="btn btn-secondary" style="width:100%;text-align:left">Question 3</button>
                  <div style="padding:0.75rem 0"><p>Réponse à la question 3.</p></div>
              </ar-collapse>
          </div>
    - name: external-trigger
      label: Trigger externe (for)
      description: |
          L'attribut `for` accepte l'ID d'un bouton natif situé n'importe où dans la page.
          `aria-expanded` et `aria-controls` sont posés automatiquement sur ce bouton.
      html: |
          <button id="ar-doc-collapse-ext" class="btn btn-secondary">Révéler le contenu</button>
          <ar-collapse for="ar-doc-collapse-ext" style="--ar-collapse-duration:200ms">
              <div style="padding:0.75rem 0">
                  <p>Contenu piloté par un trigger externe. Utile quand trigger et panel ne peuvent pas être enveloppés dans un wrapper commun.</p>
              </div>
          </ar-collapse>
    - name: trigger-after
      label: Trigger après le contenu
      description: |
          `trigger-position="after"` place le trigger après le contenu dans le DOM (et visuellement).
          Utile pour les patterns "Lire la suite" où le bouton apparaît sous le texte tronqué.
      html: |
          <ar-collapse trigger-position="after" style="--ar-collapse-duration:200ms">
              <div style="padding:0.75rem 0">
                  <p>Contenu révélé. Le trigger est positionné après dans le DOM et visuellement.</p>
              </div>
              <button slot="trigger" class="btn btn-secondary">Lire la suite</button>
          </ar-collapse>
    - name: disabled
      label: Désactivé
      description: |
          L'attribut `disabled` bloque l'interaction. Le composant pose `disabled` et
          `aria-disabled="true"` sur le trigger interne.
      html: |
          <ar-collapse disabled>
              <button slot="trigger" class="btn btn-secondary">Toggle (désactivé)</button>
              <div style="padding:0.75rem 0"><p>Ce contenu ne peut pas être révélé.</p></div>
          </ar-collapse>
---

import WcagRef from '../../components/WcagRef.astro';

## Accessibilité

### Pris en charge automatiquement

`ar-collapse` gère les attributs ARIA et les comportements keyboard sans intervention :

- `aria-expanded` est posé sur le trigger (interne ou externe) et mis à jour à chaque ouverture/fermeture.
- `aria-controls` est posé sur le trigger et pointe vers l'`id` du host `ar-collapse`. Si l'auteur ne fournit pas d'`id`, un identifiant unique est généré automatiquement.
- Le panel utilise l'attribut `hidden` pour les états stables (pas de `display:none` inline) — compatible avec les styles qui surchargeraient `display`.
- `prefers-reduced-motion` : si l'utilisateur a activé la préférence système de réduction de mouvement, les animations sont supprimées et les transitions sont instantanées.

Les critères WCAG suivants sont implémentés :

- `aria-expanded` indique l'état ouvert/fermé du panel aux technologies d'assistance (<WcagRef criterion="4.1.2" summary="Name, Role, Value : aria-expanded communique l'état du composant aux AT." />)
- L'ordre DOM du trigger reflète l'ordre visuel — `trigger-position` modifie le DOM, pas le CSS `order` (<WcagRef criterion="2.4.3" summary="Focus Order : l'ordre de focus suit l'ordre visuel." />)

### Limitations connues

- **Cross-shadow DOM** : `for` et `aria-controls` reposent sur des IDs résolus dans le document. Si le trigger et le panel se trouvent dans des shadow roots différents, la référence `aria-controls` ne sera pas résolue par les technologies d'assistance. De même, le mode accordéon (`name`) ne fonctionne pas entre shadow roots distincts.
- **`ariaControlsElements`** : la propriété IDL permettant des références cross-shadow est prévue mais le support navigateur est insuffisant en 2026. À adopter quand il sera stable.

### À votre charge

- Le trigger doit être un élément focusable avec un nom accessible (texte visible, `aria-label`, ou `aria-labelledby`).
- Pour un pattern accordéon, ajouter `role="region"` et `aria-labelledby` sur chaque panel si le contexte sémantique le demande (ex: FAQ dans un article).
- L'animation `height` via `--ar-collapse-duration` n'est pas automatique — vous devez activer la transition dans votre thème :

```css
ar-collapse::part(panel) {
    transition: height var(--ar-collapse-duration, 0s) var(--ar-collapse-easing, ease);
}
```
````

````
---

- [ ] **Step 2 : Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add apps/docs/src/content/components/ar-collapse.mdx
git commit -m "docs(collapse): page documentation ar-collapse"
````

---

## Task 7 : Build manifest + suite de tests complète

**Files:**

- Modify: `packages/core/custom-elements.json` (régénéré)

- [ ] **Step 1 : Régénérer le manifest**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run build:manifest
```

Expected: `packages/core/custom-elements.json` mis à jour avec `ar-collapse`.

- [ ] **Step 2 : Lancer la suite de tests complète**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run test:all
```

Expected: tous les tests passent (Vitest + WTR).

- [ ] **Step 3 : Commit final**

```bash
cd /Users/jon/Code/Active_projects/ariane
git add packages/core/custom-elements.json
git commit -m "feat(collapse): ar-collapse — dual trigger, accordéon name, animation height"
```

---

## Task 8 : Créer la Pull Request

- [ ] **Step 1 : Pousser la branche**

```bash
cd /Users/jon/Code/Active_projects/ariane
git push -u origin feat/ar-collapse
```

- [ ] **Step 2 : Créer la PR vers `dev`**

```bash
gh pr create --base dev --title "feat(collapse): ar-collapse — dual trigger, accordéon, animation height" --body "$(cat <<'EOF'
## Summary

- Nouveau composant `ar-collapse` — panneau pliable/dépliable accessible
- Dual trigger : `slot=\"trigger\"` (interne) et `for=\"id\"` (externe), cohérent avec `ar-dropdown`
- Mode accordéon via attribut `name` — coordination par DOM query, sans wrapper parent
- Animation height pilotée par JS (`scrollHeight`) + `transitionend`, bypass si `prefers-reduced-motion` ou durée 0s
- Tests : Vitest (unit), WTR browser (animation), WTR a11y (axe-core)
- Documentation : page MDX avec 6 variantes playground

## Test plan

- [ ] `npm run test:all` passe sans régression
- [ ] Playground doc — toutes les variantes fonctionnent (standalone, accordéon, trigger externe, trigger-position, disabled)
- [ ] Vérification manuelle : animation avec `--ar-collapse-duration:300ms`, reduced motion, clavier

🤖 Generated with [Claude Code](https://claude.ai/claude-code)
EOF
)"
```

---

## Checklist de vérification post-implémentation

- [ ] `npm run test:all` — tous les tests passent
- [ ] `npm run build:manifest` — custom-elements.json contient `ar-collapse`
- [ ] `npm run dev` — le playground de la doc affiche et joue toutes les variantes
- [ ] Vérifier manuellement : trigger interne, trigger externe, accordéon, trigger-position="after", disabled, animation avec `--ar-collapse-duration:300ms`
