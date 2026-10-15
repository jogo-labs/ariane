import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture } from '../test-utils.js';
import { ArianeFormElement } from './ariane-form-element.js';
import { ArianeElement } from './ariane-element.js';

class TestArianeFormElement extends ArianeFormElement {
    resetCalls = 0;
    getInternals() {
        return this.internals;
    }
    isEffectivelyDisabled() {
        return this.effectiveDisabled;
    }
    validateWith(flags: ValidityStateFlags, message?: string, anchor?: HTMLElement) {
        this.setComponentValidity(flags, message, anchor);
    }
    protected override formReset(): void {
        this.resetCalls += 1;
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

    // ── Propriétés partagées ────────────────────────────────────────────────

    it('name, disabled et required sont réfléchis en attributs', async () => {
        el = await fixture<TestArianeFormElement>(
            '<test-ariane-form-element></test-ariane-form-element>',
        );
        el.name = 'champ';
        el.disabled = true;
        el.required = true;
        await el.updateComplete;
        expect(el.getAttribute('name')).toBe('champ');
        expect(el.hasAttribute('disabled')).toBe(true);
        expect(el.hasAttribute('required')).toBe(true);
    });

    it('effectiveDisabled combine disabled et la cascade fieldset (formDisabledCallback)', async () => {
        el = await fixture<TestArianeFormElement>(
            '<test-ariane-form-element></test-ariane-form-element>',
        );
        expect(el.isEffectivelyDisabled()).toBe(false);
        el.formDisabledCallback(true);
        expect(el.isEffectivelyDisabled()).toBe(true);
        el.formDisabledCallback(false);
        el.disabled = true;
        expect(el.isEffectivelyDisabled()).toBe(true);
    });

    it('formResetCallback appelle le crochet formReset()', async () => {
        el = await fixture<TestArianeFormElement>(
            '<test-ariane-form-element></test-ariane-form-element>',
        );
        el.formResetCallback();
        expect(el.resetCalls).toBe(1);
    });

    // ── Délégués de validation ──────────────────────────────────────────────

    describe('sans ElementInternals (happy-dom, avant la connexion)', () => {
        it('les délégués renvoient des valeurs de repli sans lever', async () => {
            el = await fixture<TestArianeFormElement>(
                '<test-ariane-form-element></test-ariane-form-element>',
            );
            expect(el.getInternals()).toBeUndefined();
            expect(el.checkValidity()).toBe(true);
            expect(el.reportValidity()).toBe(true);
            expect(el.validationMessage).toBe('');
            expect(el.willValidate).toBe(false);
            expect(el.form).toBeNull();
            expect(el.labels.length).toBe(0);
            expect(el.validity.valid).toBe(true);
            expect(el.validity.customError).toBe(false);
            expect(() => el.setCustomValidity('x')).not.toThrow();
            expect(() => el.validateWith({ valueMissing: true }, 'requis')).not.toThrow();
        });
    });

    describe('avec ElementInternals', () => {
        interface Fake {
            validity: object;
            validationMessage: string;
            willValidate: boolean;
            form: HTMLFormElement | null;
            labels: NodeList;
            checkValidity: ReturnType<typeof vi.fn>;
            reportValidity: ReturnType<typeof vi.fn>;
            setValidity: ReturnType<typeof vi.fn>;
        }
        let fake: Fake;

        beforeEach(() => {
            fake = {
                validity: { valid: false, valueMissing: true },
                validationMessage: 'message natif',
                willValidate: true,
                form: document.createElement('form'),
                labels: document.createDocumentFragment().childNodes,
                checkValidity: vi.fn(() => false),
                reportValidity: vi.fn(() => false),
                setValidity: vi.fn(),
            };
            (HTMLElement.prototype as unknown as Record<string, unknown>).attachInternals = () =>
                fake;
        });
        afterEach(() => {
            delete (HTMLElement.prototype as unknown as Record<string, unknown>).attachInternals;
        });

        it('délègue chaque membre à ElementInternals', async () => {
            el = await fixture<TestArianeFormElement>(
                '<test-ariane-form-element></test-ariane-form-element>',
            );
            expect(el.validity).toBe(fake.validity);
            expect(el.validationMessage).toBe('message natif');
            expect(el.willValidate).toBe(true);
            expect(el.form).toBe(fake.form);
            expect(el.labels).toBe(fake.labels);
            expect(el.checkValidity()).toBe(false);
            expect(el.reportValidity()).toBe(false);
            expect(fake.checkValidity).toHaveBeenCalledOnce();
            expect(fake.reportValidity).toHaveBeenCalledOnce();
        });

        it('setComponentValidity transmet drapeaux, message et ancre à setValidity', async () => {
            el = await fixture<TestArianeFormElement>(
                '<test-ariane-form-element></test-ariane-form-element>',
            );
            const anchor = document.createElement('input');
            fake.setValidity.mockClear();
            el.validateWith({ valueMissing: true }, 'requis', anchor);
            expect(fake.setValidity).toHaveBeenLastCalledWith(
                { valueMissing: true },
                'requis',
                anchor,
            );
        });

        it('setCustomValidity ajoute customError aux drapeaux du composant et son message prime', async () => {
            el = await fixture<TestArianeFormElement>(
                '<test-ariane-form-element></test-ariane-form-element>',
            );
            el.validateWith({ valueMissing: true }, 'requis');
            el.setCustomValidity('indisponible');
            expect(fake.setValidity).toHaveBeenLastCalledWith(
                { valueMissing: true, customError: true },
                'indisponible',
                undefined,
            );
        });

        it("une nouvelle validation du composant conserve l'erreur personnalisée", async () => {
            el = await fixture<TestArianeFormElement>(
                '<test-ariane-form-element></test-ariane-form-element>',
            );
            el.setCustomValidity('indisponible');
            el.validateWith({}, undefined);
            expect(fake.setValidity).toHaveBeenLastCalledWith(
                { customError: true },
                'indisponible',
                undefined,
            );
        });

        it("setCustomValidity('') retire l'erreur personnalisée et rétablit l'état du composant", async () => {
            el = await fixture<TestArianeFormElement>(
                '<test-ariane-form-element></test-ariane-form-element>',
            );
            el.validateWith({ valueMissing: true }, 'requis');
            el.setCustomValidity('indisponible');
            el.setCustomValidity('');
            expect(fake.setValidity).toHaveBeenLastCalledWith(
                { valueMissing: true },
                'requis',
                undefined,
            );
        });

        it("applique à la connexion une erreur personnalisée posée avant l'attache d'internals", async () => {
            const detached = document.createElement(
                'test-ariane-form-element',
            ) as TestArianeFormElement;
            detached.setCustomValidity('tôt');
            document.body.append(detached);
            el = detached;
            await el.updateComplete;
            expect(fake.setValidity).toHaveBeenLastCalledWith(
                { customError: true },
                'tôt',
                undefined,
            );
        });
    });
});
