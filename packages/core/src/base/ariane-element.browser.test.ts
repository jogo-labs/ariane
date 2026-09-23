/// <reference types="mocha" />
/**
 * ariane-element.browser.test.ts
 *
 * Tests nécessitant un vrai browser (Chromium via @web/test-runner) :
 *   - :state() (ElementInternals.states, non implémenté par happy-dom/Vitest)
 */
import { fixture, expect } from '@open-wc/testing';
import { ArianeElement } from './ariane-element.js';

class TestArianeElementBrowser extends ArianeElement {
    callToggleState(name: string, active: boolean) {
        this.toggleState(name, active);
    }
}
if (!customElements.get('test-ariane-element-browser')) {
    customElements.define('test-ariane-element-browser', TestArianeElementBrowser);
}

describe('ArianeElement — browser', () => {
    it('toggleState(name, true) rend :state(name) matchable, false le retire', async () => {
        const el = await fixture<TestArianeElementBrowser>(
            '<test-ariane-element-browser></test-ariane-element-browser>',
        );
        expect(el.matches(':state(open)')).to.equal(false);

        el.callToggleState('open', true);
        expect(el.matches(':state(open)')).to.equal(true);

        el.callToggleState('open', false);
        expect(el.matches(':state(open)')).to.equal(false);
    });

    it('deux états sont indépendants', async () => {
        const el = await fixture<TestArianeElementBrowser>(
            '<test-ariane-element-browser></test-ariane-element-browser>',
        );
        el.callToggleState('open', true);
        el.callToggleState('disabled', true);
        expect(el.matches(':state(open)')).to.equal(true);
        expect(el.matches(':state(disabled)')).to.equal(true);

        el.callToggleState('open', false);
        expect(el.matches(':state(open)')).to.equal(false);
        expect(el.matches(':state(disabled)')).to.equal(true);
    });
});
