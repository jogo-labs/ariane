# ar-table-sort Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer `ar-table-sort`, un composant Lit 3 placé dans un `<th>` qui enrichit les entêtes de tableau triables avec accessibilité complète (aria-sort, scope, aria-live contextualisé) et des indicateurs visuels headless.

**Architecture:** LitElement autonome sans dépendances inter-composants. L'état (`order`, `pending`) est reflété en attributs pour piloter les styles CSS. Les effets de bord sur le `<th>` ancêtre (`aria-sort`, `scope`) sont gérés via `this.closest('th')`. Le consommateur contrôle l'avancement du cycle via `confirm()` / `reject()`. L'annonce `aria-live` inclut le nom de colonne lu depuis le slot.

**Tech Stack:** Lit 3, TypeScript, Vitest + happy-dom (tests unitaires), @web/test-runner + Playwright Chromium (tests browser/a11y), Astro + MDX (documentation).

**Spec :** `docs/superpowers/specs/2026-06-02-ar-table-sort-design.md`

---

## Fichiers

| Action   | Chemin                                                               | Rôle                              |
| -------- | -------------------------------------------------------------------- | --------------------------------- |
| Créer    | `packages/core/src/components/table-sort/table-sort.ts`              | Composant principal               |
| Créer    | `packages/core/src/components/table-sort/table-sort.styles.ts`       | Styles Shadow DOM                 |
| Créer    | `packages/core/src/components/table-sort/table-sort.test.ts`         | Tests Vitest (unitaires)          |
| Créer    | `packages/core/src/components/table-sort/table-sort.browser.test.ts` | Tests WTR (interactions browser)  |
| Créer    | `packages/core/src/components/table-sort/table-sort.a11y.test.ts`    | Tests WTR (accessibilité axe)     |
| Modifier | `packages/core/src/index.ts`                                         | Export barrel (auto via scaffold) |
| Modifier | `packages/core/src/autoloader.ts`                                    | Autoloader (auto via scaffold)    |
| Modifier | `packages/core/src/styles/themes/default.css`                        | Tokens CSS par défaut             |
| Modifier | `apps/docs/src/content/components/ar-table-sort.mdx`                 | Documentation + démos             |

---

## Task 1 : Scaffold

**Files:**

- Créer: `packages/core/src/components/table-sort/` (via script)
- Modifier: `packages/core/src/index.ts`
- Modifier: `packages/core/src/autoloader.ts`
- Créer: `apps/docs/src/content/components/ar-table-sort.mdx`

- [ ] **Step 1 : Lancer le scaffold**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run create -- table-sort
```

Expected output :

```
🧩 Création de "ar-table-sort"...

  ✓ src/components/table-sort/table-sort.ts
  ✓ src/components/table-sort/table-sort.styles.ts
  ✓ src/components/table-sort/table-sort.test.ts
  ✓ apps/docs/src/content/components/ar-table-sort.mdx
  ✓ src/index.ts mis à jour
  ✓ src/autoloader.ts mis à jour
```

- [ ] **Step 2 : Vérifier les fichiers créés**

```bash
ls packages/core/src/components/table-sort/ && grep "table-sort" packages/core/src/index.ts && grep "table-sort" packages/core/src/autoloader.ts
```

Expected : 3 fichiers listés + une ligne d'export + une ligne d'autoloader.

- [ ] **Step 3 : Créer les fichiers browser et a11y manquants**

Le scaffold ne génère pas ces deux fichiers. Les créer manuellement.

`packages/core/src/components/table-sort/table-sort.browser.test.ts` :

```ts
/// <reference types="mocha" />
import { fixture, html, expect } from '@open-wc/testing';
import type { ArTableSort } from './table-sort.js';
import './table-sort.js';

describe('ar-table-sort — browser', () => {
    // Tests ajoutés dans la Task 5
});
```

`packages/core/src/components/table-sort/table-sort.a11y.test.ts` :

```ts
/// <reference types="mocha" />
import { fixture, html, expect } from '@open-wc/testing';
import type { ArTableSort } from './table-sort.js';
import './table-sort.js';

describe('ar-table-sort — accessibilité', () => {
    // Tests ajoutés dans la Task 6
});
```

- [ ] **Step 4 : Commit**

```bash
git add packages/core/src/components/table-sort/ apps/docs/src/content/components/ar-table-sort.mdx packages/core/src/index.ts packages/core/src/autoloader.ts
git commit -m "feat(table-sort): scaffold ar-table-sort"
```

---

## Task 2 : Composant — types, attributs, cycle et template

**Files:**

- Modifier: `packages/core/src/components/table-sort/table-sort.ts`
- Modifier: `packages/core/src/components/table-sort/table-sort.test.ts`

- [ ] **Step 1 : Écrire les tests en échec**

Remplacer le contenu de `packages/core/src/components/table-sort/table-sort.test.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ArTableSort } from './table-sort.js';
import { fixture, waitForUpdate } from '../../test-utils.js';
import './table-sort.js';

