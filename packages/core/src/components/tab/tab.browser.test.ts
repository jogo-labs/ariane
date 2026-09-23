/// <reference types="mocha" />
/**
 * tab.browser.test.ts
 *
 * Tests nécessitant un vrai browser (Chromium via @web/test-runner) :
 *   - :state() (ElementInternals.states, non implémenté par jsdom/Vitest)
 */
import { fixture, html, expect } from '@open-wc/testing';
import type { ArTab } from './tab.js';
import './index.js';

describe('ar-tab — browser', () => {
    let el: ArTab;

    afterEach(() => el?.remove());

    // ── :state() cumulés (généralisation #251) ────────────────────────────────

    describe(':state() cumulés (disabled/active)', () => {
        it('expose :state(disabled) synchronisé avec disabled', async () => {
            el = await fixture(html`<ar-tab panel="a">A</ar-tab>`);
            expect(el.matches(':state(disabled)')).to.equal(false);

            el.disabled = true;
            await el.updateComplete;
            expect(el.matches(':state(disabled)')).to.equal(true);
        });

        it('expose :state(active) synchronisé avec active', async () => {
            el = await fixture(html`<ar-tab panel="a">A</ar-tab>`);
            expect(el.matches(':state(active)')).to.equal(false);

            el.active = true;
            await el.updateComplete;
            expect(el.matches(':state(active)')).to.equal(true);
        });
    });
});
