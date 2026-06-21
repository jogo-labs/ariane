import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArDatepicker } from './datepicker.js';
import { fixture, getPart, waitForUpdate } from '../../test-utils.js';
import './datepicker.js';

describe('ArDatepicker', () => {
    let el: ArDatepicker;
    afterEach(() => el?.remove());

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<ar-datepicker></ar-datepicker>');
        });

        it('monte un shadow DOM', () => expect(el.shadowRoot).not.toBeNull());
        it('contient un input part="input"', () => expect(getPart(el, 'input')).not.toBeNull());
        it('contient un bouton part="trigger"', () =>
            expect(getPart(el, 'trigger')).not.toBeNull());
        it('contient un div part="panel"', () => expect(getPart(el, 'panel')).not.toBeNull());
        it('contient un label part="label"', () => expect(getPart(el, 'label')).not.toBeNull());
        it('contient un p part="hint"', () => expect(getPart(el, 'hint')).not.toBeNull());
        it('contient un p part="error"', () => expect(getPart(el, 'error')).not.toBeNull());
        it('expose inputElement getter', () =>
            expect(el.inputElement).toBeInstanceOf(HTMLInputElement));
    });

    describe('valeurs par défaut', () => {
        beforeEach(async () => {
            el = await fixture('<ar-datepicker></ar-datepicker>');
        });

        it('format vaut "dd/MM/yyyy"', () => expect(el.format).toBe('dd/MM/yyyy'));
        it('disabled vaut false', () => expect(el.disabled).toBe(false));
        it('readonly vaut false', () => expect(el.readonly).toBe(false));
        it('open vaut false', () => expect(el.open).toBe(false));
    });

    describe('propriétés reflect', () => {
        beforeEach(async () => {
            el = await fixture('<ar-datepicker></ar-datepicker>');
        });

        it('disabled se reflète en attribut', async () => {
            el.disabled = true;
            await waitForUpdate(el);
            expect(el.hasAttribute('disabled')).toBe(true);
        });

        it('readonly se reflète en attribut', async () => {
            el.readonly = true;
            await waitForUpdate(el);
            expect(el.hasAttribute('readonly')).toBe(true);
        });

        it('has-error se reflète quand le slot error a du contenu', async () => {
            el = await fixture(`
                <ar-datepicker>
                    <span slot="error">Date invalide</span>
                </ar-datepicker>
            `);
            await waitForUpdate(el);
            expect(el.hasAttribute('has-error')).toBe(true);
        });
    });

    describe('popover', () => {
        beforeEach(async () => {
            el = await fixture('<ar-datepicker></ar-datepicker>');
        });

        it('open=true reflète en attribut', async () => {
            el.open = true;
            await waitForUpdate(el);
            expect(el.hasAttribute('open')).toBe(true);
        });

        it("émet ar-datepicker-show à l'ouverture", async () => {
            let fired = false;
            el.addEventListener('ar-datepicker-show', () => (fired = true));
            el.open = true;
            await waitForUpdate(el);
            expect(fired).toBe(true);
        });

        it('émet ar-datepicker-hide à la fermeture', async () => {
            el.open = true;
            await waitForUpdate(el);
            let fired = false;
            el.addEventListener('ar-datepicker-hide', () => (fired = true));
            el.open = false;
            await waitForUpdate(el);
            expect(fired).toBe(true);
        });

        it("disabled bloque l'ouverture", async () => {
            el.disabled = true;
            await waitForUpdate(el);
            el.open = true;
            await waitForUpdate(el);
            expect(el.open).toBe(true);
        });

        it("readonly bloque l'ouverture", async () => {
            el.readonly = true;
            await waitForUpdate(el);
            el.open = true;
            await waitForUpdate(el);
            expect(el.open).toBe(true);
        });

        it('canceller ar-datepicker-hide maintient le panel ouvert sans boucle', async () => {
            el.open = true;
            await waitForUpdate(el);
            el.addEventListener('ar-datepicker-hide', (e) => e.preventDefault());
            el.open = false;
            await waitForUpdate(el);
            // Le panel doit rester ouvert et la propriété doit être revenue à true
            expect(el.open).toBe(true);
        });

        it('canceller ar-datepicker-show maintient le panel fermé sans boucle', async () => {
            el.addEventListener('ar-datepicker-show', (e) => e.preventDefault());
            el.open = true;
            await waitForUpdate(el);
            // Le panel doit rester fermé et la propriété doit être revenue à false
            expect(el.open).toBe(false);
        });

        it("ne boucle pas à l'infini si hide et show sont tous les deux annulés", async () => {
            el = await fixture('<ar-datepicker></ar-datepicker>');
            el.addEventListener('ar-datepicker-show', (e) => e.preventDefault());
            el.addEventListener('ar-datepicker-hide', (e) => e.preventDefault());
            // Tenter d'ouvrir ne doit pas bloquer
            el.open = true;
            await el.updateComplete;
            await new Promise((r) => setTimeout(r, 50));
            // Le panel doit rester fermé (show annulé)
            expect(el.open).toBe(false);
        });
    });

    describe('synchronisation input ↔ calendrier', () => {
        it('value ISO → input texte formaté', async () => {
            el = await fixture('<ar-datepicker value="2026-06-12"></ar-datepicker>');
            await waitForUpdate(el);
            expect(el.inputElement.value).toBe('12/06/2026');
        });

        it('émet ar-datepicker-input-complete sur saisie complète', async () => {
            el = await fixture('<ar-datepicker></ar-datepicker>');
            let detail: Record<string, unknown> | null = null;
            el.addEventListener('ar-datepicker-input-complete', (e) => {
                detail = (e as CustomEvent).detail;
            });
            el.inputElement.value = '12/06/2026';
            el.inputElement.dispatchEvent(new Event('input'));
            await waitForUpdate(el);
            expect(detail).not.toBeNull();
            expect((detail as Record<string, unknown>).valid).toBe(true);
        });

        it('ar-datepicker-input-complete avec valid:false pour 30/02', async () => {
            el = await fixture('<ar-datepicker></ar-datepicker>');
            let detail: Record<string, unknown> | null = null;
            el.addEventListener('ar-datepicker-input-complete', (e) => {
                detail = (e as CustomEvent).detail;
            });
            el.inputElement.value = '30/02/2026';
            el.inputElement.dispatchEvent(new Event('input'));
            await waitForUpdate(el);
            expect((detail as Record<string, unknown>).valid).toBe(false);
        });

        it('émet ar-datepicker-input-change au blur', async () => {
            el = await fixture('<ar-datepicker></ar-datepicker>');
            let fired = false;
            el.addEventListener('ar-datepicker-input-change', () => (fired = true));
            el.inputElement.value = '12/06/2026';
            el.inputElement.dispatchEvent(new Event('blur'));
            await waitForUpdate(el);
            expect(fired).toBe(true);
        });
    });

    describe('slots et ARIA', () => {
        it('has-error absent quand slot error est vide', async () => {
            el = await fixture('<ar-datepicker></ar-datepicker>');
            await waitForUpdate(el);
            expect(el.hasAttribute('has-error')).toBe(false);
        });

        it('has-error présent quand slot error a du contenu', async () => {
            el = await fixture(`
                <ar-datepicker>
                    <span slot="error">Erreur</span>
                </ar-datepicker>
            `);
            await waitForUpdate(el);
            expect(el.hasAttribute('has-error')).toBe(true);
        });

        it("aria-describedby de l'input pointe vers les IDs internes", async () => {
            el = await fixture('<ar-datepicker></ar-datepicker>');
            const input = el.inputElement;
            const describedBy = input.getAttribute('aria-describedby') ?? '';
            const parts = describedBy.split(' ');
            expect(parts).toHaveLength(2);
            parts.forEach((id) => {
                expect(el.shadowRoot?.getElementById(id)).not.toBeNull();
            });
        });

        it('slot label est rendu dans un <label>', async () => {
            el = await fixture(`
                <ar-datepicker>
                    <span slot="label">Date de naissance</span>
                </ar-datepicker>
            `);
            const labelEl = el.shadowRoot?.querySelector('label');
            expect(labelEl).not.toBeNull();
            expect(labelEl?.querySelector('slot[name="label"]')).not.toBeNull();
        });
    });

    describe('participation formulaire', () => {
        it('formAssociated est true', () => {
            const ArDatepickerType = customElements.get('ar-datepicker') as typeof ArDatepicker;
            expect(ArDatepickerType.formAssociated).toBe(true);
        });

        it('disabled exclut la valeur du formulaire', async () => {
            el = await fixture('<ar-datepicker value="2026-06-12" disabled></ar-datepicker>');
            await waitForUpdate(el);
            expect(() => (el.disabled = false)).not.toThrow();
        });
    });

    describe('setValidity / required', () => {
        // happy-dom ne supporte pas attachInternals() ni form.checkValidity() pour les FACE.
        // On injecte un faux ElementInternals via attachInternals pour espionner setValidity.

        function withFakeInternals(test: (spy: ReturnType<typeof vi.fn>) => Promise<void>) {
            return async () => {
                const setValiditySpy = vi.fn();
                const setFormValueSpy = vi.fn();
                const fakeInternals = {
                    setFormValue: setFormValueSpy,
                    setValidity: setValiditySpy,
                };
                // happy-dom : attachInternals n'existe pas, on l'injecte
                (HTMLElement.prototype as unknown as Record<string, unknown>).attachInternals =
                    () => fakeInternals;
                await test(setValiditySpy);
                delete (HTMLElement.prototype as unknown as Record<string, unknown>)
                    .attachInternals;
            };
        }

        it(
            '<ar-datepicker required> vide → setValidity({ valueMissing:true }) appelé',
            withFakeInternals(async (setValiditySpy) => {
                el = await fixture('<ar-datepicker required></ar-datepicker>');
                await waitForUpdate(el);
                const valueMissingCall = setValiditySpy.mock.calls.find(
                    ([flags]: [ValidityStateFlags]) => flags?.valueMissing === true,
                );
                expect(valueMissingCall).toBeDefined();
            }),
        );

        it(
            '<ar-datepicker required> avec valeur → setValidity({}) appelé',
            withFakeInternals(async (setValiditySpy) => {
                el = await fixture('<ar-datepicker required value="2026-06-12"></ar-datepicker>');
                await waitForUpdate(el);
                const lastCall = setValiditySpy.mock.calls.at(-1);
                expect(lastCall).toBeDefined();
                expect(Object.keys(lastCall![0] as object)).toHaveLength(0);
            }),
        );

        it(
            '<ar-datepicker> sans required, vide → setValidity({}) appelé (pas de valueMissing)',
            withFakeInternals(async (setValiditySpy) => {
                el = await fixture('<ar-datepicker></ar-datepicker>');
                await waitForUpdate(el);
                const valueMissingCall = setValiditySpy.mock.calls.find(
                    ([flags]: [ValidityStateFlags]) => flags?.valueMissing === true,
                );
                expect(valueMissingCall).toBeUndefined();
            }),
        );

        it(
            're-valide quand required change au runtime',
            withFakeInternals(async (setValiditySpy) => {
                el = await fixture('<ar-datepicker></ar-datepicker>');
                await waitForUpdate(el);
                // Pas required par défaut → pas de valueMissing
                const initialMissingCall = setValiditySpy.mock.calls.find(
                    ([flags]: [ValidityStateFlags]) => flags?.valueMissing === true,
                );
                expect(initialMissingCall).toBeUndefined();

                // On rend required → doit appeler setValidity({ valueMissing: true })
                setValiditySpy.mockClear();
                el.required = true;
                await waitForUpdate(el);
                const afterRequiredCall = setValiditySpy.mock.calls.find(
                    ([flags]: [ValidityStateFlags]) => flags?.valueMissing === true,
                );
                expect(afterRequiredCall).toBeDefined();

                // On annule required → doit appeler setValidity({})
                setValiditySpy.mockClear();
                el.required = false;
                await waitForUpdate(el);
                const lastCall = setValiditySpy.mock.calls.at(-1);
                expect(lastCall).toBeDefined();
                expect(Object.keys(lastCall![0] as object)).toHaveLength(0);
            }),
        );
    });
});
