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
        it('noScrollLock=false', () => expect(el.noScrollLock).toBe(false));
        it('distance=4', () => expect(el.distance).toBe(4));
        it('offset=0', () => expect(el.offset).toBe(0));
        it('trigger=""', () => expect(el.trigger).toBe(''));
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

        it('no-scroll-lock reflète en attribut', async () => {
            el.noScrollLock = true;
            await waitForUpdate(el);
            expect(el.hasAttribute('no-scroll-lock')).toBe(true);
        });

        it('distance reflète en attribut', async () => {
            el.distance = 12;
            await waitForUpdate(el);
            expect(el.getAttribute('distance')).toBe('12');
        });

        it('offset reflète en attribut', async () => {
            el.offset = 8;
            await waitForUpdate(el);
            expect(el.getAttribute('offset')).toBe('8');
        });

        it('trigger reflète en attribut', async () => {
            el.trigger = 'mon-btn';
            await waitForUpdate(el);
            expect(el.getAttribute('trigger')).toBe('mon-btn');
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

    // ── noScrollLock ──────────────────────────────────────────────────────────

    describe('noScrollLock', () => {
        let container: HTMLDivElement;

        beforeEach(() => {
            container = document.createElement('div');
            container.style.overflowY = 'auto';
            document.body.appendChild(container);
        });

        afterEach(() => container.remove());

        it("bloque overflowY des ancêtres scroll à l'ouverture", async () => {
            el = await fixture('<ar-dropdown><button slot="trigger">T</button></ar-dropdown>');
            container.appendChild(el);
            mockPanelPopover(el);

            el.open = true;
            await waitForUpdate(el);

            expect(container.style.overflowY).toBe('hidden');
        });

        it('restaure overflowY des ancêtres à la fermeture', async () => {
            el = await fixture('<ar-dropdown><button slot="trigger">T</button></ar-dropdown>');
            container.appendChild(el);
            mockPanelPopover(el);

            el.open = true;
            await waitForUpdate(el);
            expect(container.style.overflowY).toBe('hidden');

            el.open = false;
            await waitForUpdate(el);
            expect(container.style.overflowY).toBe('auto'); // valeur inline d'origine restaurée
        });

        it('ne bloque pas le scroll si no-scroll-lock est activé', async () => {
            el = await fixture(
                '<ar-dropdown no-scroll-lock><button slot="trigger">T</button></ar-dropdown>',
            );
            await waitForUpdate(el);
            container.appendChild(el);
            mockPanelPopover(el);

            el.open = true;
            await waitForUpdate(el);

            expect(container.style.overflowY).not.toBe('hidden');
        });
    });

    // ── Trigger externe ───────────────────────────────────────────────────────

    describe('trigger externe', () => {
        let externalBtn: HTMLButtonElement;

        beforeEach(() => {
            externalBtn = document.createElement('button');
            externalBtn.id = 'test-ext-trigger';
            document.body.appendChild(externalBtn);
        });

        afterEach(() => externalBtn.remove());

        it('pose aria-haspopup et aria-expanded sur le trigger externe', async () => {
            el = await fixture('<ar-dropdown trigger="test-ext-trigger"></ar-dropdown>');
            expect(externalBtn.getAttribute('aria-haspopup')).toBe('true');
            expect(externalBtn.getAttribute('aria-expanded')).toBe('false');
        });

        it('le clic sur le trigger externe ouvre le dropdown', async () => {
            el = await fixture('<ar-dropdown trigger="test-ext-trigger"></ar-dropdown>');
            mockPanelPopover(el);

            externalBtn.click();
            await waitForUpdate(el);

            expect(el.open).toBe(true);
        });

        it('le slot trigger est ignoré quand trigger est défini', async () => {
            el = await fixture(`
                <ar-dropdown trigger="test-ext-trigger">
                    <button slot="trigger" id="slot-btn">Slot</button>
                </ar-dropdown>
            `);
            const slotBtn = el.querySelector<HTMLButtonElement>('#slot-btn');
            expect(slotBtn?.getAttribute('aria-haspopup')).toBeNull();
        });

        it("affiche un warn si l'ID est introuvable", async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            el = await fixture('<ar-dropdown trigger="id-qui-nexiste-pas"></ar-dropdown>');
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('id-qui-nexiste-pas'));
            warnSpy.mockRestore();
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

        it('pose role="separator" sur les <hr> en mode menu', async () => {
            el = await fixture(`
                <ar-dropdown>
                    <button slot="trigger">Menu</button>
                </ar-dropdown>
            `);
            mockPanelPopover(el);
            const item1 = document.createElement('ar-dropdown-item');
            item1.innerHTML = '<button>Item 1</button>';
            const hr = document.createElement('hr');
            const item2 = document.createElement('ar-dropdown-item');
            item2.innerHTML = '<button>Item 2</button>';
            el.appendChild(item1);
            el.appendChild(hr);
            el.appendChild(item2);
            await waitForUpdate(el);
            expect(hr.getAttribute('role')).toBe('separator');
        });
    });

    describe('warn() — trigger introuvable', () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('émet un warn si trigger pointe vers un ID inexistant (firstUpdated)', async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            el = await fixture('<ar-dropdown trigger="id-qui-nexiste-pas"></ar-dropdown>');

            expect(spy).toHaveBeenCalledOnce();
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-dropdown]'));
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('id-qui-nexiste-pas'));
        });

        it('émet un warn si trigger est mis à jour vers un ID inexistant', async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            el = await fixture<ArDropdown>('<ar-dropdown></ar-dropdown>');

            el.trigger = 'id-inconnu';
            await waitForUpdate(el);

            expect(spy).toHaveBeenCalledOnce();
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-dropdown]'));
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('id-inconnu'));
        });
    });
});
