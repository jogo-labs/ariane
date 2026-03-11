import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MrAlert } from './alert.js';
import './alert.js';

async function fixture(html: string): Promise<MrAlert> {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstElementChild as MrAlert;
    document.body.appendChild(el);
    await (el as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    return el;
}

describe('MrAlert', () => {
    let el: MrAlert;

    afterEach(() => el?.remove());

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<mr-alert></mr-alert>');
        });

        it('monte un shadow DOM', () => {
            expect(el.shadowRoot).not.toBeNull();
        });

        it('contient un slot nommé title', () => {
            expect(el.shadowRoot!.querySelector('slot[name="title"]')).not.toBeNull();
        });
        it('contient un slot nommé content', () => {
            expect(el.shadowRoot!.querySelector('slot[name="content"]')).not.toBeNull();
        });
    });
});
