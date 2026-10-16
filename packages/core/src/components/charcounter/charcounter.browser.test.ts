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

        it('suit le reset du nouveau formulaire quand le champ change de formulaire', async () => {
            wrapper = await fixture(html`
                <div>
                    <form id="a"><input id="field" value="ab" /></form>
                    <form id="b"></form>
                    <ar-charcounter for="field" max="10"></ar-charcounter>
                </div>
            `);
            const el = wrapper.querySelector<ArCharcounter>('ar-charcounter')!;
            const input = wrapper.querySelector<HTMLInputElement>('#field')!;
            const formB = wrapper.querySelector<HTMLFormElement>('#b')!;
            await el.updateComplete;
            formB.appendChild(input);
            input.defaultValue = 'abcd';
            el.refresh();
            setValue(input, 'abcdefgh');
            await el.updateComplete;
            formB.reset();
            await nextTask();
            await el.updateComplete;
            expect(remaining(el)).to.equal('6');
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
    // ── Valeur posée par programme (#332) ─────────────────────────────────────

    describe('valeur posée par programme', () => {
        const remaining = (el: ArCharcounter) =>
            el.shadowRoot!.querySelector('[part="remaining"]')!.textContent!.trim();

        it('suit textarea.value = … et input.value = … sans événement', async () => {
            wrapper = await fixture(html`
                <div>
                    <textarea id="area"></textarea>
                    <input id="line" type="text" />
                    <ar-charcounter id="a" for="area" max="10"></ar-charcounter>
                    <ar-charcounter id="b" for="line" max="10"></ar-charcounter>
                </div>
            `);
            const a = wrapper.querySelector<ArCharcounter>('#a')!;
            const b = wrapper.querySelector<ArCharcounter>('#b')!;
            await Promise.all([a.updateComplete, b.updateComplete]);
            wrapper.querySelector<HTMLTextAreaElement>('#area')!.value = '12345';
            wrapper.querySelector<HTMLInputElement>('#line')!.value = '123';
            await Promise.all([a.updateComplete, b.updateComplete]);
            expect(remaining(a)).to.equal('5');
            expect(remaining(b)).to.equal('7');
        });

        it('compose avec un value propre au champ, et le rend au retrait du compteur', async () => {
            wrapper = await fixture(html`
                <div>
                    <textarea id="area"></textarea>
                    <ar-charcounter for="area" max="10"></ar-charcounter>
                </div>
            `);
            const area = wrapper.querySelector<HTMLTextAreaElement>('#area')!;
            const el = wrapper.querySelector<ArCharcounter>('ar-charcounter')!;
            const proto = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!;
            const writes: string[] = [];
            // Comme le suivi de valeur de React : un value sur l'instance qui délègue au prototype.
            // Posé après le compteur ici ; l'ordre inverse est couvert par les tests unitaires.
            el.remove();
            const own: PropertyDescriptor = {
                configurable: true,
                get() {
                    return proto.get!.call(this);
                },
                set(v: string) {
                    writes.push(v);
                    proto.set!.call(this, v);
                },
            };
            Object.defineProperty(area, 'value', own);
            wrapper.appendChild(el);
            await el.updateComplete;
            await new Promise<void>((resolve) => setTimeout(resolve, 0));

            area.value = '1234';
            await el.updateComplete;
            expect(writes).to.deep.equal(['1234']);
            expect(remaining(el)).to.equal('6');

            el.remove();
            const restored = Object.getOwnPropertyDescriptor(area, 'value');
            expect(restored?.set).to.equal(own.set);
            area.value = 'x';
            expect(writes).to.deep.equal(['1234', 'x']);
        });
    });
});
