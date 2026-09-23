/// <reference types="mocha" />
/**
 * charcounter.browser.test.ts
 *
 * Tests nécessitant un vrai browser (Chromium via @web/test-runner) :
 *   - :state() (ElementInternals.states, non implémenté par jsdom/Vitest)
 */
import { fixture, html, expect } from '@open-wc/testing';
import type { ArCharcounter } from './charcounter.js';
import './index.js';

function setValue(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
}

describe('ar-charcounter — browser', () => {
    let wrapper: HTMLElement;

    afterEach(() => wrapper?.remove());

    // ── :state() cumulés (généralisation #251) ────────────────────────────────

    describe(':state() cumulés (warning/error)', () => {
        it('expose :state(warning)/:state(error) selon le nombre de caractères restants', async () => {
            wrapper = await fixture(html`
                <div>
                    <input id="field" />
                    <ar-charcounter for="field" max="10" warn-threshold="3"></ar-charcounter>
                </div>
            `);
            const input = wrapper.querySelector<HTMLInputElement>('#field')!;
            const el = wrapper.querySelector<ArCharcounter>('ar-charcounter')!;
            await el.updateComplete;

            expect(el.matches(':state(warning)')).to.equal(false);
            expect(el.matches(':state(error)')).to.equal(false);

            setValue(input, '12345678'); // 2 restants (<= warn-threshold 3)
            await el.updateComplete;
            expect(el.matches(':state(warning)')).to.equal(true);
            expect(el.matches(':state(error)')).to.equal(false);

            setValue(input, '12345678901'); // dépasse max=10
            await el.updateComplete;
            expect(el.matches(':state(warning)')).to.equal(false);
            expect(el.matches(':state(error)')).to.equal(true);

            setValue(input, '123'); // retour à l'état normal
            await el.updateComplete;
            expect(el.matches(':state(warning)')).to.equal(false);
            expect(el.matches(':state(error)')).to.equal(false);
        });
    });
});
