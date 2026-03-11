import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MrStepper } from './stepper.js';
import './stepper.js';

async function fixture(html: string): Promise<MrStepper> {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstElementChild as MrStepper;
    document.body.appendChild(el);
    await (el as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    return el;
}

describe('MrStepper', () => {
    let el: MrStepper;

    afterEach(() => el?.remove());

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<mr-stepper></mr-stepper>');
        });

        it('monte un shadow DOM', () => {
            expect(el.shadowRoot).not.toBeNull();
        });

        // it('contient un élément racine avec part="base"', () => {
        //     expect(el.shadowRoot!.querySelector('[part="base"]')).not.toBeNull();
        // });
    });
});
