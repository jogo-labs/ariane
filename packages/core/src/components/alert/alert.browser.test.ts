/// <reference types="mocha" />
/**
 * alert.browser.test.ts
 *
 * Tests nécessitant un vrai browser (Chromium via @web/test-runner) :
 *   - :state() (ElementInternals.states, non implémenté par happy-dom/Vitest)
 */
import { fixture, html, expect } from '@open-wc/testing';
import type { ArAlert } from './alert.js';
import './index.js';

// _shouldAnimate() lit transitionDuration via getComputedStyle : sans thème chargé, elle vaut 0
// et _hide() appelle _finishHide() immédiatement (état hiding retombe à false sans laisser de
// fenêtre observable). On injecte une vraie transition pour forcer le chemin "attend
// transitionend" — même technique que collapse.browser.test.ts.
let styleEl: HTMLStyleElement;
before(() => {
    styleEl = document.createElement('style');
    styleEl.textContent = 'ar-alert { transition: opacity 100ms ease; }';
    document.head.appendChild(styleEl);
});
after(() => styleEl.remove());

describe('ar-alert — browser', () => {
    let el: ArAlert;

    afterEach(() => el?.remove());

    // ── :state(hiding) cumulé (généralisation #251) ───────────────────────────

    describe(':state(hiding)', () => {
        it('passe à true à la fermeture, tant que la transition est en cours', async () => {
            const target = document.createElement('button');
            target.id = 'target';
            document.body.appendChild(target);

            el = await fixture(html`<ar-alert next-focus="target">Message</ar-alert>`);
            expect(el.matches(':state(hiding)')).to.equal(false);

            const closeButton =
                el.shadowRoot!.querySelector<HTMLButtonElement>('[part~="close-button"]')!;
            closeButton.click();
            await el.updateComplete;

            expect(el.matches(':state(hiding)')).to.equal(true);

            target.remove();
        });
    });
});
