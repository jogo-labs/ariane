import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MrPagination } from './pagination.js';
import './pagination.js';

async function fixture(html: string): Promise<MrPagination> {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstElementChild as MrPagination;
    document.body.appendChild(el);
    await (el as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    return el;
}

describe('MrPagination', () => {
    let el: MrPagination;

    afterEach(() => el?.remove());

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<mr-pagination></mr-pagination>');
        });

        it('monte un shadow DOM', () => {
            expect(el.shadowRoot).not.toBeNull();
        });

        // it('contient un élément racine avec part="base"', () => {
        //     expect(el.shadowRoot!.querySelector('[part="base"]')).not.toBeNull();
        // });
    });
});
