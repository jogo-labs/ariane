import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MrBreadcrumb } from './breadcrumb.js';
import './breadcrumb.js';

async function fixture(html: string): Promise<MrBreadcrumb> {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstElementChild as MrBreadcrumb;
    document.body.appendChild(el);
    await (el as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    return el;
}

describe('MrBreadcrumb', () => {
    let el: MrBreadcrumb;

    afterEach(() => el?.remove());

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<mr-breadcrumb></mr-breadcrumb>');
        });

        it('monte un shadow DOM', () => {
            expect(el.shadowRoot).not.toBeNull();
        });

        it('contient un élément racine avec part="base"', () => {
            expect(el.shadowRoot!.querySelector('[part="base"]')).not.toBeNull();
        });
    });
});
