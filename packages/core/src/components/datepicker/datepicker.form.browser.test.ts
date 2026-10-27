/// <reference types="mocha" />
/**
 * Comportement de formulaire d'ar-datepicker dans un vrai navigateur : `FormData`, `form.reset()`,
 * API de validation, erreur personnalisée, fieldset, labels (#325).
 */
import { expect, fixture } from '@open-wc/testing';
import { sendKeys } from '@web/test-runner-commands';
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

    describe('has-error, user-invalid, aria-invalid et badInput (#404)', () => {
        const settle = async (el: ArDatepicker): Promise<void> => {
            await el.updateComplete;
            await el.updateComplete;
        };
        const typeAndBlur = async (el: ArDatepicker, text: string): Promise<void> => {
            el.inputElement.focus();
            await sendKeys({ type: text });
            el.inputElement.blur();
            await settle(el);
        };
        const errorPart = (el: ArDatepicker): HTMLElement | null =>
            el.shadowRoot!.querySelector<HTMLElement>('[part="error"]');

        it('un champ obligatoire vide au chargement : ni user-invalid, ni has-error, ni aria-invalid', async () => {
            const { el } = await mount('<ar-datepicker required></ar-datepicker>');
            expect(el.matches(':state(user-invalid)')).to.equal(false);
            expect(el.matches(':state(has-error)')).to.equal(false);
            expect(el.inputElement.hasAttribute('aria-invalid')).to.equal(false);
        });

        it("un champ obligatoire vidé puis quitté est user-invalid et aria-invalid, sans has-error ni élément d'erreur", async () => {
            const { el } = await mount('<ar-datepicker required></ar-datepicker>');
            el.inputElement.focus();
            await sendKeys({ type: '1' });
            await sendKeys({ press: 'Backspace' });
            el.inputElement.blur();
            await settle(el);
            expect(el.matches(':state(user-invalid)')).to.equal(true);
            expect(el.inputElement.getAttribute('aria-invalid')).to.equal('true');
            expect(el.matches(':state(has-error)')).to.equal(false);
            expect(errorPart(el)).to.equal(null);
        });

        it("un slot error rempli pose has-error et aria-invalid dès le chargement, et se lie à l'input", async () => {
            const { el } = await mount(
                '<ar-datepicker><span slot="error">Message applicatif</span></ar-datepicker>',
            );
            expect(el.matches(':state(has-error)')).to.equal(true);
            expect(el.matches(':state(user-invalid)')).to.equal(false);
            expect(el.inputElement.getAttribute('aria-invalid')).to.equal('true');
            expect(el.inputElement.getAttribute('aria-describedby')).to.contain(errorPart(el)!.id);
            expect(errorPart(el)!.hasAttribute('role')).to.equal(false);
        });

        it('un texte non reconnu pose badInput et user-invalid, et garde le texte', async () => {
            const { form, el } = await mount('<ar-datepicker name="d"></ar-datepicker>');
            await typeAndBlur(el, 'abc');
            expect(el.validity.badInput).to.equal(true);
            expect(form.checkValidity()).to.equal(false);
            expect(el.value).to.equal('');
            expect(el.inputElement.value).to.equal('abc');
            expect(el.matches(':state(user-invalid)')).to.equal(true);
            expect(el.matches(':state(has-error)')).to.equal(false);
            expect(el.inputElement.getAttribute('aria-invalid')).to.equal('true');
            expect(el.validationMessage).to.equal(
                `Date non reconnue. Format attendu : dd/MM/yyyy (ex. 31/12/${new Date().getFullYear()}).`,
            );
        });

        it('le texte non reconnu est conservé aussi quand le champ avait une valeur', async () => {
            const { el } = await mount('<ar-datepicker value="2026-06-12"></ar-datepicker>');
            el.inputElement.focus();
            el.inputElement.select();
            await sendKeys({ type: 'abc' });
            el.inputElement.blur();
            await settle(el);
            expect(el.value).to.equal('');
            expect(el.inputElement.value).to.equal('abc');
            expect(el.validity.badInput).to.equal(true);
        });

        it('corriger la saisie retire badInput, user-invalid et aria-invalid', async () => {
            const { el } = await mount('<ar-datepicker></ar-datepicker>');
            await typeAndBlur(el, 'abc');
            expect(el.validity.badInput).to.equal(true);
            el.inputElement.focus();
            el.inputElement.select();
            await sendKeys({ type: '12/06/2026' });
            el.inputElement.blur();
            await settle(el);
            expect(el.validity.badInput).to.equal(false);
            expect(el.value).to.equal('2026-06-12');
            expect(el.matches(':state(user-invalid)')).to.equal(false);
            expect(el.inputElement.hasAttribute('aria-invalid')).to.equal(false);
        });

        it('une date hors plage saisie est user-invalid et reste une date plausible', async () => {
            const { el } = await mount('<ar-datepicker min="2026-06-01"></ar-datepicker>');
            let valid: boolean | undefined;
            el.addEventListener('ar-datepicker-input-complete', (e) => {
                valid = (e as CustomEvent).detail.valid;
            });
            await typeAndBlur(el, '01/01/2026');
            expect(valid).to.equal(true);
            expect(el.validity.rangeUnderflow).to.equal(true);
            expect(el.matches(':state(user-invalid)')).to.equal(true);
        });

        it('setCustomValidity rend le champ user-invalid une fois touché, et se retire', async () => {
            const { el } = await mount('<ar-datepicker name="d"></ar-datepicker>');
            el.setCustomValidity('Date indisponible');
            await settle(el);
            expect(el.matches(':state(user-invalid)')).to.equal(false);
            el.reportValidity();
            await settle(el);
            expect(el.matches(':state(user-invalid)')).to.equal(true);
            expect(el.inputElement.getAttribute('aria-invalid')).to.equal('true');
            el.setCustomValidity('');
            await settle(el);
            expect(el.matches(':state(user-invalid)')).to.equal(false);
            expect(el.inputElement.hasAttribute('aria-invalid')).to.equal(false);
        });

        it('form.reset() retire user-invalid et aria-invalid, mais pas un slot error rempli', async () => {
            const { form, el } = await mount('<ar-datepicker name="d"></ar-datepicker>');
            await typeAndBlur(el, 'abc');
            expect(el.matches(':state(user-invalid)')).to.equal(true);
            form.reset();
            await settle(el);
            expect(el.validity.badInput).to.equal(false);
            expect(el.inputElement.value).to.equal('');
            expect(el.matches(':state(user-invalid)')).to.equal(false);
            expect(el.inputElement.hasAttribute('aria-invalid')).to.equal(false);
        });
    });

    describe('intégration framework (#326)', () => {
        it('saisie hors max : rangeOverflow, checkValidity() faux, value conservée', async () => {
            const { form, el } = await mount(
                '<ar-datepicker name="d" max="2026-12-31"></ar-datepicker>',
            );
            el.inputElement.value = '20/04/2027';
            el.inputElement.dispatchEvent(new Event('blur'));
            await el.updateComplete;
            expect(el.validity.rangeOverflow).to.equal(true);
            expect(form.checkValidity()).to.equal(false);
            expect(el.value).to.equal('2027-04-20');
            el.max = '2027-12-31';
            await el.updateComplete;
            expect(el.validity.valid).to.equal(true);
        });

        it('change natif : value déjà à jour à la réception, un seul événement', async () => {
            const { el } = await mount('<ar-datepicker></ar-datepicker>');
            const seen: string[] = [];
            el.addEventListener('input', () => seen.push(`input:${el.value}`));
            el.addEventListener('change', () => seen.push(`change:${el.value}`));
            el.inputElement.value = '12/06/2026';
            el.inputElement.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
            el.inputElement.dispatchEvent(new Event('blur'));
            await el.updateComplete;
            el.inputElement.dispatchEvent(new Event('blur'));
            expect(seen).to.deep.equal(['input:2026-06-12', 'change:2026-06-12']);
        });
    });

    describe('états de validation (#360)', () => {
        const NAMES = ['required', 'optional', 'user-invalid', 'user-valid'];
        const states = (el: ArDatepicker): string[] =>
            NAMES.filter((name) => el.matches(`:state(${name})`));
        const settle = async (el: ArDatepicker): Promise<void> => {
            await el.updateComplete;
            await el.updateComplete;
        };

        it('required et optional suivent la propriété required', async () => {
            const { el } = await mount('<ar-datepicker></ar-datepicker>');
            expect(states(el)).to.deep.equal(['optional']);
            el.required = true;
            await settle(el);
            expect(states(el)).to.deep.equal(['required']);
            el.required = false;
            await settle(el);
            expect(states(el)).to.deep.equal(['optional']);
        });

        it("un champ obligatoire vide n'est ni user-invalid ni user-valid au chargement, ni après focus puis blur", async () => {
            const { el } = await mount('<ar-datepicker required></ar-datepicker>');
            expect(el.matches(':invalid')).to.equal(true);
            expect(states(el)).to.deep.equal(['required']);
            el.inputElement.focus();
            el.inputElement.blur();
            await settle(el);
            expect(states(el)).to.deep.equal(['required']);
        });

        it('une saisie valide puis la perte de focus pose user-valid', async () => {
            const { el } = await mount('<ar-datepicker required></ar-datepicker>');
            el.inputElement.focus();
            await sendKeys({ type: '12/06/2026' });
            el.inputElement.blur();
            await settle(el);
            expect(el.value).to.equal('2026-06-12');
            expect(states(el)).to.deep.equal(['required', 'user-valid']);
        });

        it('une saisie effacée puis la perte de focus pose user-invalid', async () => {
            const { el } = await mount('<ar-datepicker required></ar-datepicker>');
            el.inputElement.focus();
            await sendKeys({ type: '1' });
            await sendKeys({ press: 'Backspace' });
            el.inputElement.blur();
            await settle(el);
            expect(el.value).to.equal('');
            expect(states(el)).to.deep.equal(['required', 'user-invalid']);
        });

        it('une valeur posée par programme ne pose ni user-valid ni user-invalid', async () => {
            const { el } = await mount('<ar-datepicker required></ar-datepicker>');
            el.value = '2026-06-12';
            await settle(el);
            expect(el.matches(':valid')).to.equal(true);
            expect(states(el)).to.deep.equal(['required']);
            el.value = '';
            await settle(el);
            expect(states(el)).to.deep.equal(['required']);
        });

        it("un événement input envoyé sur l'hôte ne marque pas le champ", async () => {
            const { el } = await mount('<ar-datepicker required></ar-datepicker>');
            el.dispatchEvent(new Event('input', { bubbles: true }));
            await settle(el);
            expect(states(el)).to.deep.equal(['required']);
        });

        it('une sélection dans le calendrier pose user-valid', async () => {
            const { el } = await mount(
                '<ar-datepicker required value="2026-06-10"></ar-datepicker>',
            );
            el.value = '';
            await settle(el);
            el.open = true;
            await settle(el);
            el.shadowRoot!.querySelector<HTMLButtonElement>('td button:not([disabled])')!.click();
            await settle(el);
            expect(el.value).to.not.equal('');
            expect(states(el)).to.deep.equal(['required', 'user-valid']);
        });

        it("une tentative de soumission pose user-invalid ; form.reset() l'efface", async () => {
            const { form, el } = await mount('<ar-datepicker required name="d"></ar-datepicker>');
            form.addEventListener('submit', (event) => event.preventDefault());
            form.requestSubmit();
            await settle(el);
            expect(states(el)).to.deep.equal(['required', 'user-invalid']);
            form.reset();
            await settle(el);
            expect(states(el)).to.deep.equal(['required']);
        });

        it('checkValidity() ne touche pas le champ, reportValidity() oui', async () => {
            const { el } = await mount('<ar-datepicker required></ar-datepicker>');
            expect(el.checkValidity()).to.equal(false);
            await settle(el);
            expect(states(el)).to.deep.equal(['required']);
            expect(el.reportValidity()).to.equal(false);
            await settle(el);
            expect(states(el)).to.deep.equal(['required', 'user-invalid']);
        });

        it('la validité est suivie après interaction : user-invalid devient user-valid', async () => {
            const { el } = await mount('<ar-datepicker required></ar-datepicker>');
            el.reportValidity();
            await settle(el);
            expect(states(el)).to.include('user-invalid');
            el.value = '2026-06-12';
            await settle(el);
            expect(states(el)).to.deep.equal(['required', 'user-valid']);
        });

        it('un champ désactivé ne porte ni user-valid ni user-invalid', async () => {
            const { el } = await mount('<ar-datepicker required disabled></ar-datepicker>');
            el.reportValidity();
            await settle(el);
            expect(states(el)).to.deep.equal(['required']);
        });
    });
});
