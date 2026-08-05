/// <reference types="mocha" />
/**
 * pagination.browser.test.ts
 *
 * Tests nécessitant un vrai browser (Chromium via @web/test-runner) :
 *   - Focus + :focus-visible après activation d'un lien de page (#154),
 *     vérifiable uniquement avec un vrai `:focus-visible` (absent de happy-dom).
 */
import { fixture, html, expect, elementUpdated } from '@open-wc/testing';
import './index.js';

describe('ar-pagination — browser', () => {
    describe('focus après activation (#154)', () => {
        // Vérifie que le focus atterrit sur le nouvel élément part="current" et que
        // :focus-visible matche après un focus() + click() programmatiques. Ne vérifie PAS
        // l'ordre de tabulation réel ni la distinction clavier/souris — nécessiterait
        // @web/test-runner-commands (sendKeys/sendMouse), non installé, hors scope de ce
        // correctif.
        it('focalise le nouvel élément part="current" et :focus-visible matche après activation', async () => {
            const el = await fixture(html`<ar-pagination current="1" total="5"></ar-pagination>`);
            const shadowRoot = el.shadowRoot as ShadowRoot;
            const pageLink = shadowRoot.querySelector(
                '[data-ar-pagination-page="3"]',
            ) as HTMLElement;

            pageLink.focus();
            pageLink.click();
            await elementUpdated(el);

            const current = shadowRoot.querySelector('[part~="current"]') as HTMLElement;
            expect(shadowRoot.activeElement).to.equal(current);
            expect(current.matches(':focus-visible')).to.equal(true);
        });
    });
});
