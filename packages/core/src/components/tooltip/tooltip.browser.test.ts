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
