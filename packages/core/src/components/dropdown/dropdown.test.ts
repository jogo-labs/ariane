import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArDropdown } from './dropdown.js';
import { fixture, waitForUpdate, getPart } from '../../test-utils.js';
import './dropdown.js';
import '../dropdown-item/dropdown-item.js';

// happy-dom does not implement the Popover API — mock showPopover/hidePopover on the panel.
function mockPanelPopover(el: ArDropdown): void {
    const panel = getPart(el, 'panel') as HTMLElement | null;
    if (!panel) return;
    (panel as HTMLElement & { showPopover: () => void; hidePopover: () => void }).showPopover =
        vi.fn();
    (panel as HTMLElement & { showPopover: () => void; hidePopover: () => void }).hidePopover =
        vi.fn();
}

describe('ArDropdown', () => {
    let el: ArDropdown;

    afterEach(() => el?.remove());

    // ── Rendu ─────────────────────────────────────────────────────────────────

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<ar-dropdown></ar-dropdown>');
        });

        it('monte un shadow DOM', () => {
            expect(el.shadowRoot).not.toBeNull();
        });

        it('contient un panel avec part="panel"', () => {
            expect(getPart(el, 'panel')).not.toBeNull();
        });
    });

    // ── Valeurs par défaut ────────────────────────────────────────────────────

    describe('valeurs par défaut', () => {
        beforeEach(async () => {
            el = await fixture('<ar-dropdown></ar-dropdown>');
        });

        it('open=false', () => expect(el.open).toBe(false));
        it('placement="bottom-start"', () => expect(el.placement).toBe('bottom-start'));
        it('disabled=false', () => expect(el.disabled).toBe(false));
    });

    // ── Attributs reflect ─────────────────────────────────────────────────────

    describe('attributs reflect', () => {
        beforeEach(async () => {
            el = await fixture('<ar-dropdown></ar-dropdown>');
        });

        it('open reflète en attribut', async () => {
            mockPanelPopover(el);
            el.open = true;
            await waitForUpdate(el);
            expect(el.hasAttribute('open')).toBe(true);
        });

        it('placement reflète en attribut', async () => {
            el.placement = 'top-end';
            await waitForUpdate(el);
            expect(el.getAttribute('placement')).toBe('top-end');
        });

        it('disabled reflète en attribut', async () => {
            el.disabled = true;
            await waitForUpdate(el);
            expect(el.hasAttribute('disabled')).toBe(true);
        });
    });

    // ── Événements ────────────────────────────────────────────────────────────

    describe('événements', () => {
        beforeEach(async () => {
            el = await fixture(
                '<ar-dropdown><button slot="trigger">Trigger</button></ar-dropdown>',
            );
            mockPanelPopover(el);
        });

        it('émet ar-dropdown-show avant ouverture', async () => {
            const handler = vi.fn();
            el.addEventListener('ar-dropdown-show', handler);
            el.open = true;
            await waitForUpdate(el);
            expect(handler).toHaveBeenCalledOnce();
        });

        it('émet ar-dropdown-hide avant fermeture', async () => {
            el.open = true;
            await waitForUpdate(el);
            const handler = vi.fn();
            el.addEventListener('ar-dropdown-hide', handler);
            el.open = false;
            await waitForUpdate(el);
            expect(handler).toHaveBeenCalledOnce();
        });

        it('annule ouverture si ar-dropdown-show est preventDefault()', async () => {
            el.addEventListener('ar-dropdown-show', (e) => e.preventDefault());
            el.open = true;
            await waitForUpdate(el);
            expect(el.open).toBe(false);
        });

        it('annule fermeture si ar-dropdown-hide est preventDefault()', async () => {
            el.open = true;
            await waitForUpdate(el);
            el.addEventListener('ar-dropdown-hide', (e) => e.preventDefault());
            el.open = false;
            await waitForUpdate(el);
            expect(el.open).toBe(true);
        });
    });

    // ── Disabled ─────────────────────────────────────────────────────────────

    describe('disabled', () => {
        it("le clic sur le trigger ne déclenche pas d'ouverture quand disabled", async () => {
            el = await fixture(
                '<ar-dropdown disabled><button slot="trigger">Trigger</button></ar-dropdown>',
            );
            mockPanelPopover(el);
            const trigger = el.querySelector<HTMLButtonElement>('button');
            trigger?.click();
            await waitForUpdate(el);
            expect(el.open).toBe(false);
        });
    });

    // ── Mode menu ────────────────────────────────────────────────────────────

    describe('mode menu', () => {
        it('pose role="menu" sur le panel si ar-dropdown-item présents', async () => {
            el = await fixture(`
                <ar-dropdown>
                    <button slot="trigger">Menu</button>
                </ar-dropdown>
            `);
            mockPanelPopover(el);
            // Append items after fixture to trigger slotchange
            const item1 = document.createElement('ar-dropdown-item');
            item1.innerHTML = '<button>Item 1</button>';
            const item2 = document.createElement('ar-dropdown-item');
            item2.innerHTML = '<button>Item 2</button>';
            el.appendChild(item1);
            el.appendChild(item2);
            await waitForUpdate(el);
            const panel = getPart(el, 'panel');
            expect(panel?.getAttribute('role')).toBe('menu');
        });

        it('pas de role="menu" sans ar-dropdown-item', async () => {
            el = await fixture(`
                <ar-dropdown>
                    <button slot="trigger">Panel</button>
                    <p>Contenu libre</p>
                </ar-dropdown>
            `);
            mockPanelPopover(el);
            await waitForUpdate(el);
            const panel = getPart(el, 'panel');
            expect(panel?.getAttribute('role')).toBeNull();
        });
    });
});
