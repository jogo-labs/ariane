import { afterEach, describe, expect, it } from 'vitest';
import type { ArDropdownItem } from './dropdown-item.js';
import { fixture, waitForUpdate } from '../../test-utils.js';
import './index.js';

async function fixtureWithSlot(innerHtml: string): Promise<ArDropdownItem> {
    // Mount empty, then append child to trigger slotchange
    const el = await fixture<ArDropdownItem>('<ar-dropdown-item></ar-dropdown-item>');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = innerHtml;
    const node = wrapper.firstElementChild;
    if (node) el.appendChild(node);
    await waitForUpdate(el);
    return el;
}

describe('ArDropdownItem', () => {
    let el: ArDropdownItem;

    afterEach(() => el?.remove());

    // ── Rendu ─────────────────────────────────────────────────────────────────

    describe('rendu', () => {
        it('monte un shadow DOM', async () => {
            el = await fixture('<ar-dropdown-item></ar-dropdown-item>');
            expect(el.shadowRoot).not.toBeNull();
        });
    });

    // ── Comportement slotchange ───────────────────────────────────────────────

    describe('slotchange sur bouton', () => {
        it('pose role="menuitem" et tabIndex=-1 sur un bouton slotté', async () => {
            el = await fixtureWithSlot('<button>Action</button>');
            const btn = el.querySelector('button');
            expect(btn?.getAttribute('role')).toBe('menuitem');
            expect(btn?.tabIndex).toBe(-1);
        });
    });

    describe('slotchange sur lien', () => {
        it('pose role="menuitem" et tabIndex=-1 sur un <a href>', async () => {
            el = await fixtureWithSlot('<a href="#">Lien</a>');
            const link = el.querySelector('a');
            expect(link?.getAttribute('role')).toBe('menuitem');
            expect(link?.tabIndex).toBe(-1);
        });
    });

    describe('sans enfant focusable', () => {
        it("ne lève pas d'erreur si aucun enfant focusable", async () => {
            el = await fixtureWithSlot('<span>Texte</span>');
            const span = el.querySelector('span');
            expect(span?.getAttribute('role')).toBeNull();
        });
    });
});
