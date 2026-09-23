/// <reference types="mocha" />
/**
 * internals-states.controller.browser.test.ts
 *
 * Tests nécessitant un vrai browser (Chromium via @web/test-runner) :
 *   - :state() (ElementInternals.states, non implémenté par jsdom/Vitest)
 */
import { LitElement } from 'lit';
import { fixture, expect } from '@open-wc/testing';
import { InternalsStatesController } from './internals-states.controller.js';

class TestInternalsStatesBrowserHost extends LitElement {
    readonly states = new InternalsStatesController(this);
}
if (!customElements.get('test-internals-states-browser-host')) {
    customElements.define('test-internals-states-browser-host', TestInternalsStatesBrowserHost);
}

describe('InternalsStatesController — browser', () => {
    it('toggle(name, true) rend :state(name) matchable, toggle(name, false) le retire', async () => {
        const el = await fixture<TestInternalsStatesBrowserHost>(
            '<test-internals-states-browser-host></test-internals-states-browser-host>',
        );
        expect(el.matches(':state(open)')).to.equal(false);

        el.states.toggle('open', true);
        expect(el.matches(':state(open)')).to.equal(true);

        el.states.toggle('open', false);
        expect(el.matches(':state(open)')).to.equal(false);
    });

    it('deux états sont indépendants', async () => {
        const el = await fixture<TestInternalsStatesBrowserHost>(
            '<test-internals-states-browser-host></test-internals-states-browser-host>',
        );
        el.states.toggle('open', true);
        el.states.toggle('disabled', true);
        expect(el.matches(':state(open)')).to.equal(true);
        expect(el.matches(':state(disabled)')).to.equal(true);

        el.states.toggle('open', false);
        expect(el.matches(':state(open)')).to.equal(false);
        expect(el.matches(':state(disabled)')).to.equal(true);
    });
});