describe('ArTableSort', () => {
    let el: ArTableSort;
    afterEach(() => el?.remove());

    // ── Valeurs par défaut ────────────────────────────────────────────────

    describe('valeurs par défaut', () => {
        beforeEach(async () => {
            el = await fixture('<ar-table-sort></ar-table-sort>');
        });

        it('type vaut "alpha"', () => expect(el.type).toBe('alpha'));
        it('order vaut "none"', () => expect(el.order).toBe('none'));
        it('pending vaut false', () => expect(el.pending).toBe(false));
        it('reflète order comme attribut', () => expect(el.getAttribute('order')).toBe('none'));
        it('ne reflète pas pending quand false', () =>
            expect(el.hasAttribute('pending')).toBe(false));
    });

    // ── Reflect depuis attributs HTML ─────────────────────────────────────

    describe('reflect', () => {
        it("lit type depuis l'attribut HTML", async () => {
            el = await fixture('<ar-table-sort type="numeric"></ar-table-sort>');
            expect(el.type).toBe('numeric');
        });

        it("lit order depuis l'attribut HTML", async () => {
            el = await fixture('<ar-table-sort order="asc"></ar-table-sort>');
            expect(el.order).toBe('asc');
        });
    });

    // ── Template ──────────────────────────────────────────────────────────

    describe('template', () => {
        beforeEach(async () => {
            el = await fixture('<ar-table-sort></ar-table-sort>');
        });

        it('contient part="button"', () => {
            expect(el.shadowRoot!.querySelector('[part="button"]')).not.toBeNull();
        });

        it('contient part="indicator"', () => {
            expect(el.shadowRoot!.querySelector('[part="indicator"]')).not.toBeNull();
        });

        it('contient une région aria-live="polite"', () => {
            const live = el.shadowRoot!.querySelector('[aria-live="polite"]');
            expect(live).not.toBeNull();
            expect(live!.getAttribute('aria-atomic')).toBe('true');
        });
    });

    // ── Labels alpha ──────────────────────────────────────────────────────

    describe('labels — alpha', () => {
        it('title = "Trier A → Z" quand order=none', async () => {
            el = await fixture('<ar-table-sort type="alpha" order="none"></ar-table-sort>');
            await waitForUpdate(el);
            expect(
                el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.getAttribute('title'),
            ).toBe('Trier A → Z');
        });

        it('title = "Trier Z → A" quand order=asc', async () => {
            el = await fixture('<ar-table-sort type="alpha" order="asc"></ar-table-sort>');
            await waitForUpdate(el);
            expect(
                el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.getAttribute('title'),
            ).toBe('Trier Z → A');
        });

        it('title = "Supprimer le tri" quand order=desc', async () => {
            el = await fixture('<ar-table-sort type="alpha" order="desc"></ar-table-sort>');
            await waitForUpdate(el);
            expect(
                el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.getAttribute('title'),
            ).toBe('Supprimer le tri');
        });
    });

    // ── Labels numeric ────────────────────────────────────────────────────

    describe('labels — numeric', () => {
        it('title = "Trier croissant" quand order=none', async () => {
            el = await fixture('<ar-table-sort type="numeric" order="none"></ar-table-sort>');
            await waitForUpdate(el);
            expect(
                el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.getAttribute('title'),
            ).toBe('Trier croissant');
        });

        it('title = "Trier décroissant" quand order=asc', async () => {
            el = await fixture('<ar-table-sort type="numeric" order="asc"></ar-table-sort>');
            await waitForUpdate(el);
            expect(
                el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.getAttribute('title'),
            ).toBe('Trier décroissant');
        });
    });

    // ── Labels date ───────────────────────────────────────────────────────

    describe('labels — date', () => {
        it('title = "Trier du plus ancien" quand order=none', async () => {
            el = await fixture('<ar-table-sort type="date" order="none"></ar-table-sort>');
            await waitForUpdate(el);
            expect(
                el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.getAttribute('title'),
            ).toBe('Trier du plus ancien');
        });

        it('title = "Trier du plus récent" quand order=asc', async () => {
            el = await fixture('<ar-table-sort type="date" order="asc"></ar-table-sort>');
            await waitForUpdate(el);
            expect(
                el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.getAttribute('title'),
            ).toBe('Trier du plus récent');
        });
    });

    // ── Label pendant pending ─────────────────────────────────────────────

    describe('label pendant pending', () => {
        it('title = "Tri en cours…" pendant pending', async () => {
            el = await fixture('<ar-table-sort></ar-table-sort>');
            el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.click();
            await waitForUpdate(el);
            expect(
                el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.getAttribute('title'),
            ).toBe('Tri en cours…');
        });
    });

    // ── Cycle et événement ────────────────────────────────────────────────

    describe('clic — cycle et événement', () => {
        it('passe pending=true et émet ar-table-sort-change', async () => {
            el = await fixture('<ar-table-sort></ar-table-sort>');
            const events: CustomEvent[] = [];
            el.addEventListener('ar-table-sort-change', (e) => events.push(e as CustomEvent));

            el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.click();
            await waitForUpdate(el);

            expect(el.pending).toBe(true);
            expect(el.hasAttribute('pending')).toBe(true);
            expect(events).toHaveLength(1);
            expect(events[0].detail.type).toBe('alpha');
            expect(events[0].detail.currentOrder).toBe('none');
            expect(events[0].detail.requestedOrder).toBe('asc');
        });

        it('inclut columnLabel dans le detail', async () => {
            el = await fixture('<ar-table-sort>Prix</ar-table-sort>');
            const events: CustomEvent[] = [];
            el.addEventListener('ar-table-sort-change', (e) => events.push(e as CustomEvent));

            el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.click();
            await waitForUpdate(el);

            expect(events[0].detail.columnLabel).toBe('Prix');
        });

        it('none → asc (cycle)', async () => {
            el = await fixture('<ar-table-sort order="asc"></ar-table-sort>');
            const events: CustomEvent[] = [];
            el.addEventListener('ar-table-sort-change', (e) => events.push(e as CustomEvent));

            el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.click();
            await waitForUpdate(el);
            expect(events[0].detail.requestedOrder).toBe('desc');
        });

        it('desc → none (cycle)', async () => {
            el = await fixture('<ar-table-sort order="desc"></ar-table-sort>');
            const events: CustomEvent[] = [];
            el.addEventListener('ar-table-sort-change', (e) => events.push(e as CustomEvent));

            el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.click();
            await waitForUpdate(el);
            expect(events[0].detail.requestedOrder).toBe('none');
        });

        it('second clic pendant pending ignoré', async () => {
            el = await fixture('<ar-table-sort></ar-table-sort>');
            const events: CustomEvent[] = [];
            el.addEventListener('ar-table-sort-change', (e) => events.push(e as CustomEvent));

            const btn = el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!;
            btn.click();
            await waitForUpdate(el);
            btn.click();
            await waitForUpdate(el);

            expect(events).toHaveLength(1);
        });

        it('aria-disabled="true" sur le bouton pendant pending', async () => {
            el = await fixture('<ar-table-sort></ar-table-sort>');
            el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.click();
            await waitForUpdate(el);
            expect(
                el.shadowRoot!.querySelector('[part="button"]')!.getAttribute('aria-disabled'),
            ).toBe('true');
        });
    });

    // ── confirm() ─────────────────────────────────────────────────────────

    describe('confirm()', () => {
        it('avance order et efface pending', async () => {
            el = await fixture('<ar-table-sort></ar-table-sort>');
            el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.click();
            await waitForUpdate(el);

            el.confirm();
            await waitForUpdate(el);

            expect(el.order).toBe('asc');
            expect(el.pending).toBe(false);
            expect(el.getAttribute('order')).toBe('asc');
            expect(el.hasAttribute('pending')).toBe(false);
        });

        it('sans effet si pending est false', async () => {
            el = await fixture('<ar-table-sort order="asc"></ar-table-sort>');
            el.confirm();
            await waitForUpdate(el);
            expect(el.order).toBe('asc');
        });

        it('second confirm() consécutif sans effet', async () => {
            el = await fixture('<ar-table-sort></ar-table-sort>');
            el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.click();
            await waitForUpdate(el);
            el.confirm();
            await waitForUpdate(el);
            el.confirm();
            await waitForUpdate(el);
            expect(el.order).toBe('asc');
        });
    });

    // ── reject() ──────────────────────────────────────────────────────────

    describe('reject()', () => {
        it('efface pending sans changer order', async () => {
            el = await fixture('<ar-table-sort></ar-table-sort>');
            el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.click();
            await waitForUpdate(el);

            el.reject();
            await waitForUpdate(el);

            expect(el.order).toBe('none');
            expect(el.pending).toBe(false);
        });

        it('sans effet si pending est false', async () => {
            el = await fixture('<ar-table-sort order="asc"></ar-table-sort>');
            el.reject();
            await waitForUpdate(el);
            expect(el.order).toBe('asc');
        });
    });

    // ── Effets de bord sur <th> ───────────────────────────────────────────

    describe('effets de bord sur le <th> parent', () => {
        async function inTh(attrs = ''): Promise<{ th: HTMLTableCellElement; el: ArTableSort }> {
            const th = document.createElement('th');
            th.innerHTML = `<ar-table-sort ${attrs}>Nom</ar-table-sort>`;
            document.body.appendChild(th);
            const sort = th.querySelector<ArTableSort>('ar-table-sort')!;
            await waitForUpdate(sort);
            return { th, el: sort };
        }

        afterEach(() => document.querySelectorAll('th').forEach((t) => t.remove()));

        it('pose aria-sort="none" au connectedCallback', async () => {
            const { th } = await inTh();
            expect(th.getAttribute('aria-sort')).toBe('none');
        });

        it('pose aria-sort="ascending" quand order="asc"', async () => {
            const { th } = await inTh('order="asc"');
            expect(th.getAttribute('aria-sort')).toBe('ascending');
        });

        it('pose aria-sort="descending" quand order="desc"', async () => {
            const { th } = await inTh('order="desc"');
            expect(th.getAttribute('aria-sort')).toBe('descending');
        });

        it('met à jour aria-sort après confirm()', async () => {
            const { th, el } = await inTh();
            el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.click();
            await waitForUpdate(el);
            el.confirm();
            await waitForUpdate(el);
            expect(th.getAttribute('aria-sort')).toBe('ascending');
        });

        it('pose scope="col" si absent', async () => {
            const { th } = await inTh();
            expect(th.getAttribute('scope')).toBe('col');
        });

        it('ne remplace pas un scope déjà présent', async () => {
            const th = document.createElement('th');
            th.setAttribute('scope', 'row');
            th.innerHTML = '<ar-table-sort>Nom</ar-table-sort>';
            document.body.appendChild(th);
            const sort = th.querySelector<ArTableSort>('ar-table-sort')!;
            await waitForUpdate(sort);
            expect(th.getAttribute('scope')).toBe('row');
            th.remove();
        });

        it('fonctionne si un wrapper est intercalé (closest)', async () => {
            const th = document.createElement('th');
            th.innerHTML = '<span><ar-table-sort>Nom</ar-table-sort></span>';
            document.body.appendChild(th);
            const sort = th.querySelector<ArTableSort>('ar-table-sort')!;
            await waitForUpdate(sort);
            expect(th.getAttribute('aria-sort')).toBe('none');
            th.remove();
        });
    });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test -- --reporter=verbose 2>&1 | grep -E "FAIL|ArTableSort" | head -10
```

Expected : erreurs sur les propriétés et le template manquants.

- [ ] **Step 3 : Implémenter le composant**

Remplacer le contenu de `packages/core/src/components/table-sort/table-sort.ts` :

```ts
import { LitElement, html, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import styles from './table-sort.styles.js';

export type TableSortType = 'alpha' | 'numeric' | 'date';
export type TableSortOrder = 'none' | 'asc' | 'desc';

const CYCLE: TableSortOrder[] = ['none', 'asc', 'desc'];

function nextOrder(current: TableSortOrder): TableSortOrder {
    return CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
}

const ACTION_LABELS: Record<TableSortType, Record<'asc' | 'desc' | 'reset', string>> = {
    alpha: { asc: 'Trier A → Z', desc: 'Trier Z → A', reset: 'Supprimer le tri' },
    numeric: { asc: 'Trier croissant', desc: 'Trier décroissant', reset: 'Supprimer le tri' },
    date: { asc: 'Trier du plus ancien', desc: 'Trier du plus récent', reset: 'Supprimer le tri' },
};

const APPLIED_LABELS: Record<TableSortOrder, string> = {
    none: 'tri supprimé',
    asc: 'tri croissant appliqué',
    desc: 'tri décroissant appliqué',
};

function getActionLabel(type: TableSortType, order: TableSortOrder, pending: boolean): string {
    if (pending) return 'Tri en cours…';
    if (order === 'none') return ACTION_LABELS[type].asc;
    if (order === 'asc') return ACTION_LABELS[type].desc;
    return ACTION_LABELS[type].reset;
}

/**
 * @summary Entête de colonne triable accessible — indicateur visuel ↑↓ et aria-sort automatique.
 * @display demo
 *
 * Placer à l'intérieur d'un `<th>`. Le composant met à jour `aria-sort` et `scope="col"` sur
 * le `<th>` ancêtre. Le consommateur appelle `confirm()` après un tri réussi ou `reject()` en
 * cas d'échec.
 *
 * @slot - Libellé de la colonne.
 *
 * @csspart button    - Le bouton déclencheur.
 * @csspart indicator - L'icône de direction de tri.
 *
 * @cssprop --ar-table-sort-gap                     - Espacement label / indicateur.
 * @cssprop --ar-table-sort-indicator-size          - Taille de l'icône.
 * @cssprop --ar-table-sort-indicator-color         - Couleur état neutre.
 * @cssprop --ar-table-sort-indicator-active-color  - Couleur état actif (asc/desc).
 * @cssprop --ar-table-sort-indicator-pending-color - Couleur état pending.
 *
 * @event {CustomEvent<{ type: TableSortType; currentOrder: TableSortOrder; requestedOrder: TableSortOrder; columnLabel: string }>} ar-table-sort-change - Émis au clic quand pending est false.
 */
@customElement('ar-table-sort')
export class ArTableSort extends LitElement {
    static override styles = [styles];

    /** Type de tri — influe sur les labels accessibles. */
    @property({ reflect: true }) type: TableSortType = 'alpha';

    /** Ordre actuel. Ne pas modifier directement — utiliser confirm() ou reject(). */
    @property({ reflect: true }) order: TableSortOrder = 'none';

    /**
     * Vrai quand un tri a été demandé et attend confirmation.
     * @readonly Piloté par le composant — ne pas modifier directement.
     */
    @property({ reflect: true, type: Boolean }) pending = false;

    private _pendingOrder: TableSortOrder | null = null;

    @query('.live') private _liveEl?: HTMLElement;

    override connectedCallback(): void {
        super.connectedCallback();
        this._syncParentTh();
    }

    /** Applique le pending order et avance le cycle. Sans effet si pending est false. */
    confirm(): void {
        if (!this._pendingOrder) return;
        const newOrder = this._pendingOrder;
        this._pendingOrder = null;
        this.pending = false;
        this.order = newOrder;
        this._syncParentTh();
        this._announce(`${this._getColumnLabel()} : ${APPLIED_LABELS[newOrder]}`);
    }

    /** Annule le pending order. Sans effet si pending est false. */
    reject(): void {
        if (!this._pendingOrder) return;
        this._pendingOrder = null;
        this.pending = false;
    }

    private _syncParentTh(): void {
        const th = this.closest('th');
        if (!th) return;
        const ariaSort = ({ none: 'none', asc: 'ascending', desc: 'descending' } as const)[
            this.order
        ];
        th.setAttribute('aria-sort', ariaSort);
        if (!th.hasAttribute('scope')) th.setAttribute('scope', 'col');
    }

    private _getColumnLabel(): string {
        const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])');
        if (!slot) return '';
        return slot
            .assignedNodes({ flatten: true })
            .map((n) => n.textContent ?? '')
            .join('')
            .trim();
    }

    private _announce(message: string): void {
        if (!this._liveEl) return;
        this._liveEl.textContent = message;
        setTimeout(() => {
            if (this._liveEl) this._liveEl.textContent = '';
        }, 150);
    }

    private _handleClick(): void {
        if (this.pending) return;
        const requestedOrder = nextOrder(this.order);
        this._pendingOrder = requestedOrder;
        this.pending = true;
        this.dispatchEvent(
            new CustomEvent('ar-table-sort-change', {
                bubbles: true,
                composed: true,
                detail: {
                    type: this.type,
                    currentOrder: this.order,
                    requestedOrder,
                    columnLabel: this._getColumnLabel(),
                },
            }),
        );
    }

    override render() {
        const label = getActionLabel(this.type, this.order, this.pending);
        return html`
            <button
                part="button"
                title=${label}
                aria-disabled=${this.pending ? 'true' : nothing}
                @click=${this._handleClick}
            >
                <slot></slot>
                <span class="sr-only">, ${label}</span>
                <span part="indicator" aria-hidden="true"></span>
            </button>
            <span class="sr-only live" aria-live="polite" aria-atomic="true"></span>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-table-sort': ArTableSort;
    }
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test -- --reporter=verbose 2>&1 | grep -A 80 "ArTableSort"
```

Expected : tous les tests verts.

- [ ] **Step 5 : Commit**

```bash
git add packages/core/src/components/table-sort/table-sort.ts packages/core/src/components/table-sort/table-sort.test.ts
git commit -m "feat(table-sort): composant ar-table-sort — attributs, cycle, template, labels, confirm/reject"
```

---

## Task 3 : Styles et tokens CSS

**Files:**

- Modifier: `packages/core/src/components/table-sort/table-sort.styles.ts`
- Modifier: `packages/core/src/styles/themes/default.css`

- [ ] **Step 1 : Écrire les styles du composant**

Remplacer le contenu de `packages/core/src/components/table-sort/table-sort.styles.ts` :

```ts
import { css } from 'lit';

export default css`
    :host {
        display: inline-flex;
        align-items: center;
    }

    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }

    [part='button'] {
        display: inline-flex;
        align-items: center;
        gap: var(--ar-table-sort-gap);
        background: none;
        border: none;
        padding: 0;
        font: inherit;
        color: inherit;
        cursor: pointer;
        text-align: inherit;
    }

    [part='button']:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
        border-radius: 2px;
    }

    [part='button'][aria-disabled='true'] {
        cursor: wait;
    }

    /* ── Indicateur ↑↓ ──────────────────────────────────────────── */

    [part='indicator'] {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        gap: 1px;
        width: var(--ar-table-sort-indicator-size);
        flex-shrink: 0;
    }

    [part='indicator']::before,
    [part='indicator']::after {
        content: '';
        display: block;
        border-left: calc(var(--ar-table-sort-indicator-size) / 2) solid transparent;
        border-right: calc(var(--ar-table-sort-indicator-size) / 2) solid transparent;
    }

    /* caret haut */
    [part='indicator']::before {
        border-bottom: calc(var(--ar-table-sort-indicator-size) / 2 * 1.1) solid
            var(--ar-table-sort-indicator-color);
    }

    /* caret bas */
    [part='indicator']::after {
        border-top: calc(var(--ar-table-sort-indicator-size) / 2 * 1.1) solid
            var(--ar-table-sort-indicator-color);
    }

    /* asc : caret haut actif, caret bas atténué */
    :host([order='asc']) [part='indicator']::before {
        border-bottom-color: var(--ar-table-sort-indicator-active-color);
    }

    :host([order='asc']) [part='indicator']::after {
        opacity: 0.3;
    }

    /* desc : caret bas actif, caret haut atténué */
    :host([order='desc']) [part='indicator']::after {
        border-top-color: var(--ar-table-sort-indicator-active-color);
    }

    :host([order='desc']) [part='indicator']::before {
        opacity: 0.3;
    }

    /* pending : les deux carets atténués */
    :host([pending]) [part='indicator']::before,
    :host([pending]) [part='indicator']::after {
        opacity: 0.4;
        border-bottom-color: var(--ar-table-sort-indicator-pending-color);
        border-top-color: var(--ar-table-sort-indicator-pending-color);
    }
`;
```

- [ ] **Step 2 : Ajouter les tokens dans le thème par défaut**

Dans `packages/core/src/styles/themes/default.css`, repérer le bloc `:root {` du mode clair et ajouter avant sa dernière `}` :

```css
/* Table Sort */
--ar-table-sort-gap: 0.375rem;
--ar-table-sort-indicator-size: 0.5rem;
--ar-table-sort-indicator-color: var(--ar-color-text-muted, #9ca3af);
--ar-table-sort-indicator-active-color: var(--ar-color-interactive, #2563eb);
--ar-table-sort-indicator-pending-color: var(--ar-color-text-muted, #9ca3af);
```

- [ ] **Step 3 : Vérifier que les tests passent toujours**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test 2>&1 | tail -5
```

Expected : aucune régression.

- [ ] **Step 4 : Commit**

```bash
git add packages/core/src/components/table-sort/table-sort.styles.ts packages/core/src/styles/themes/default.css
git commit -m "feat(table-sort): styles Shadow DOM et tokens CSS default theme"
```

---

## Task 4 : Régénérer le CEM

**Files:**

- Modifier: `packages/core/custom-elements.json` (généré)

- [ ] **Step 1 : Régénérer**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run build:manifest 2>&1 | tail -5
```

Expected : pas d'erreur.

- [ ] **Step 2 : Commit**

```bash
git add packages/core/custom-elements.json
git commit -m "chore(cem): régénérer manifest — ar-table-sort"
```

---

## Task 5 : Tests browser (WTR)

**Files:**

- Modifier: `packages/core/src/components/table-sort/table-sort.browser.test.ts`

- [ ] **Step 1 : Écrire les tests browser**

Remplacer le contenu de `packages/core/src/components/table-sort/table-sort.browser.test.ts` :

```ts
/// <reference types="mocha" />
import { fixture, html, expect, aTimeout } from '@open-wc/testing';
import type { ArTableSort } from './table-sort.js';
import './table-sort.js';

function btn(el: ArTableSort): HTMLButtonElement {
    const b = el.shadowRoot?.querySelector<HTMLButtonElement>('[part="button"]');
    if (!b) throw new Error('part="button" introuvable');
    return b;
}

describe('ar-table-sort — browser', () => {
    // ── Clic ──────────────────────────────────────────────────────────────

    describe('clic', () => {
        it('émet ar-table-sort-change et passe pending=true', async () => {
            const el = await fixture<ArTableSort>(html`<ar-table-sort></ar-table-sort>`);
            const events: CustomEvent[] = [];
            el.addEventListener('ar-table-sort-change', (e) => events.push(e as CustomEvent));

            btn(el).click();
            await el.updateComplete;

            expect(el.pending).to.equal(true);
            expect(events).to.have.length(1);
            expect(events[0].detail.requestedOrder).to.equal('asc');
        });

        it('columnLabel dans le detail', async () => {
            const el = await fixture<ArTableSort>(html`<ar-table-sort>Prix</ar-table-sort>`);
            const events: CustomEvent[] = [];
            el.addEventListener('ar-table-sort-change', (e) => events.push(e as CustomEvent));

            btn(el).click();
            await el.updateComplete;

            expect(events[0].detail.columnLabel).to.equal('Prix');
        });

        it('ignore le clic pendant pending', async () => {
            const el = await fixture<ArTableSort>(html`<ar-table-sort></ar-table-sort>`);
            const events: CustomEvent[] = [];
            el.addEventListener('ar-table-sort-change', (e) => events.push(e as CustomEvent));

            btn(el).click();
            await el.updateComplete;
            btn(el).click();
            await el.updateComplete;

            expect(events).to.have.length(1);
        });
    });

    // ── confirm() ─────────────────────────────────────────────────────────

    describe('confirm()', () => {
        it('avance order et efface pending', async () => {
            const el = await fixture<ArTableSort>(html`<ar-table-sort></ar-table-sort>`);
            btn(el).click();
            await el.updateComplete;

            el.confirm();
            await el.updateComplete;

            expect(el.order).to.equal('asc');
            expect(el.pending).to.equal(false);
        });

        it('met à jour aria-sort sur le <th> parent', async () => {
            const th = await fixture<HTMLTableCellElement>(
                html`<th><ar-table-sort>Prix</ar-table-sort></th>`,
            );
            const el = th.querySelector<ArTableSort>('ar-table-sort')!;
            await el.updateComplete;

            btn(el).click();
            await el.updateComplete;
            el.confirm();
            await el.updateComplete;

            expect(th.getAttribute('aria-sort')).to.equal('ascending');
        });

        it('annonce via aria-live après confirm()', async () => {
            const el = await fixture<ArTableSort>(html`<ar-table-sort>Prix</ar-table-sort>`);
            btn(el).click();
            await el.updateComplete;
            el.confirm();
            await el.updateComplete;

            const live = el.shadowRoot!.querySelector('.live')!;
            expect(live.textContent).to.equal('Prix : tri croissant appliqué');
        });

        it('vide la région live après 150ms', async () => {
            const el = await fixture<ArTableSort>(html`<ar-table-sort>Prix</ar-table-sort>`);
            btn(el).click();
            await el.updateComplete;
            el.confirm();
            await el.updateComplete;
            await aTimeout(200);

            expect(el.shadowRoot!.querySelector('.live')!.textContent).to.equal('');
        });
    });

    // ── reject() ──────────────────────────────────────────────────────────

    describe('reject()', () => {
        it('efface pending sans changer order', async () => {
            const el = await fixture<ArTableSort>(html`<ar-table-sort></ar-table-sort>`);
            btn(el).click();
            await el.updateComplete;

            el.reject();
            await el.updateComplete;

            expect(el.order).to.equal('none');
            expect(el.pending).to.equal(false);
        });
    });

    // ── Clavier ───────────────────────────────────────────────────────────

    describe('clavier', () => {
        it('Enter déclenche ar-table-sort-change', async () => {
            const el = await fixture<ArTableSort>(html`<ar-table-sort></ar-table-sort>`);
            const events: CustomEvent[] = [];
            el.addEventListener('ar-table-sort-change', (e) => events.push(e as CustomEvent));

            btn(el).focus();
            btn(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            await el.updateComplete;

            expect(el.pending).to.equal(true);
        });
    });

    // ── closest('th') ─────────────────────────────────────────────────────

    describe("closest('th')", () => {
        it('met à jour aria-sort même si un wrapper est intercalé', async () => {
            const th = await fixture<HTMLTableCellElement>(
                html`<th>
                    <span><ar-table-sort>Nom</ar-table-sort></span>
                </th>`,
            );
            const el = th.querySelector<ArTableSort>('ar-table-sort')!;
            await el.updateComplete;
            expect(th.getAttribute('aria-sort')).to.equal('none');
        });
    });
});
```

- [ ] **Step 2 : Lancer les tests browser**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test:all 2>&1 | grep -A 30 "ar-table-sort — browser"
```

Expected : tous les tests verts.

- [ ] **Step 3 : Commit**

```bash
git add packages/core/src/components/table-sort/table-sort.browser.test.ts
git commit -m "test(table-sort): tests browser — clic, confirm, reject, aria-live, clavier"
```

---

## Task 6 : Tests accessibilité (WTR + axe)

**Files:**

- Modifier: `packages/core/src/components/table-sort/table-sort.a11y.test.ts`

- [ ] **Step 1 : Écrire les tests a11y**

Remplacer le contenu de `packages/core/src/components/table-sort/table-sort.a11y.test.ts` :

```ts
/// <reference types="mocha" />
import { fixture, html, expect } from '@open-wc/testing';
import type { ArTableSort } from './table-sort.js';
import './table-sort.js';

describe('ar-table-sort — accessibilité', () => {
    // ── Audit axe ─────────────────────────────────────────────────────────

    describe('audit axe', () => {
        it('passe axe dans un <table> complet', async () => {
            const table = await fixture(html`
                <table>
                    <thead>
                        <tr>
                            <th><ar-table-sort type="alpha">Nom</ar-table-sort></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Alice</td>
                        </tr>
                    </tbody>
                </table>
            `);
            await expect(table).to.be.accessible();
        });

        it('passe axe avec order="asc"', async () => {
            const table = await fixture(html`
                <table>
                    <thead>
                        <tr>
                            <th>
                                <ar-table-sort type="numeric" order="asc">Prix</ar-table-sort>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>10</td>
                        </tr>
                    </tbody>
                </table>
            `);
            await expect(table).to.be.accessible();
        });
    });

    // ── aria-sort ─────────────────────────────────────────────────────────

    describe('aria-sort sur le <th>', () => {
        it('aria-sort="none" par défaut', async () => {
            const th = await fixture<HTMLTableCellElement>(
                html`<th><ar-table-sort>Nom</ar-table-sort></th>`,
            );
            expect(th.getAttribute('aria-sort')).to.equal('none');
        });

        it('aria-sort="ascending" quand order="asc"', async () => {
            const th = await fixture<HTMLTableCellElement>(
                html`<th><ar-table-sort order="asc">Nom</ar-table-sort></th>`,
            );
            expect(th.getAttribute('aria-sort')).to.equal('ascending');
        });

        it('aria-sort="descending" quand order="desc"', async () => {
            const th = await fixture<HTMLTableCellElement>(
                html`<th><ar-table-sort order="desc">Nom</ar-table-sort></th>`,
            );
            expect(th.getAttribute('aria-sort')).to.equal('descending');
        });
    });

    // ── scope ─────────────────────────────────────────────────────────────

    describe('scope sur le <th>', () => {
        it('pose scope="col" si absent', async () => {
            const th = await fixture<HTMLTableCellElement>(
                html`<th><ar-table-sort>Nom</ar-table-sort></th>`,
            );
            expect(th.getAttribute('scope')).to.equal('col');
        });

        it('ne remplace pas scope="row" existant', async () => {
            const th = await fixture<HTMLTableCellElement>(
                html`<th scope="row"><ar-table-sort>Nom</ar-table-sort></th>`,
            );
            expect(th.getAttribute('scope')).to.equal('row');
        });
    });

    // ── Structure du bouton ───────────────────────────────────────────────

    describe('bouton', () => {
        it('contient un <button> dans le shadow DOM', async () => {
            const el = await fixture<ArTableSort>(html`<ar-table-sort>Nom</ar-table-sort>`);
            expect(el.shadowRoot!.querySelector('button')).to.not.be.null;
        });

        it('aria-disabled="true" pendant pending', async () => {
            const el = await fixture<ArTableSort>(html`<ar-table-sort>Nom</ar-table-sort>`);
            el.shadowRoot!.querySelector<HTMLElement>('[part="button"]')!.click();
            await el.updateComplete;
            expect(
                el.shadowRoot!.querySelector('[part="button"]')!.getAttribute('aria-disabled'),
            ).to.equal('true');
        });

        it('région aria-live présente et vide au repos', async () => {
            const el = await fixture<ArTableSort>(html`<ar-table-sort>Nom</ar-table-sort>`);
            const live = el.shadowRoot!.querySelector('[aria-live="polite"]');
            expect(live).to.not.be.null;
            expect(live!.textContent).to.equal('');
        });
    });
});
```

- [ ] **Step 2 : Lancer les tests a11y**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run test:all 2>&1 | grep -A 25 "ar-table-sort — accessibilité"
```

Expected : tous les tests verts.

- [ ] **Step 3 : Commit**

```bash
git add packages/core/src/components/table-sort/table-sort.a11y.test.ts
git commit -m "test(table-sort): audit axe, aria-sort, scope, structure bouton"
```

---

## Task 7 : Documentation MDX

**Files:**

- Modifier: `apps/docs/src/content/components/ar-table-sort.mdx`

- [ ] **Step 1 : Écrire la documentation**

Remplacer le contenu de `apps/docs/src/content/components/ar-table-sort.mdx` :

```mdx
---
tagName: ar-table-sort
title: Table Sort
description: Entête de colonne triable accessible — indicateur visuel ↑↓, aria-sort automatique et annonce aria-live contextualisée.
playgroundTemplate: alpha
variants:
    - name: alpha
      label: Alphabétique
      description: |
          Tri alphabétique (A → Z / Z → A). Cliquer sur l'entête émet `ar-table-sort-change`.
          Appeler `confirm()` pour valider le tri ou `reject()` pour annuler.
      html: |
          <table style="border-collapse:collapse;font-family:inherit;">
              <thead>
                  <tr>
                      <th style="padding:.5rem 1rem;text-align:left;border-bottom:1px solid var(--ar-color-border,#e5e7eb);">
                          <ar-table-sort type="alpha" id="demo-alpha">Nom</ar-table-sort>
                      </th>
                  </tr>
              </thead>
              <tbody>
                  <tr><td style="padding:.5rem 1rem;">Alice</td></tr>
                  <tr><td style="padding:.5rem 1rem;">Bob</td></tr>
              </tbody>
          </table>
          <script type="module">
              document.getElementById('demo-alpha').addEventListener('ar-table-sort-change', (e) => {
                  setTimeout(() => e.target.confirm(), 300);
              });
          </script>
    - name: numeric
      label: Numérique
      description: Tri numérique (croissant / décroissant).
      html: |
          <table style="border-collapse:collapse;font-family:inherit;">
              <thead>
                  <tr>
                      <th style="padding:.5rem 1rem;text-align:left;border-bottom:1px solid var(--ar-color-border,#e5e7eb);">
                          <ar-table-sort type="numeric" id="demo-numeric">Prix</ar-table-sort>
                      </th>
                  </tr>
              </thead>
              <tbody>
                  <tr><td style="padding:.5rem 1rem;">10 €</td></tr>
                  <tr><td style="padding:.5rem 1rem;">42 €</td></tr>
              </tbody>
          </table>
          <script type="module">
              document.getElementById('demo-numeric').addEventListener('ar-table-sort-change', (e) => {
                  setTimeout(() => e.target.confirm(), 300);
              });
          </script>
    - name: date
      label: Date
      description: Tri chronologique (plus ancien / plus récent).
      html: |
          <table style="border-collapse:collapse;font-family:inherit;">
              <thead>
                  <tr>
                      <th style="padding:.5rem 1rem;text-align:left;border-bottom:1px solid var(--ar-color-border,#e5e7eb);">
                          <ar-table-sort type="date" id="demo-date">Date</ar-table-sort>
                      </th>
                  </tr>
              </thead>
              <tbody>
                  <tr><td style="padding:.5rem 1rem;">2024-01-15</td></tr>
                  <tr><td style="padding:.5rem 1rem;">2024-06-03</td></tr>
              </tbody>
          </table>
          <script type="module">
              document.getElementById('demo-date').addEventListener('ar-table-sort-change', (e) => {
                  setTimeout(() => e.target.confirm(), 300);
              });
          </script>
    - name: multi
      label: Multi-colonnes
      description: |
          Plusieurs colonnes triables — le consommateur gère la coordination.
          Réinitialiser les autres colonnes (`order="none"`) avant de confirmer la colonne active.
      html: |
          <table style="border-collapse:collapse;font-family:inherit;" id="demo-multi">
              <thead>
                  <tr>
                      <th style="padding:.5rem 1rem;text-align:left;border-bottom:1px solid var(--ar-color-border,#e5e7eb);">
                          <ar-table-sort type="alpha">Nom</ar-table-sort>
                      </th>
                      <th style="padding:.5rem 1rem;text-align:right;border-bottom:1px solid var(--ar-color-border,#e5e7eb);">
                          <ar-table-sort type="numeric">Prix</ar-table-sort>
                      </th>
                  </tr>
              </thead>
              <tbody>
                  <tr>
                      <td style="padding:.5rem 1rem;">Alice</td>
                      <td style="padding:.5rem 1rem;text-align:right;">42 €</td>
                  </tr>
              </tbody>
          </table>
          <script type="module">
              const sorters = document.getElementById('demo-multi').querySelectorAll('ar-table-sort');
              sorters.forEach((sorter) => {
                  sorter.addEventListener('ar-table-sort-change', (e) => {
                      sorters.forEach((s) => { if (s !== e.target) s.order = 'none'; });
                      setTimeout(() => e.target.confirm(), 300);
                  });
              });
          </script>
    - name: reject
      label: Tri en échec
      description: |
          Si le tri échoue, appeler `reject()` — le composant revient à son état précédent
          sans avancer dans le cycle.
      html: |
          <table style="border-collapse:collapse;font-family:inherit;">
              <thead>
                  <tr>
                      <th style="padding:.5rem 1rem;text-align:left;border-bottom:1px solid var(--ar-color-border,#e5e7eb);">
                          <ar-table-sort type="alpha" id="demo-reject">Nom (échec simulé)</ar-table-sort>
                      </th>
                  </tr>
              </thead>
              <tbody>
                  <tr><td style="padding:.5rem 1rem;">Alice</td></tr>
              </tbody>
          </table>
          <script type="module">
              document.getElementById('demo-reject').addEventListener('ar-table-sort-change', (e) => {
                  setTimeout(() => e.target.reject(), 500);
              });
          </script>
---

import WcagRef from '../../components/WcagRef.astro';

## Accessibilité

### Pris en charge automatiquement

- `aria-sort` est posé et mis à jour sur le `<th>` ancêtre à chaque changement confirmé (`none` → `"none"`, `asc` → `"ascending"`, `desc` → `"descending"`).
- `scope="col"` est posé sur le `<th>` ancêtre s'il est absent — ne remplace jamais un `scope` existant.
- Le bouton reçoit `aria-disabled="true"` (pas `disabled`) pendant `pending` — focusable mais bloqué.
- Une région `aria-live="polite"` annonce le résultat après `confirm()` en incluant le nom de colonne : _"Prix : tri croissant appliqué"_, _"Nom : tri supprimé"_.
- <WcagRef
      criterion="1.3.1"
      summary="Info and Relationships : aria-sort et scope encodent la sémantique du tri programmatiquement."
  />
- <WcagRef
      criterion="1.3.3"
      summary="Sensory Characteristics : la direction de tri n'est pas communiquée uniquement par la flèche visuelle."
  />
- <WcagRef
      criterion="2.1.1"
      summary="Keyboard : le bouton interne est activable au clavier (Entrée / Espace)."
  />
- <WcagRef
      criterion="2.4.6"
      summary="Headings and Labels : le nom accessible du bouton décrit l'action suivante."
  />
- <WcagRef criterion="2.4.7" summary="Focus Visible : :focus-visible visible sur le bouton." />
- <WcagRef
      criterion="4.1.2"
      summary="Name, Role, Value : nom (slot + sr-only), rôle (button), état (aria-sort, aria-disabled)."
  />
- <WcagRef
      criterion="4.1.3"
      summary="Status Messages : la région aria-live annonce le résultat du tri sans déplacer le focus."
  />

### Multi-colonnes

`ar-table-sort` ne coordonne pas les colonnes entre elles. Quand une nouvelle colonne est triée, réinitialiser les autres en posant `order="none"` avant d'appeler `confirm()`. Voir la variante **Multi-colonnes** ci-dessus.

### Localisation

Les labels sont en français par défaut. Une infrastructure de localisation (`setLocale()`) est prévue — voir l'issue GitHub correspondante.
```

- [ ] **Step 2 : Vérifier que le build docs tourne sans erreur**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=apps/docs 2>&1 | tail -10
```

Expected : build terminé sans erreur.

- [ ] **Step 3 : Commit**

```bash
git add apps/docs/src/content/components/ar-table-sort.mdx
git commit -m "docs(table-sort): page documentation avec variantes et références WCAG"
```

---

## Task 8 : Issue GitHub i18n

- [ ] **Step 1 : Créer l'issue**

```bash
gh issue create \
  --title "feat: infrastructure i18n — setLocale() + locales CDN" \
  --body "## Contexte

\`ar-table-sort\` embarque des labels accessibles en français hardcodés (labels de tri, annonces aria-live contextualisées). D'autres composants futurs auront le même besoin.

## Objectif

Concevoir une infrastructure i18n légère pour \`@ariane-ui/core\` :

- **\`setLocale(obj)\`** exporté depuis le package — appelé une seule fois au bootstrap
- **Cache module-level** — partagé entre toutes les instances via le singleton ES module
- **Fichiers de locale** livrés avec le package : \`locales/fr.js\` (défaut), \`locales/en.js\` (référence typée)
- **Fallback \`window.ARIANE_I18N\`** pour les usages CDN sans import ES module
- **TypeScript typé** — le consommateur sait exactement quelles clés fournir

## Références

- Design brainstormé lors de l'implémentation de \`ar-table-sort\` (2026-06-02)
- Inspiration : Shoelace \`registerTranslation()\`
- Spec : \`docs/superpowers/specs/2026-06-02-ar-table-sort-design.md\`" \
  --label "enhancement"
```

- [ ] **Step 2 : Vérifier l'issue créée**

```bash
gh issue list --limit 3
```

---

## Vérification finale

- [ ] Tous les tests unitaires passent : `cd /Users/jon/Code/Active_projects/ariane && npm run test`
- [ ] Tous les tests browser et a11y passent : `npm run test:all`
- [ ] Build docs sans erreur : `npm run build --workspace=apps/docs`
- [ ] CEM régénéré sans erreur : `npm run build:manifest`
