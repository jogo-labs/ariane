/// <reference types="mocha" />
import { fixture, html, expect } from '@open-wc/testing';
import type { ArCharcounter } from './charcounter.js';
import './charcounter.js';

describe('ar-charcounter — accessibilité', () => {
    // ── Audit axe ─────────────────────────────────────────────────────────

    describe('audit axe', () => {
        it('passe axe sans aria-describedby consumer (géré automatiquement)', async () => {
            const container = await fixture(html`
                <div>
                    <label for="field">Commentaire</label>
                    <textarea id="field"></textarea>
                    <ar-charcounter for="field" max="200"></ar-charcounter>
                </div>
            `);
            await expect(container).to.be.accessible();
        });

        it('passe axe avec aria-describedby consumer explicite', async () => {
            const container = await fixture(html`
                <div>
                    <label for="field1">Commentaire</label>
                    <textarea id="field1" aria-describedby="counter1"></textarea>
                    <ar-charcounter id="counter1" for="field1" max="200"></ar-charcounter>
                </div>
            `);
            await expect(container).to.be.accessible();
        });

        it('passe axe en état warning', async () => {
            const container = await fixture(html`
                <div>
                    <label for="field2">Commentaire</label>
                    <textarea id="field2">${'x'.repeat(165)}</textarea>
                    <ar-charcounter for="field2" max="200"></ar-charcounter>
                </div>
            `);
            await expect(container).to.be.accessible();
        });
    });

    // ── Annonces SR ───────────────────────────────────────────────────────

    describe('announceA11y aux transitions', () => {
        it('annonce le seuil warning (polite)', async () => {
            const el = await fixture<ArCharcounter>(html`
                <div>
                    <textarea id="fa"></textarea>
                    <ar-charcounter for="fa" max="10" warn-threshold="1"></ar-charcounter>
                </div>
            `);
            const counter = el.querySelector<ArCharcounter>('ar-charcounter')!;
            const field = el.querySelector<HTMLTextAreaElement>('textarea')!;

            field.value = 'xxxxxxxxxx';
            field.dispatchEvent(new Event('input'));
            await counter.updateComplete;

            await new Promise((r) => setTimeout(r, 80));
            const region = document.getElementById('ar-live-region-polite');
            expect(region?.textContent?.trim()).to.equal('0 caractères restants');
        });

        it('annonce "Limite dépassée" en assertive', async () => {
            const el = await fixture<ArCharcounter>(html`
                <div>
                    <textarea id="fb"></textarea>
                    <ar-charcounter for="fb" max="5" warn-threshold="0"></ar-charcounter>
                </div>
            `);
            const counter = el.querySelector<ArCharcounter>('ar-charcounter')!;
            const field = el.querySelector<HTMLTextAreaElement>('textarea')!;

            field.value = 'xxxxxx';
            field.dispatchEvent(new Event('input'));
            await counter.updateComplete;

            await new Promise((r) => setTimeout(r, 80));
            const region = document.getElementById('ar-live-region-assertive');
            expect(region?.textContent?.trim()).to.equal('Limite dépassée de 1 caractère');
        });

        it('met à jour la région assertive à chaque frappe en état error', async () => {
            const el = await fixture<ArCharcounter>(html`
                <div>
                    <textarea id="fc2"></textarea>
                    <ar-charcounter for="fc2" max="5" warn-threshold="0"></ar-charcounter>
                </div>
            `);
            const counter = el.querySelector<ArCharcounter>('ar-charcounter')!;
            const field = el.querySelector<HTMLTextAreaElement>('textarea')!;

            field.value = 'xxxxxx';
            field.dispatchEvent(new Event('input'));
            await counter.updateComplete;
            await new Promise((r) => setTimeout(r, 80));

            field.value = 'xxxxxxxx';
            field.dispatchEvent(new Event('input'));
            await counter.updateComplete;
            await new Promise((r) => setTimeout(r, 80));

            const region = document.getElementById('ar-live-region-assertive');
            expect(region?.textContent?.trim()).to.equal('Limite dépassée de 3 caractères');
        });
    });

    // ── Parts shadow DOM ──────────────────────────────────────────────────

    describe('parts shadow DOM', () => {
        it('expose part="container"', async () => {
            const el = await fixture<ArCharcounter>(html`
                <div>
                    <textarea id="fc"></textarea>
                    <ar-charcounter for="fc" max="100"></ar-charcounter>
                </div>
            `);
            const counter = el.querySelector<ArCharcounter>('ar-charcounter')!;
            expect(counter.shadowRoot!.querySelector('[part="container"]')).to.not.equal(null);
        });
    });
});
