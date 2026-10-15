/// <reference types="mocha" />
/**
 * charcounter.browser.test.ts
 *
 * Tests nécessitant un vrai browser (Chromium via @web/test-runner) :
 *   - :state() (ElementInternals.states, non implémenté par happy-dom/Vitest)
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

    // ── Réinitialisation du formulaire et champ tardif (#332) ─────────────────

    describe('form.reset() et champ tardif', () => {
        const remaining = (el: ArCharcounter) =>
            el.shadowRoot!.querySelector('[part="remaining"]')!.textContent!.trim();
        const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

        it('remet le décompte à la valeur par défaut après form.reset()', async () => {
            wrapper = await fixture(html`
                <form>
                    <textarea id="field">abc</textarea>
                    <ar-charcounter for="field" max="10"></ar-charcounter>
                </form>
            `);
            const form = wrapper as HTMLFormElement;
            const area = form.querySelector<HTMLTextAreaElement>('#field')!;
            const el = form.querySelector<ArCharcounter>('ar-charcounter')!;
            await el.updateComplete;
            setValue(area as unknown as HTMLInputElement, '1234567');
            await el.updateComplete;
            expect(remaining(el)).to.equal('3');

            form.reset();
            await nextTask();
            await el.updateComplete;
            expect(remaining(el)).to.equal('7');
        });

        it('suit toujours la saisie après un reset', async () => {
            wrapper = await fixture(html`
                <form>
                    <input id="field" value="ab" />
                    <ar-charcounter for="field" max="10"></ar-charcounter>
                </form>
            `);
            const form = wrapper as HTMLFormElement;
            const input = form.querySelector<HTMLInputElement>('#field')!;
            const el = form.querySelector<ArCharcounter>('ar-charcounter')!;
            form.reset();
            await nextTask();
            setValue(input, 'abcdef');
            await el.updateComplete;
            expect(remaining(el)).to.equal('4');
        });

        it('se rattache à un champ inséré après le compteur', async () => {
            wrapper = await fixture(html`
                <div>
                    <ar-charcounter id="cc" for="late" max="10"></ar-charcounter>
                </div>
            `);
            const el = wrapper.querySelector<ArCharcounter>('ar-charcounter')!;
            const input = document.createElement('input');
            input.id = 'late';
            input.value = 'abcd';
            wrapper.appendChild(input);
            await nextTask();
            await el.updateComplete;
            expect(remaining(el)).to.equal('6');
            expect(input.getAttribute('aria-describedby')).to.equal('cc');
        });
    });
});
