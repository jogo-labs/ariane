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
