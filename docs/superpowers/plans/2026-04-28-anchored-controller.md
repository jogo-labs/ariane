# AnchoredController — Refacto couche flottante

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extraire `scroll-lock` et `Popover` en utilitaires internes, remplacer `PopoverController` par `AnchoredController`, créer `TooltipController`, migrer `ar-dropdown`, `ar-stepper`, `ar-breadcrumb`, supprimer `DropdownController`.

**Architecture:** La couche flottante se découpe en deux utilitaires purs (`scroll-lock.ts`, `popover.ts`), deux controllers Lit (`AnchoredController`, `TooltipController`) qui composent ces utilitaires, et une migration séquentielle des composants existants. Chaque tâche est indépendamment committable et laisse les tests verts.

**Tech Stack:** Lit 3, TypeScript, Floating UI, Native Popover API, Vitest (happy-dom), @web/test-runner (Chromium via Playwright), @open-wc/testing.

---

## Fichiers créés / modifiés

| Action    | Fichier                                                              | Responsabilité                                                                      |
| --------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Créer     | `packages/core/src/utils/scroll-lock.ts`                             | ref-counting partagé par élément                                                    |
| Créer     | `packages/core/src/utils/scroll-lock.test.ts`                        | Vitest : compteur, unlock à 0, multi-caller                                         |
| Créer     | `packages/core/src/utils/popover.ts`                                 | class Popover : popover API + floating-ui, sans ARIA                                |
| Créer     | `packages/core/src/utils/popover.browser.test.ts`                    | WTR : show/hide/position, auto vs manual, promise                                   |
| Créer     | `packages/core/src/controllers/anchored.controller.ts`               | ReactiveController : ARIA menu/dialog + scroll lock                                 |
| Créer     | `packages/core/src/controllers/anchored.controller.browser.test.ts`  | WTR : scroll multi-instance, ARIA menu vs dialog                                    |
| Créer     | `packages/core/src/controllers/tooltip.controller.ts`                | ReactiveController : ARIA tooltip, popover manual                                   |
| Modifier  | `packages/core/src/components/dialog/dialog.ts`                      | `_freezeScroll` → `acquireScrollLock(document.body)`                                |
| Modifier  | `packages/core/src/components/dropdown/dropdown.ts`                  | `PopoverController` → `AnchoredController`                                          |
| Modifier  | `packages/core/src/components/stepper/stepper.ts`                    | `DropdownController` → `AnchoredController`                                         |
| Modifier  | `packages/core/src/components/stepper/stepper.renderer.ts`           | Retirer `aria-expanded` (géré par le controller)                                    |
| Modifier  | `packages/core/src/components/breadcrumb/breadcrumb.ts`              | inline show/hide → `AnchoredController`                                             |
| Créer     | `packages/core/src/components/breadcrumb/breadcrumb.browser.test.ts` | WTR : ouverture/fermeture mobile, light-dismiss                                     |
| Modifier  | `packages/core/src/index.ts`                                         | Remplacer export `PopoverController` par `AnchoredController` + `TooltipController` |
| Supprimer | `packages/core/src/controllers/popover.controller.ts`                | Remplacé par `popover.ts` + `anchored.controller.ts`                                |
| Supprimer | `packages/core/src/controllers/dropdown.controller.ts`               | Remplacé par `AnchoredController`                                                   |
| Supprimer | `packages/core/src/controllers/dropdown.controller.test.ts`          | Supprimé avec le controller                                                         |

---

## Task 0 : Créer la branche

**Files:** (aucun fichier source)

- [ ] **Step 1 : Créer et basculer sur la branche**

```bash
cd /Users/jon/Code/Active_projects/ariane && git checkout -b refactor/anchored-controller
```

Expected: `Switched to a new branch 'refactor/anchored-controller'`

---

## Task 1 : `scroll-lock.ts` + tests Vitest

**Files:**

- Create: `packages/core/src/utils/scroll-lock.ts`
- Create: `packages/core/src/utils/scroll-lock.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```ts
// packages/core/src/utils/scroll-lock.test.ts
import { afterEach, describe, expect, it } from 'vitest';
import { acquireScrollLock, isScrollLocked, releaseScrollLock } from './scroll-lock.js';

