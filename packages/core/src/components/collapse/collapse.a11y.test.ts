/// <reference types="mocha" />
import { fixture, html, expect } from '@open-wc/testing';
import type { ArCollapse } from './collapse.js';
import './collapse.js';

describe('ar-collapse — accessibilité', () => {
    let el: ArCollapse;

    afterEach(() => {
        el?.remove();
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
            const btn = document.createElement('button');
            btn.id = 'ext-a11y';
            btn.textContent = 'Btn';
            document.body.appendChild(btn);
            el = await fixture(html`<ar-collapse id="panel-a11y" for="ext-a11y"></ar-collapse>`);
            expect(btn.getAttribute('aria-expanded')).to.equal('false');
            expect(btn.getAttribute('aria-controls')).to.equal('panel-a11y');
            btn.remove();
        });
    });
});
