/// <reference types="mocha" />
import { fixture, html, expect } from '@open-wc/testing';
import type { ArTableSort } from './table-sort.js';
import './index.js';

function btn(el: ArTableSort): HTMLButtonElement {
    const b = el.shadowRoot?.querySelector<HTMLButtonElement>('[part~="sort-button"]');
    if (!b) throw new Error('part="sort-button" introuvable');
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
            await new Promise((resolve) => setTimeout(resolve, 60));

            const live = document.querySelector('[data-ar-live-region="polite"]')!;
            expect(live.textContent).to.equal('Prix : tri croissant appliqué');
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

    // ── font-weight du tooltip interne (régression #168) ────────────────────

    describe('font-weight du tooltip interne', () => {
        it("le tooltip n'hérite pas du bold par défaut d'un <th>, le libellé de colonne si", async () => {
            const th = await fixture<HTMLTableCellElement>(
                html`<th>
                    <ar-table-sort><span id="label">Nom</span></ar-table-sort>
                </th>`,
            );
            const el = th.querySelector<ArTableSort>('ar-table-sort')!;
            await el.updateComplete;

            const label = th.querySelector<HTMLElement>('#label')!;
            expect(getComputedStyle(label).fontWeight).to.equal('700');

            const tooltip = el.shadowRoot?.querySelector('ar-tooltip');
            if (!tooltip) throw new Error('ar-tooltip introuvable');
            expect(getComputedStyle(tooltip).fontWeight).to.equal('400');
        });
    });
});
