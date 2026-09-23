import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixture } from '../test-utils.js';
import { ArianeFormElement } from './ariane-form-element.js';
import { ArianeElement } from './ariane-element.js';

class TestArianeFormElement extends ArianeFormElement {
    getInternals() {
        return this.internals;
    }
}
if (!customElements.get('test-ariane-form-element')) {
    customElements.define('test-ariane-form-element', TestArianeFormElement);
}

describe('ArianeFormElement', () => {
    let el: TestArianeFormElement;

    afterEach(() => el?.remove());

    it('hérite bien de ArianeElement', async () => {
        el = await fixture<TestArianeFormElement>(
            '<test-ariane-form-element></test-ariane-form-element>',
        );
        expect(el).toBeInstanceOf(ArianeElement);
    });

    it('pose formAssociated = true (hérité, sans le redéclarer dans la sous-classe)', () => {
        expect(TestArianeFormElement.formAssociated).toBe(true);
    });

    // happy-dom n'implémente pas attachInternals() (cf. datepicker.test.ts) — on l'injecte
    // temporairement sur HTMLElement.prototype pour vérifier que this.internals (hérité
    // d'ArianeElement) est bien exploitable pour setFormValue()/setValidity() sans wrapper
    // dédié, une fois attachInternals() disponible (cas réel : tout vrai navigateur).
    it('this.internals expose setFormValue()/setValidity() une fois attachInternals() disponible', async () => {
        const setFormValueSpy = vi.fn();
        const setValiditySpy = vi.fn();
        const fakeInternals = { setFormValue: setFormValueSpy, setValidity: setValiditySpy };
        (HTMLElement.prototype as unknown as Record<string, unknown>).attachInternals = () =>
            fakeInternals;

        el = await fixture<TestArianeFormElement>(
            '<test-ariane-form-element></test-ariane-form-element>',
        );
        const internals = el.getInternals();
        expect(internals).toBe(fakeInternals);

        internals?.setFormValue('valeur');
        internals?.setValidity({});
        expect(setFormValueSpy).toHaveBeenCalledWith('valeur');
        expect(setValiditySpy).toHaveBeenCalledWith({});

        delete (HTMLElement.prototype as unknown as Record<string, unknown>).attachInternals;
    });
});
