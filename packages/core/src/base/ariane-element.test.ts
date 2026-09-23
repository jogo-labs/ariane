import { LitElement } from 'lit';
import { afterEach, describe, expect, it } from 'vitest';
import { fixture } from '../test-utils.js';
import { ArianeElement } from './ariane-element.js';

class TestArianeElement extends ArianeElement {
    getInternals() {
        return this.internals;
    }
    callToggleState(name: string, active: boolean) {
        this.toggleState(name, active);
    }
}
if (!customElements.get('test-ariane-element')) {
    customElements.define('test-ariane-element', TestArianeElement);
}

describe('ArianeElement', () => {
    let el: TestArianeElement;

    afterEach(() => el?.remove());

    it('est bien une LitElement', async () => {
        el = await fixture<TestArianeElement>('<test-ariane-element></test-ariane-element>');
        expect(el).toBeInstanceOf(LitElement);
    });

    it("connectedCallback() n'échoue pas même quand attachInternals() est absent (happy-dom)", async () => {
        // happy-dom n'implémente pas du tout attachInternals() — this.internals reste
        // undefined ici, contrairement à un vrai navigateur (couvert par
        // ariane-element.browser.test.ts). Le point testé est l'absence d'exception.
        el = await fixture<TestArianeElement>('<test-ariane-element></test-ariane-element>');
        expect(el.getInternals()).toBeUndefined();
    });

    it("toggleState() ne lève pas d'erreur quand this.internals est undefined", async () => {
        el = await fixture<TestArianeElement>('<test-ariane-element></test-ariane-element>');
        expect(() => el.callToggleState('open', true)).not.toThrow();
        expect(() => el.callToggleState('open', false)).not.toThrow();
    });

    it("survit à une déconnexion puis reconnexion sans lever d'erreur", async () => {
        el = await fixture<TestArianeElement>('<test-ariane-element></test-ariane-element>');
        const parent = el.parentElement as HTMLElement;
        parent.removeChild(el);
        parent.appendChild(el);
        expect(() => el.callToggleState('open', true)).not.toThrow();
    });
});
