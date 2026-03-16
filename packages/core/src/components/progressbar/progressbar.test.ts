import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MrProgressbar } from './progressbar.js';
import './progressbar.js';

async function fixture(html: string): Promise<MrProgressbar> {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstElementChild as MrProgressbar;
    document.body.appendChild(el);
    await (el as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    return el;
}

describe('MrProgressbar', () => {
    let el: MrProgressbar;

    afterEach(() => el?.remove());

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<mr-progressbar></mr-progressbar>');
        });

        it('monte un shadow DOM', () => {
            expect(el.shadowRoot).not.toBeNull();
        });

        // it('contient un élément racine avec part="base"', () => {
        //     expect(el.shadowRoot!.querySelector('[part="base"]')).not.toBeNull();
        // });
    });
});
