import { LitElement } from 'lit';
import { afterEach, describe, expect, it } from 'vitest';
import { fixture } from '../test-utils.js';
import { InternalsStatesController } from './internals-states.controller.js';

class TestInternalsStatesHost extends LitElement {
    readonly states = new InternalsStatesController(this);
}
if (!customElements.get('test-internals-states-host')) {
    customElements.define('test-internals-states-host', TestInternalsStatesHost);
}

describe('InternalsStatesController', () => {
    let el: TestInternalsStatesHost;

    afterEach(() => el?.remove());

    it("appelle attachInternals() à la connexion sans lever d'erreur", async () => {
        el = await fixture<TestInternalsStatesHost>(
            '<test-internals-states-host></test-internals-states-host>',
        );
        expect(el).not.toBeNull();
    });

    it("toggle() ne lève pas d'erreur même si internals.states est absent (jsdom)", async () => {
        el = await fixture<TestInternalsStatesHost>(
            '<test-internals-states-host></test-internals-states-host>',
        );
        expect(() => el.states.toggle('open', true)).not.toThrow();
        expect(() => el.states.toggle('open', false)).not.toThrow();
    });

    it('survit à une déconnexion puis reconnexion (attachInternals() une seule fois)', async () => {
        el = await fixture<TestInternalsStatesHost>(
            '<test-internals-states-host></test-internals-states-host>',
        );
        const parent = el.parentElement as HTMLElement;
        parent.removeChild(el);
        parent.appendChild(el);
        expect(() => el.states.toggle('open', true)).not.toThrow();
    });
});
