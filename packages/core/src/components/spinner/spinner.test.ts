import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MrSpinner } from './spinner.js';
import './spinner.js';

async function fixture(html: string): Promise<MrSpinner> {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstElementChild as MrSpinner;
    document.body.appendChild(el);
    await (el as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    return el;
}

describe('MrSpinner', () => {
    let el: MrSpinner;

    afterEach(() => el?.remove());

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<mr-spinner></mr-spinner>');
        });

        it('monte un shadow DOM', () => {
            expect(el.shadowRoot).not.toBeNull();
        });

        // it('contient un élément racine avec part="base"', () => {
        //     expect(el.shadowRoot!.querySelector('[part="base"]')).not.toBeNull();
        // });
    });
});