describe('scroll-lock', () => {
    const cleanup: HTMLElement[] = [];

    function makeEl(overflowY = ''): HTMLElement {
        const el = document.createElement('div');
        el.style.overflowY = overflowY;
        document.body.appendChild(el);
        cleanup.push(el);
        return el;
    }

    afterEach(() => {
        cleanup.forEach((el) => el.remove());
        cleanup.length = 0;
    });

    it('acquireScrollLock applique overflow:hidden', () => {
        const el = makeEl('auto');
        acquireScrollLock(el);
        expect(el.style.overflowY).toBe('hidden');
        expect(el.style.overflowX).toBe('hidden');
        releaseScrollLock(el);
    });

    it('releaseScrollLock restaure les styles originaux à count=0', () => {
        const el = makeEl('auto');
        acquireScrollLock(el);
        releaseScrollLock(el);
        expect(el.style.overflowY).toBe('auto');
        expect(el.style.overflowX).toBe('');
    });

    it('isScrollLocked renvoie true après acquire, false après release complète', () => {
        const el = makeEl();
        expect(isScrollLocked(el)).toBe(false);
        acquireScrollLock(el);
        expect(isScrollLocked(el)).toBe(true);
        releaseScrollLock(el);
        expect(isScrollLocked(el)).toBe(false);
    });

    it('ref-count : deux acquire, un release ne déverrouille pas encore', () => {
        const el = makeEl();
        acquireScrollLock(el);
        acquireScrollLock(el);
        releaseScrollLock(el);
        expect(el.style.overflowY).toBe('hidden');
        releaseScrollLock(el); // cleanup
    });

    it('ref-count : deux acquire, deux release restaure', () => {
        const el = makeEl();
        acquireScrollLock(el);
        acquireScrollLock(el);
        releaseScrollLock(el);
        releaseScrollLock(el);
        expect(el.style.overflowY).toBe('');
        expect(isScrollLocked(el)).toBe(false);
    });

    it("deux éléments différents : release de l'un ne restaure pas l'autre", () => {
        const el1 = makeEl();
        const el2 = makeEl();
        acquireScrollLock(el1);
        acquireScrollLock(el2);
        releaseScrollLock(el1);
        expect(isScrollLocked(el2)).toBe(true);
        expect(el2.style.overflowY).toBe('hidden');
        releaseScrollLock(el2); // cleanup
    });

    it('releaseScrollLock sur un élément inconnu ne crash pas', () => {
        const el = makeEl();
        expect(() => releaseScrollLock(el)).not.toThrow();
    });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd /Users/jon/Code/Active_projects/ariane && npx vitest run packages/core/src/utils/scroll-lock.test.ts
```

Expected: erreur `Cannot find module './scroll-lock.js'`

- [ ] **Step 3 : Implémenter `scroll-lock.ts`**

```ts
// packages/core/src/utils/scroll-lock.ts
interface _Entry {
    count: number;
    overflowY: string;
    overflowX: string;
}

const _registry = new Map<HTMLElement, _Entry>();

export function acquireScrollLock(el: HTMLElement): void {
    const entry = _registry.get(el);
    if (!entry) {
        _registry.set(el, {
            count: 1,
            overflowY: el.style.overflowY,
            overflowX: el.style.overflowX,
        });
        el.style.overflowY = 'hidden';
        el.style.overflowX = 'hidden';
    } else {
        entry.count++;
    }
}

export function releaseScrollLock(el: HTMLElement): void {
    const entry = _registry.get(el);
    if (!entry) return;
    entry.count--;
    if (entry.count === 0) {
        el.style.overflowY = entry.overflowY;
        el.style.overflowX = entry.overflowX;
        _registry.delete(el);
    }
}

export function isScrollLocked(el: HTMLElement): boolean {
    return _registry.has(el);
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
cd /Users/jon/Code/Active_projects/ariane && npx vitest run packages/core/src/utils/scroll-lock.test.ts
```

Expected: `7 passed`

- [ ] **Step 5 : Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/utils/scroll-lock.ts packages/core/src/utils/scroll-lock.test.ts && git commit -m "feat(utils): add scroll-lock utility with ref-counting"
```

---

## Task 2 : Migrer `ar-dialog` vers `scroll-lock.ts`

**Files:**

- Modify: `packages/core/src/components/dialog/dialog.ts`

La migration remplace le pattern `arDialogLocks` (Set) + `_savedBodyOverflow` par deux mécanismes séparés :

- `acquireScrollLock(document.body)` / `releaseScrollLock(document.body)` pour le scroll
- `_dialogStack: ArDialog[]` module-level pour l'ordre Escape (le Set ne préservait pas l'ordre, mais les dialogs s'empilent en ordre d'ouverture)

- [ ] **Step 1 : Modifier `dialog.ts`**

Remplacer les lignes 29-31 (les deux variables module-level) :

```ts
// AVANT (lignes 29-31 de dialog.ts) :
const arDialogLocks = new Set<ArDialog>();
// Partagé entre instances pour restaurer fidèlement le overflow d'origine lors d'un empilement de dialogs.
let _savedBodyOverflow: string | null = null;
```

par :

```ts
// APRÈS :
import { acquireScrollLock, releaseScrollLock } from '../../utils/scroll-lock.js';
const _dialogStack: ArDialog[] = [];
```

Note : `import { announceA11y }` est déjà là ; ajouter `acquireScrollLock`/`releaseScrollLock` juste après les imports existants.

Remplacer `_freezeScroll()` (lignes 271-277) par :

```ts
private _freezeScroll() {
    _dialogStack.push(this);
    acquireScrollLock(document.body);
}
```

Remplacer `_unfreezeScroll()` (lignes 279-290) par :

```ts
private _unfreezeScroll() {
    const idx = _dialogStack.indexOf(this);
    if (idx !== -1) _dialogStack.splice(idx, 1);
    releaseScrollLock(document.body);
}
```

Dans `_handleDocumentKeyDown` (ligne 359), remplacer :

```ts
// AVANT :
const locks = [...arDialogLocks];
if (locks[locks.length - 1] !== this) return;
```

par :

```ts
// APRÈS :
if (_dialogStack[_dialogStack.length - 1] !== this) return;
```

- [ ] **Step 2 : Vérifier que tous les tests dialog passent sans modification**

```bash
cd /Users/jon/Code/Active_projects/ariane && npx vitest run packages/core/src/components/dialog/
```

Expected: tous les tests passent (dialog.test.ts, dialog.a11y.test.ts)

- [ ] **Step 3 : Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/components/dialog/dialog.ts && git commit -m "refactor(dialog): migrate scroll management to scroll-lock utility"
```

---

## Task 3 : `popover.ts` + tests WTR

**Files:**

- Create: `packages/core/src/utils/popover.ts`
- Create: `packages/core/src/utils/popover.browser.test.ts`

- [ ] **Step 1 : Écrire les tests browser qui échouent**

```ts
// packages/core/src/utils/popover.browser.test.ts
/// <reference types="mocha" />
import { LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { fixture, html, expect, aTimeout } from '@open-wc/testing';
import { Popover } from '../../utils/popover.js';

@customElement('test-popover-host')
class TestPopoverHost extends LitElement {
    updateCount = 0;
    override requestUpdate() {
        this.updateCount++;
        return super.requestUpdate();
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'test-popover-host': TestPopoverHost;
    }
}

async function setupPopover(options: ConstructorParameters<typeof Popover>[1] = {}) {
    const host = await fixture<TestPopoverHost>(html`
        <test-popover-host>
            <button id="trigger">Trigger</button>
            <div id="panel">Panel</div>
        </test-popover-host>
    `);
    const trigger = host.querySelector<HTMLElement>('#trigger')!;
    const panel = host.querySelector<HTMLElement>('#panel')!;
    const popover = new Popover(host, options);
    popover.attach(trigger, panel);
    return { host, trigger, panel, popover };
}

describe('Popover', () => {
    describe('show / hide', () => {
        it('show() met le panel en :popover-open', async () => {
            const { panel, popover } = await setupPopover();
            await popover.show();
            expect(panel.matches(':popover-open')).to.equal(true);
        });

        it('hide() ferme le panel', async () => {
            const { panel, popover } = await setupPopover();
            await popover.show();
            popover.hide();
            expect(panel.matches(':popover-open')).to.equal(false);
        });

        it("isOpen reflète l'état", async () => {
            const { popover } = await setupPopover();
            expect(popover.isOpen).to.equal(false);
            await popover.show();
            expect(popover.isOpen).to.equal(true);
            popover.hide();
            expect(popover.isOpen).to.equal(false);
        });

        it('show() résout la promise après positionnement (transform posé)', async () => {
            const { panel, popover } = await setupPopover();
            await popover.show();
            // floating-ui pose un transform après positionnement
            expect(panel.style.transform).to.not.equal('');
        });

        it('host.requestUpdate() est appelé lors de show()', async () => {
            const { host, popover } = await setupPopover();
            const before = host.updateCount;
            await popover.show();
            expect(host.updateCount).to.be.greaterThan(before);
        });
    });

    describe('popoverType: auto — onExternalClose', () => {
        it("onExternalClose est appelé lors d'un light-dismiss", async () => {
            let called = false;
            const { panel, popover } = await setupPopover({
                popoverType: 'auto',
                onExternalClose: () => {
                    called = true;
                },
            });
            await popover.show();
            // Simule le light-dismiss via hidePopover() (déclenche l'event toggle)
            (panel as HTMLElement & { hidePopover(): void }).hidePopover();
            await aTimeout(50);
            expect(called).to.equal(true);
        });

        it('isOpen devient false après light-dismiss', async () => {
            const { panel, popover } = await setupPopover({ popoverType: 'auto' });
            await popover.show();
            (panel as HTMLElement & { hidePopover(): void }).hidePopover();
            await aTimeout(50);
            expect(popover.isOpen).to.equal(false);
        });
    });

    describe('popoverType: manual', () => {
        it("onExternalClose n'est pas appelé (pas de light-dismiss)", async () => {
            let called = false;
            const { popover } = await setupPopover({
                popoverType: 'manual',
                onExternalClose: () => {
                    called = true;
                },
            });
            await popover.show();
            popover.hide();
            await aTimeout(50);
            expect(called).to.equal(false);
        });
    });

    describe('attach()', () => {
        it('génère un id sur le panel si absent', async () => {
            const host = await fixture<TestPopoverHost>(
                html`<test-popover-host></test-popover-host>`,
            );
            const trigger = document.createElement('button');
            const panel = document.createElement('div');
            host.appendChild(trigger);
            host.appendChild(panel);
            const popover = new Popover(host);
            popover.attach(trigger, panel);
            expect(panel.id).to.match(/^ar-popover-/);
        });

        it('pose popover="auto" sur le panel', async () => {
            const { panel } = await setupPopover({ popoverType: 'auto' });
            expect(panel.getAttribute('popover')).to.equal('auto');
        });

        it('pose popover="manual" sur le panel', async () => {
            const { panel } = await setupPopover({ popoverType: 'manual' });
            expect(panel.getAttribute('popover')).to.equal('manual');
        });
    });

    describe('destroy()', () => {
        it('ferme le panel si ouvert', async () => {
            const { panel, popover } = await setupPopover();
            await popover.show();
            popover.destroy();
            expect(panel.matches(':popover-open')).to.equal(false);
        });
    });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx wtr src/utils/popover.browser.test.ts --node-resolve
```

Expected: erreur module introuvable

- [ ] **Step 3 : Implémenter `popover.ts`**

```ts
// packages/core/src/utils/popover.ts
import { computePosition, flip, hide, offset, shift, autoUpdate } from '@floating-ui/dom';
import type { Placement } from '@floating-ui/dom';
import type { ReactiveControllerHost } from 'lit';

type PopoverPanel = HTMLElement & { showPopover(): void; hidePopover(): void };

export interface PopoverOptions {
    placement?: Placement;
    /** Espacement perpendiculaire trigger→panel (mainAxis). Défaut : 4. */
    distance?: number;
    /** Décalage latéral (crossAxis). Défaut : 0. */
    offset?: number;
    popoverType?: 'auto' | 'manual';
    /** Appelé lors du light-dismiss natif (popoverType 'auto' uniquement). */
    onExternalClose?: () => void;
}

export class Popover {
    private _host: ReactiveControllerHost & HTMLElement;
    private _trigger: HTMLElement | null = null;
    private _panel: HTMLElement | null = null;
    private _isOpen = false;
    private _cleanupAutoUpdate: (() => void) | null = null;
    private _opts: Required<Omit<PopoverOptions, 'onExternalClose'>> & {
        onExternalClose?: () => void;
    };

    constructor(host: ReactiveControllerHost & HTMLElement, options: PopoverOptions = {}) {
        this._host = host;
        this._opts = {
            placement: options.placement ?? 'bottom-start',
            distance: options.distance ?? 4,
            offset: options.offset ?? 0,
            popoverType: options.popoverType ?? 'auto',
            ...(options.onExternalClose !== undefined && {
                onExternalClose: options.onExternalClose,
            }),
        };
    }

    get isOpen(): boolean {
        return this._isOpen;
    }

    setPlacement(v: Placement): void {
        this._opts.placement = v;
    }

    setDistance(v: number): void {
        this._opts.distance = v;
    }

    setOffset(v: number): void {
        this._opts.offset = v;
    }

    attach(trigger: HTMLElement, panel: HTMLElement): void {
        this._trigger = trigger;
        this._panel = panel;
        if (!panel.id) panel.id = `ar-popover-${crypto.randomUUID().slice(0, 8)}`;
        panel.setAttribute('popover', this._opts.popoverType);
        if (this._opts.popoverType === 'auto') {
            panel.addEventListener('toggle', this._onToggle);
        }
    }

    show(): Promise<void> {
        if (this._isOpen || !this._panel || !this._trigger) return Promise.resolve();
        const panel = this._panel as PopoverPanel;
        if (typeof panel.showPopover !== 'function') return Promise.resolve();
        this._panel.style.visibility = 'hidden';
        panel.showPopover();
        this._isOpen = true;
        this._host.requestUpdate();
        this._cleanupAutoUpdate = autoUpdate(this._trigger, this._panel, async () => {
            await this._position();
        });
        return this._position();
    }

    hide(): void {
        if (!this._isOpen || !this._panel) return;
        this._cleanupAutoUpdate?.();
        this._cleanupAutoUpdate = null;
        const panel = this._panel as PopoverPanel;
        if (typeof panel.hidePopover === 'function') panel.hidePopover();
        this._isOpen = false;
        this._host.requestUpdate();
    }

    destroy(): void {
        this._cleanupAutoUpdate?.();
        this._cleanupAutoUpdate = null;
        if (this._isOpen && this._panel) {
            const panel = this._panel as PopoverPanel;
            if (typeof panel.hidePopover === 'function') panel.hidePopover();
            this._isOpen = false;
        }
        this._panel?.removeEventListener('toggle', this._onToggle);
    }

    private _onToggle = (e: Event): void => {
        const newState = (e as ToggleEvent).newState;
        if (newState === 'closed' && this._isOpen) {
            this._cleanupAutoUpdate?.();
            this._cleanupAutoUpdate = null;
            this._isOpen = false;
            this._opts.onExternalClose?.();
            this._host.requestUpdate();
        }
    };

    private async _position(): Promise<void> {
        if (!this._trigger || !this._panel) return;
        const { x, y, middlewareData } = await computePosition(this._trigger, this._panel, {
            placement: this._opts.placement,
            strategy: 'absolute',
            middleware: [
                offset({ mainAxis: this._opts.distance, crossAxis: this._opts.offset }),
                flip(),
                shift({ padding: 4 }),
                hide(),
            ],
        });
        this._panel.style.visibility = middlewareData.hide?.referenceHidden ? 'hidden' : '';
        if (middlewareData.hide?.referenceHidden) return;
        this._panel.style.transform = `translate(${this._roundByDPR(x)}px, ${this._roundByDPR(y)}px)`;
    }

    private _roundByDPR(value: number): number {
        const dpr = window.devicePixelRatio || 1;
        return Math.round(value * dpr) / dpr;
    }
}
```

- [ ] **Step 4 : Vérifier que les tests WTR passent**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx wtr src/utils/popover.browser.test.ts --node-resolve
```

Expected: tous les tests passent

- [ ] **Step 5 : Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/utils/popover.ts packages/core/src/utils/popover.browser.test.ts && git commit -m "feat(utils): add Popover utility (popover API + floating-ui)"
```

---

## Task 4 : `AnchoredController` + tests WTR

**Files:**

- Create: `packages/core/src/controllers/anchored.controller.ts`
- Create: `packages/core/src/controllers/anchored.controller.browser.test.ts`

- [ ] **Step 1 : Écrire les tests browser qui échouent**

```ts
// packages/core/src/controllers/anchored.controller.browser.test.ts
/// <reference types="mocha" />
import { LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { fixture, html, expect, aTimeout } from '@open-wc/testing';
import { AnchoredController } from './anchored.controller.js';

@customElement('test-anchored-host')
class TestAnchoredHost extends LitElement {
    override requestUpdate() {
        return super.requestUpdate();
    }
}
declare global {
    interface HTMLElementTagNameMap {
        'test-anchored-host': TestAnchoredHost;
    }
}

async function setupAnchored(options: ConstructorParameters<typeof AnchoredController>[1] = {}) {
    const host = await fixture<TestAnchoredHost>(html`
        <test-anchored-host>
            <button id="trigger">Trigger</button>
            <div id="panel">Panel</div>
        </test-anchored-host>
    `);
    const trigger = host.querySelector<HTMLElement>('#trigger')!;
    const panel = host.querySelector<HTMLElement>('#panel')!;
    const ctrl = new AnchoredController(host, options);
    ctrl.attach(trigger, panel);
    return { host, trigger, panel, ctrl };
}

describe('AnchoredController', () => {
    describe('ARIA — popupMode: menu (défaut)', () => {
        it('attach() pose aria-haspopup="true"', async () => {
            const { trigger } = await setupAnchored({ popupMode: 'menu' });
            expect(trigger.getAttribute('aria-haspopup')).to.equal('true');
        });

        it("attach() pose aria-controls avec l'id du panel", async () => {
            const { trigger, panel } = await setupAnchored({ popupMode: 'menu' });
            expect(trigger.getAttribute('aria-controls')).to.equal(panel.id);
        });

        it('attach() pose aria-expanded="false"', async () => {
            const { trigger } = await setupAnchored({ popupMode: 'menu' });
            expect(trigger.getAttribute('aria-expanded')).to.equal('false');
        });

        it('show() met aria-expanded="true"', async () => {
            const { trigger, ctrl } = await setupAnchored({ popupMode: 'menu' });
            await ctrl.show();
            expect(trigger.getAttribute('aria-expanded')).to.equal('true');
            ctrl.hide();
        });

        it('hide() remet aria-expanded="false"', async () => {
            const { trigger, ctrl } = await setupAnchored({ popupMode: 'menu' });
            await ctrl.show();
            ctrl.hide();
            expect(trigger.getAttribute('aria-expanded')).to.equal('false');
        });
    });

    describe('ARIA — popupMode: dialog', () => {
        it('attach() pose aria-haspopup="dialog"', async () => {
            const { trigger } = await setupAnchored({ popupMode: 'dialog' });
            expect(trigger.getAttribute('aria-haspopup')).to.equal('dialog');
        });
    });

    describe('isOpen', () => {
        it('isOpen est false avant show()', async () => {
            const { ctrl } = await setupAnchored();
            expect(ctrl.isOpen).to.equal(false);
        });

        it('isOpen est true après show(), false après hide()', async () => {
            const { ctrl } = await setupAnchored();
            await ctrl.show();
            expect(ctrl.isOpen).to.equal(true);
            ctrl.hide();
            expect(ctrl.isOpen).to.equal(false);
        });
    });

    describe('toggle()', () => {
        it('toggle() ouvre si fermé', async () => {
            const { ctrl } = await setupAnchored();
            ctrl.toggle();
            await aTimeout(50);
            expect(ctrl.isOpen).to.equal(true);
            ctrl.hide();
        });

        it('toggle() ferme si ouvert', async () => {
            const { ctrl } = await setupAnchored();
            await ctrl.show();
            ctrl.toggle();
            expect(ctrl.isOpen).to.equal(false);
        });
    });

    describe('scroll lock — multi-instance', () => {
        it("deux controllers sur le même conteneur : le conteneur reste locké après hide() d'un seul", async () => {
            const container = document.createElement('div');
            container.style.overflowY = 'auto';
            document.body.appendChild(container);

            const makeHost = async () => {
                const h = await fixture<TestAnchoredHost>(html`
                    <test-anchored-host>
                        <button id="t">T</button>
                        <div id="p">P</div>
                    </test-anchored-host>
                `);
                container.appendChild(h);
                return h;
            };

            const h1 = await makeHost();
            const h2 = await makeHost();
            const ctrl1 = new AnchoredController(h1, { lockScroll: true });
            const ctrl2 = new AnchoredController(h2, { lockScroll: true });
            ctrl1.attach(h1.querySelector('#t')!, h1.querySelector('#p')!);
            ctrl2.attach(h2.querySelector('#t')!, h2.querySelector('#p')!);

            await ctrl1.show();
            await ctrl2.show();
            expect(container.style.overflowY).to.equal('hidden');

            ctrl1.hide();
            expect(container.style.overflowY).to.equal('hidden'); // encore locké par ctrl2

            ctrl2.hide();
            expect(container.style.overflowY).to.equal('auto'); // restauré

            container.remove();
        });
    });

    describe('onExternalClose', () => {
        it("onExternalClose est appelé lors d'un light-dismiss et met aria-expanded à false", async () => {
            let called = false;
            const { trigger, panel, ctrl } = await setupAnchored({
                onExternalClose: () => {
                    called = true;
                },
            });
            await ctrl.show();
            (panel as HTMLElement & { hidePopover(): void }).hidePopover();
            await aTimeout(50);
            expect(called).to.equal(true);
            expect(trigger.getAttribute('aria-expanded')).to.equal('false');
        });
    });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx wtr src/controllers/anchored.controller.browser.test.ts --node-resolve
```

Expected: erreur module introuvable

- [ ] **Step 3 : Implémenter `anchored.controller.ts`**

```ts
// packages/core/src/controllers/anchored.controller.ts
import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { Placement } from '@floating-ui/dom';
import { Popover } from '../utils/popover.js';
import { acquireScrollLock, isScrollLocked, releaseScrollLock } from '../utils/scroll-lock.js';

export interface AnchoredControllerOptions {
    popupMode?: 'menu' | 'dialog';
    placement?: Placement;
    /** Espacement perpendiculaire trigger→panel (mainAxis). Défaut : 4. */
    distance?: number;
    /** Décalage latéral (crossAxis). Défaut : 0. */
    offset?: number;
    /** Verrouille le scroll des ancêtres scrollables à l'ouverture. Défaut : true. */
    lockScroll?: boolean;
    /** Appelé lors d'un light-dismiss natif (popover auto). */
    onExternalClose?: () => void;
}

export class AnchoredController implements ReactiveController {
    private _trigger: HTMLElement | null = null;
    private _scrollLocks: HTMLElement[] = [];
    private _opts: Required<Omit<AnchoredControllerOptions, 'onExternalClose'>> & {
        onExternalClose?: () => void;
    };
    private readonly _popover: Popover;

    constructor(
        host: ReactiveControllerHost & HTMLElement,
        options: AnchoredControllerOptions = {},
    ) {
        this._opts = {
            popupMode: options.popupMode ?? 'menu',
            placement: options.placement ?? 'bottom-start',
            distance: options.distance ?? 4,
            offset: options.offset ?? 0,
            lockScroll: options.lockScroll ?? true,
            ...(options.onExternalClose !== undefined && {
                onExternalClose: options.onExternalClose,
            }),
        };
        this._popover = new Popover(host, {
            placement: this._opts.placement,
            distance: this._opts.distance,
            offset: this._opts.offset,
            popoverType: 'auto',
            onExternalClose: () => {
                this._releaseScrollLocks();
                this._trigger?.setAttribute('aria-expanded', 'false');
                this._opts.onExternalClose?.();
            },
        });
        host.addController(this);
    }

    get isOpen(): boolean {
        return this._popover.isOpen;
    }

    attach(trigger: HTMLElement, panel: HTMLElement): void {
        this._trigger = trigger;
        this._popover.attach(trigger, panel);
        const haspopup = this._opts.popupMode === 'dialog' ? 'dialog' : 'true';
        trigger.setAttribute('aria-haspopup', haspopup);
        trigger.setAttribute('aria-controls', panel.id);
        trigger.setAttribute('aria-expanded', 'false');
    }

    async show(): Promise<void> {
        if (this._popover.isOpen || !this._trigger) return;
        if (this._opts.lockScroll) this._acquireScrollLocks();
        await this._popover.show();
        this._trigger.setAttribute('aria-expanded', 'true');
    }

    hide(): void {
        if (!this._popover.isOpen) return;
        this._popover.hide();
        this._releaseScrollLocks();
        this._trigger?.setAttribute('aria-expanded', 'false');
    }

    toggle(): void {
        if (this._popover.isOpen) this.hide();
        else void this.show();
    }

    setPlacement(v: Placement): void {
        this._opts.placement = v;
        this._popover.setPlacement(v);
    }

    setDistance(v: number): void {
        this._opts.distance = v;
        this._popover.setDistance(v);
    }

    setOffset(v: number): void {
        this._opts.offset = v;
        this._popover.setOffset(v);
    }

    setLockScroll(v: boolean): void {
        this._opts.lockScroll = v;
    }

    hostConnected(): void {}

    hostDisconnected(): void {
        this._popover.destroy();
        this._releaseScrollLocks();
    }

    private _acquireScrollLocks(): void {
        let el: HTMLElement | null = this._trigger?.parentElement ?? null;
        while (el && el !== document.documentElement) {
            const { overflowY, overflowX } = getComputedStyle(el);
            if (
                isScrollLocked(el) ||
                ['auto', 'scroll'].includes(overflowY) ||
                ['auto', 'scroll'].includes(overflowX)
            ) {
                acquireScrollLock(el);
                this._scrollLocks.push(el);
            }
            el = el.parentElement;
        }
    }

    private _releaseScrollLocks(): void {
        for (const el of this._scrollLocks) {
            releaseScrollLock(el);
        }
        this._scrollLocks = [];
    }
}
```

- [ ] **Step 4 : Vérifier que les tests WTR passent**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx wtr src/controllers/anchored.controller.browser.test.ts --node-resolve
```

Expected: tous les tests passent

- [ ] **Step 5 : Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/controllers/anchored.controller.ts packages/core/src/controllers/anchored.controller.browser.test.ts && git commit -m "feat(controller): add AnchoredController (ARIA menu/dialog + scroll lock)"
```

---

## Task 5 : Migrer `ar-dropdown` vers `AnchoredController`

**Files:**

- Modify: `packages/core/src/components/dropdown/dropdown.ts`
- Modify: `packages/core/src/index.ts`
- Delete: `packages/core/src/controllers/popover.controller.ts`

`ar-dropdown` utilise `PopoverController` avec la même API que `AnchoredController` (`attach`, `show`, `hide`, `toggle`, `isOpen`, `setPlacement`, `setDistance`, `setOffset`, `setLockScroll`, `onExternalClose`). C'est un remplacement quasi 1:1.

- [ ] **Step 1 : Modifier `dropdown.ts`**

Remplacer l'import et l'instanciation du controller. Dans `dropdown.ts` :

Remplacer :

```ts
import { PopoverController } from '../../controllers/popover.controller.js';
```

par :

```ts
import { AnchoredController } from '../../controllers/anchored.controller.js';
```

Remplacer :

```ts
private readonly _popover = new PopoverController(this, {
    onExternalClose: () => {
        this.open = false;
    },
});
```

par :

```ts
private readonly _popover = new AnchoredController(this, {
    onExternalClose: () => {
        this.open = false;
    },
});
```

Remplacer les deux occurrences du cast `this._panel as HTMLElement & { showPopover(): void; hidePopover(): void }` par simplement `this._panel` (AnchoredController accepte `HTMLElement`).

Concrètement, partout où le code lit :

```ts
this._popover.attach(
    trigger,
    this._panel as HTMLElement & { showPopover(): void; hidePopover(): void },
);
```

écrire :

```ts
this._popover.attach(trigger, this._panel);
```

(Trois occurrences dans `firstUpdated`, `updated`, `_handleTriggerSlotChange`.)

- [ ] **Step 2 : Mettre à jour `index.ts`**

Dans `packages/core/src/index.ts`, remplacer :

```ts
export { PopoverController } from './controllers/popover.controller.js';
```

par :

```ts
export { AnchoredController } from './controllers/anchored.controller.js';
```

- [ ] **Step 3 : Supprimer `popover.controller.ts`**

```bash
rm /Users/jon/Code/Active_projects/ariane/packages/core/src/controllers/popover.controller.ts
```

- [ ] **Step 4 : Vérifier que tous les tests dropdown passent (Vitest)**

```bash
cd /Users/jon/Code/Active_projects/ariane && npx vitest run packages/core/src/components/dropdown/
```

Expected: tous les tests passent

- [ ] **Step 5 : Vérifier les tests WTR dropdown**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx wtr src/components/dropdown/dropdown.browser.test.ts --node-resolve
```

Expected: tous les tests passent

- [ ] **Step 6 : Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/components/dropdown/dropdown.ts packages/core/src/index.ts && git rm packages/core/src/controllers/popover.controller.ts && git commit -m "refactor(dropdown): replace PopoverController with AnchoredController"
```

---

## Task 6 : Migrer `ar-stepper` vers `AnchoredController`

**Files:**

- Modify: `packages/core/src/components/stepper/stepper.ts`
- Modify: `packages/core/src/components/stepper/stepper.renderer.ts`

`ar-stepper` utilise `DropdownController` (outside-click, sans positionnement). Après migration, le dropdown mobile utilise la native popover API + floating-ui. Les tests existants (happy-dom) ne testent pas `showPopover`, ils passeront grâce au guard dans `Popover.show()`.

La migration nécessite :

1. Trouver le trigger (`.btn-stepper-mobile`) et le panel (`#stepper-dropdown-menu`) dans le shadow DOM
2. Appeler `attach()` quand le rendu mobile est actif (`!_isDesktop`)
3. Retirer `aria-expanded` du renderer (le controller le gère)

- [ ] **Step 1 : Modifier `stepper.renderer.ts`**

Dans `renderMobile()`, retirer l'attribut `aria-expanded` du bouton (le controller le posera via `attach()`).

Remplacer dans `renderMobile()` :

```ts
<button
    type="button"
    class="btn btn-secondary dropdown-toggle btn-block btn-stepper-mobile"
    aria-expanded=${ctx.isOpen}
    aria-controls="stepper-dropdown-menu"
    @click=${ctx.onToggle}
>
```

par :

```ts
<button
    type="button"
    class="btn btn-secondary dropdown-toggle btn-block btn-stepper-mobile"
    aria-controls="stepper-dropdown-menu"
    @click=${ctx.onToggle}
>
```

Note : `aria-controls` reste dans le template (valeur statique concordante avec ce que le controller posera). `aria-haspopup` sera ajouté par `attach()`.

- [ ] **Step 2 : Modifier `stepper.ts`**

Remplacer l'import :

```ts
import { DropdownController } from '../../controllers/dropdown.controller.js';
```

par :

```ts
import { AnchoredController } from '../../controllers/anchored.controller.js';
```

Remplacer l'instanciation du controller dans `stepper.ts` (ligne `private readonly dropdown = new DropdownController(this);`) :

```ts
private readonly dropdown = new AnchoredController(this, { lockScroll: false, popupMode: 'menu' });
```

Ajouter `@query` pour le trigger et le panel. Ces éléments n'existent que dans le rendu mobile (quand `!_isDesktop`). Les requêtes dans le shadow DOM :

```ts
// Ajouter après les imports de décorateurs existants
import { query } from 'lit/decorators.js'; // déjà importé si @query est utilisé; sinon ajouter

@query('.btn-stepper-mobile') private _dropdownTrigger?: HTMLElement;
@query('#stepper-dropdown-menu') private _dropdownPanel?: HTMLElement;
```

Ajouter `firstUpdated()` et modifier `applyResponsiveMode()` pour appeler `attach()` au bon moment :

Ajouter après `_onDropdownToggle` :

```ts
override firstUpdated(): void {
    if (!this._isDesktop) this._attachDropdown();
}

private _attachDropdown(): void {
    if (this._dropdownTrigger && this._dropdownPanel) {
        this.dropdown.attach(this._dropdownTrigger, this._dropdownPanel);
    }
}
```

Modifier `applyResponsiveMode()` pour appeler `_attachDropdown()` quand on passe en mobile. Remplacer :

```ts
private applyResponsiveMode(matches: boolean): void {
    // Le mode de rendu suit le breakpoint, indépendamment de la téléportation
    this._isDesktop = matches;

    if (this.desktopTarget) {
        if (matches) {
            this._teleportToTarget();
        } else {
            this._restoreToOriginalContainer();
        }
    }
}
```

par :

```ts
private applyResponsiveMode(matches: boolean): void {
    const wasDesktop = this._isDesktop;
    this._isDesktop = matches;

    if (this.desktopTarget) {
        if (matches) {
            this._teleportToTarget();
        } else {
            this._restoreToOriginalContainer();
        }
    }

    // Attacher le controller au premier passage en mode mobile
    if (wasDesktop && !matches) {
        // Le rendu mobile n'existe pas encore — attendre le prochain cycle
        this.updateComplete.then(() => this._attachDropdown());
    }
}
```

- [ ] **Step 3 : Vérifier que les tests stepper passent**

```bash
cd /Users/jon/Code/Active_projects/ariane && npx vitest run packages/core/src/components/stepper/
```

Expected: tous les tests passent sans modification

- [ ] **Step 4 : Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/components/stepper/stepper.ts packages/core/src/components/stepper/stepper.renderer.ts && git commit -m "refactor(stepper): replace DropdownController with AnchoredController"
```

---

## Task 7 : Migrer `ar-breadcrumb` + tests WTR

**Files:**

- Modify: `packages/core/src/components/breadcrumb/breadcrumb.ts`
- Create: `packages/core/src/components/breadcrumb/breadcrumb.browser.test.ts`

La migration conserve `@state() dropdownOpen` pour les tests Vitest existants (qui vériffient les classes CSS et ne testent pas la popover API). `AnchoredController` ajoute ARIA + light-dismiss natif. `_show()` / `_hide()` continuent de conduire l'état CSS ; le listener `blur` est supprimé.

- [ ] **Step 1 : Écrire les tests WTR browser qui échouent**

```ts
// packages/core/src/components/breadcrumb/breadcrumb.browser.test.ts
/// <reference types="mocha" />
import { fixture, html, expect, aTimeout } from '@open-wc/testing';
import './breadcrumb.js';
import '../breadcrumb-item/breadcrumb-item.js';
import type { ArBreadcrumb } from './breadcrumb.js';

function getBtn(el: ArBreadcrumb): HTMLButtonElement {
    const btn = el.shadowRoot?.querySelector<HTMLButtonElement>('#breadcrumb-dropdown');
    if (!btn) throw new Error('#breadcrumb-dropdown introuvable');
    return btn;
}

function getPanel(el: ArBreadcrumb): HTMLElement {
    const panel = el.shadowRoot?.querySelector<HTMLElement>('.breadcrumb-dropdown-panel');
    if (!panel) throw new Error('.breadcrumb-dropdown-panel introuvable');
    return panel;
}

async function mobileBreadcrumb(): Promise<ArBreadcrumb> {
    // Viewport narrow → isMobile = true
    const el = await fixture<ArBreadcrumb>(html`
        <ar-breadcrumb style="width:400px">
            <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
            <ar-breadcrumb-item label="Catégorie" href="/cat"></ar-breadcrumb-item>
            <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
        </ar-breadcrumb>
    `);
    // Force le mode mobile
    (el as ArBreadcrumb & { isMobile: boolean }).isMobile = true;
    await el.updateComplete;
    return el;
}

describe('ar-breadcrumb — browser', () => {
    let el: ArBreadcrumb;

    afterEach(() => el?.remove());

    describe('ouverture / fermeture', () => {
        it('le panel est en :popover-open après ouverture', async () => {
            el = await mobileBreadcrumb();
            getBtn(el).click();
            await aTimeout(50);
            expect(getPanel(el).matches(':popover-open')).to.equal(true);
        });

        it("le panel n'est plus en :popover-open après fermeture", async () => {
            el = await mobileBreadcrumb();
            getBtn(el).click();
            await aTimeout(50);
            getBtn(el).click();
            await aTimeout(50);
            expect(getPanel(el).matches(':popover-open')).to.equal(false);
        });

        it('aria-expanded="true" après ouverture', async () => {
            el = await mobileBreadcrumb();
            getBtn(el).click();
            await aTimeout(50);
            expect(getBtn(el).getAttribute('aria-expanded')).to.equal('true');
        });

        it('aria-expanded="false" après fermeture', async () => {
            el = await mobileBreadcrumb();
            getBtn(el).click();
            await aTimeout(50);
            getBtn(el).click();
            await aTimeout(50);
            expect(getBtn(el).getAttribute('aria-expanded')).to.equal('false');
        });
    });

    describe('light-dismiss', () => {
        it('un hidePopover() externe ferme le panel et émet ar-breadcrumb-close', async () => {
            el = await mobileBreadcrumb();
            const closeHandler = (() => {
                (closeHandler as { called?: boolean }).called = true;
            }) as EventListener & { called?: boolean };
            el.addEventListener('ar-breadcrumb-close', closeHandler);
            getBtn(el).click();
            await aTimeout(50);

            // Simule le light-dismiss
            (getPanel(el) as HTMLElement & { hidePopover(): void }).hidePopover();
            await aTimeout(50);

            expect(closeHandler.called).to.equal(true);
            expect(getPanel(el).matches(':popover-open')).to.equal(false);
        });
    });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx wtr src/components/breadcrumb/breadcrumb.browser.test.ts --node-resolve
```

Expected: erreur (`.breadcrumb-dropdown-panel` introuvable ou ARIA non posé)

- [ ] **Step 3 : Modifier `breadcrumb.ts`**

Ajouter les imports en tête de fichier :

```ts
import { type PropertyValues, query } from 'lit'; // query si pas déjà importé
import { AnchoredController } from '../../controllers/anchored.controller.js';
```

Note : `query` vient de `lit/decorators.js` — ajuster selon l'import existant.

Ajouter les `@query` après le `@state() private dropdownOpen`:

```ts
@query('#breadcrumb-dropdown') private _dropdownTrigger?: HTMLButtonElement;
@query('.breadcrumb-dropdown-panel') private _dropdownPanel?: HTMLElement;
```

Ajouter le controller après les `@query` :

```ts
private readonly _anchoredCtrl = new AnchoredController(this, {
    lockScroll: false,
    popupMode: 'menu',
    onExternalClose: () => {
        this.dropdownOpen = false;
        this.dispatchEvent(
            new CustomEvent('ar-breadcrumb-close', { bubbles: true, composed: true }),
        );
    },
});
```

Dans le template `render()`, ajouter la classe `breadcrumb-dropdown-panel` au div panel et retirer `.ariaExpanded`. Remplacer dans la partie mobile :

```ts
// AVANT :
<button
    @click=${this.dropdownOpen ? this._hide : this._show}
    .ariaExpanded=${this.dropdownOpen}
    type="button"
    class="btn btn-tertiary btn-ratio-square"
    id="breadcrumb-dropdown"
>
// ...
<div
    class="dropdown-menu dropdown-menu-left${this.dropdownOpen ? ' show' : ''}"
    tabindex="-1"
>
```

```ts
// APRÈS :
<button
    @click=${this.dropdownOpen ? this._hide : this._show}
    type="button"
    class="btn btn-tertiary btn-ratio-square"
    id="breadcrumb-dropdown"
>
// ...
<div
    class="breadcrumb-dropdown-panel dropdown-menu dropdown-menu-left${this.dropdownOpen ? ' show' : ''}"
    tabindex="-1"
>
```

Ajouter `firstUpdated()` pour attacher le controller dès que le rendu mobile est présent :

```ts
override firstUpdated(): void {
    if (this.isMobile) this._attachDropdown();
}

override updated(changed: PropertyValues<this>): void {
    if (changed.has('isMobile') && this.isMobile) {
        this.updateComplete.then(() => this._attachDropdown());
    }
}

private _attachDropdown(): void {
    if (this._dropdownTrigger && this._dropdownPanel) {
        this._anchoredCtrl.attach(this._dropdownTrigger, this._dropdownPanel);
    }
}
```

Remplacer `_show()` et `_hide()` pour appeler le controller et retirer le listener `blur` :

```ts
private _show(): void {
    this.dropdownOpen = true;
    void this._anchoredCtrl.show();
    this.dispatchEvent(
        new CustomEvent('ar-breadcrumb-open', { bubbles: true, composed: true }),
    );
}

private _hide(): void {
    this.dropdownOpen = false;
    this._anchoredCtrl.hide();
    this.dispatchEvent(
        new CustomEvent('ar-breadcrumb-close', { bubbles: true, composed: true }),
    );
}
```

- [ ] **Step 4 : Vérifier que les tests Vitest existants passent**

```bash
cd /Users/jon/Code/Active_projects/ariane && npx vitest run packages/core/src/components/breadcrumb/
```

Expected: tous les tests passent (les tests WTR sont exclus automatiquement)

- [ ] **Step 5 : Vérifier les tests WTR breadcrumb**

```bash
cd /Users/jon/Code/Active_projects/ariane/packages/core && npx wtr src/components/breadcrumb/breadcrumb.browser.test.ts --node-resolve
```

Expected: tous les tests passent

- [ ] **Step 6 : Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/components/breadcrumb/ && git commit -m "refactor(breadcrumb): replace blur listener with AnchoredController + light-dismiss"
```

---

## Task 8 : Supprimer `DropdownController`

**Files:**

- Delete: `packages/core/src/controllers/dropdown.controller.ts`
- Delete: `packages/core/src/controllers/dropdown.controller.test.ts`

`DropdownController` n'est plus utilisé par aucun composant après les migrations Tasks 6 et 7. Il n'est pas exporté depuis `index.ts` (vérifier avec grep avant de supprimer).

- [ ] **Step 1 : Confirmer qu'aucun import ne subsiste**

```bash
grep -r "dropdown.controller" /Users/jon/Code/Active_projects/ariane/packages/core/src/
```

Expected: aucune sortie (ou uniquement les fichiers à supprimer eux-mêmes)

- [ ] **Step 2 : Confirmer l'absence d'export dans index.ts**

```bash
grep "DropdownController" /Users/jon/Code/Active_projects/ariane/packages/core/src/index.ts
```

Expected: aucune sortie

- [ ] **Step 3 : Supprimer les fichiers**

```bash
cd /Users/jon/Code/Active_projects/ariane && git rm packages/core/src/controllers/dropdown.controller.ts packages/core/src/controllers/dropdown.controller.test.ts
```

- [ ] **Step 4 : Vérifier que la suite complète passe**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test
```

Expected: toute la suite Vitest passe sans erreur

- [ ] **Step 5 : Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git commit -m "refactor: remove DropdownController (replaced by AnchoredController)"
```

---

## Task 9 : `TooltipController`

**Files:**

- Create: `packages/core/src/controllers/tooltip.controller.ts`
- Modify: `packages/core/src/index.ts`

Thin wrapper sur `Popover` avec `popoverType: 'manual'`, sans scroll lock. ARIA tooltip (`role="tooltip"` sur le panel, `aria-describedby` sur le trigger).

- [ ] **Step 1 : Implémenter `tooltip.controller.ts`**

```ts
// packages/core/src/controllers/tooltip.controller.ts
import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { Placement } from '@floating-ui/dom';
import { Popover } from '../utils/popover.js';

export interface TooltipControllerOptions {
    placement?: Placement;
    /** Espacement perpendiculaire trigger→tooltip. Défaut : 6. */
    distance?: number;
    /** Décalage latéral. Défaut : 0. */
    offset?: number;
}

export class TooltipController implements ReactiveController {
    private readonly _popover: Popover;

    constructor(
        host: ReactiveControllerHost & HTMLElement,
        options: TooltipControllerOptions = {},
    ) {
        this._popover = new Popover(host, {
            placement: options.placement ?? 'top',
            distance: options.distance ?? 6,
            offset: options.offset ?? 0,
            popoverType: 'manual',
        });
        host.addController(this);
    }

    get isOpen(): boolean {
        return this._popover.isOpen;
    }

    attach(trigger: HTMLElement, panel: HTMLElement): void {
        this._popover.attach(trigger, panel);
        panel.setAttribute('role', 'tooltip');
        trigger.setAttribute('aria-describedby', panel.id);
    }

    show(): Promise<void> {
        return this._popover.show();
    }

    hide(): void {
        this._popover.hide();
    }

    setPlacement(v: Placement): void {
        this._popover.setPlacement(v);
    }

    setDistance(v: number): void {
        this._popover.setDistance(v);
    }

    setOffset(v: number): void {
        this._popover.setOffset(v);
    }

    hostConnected(): void {}

    hostDisconnected(): void {
        this._popover.destroy();
    }
}
```

- [ ] **Step 2 : Exporter depuis `index.ts`**

Dans `packages/core/src/index.ts`, ajouter après la ligne `AnchoredController` :

```ts
export { TooltipController } from './controllers/tooltip.controller.js';
```

- [ ] **Step 3 : Vérifier que la suite complète passe**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test
```

Expected: toute la suite Vitest passe

- [ ] **Step 4 : Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add packages/core/src/controllers/tooltip.controller.ts packages/core/src/index.ts && git commit -m "feat(controller): add TooltipController (popover manual, ARIA tooltip)"
```

---

## Task finale : Vérification complète

- [ ] **Step 1 : Toutes les suites (Vitest + WTR)**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test:all
```

Expected: 0 failing — tests Vitest + WTR browser tous verts

- [ ] **Step 2 : Build pour valider les types**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run build:manifest
```

Expected: pas d'erreur TypeScript

---

## Self-Review

### Couverture spec vs plan

| Section spec                                                  | Tâche           | Statut                         |
| ------------------------------------------------------------- | --------------- | ------------------------------ |
| §1 scroll-lock.ts (acquireScrollLock, releaseScrollLock)      | Task 1          | ✓                              |
| §1 isScrollLocked (besoin interne AnchoredController)         | Task 1          | ✓ ajouté                       |
| §1 migration ar-dialog (\_freezeScroll → acquireScrollLock)   | Task 2          | ✓                              |
| §1 suppression arDialogLocks + \_savedBodyOverflow            | Task 2          | ✓ (remplacé par \_dialogStack) |
| §2 class Popover (attach, show, hide, destroy, setters)       | Task 3          | ✓                              |
| §2 onExternalClose via toggle event                           | Task 3          | ✓                              |
| §3 AnchoredController (ARIA menu/dialog, scroll lock)         | Task 4          | ✓                              |
| §4 TooltipController (role=tooltip, aria-describedby, manual) | Task 9          | ✓                              |
| §5 ordre migrations                                           | Tasks 2→5→6→7→8 | ✓                              |
| §6 scroll-lock.test.ts (Vitest)                               | Task 1          | ✓                              |
| §6 popover.browser.test.ts (WTR)                              | Task 3          | ✓                              |
| §6 anchored.controller.browser.test.ts (WTR)                  | Task 4          | ✓                              |
| §6 breadcrumb.browser.test.ts (WTR)                           | Task 7          | ✓                              |

### Placeholders

Aucun "TBD" ou "implement later" — tous les steps contiennent du code complet.

### Cohérence des types

- `Popover` exporté comme `export class Popover` depuis `utils/popover.ts`
- `AnchoredController` importé `from '../utils/popover.js'` dans `anchored.controller.ts` ✓
- `acquireScrollLock`, `releaseScrollLock`, `isScrollLocked` exportés de `scroll-lock.ts` et importés dans `anchored.controller.ts` ✓
- `PopoverOptions` et `AnchoredControllerOptions` : types distincts, pas de collision ✓
- `TooltipController.attach()` appelle `_popover.attach()` qui génère `panel.id` avant que `attach()` pose `aria-describedby={panel.id}` ✓

### Point d'attention : breadcrumb `isMobile` privé

Le test WTR force `isMobile` via cast : `(el as ArBreadcrumb & { isMobile: boolean }).isMobile = true`. C'est un `@state()` Lit (pas un `@property` avec attribut HTML), donc l'accès direct est possible en test. Le viewport en WTR peut ne pas déclencher automatiquement le media query — forcer l'état est la bonne approche pour les tests.
