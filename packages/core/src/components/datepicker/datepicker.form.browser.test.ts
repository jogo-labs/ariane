/// <reference types="mocha" />
/**
 * Comportement de formulaire d'ar-datepicker dans un vrai navigateur : `FormData`, `form.reset()`,
 * API de validation, erreur personnalisée, fieldset, labels (#325).
 */
import { expect, fixture } from '@open-wc/testing';
import type { ArDatepicker } from './datepicker.js';
import './index.js';

document.documentElement.lang = 'fr';

async function mount(markup: string): Promise<{ form: HTMLFormElement; el: ArDatepicker }> {
    const form = await fixture<HTMLFormElement>(`<form>${markup}</form>`);
    const el = form.querySelector<ArDatepicker>('ar-datepicker')!;
    await el.updateComplete;
    return { form, el };
}

describe('ar-datepicker — formulaire', () => {
    describe('name', () => {
        it('posé en propriété (React 19), la valeur entre dans FormData', async () => {
            const form = await fixture<HTMLFormElement>('<form></form>');
            const el = document.createElement('ar-datepicker') as ArDatepicker;
            el.name = 'date';
            el.value = '2026-03-15';
            form.append(el);
            await el.updateComplete;
            expect(el.getAttribute('name')).to.equal('date');
            expect(new FormData(form).get('date')).to.equal('2026-03-15');
        });

        it('un <fieldset disabled> exclut la valeur de FormData', async () => {
            const { form } = await mount(
                '<fieldset disabled><ar-datepicker name="d" value="2026-03-15"></ar-datepicker></fieldset>',
            );
            expect(new FormData(form).get('d')).to.equal(null);
        });
    });

    describe('form.reset()', () => {
        it("restaure la valeur initiale posée par l'attribut, texte de saisie compris", async () => {
            const { form, el } = await mount(
                '<ar-datepicker name="d" value="2026-05-01"></ar-datepicker>',
            );
            el.value = '2026-06-02';
            await el.updateComplete;
            form.reset();
            await el.updateComplete;
            expect(el.value).to.equal('2026-05-01');
            expect(new FormData(form).get('d')).to.equal('2026-05-01');
            expect(el.inputElement.value).to.equal('01/05/2026');
        });

        it('restaure la valeur posée par propriété avant le premier rendu', async () => {
            const form = await fixture<HTMLFormElement>('<form></form>');
            const el = document.createElement('ar-datepicker') as ArDatepicker;
            el.name = 'd';
            el.value = '2026-01-10';
            form.append(el);
            await el.updateComplete;
            el.value = '2026-02-20';
            await el.updateComplete;
            form.reset();
            await el.updateComplete;
            expect(el.value).to.equal('2026-01-10');
        });

        it('revient à vide quand la valeur initiale est vide, et efface le texte saisi', async () => {
            const { form, el } = await mount('<ar-datepicker name="d"></ar-datepicker>');
            el.inputElement.value = '12/06/20';
            el.value = '2026-06-12';
            await el.updateComplete;
            form.reset();
            await el.updateComplete;
            expect(el.value).to.equal('');
            expect(el.inputElement.value).to.equal('');
            expect(new FormData(form).get('d')).to.equal(null);
        });

        it('ne change ni la validité personnalisée ni les événements', async () => {
            const { form, el } = await mount('<ar-datepicker name="d"></ar-datepicker>');
            let events = 0;
            el.addEventListener('ar-datepicker-input-change', () => (events += 1));
            el.setCustomValidity('Date indisponible');
            form.reset();
            await el.updateComplete;
            expect(el.validity.customError).to.equal(true);
            expect(events).to.equal(0);
        });
    });

    describe('form.reset() avec le panneau ouvert', () => {
        it('ferme le panneau avec ses événements habituels, sans événement de valeur', async () => {
            const { form, el } = await mount(
                '<ar-datepicker name="d" value="2026-05-01"></ar-datepicker>',
            );
            el.value = '2026-06-02';
            el.open = true;
            await el.updateComplete;
            await new Promise((resolve) => setTimeout(resolve, 100));
            const seen: string[] = [];
            for (const name of [
                'ar-datepicker-input-change',
                'ar-datepicker-input-complete',
                'ar-datepicker-hide',
                'ar-datepicker-hidden',
            ]) {
                el.addEventListener(name, () => seen.push(name));
            }
            form.reset();
            await el.updateComplete;
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(el.open).to.equal(false);
            expect(seen).to.not.include('ar-datepicker-input-change');
            expect(seen).to.not.include('ar-datepicker-input-complete');
            expect(seen).to.include('ar-datepicker-hide');
            expect(seen).to.include('ar-datepicker-hidden');
        });
    });

    describe('API de validation', () => {
        it('un champ obligatoire vide est invalide, avec le message localisé', async () => {
            const { form, el } = await mount('<ar-datepicker required></ar-datepicker>');
            expect(el.willValidate).to.equal(true);
            expect(el.checkValidity()).to.equal(false);
            expect(el.validity.valueMissing).to.equal(true);
            expect(el.validationMessage).to.equal('Veuillez renseigner ce champ.');
            expect(el.form).to.equal(form);
            el.value = '2026-06-12';
            await el.updateComplete;
            expect(el.checkValidity()).to.equal(true);
            expect(el.validationMessage).to.equal('');
        });

        it("labels renvoie le <label for> associé à l'hôte", async () => {
            const { el } = await mount(
                '<label for="dp-test">Date</label><ar-datepicker id="dp-test"></ar-datepicker>',
            );
            expect(el.labels.length).to.equal(1);
            expect((el.labels[0] as HTMLElement).textContent).to.equal('Date');
        });
    });

    describe('setCustomValidity', () => {
        it('rend le champ invalide, survit à une revalidation du composant, se retire avec une chaîne vide', async () => {
            const { form, el } = await mount('<ar-datepicker name="d"></ar-datepicker>');
            el.setCustomValidity('Date indisponible');
            expect(el.validity.customError).to.equal(true);
            expect(el.validationMessage).to.equal('Date indisponible');
            expect(form.checkValidity()).to.equal(false);

            // Revalidation par le composant (changement de valeur) : l'erreur personnalisée reste.
            el.value = '2026-06-12';
            await el.updateComplete;
            expect(el.validity.customError).to.equal(true);

            el.setCustomValidity('');
            expect(el.validity.customError).to.equal(false);
            expect(el.checkValidity()).to.equal(true);
        });

        it("s'ajoute au drapeau valueMissing sans le remplacer, et le message personnalisé prime", async () => {
            const { el } = await mount('<ar-datepicker required></ar-datepicker>');
            el.setCustomValidity('Choisissez une date ouvrée');
            expect(el.validity.valueMissing).to.equal(true);
            expect(el.validity.customError).to.equal(true);
            expect(el.validationMessage).to.equal('Choisissez une date ouvrée');
            el.setCustomValidity('');
            expect(el.validity.valueMissing).to.equal(true);
            expect(el.validationMessage).to.equal('Veuillez renseigner ce champ.');
        });
    });
});
