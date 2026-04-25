/// <reference types="mocha" />
/**
 * dropdown.browser.test.ts
 *
 * Tests nécessitant un vrai browser (Chromium via @web/test-runner) :
 *   - API Popover native (showPopover / hidePopover / :popover-open)
 *   - Light-dismiss (clic extérieur)
 *   - Escape natif
 *   - Navigation clavier avec focus réel
 *   - Retour du focus au trigger à la fermeture
 */
import { fixture, html, expect, aTimeout } from '@open-wc/testing';
import type { ArDropdown } from './dropdown.js';
import './dropdown.js';
import '../dropdown-item/dropdown-item.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPanel(el: ArDropdown): HTMLElement {
    const panel = el.shadowRoot?.querySelector('[part="panel"]');
    if (!(panel instanceof HTMLElement)) throw new Error('[part="panel"] introuvable');
    return panel;
}

async function openDropdown(el: ArDropdown): Promise<void> {
    el.open = true;
    await el.updateComplete;
    await aTimeout(20);
}

// ──────────────────────────────────────────────────────────────────────────────

describe('ar-dropdown — browser', () => {
    let el: ArDropdown;

    afterEach(() => el?.remove());

    // ── Ouverture / fermeture réelles ─────────────────────────────────────────

    describe('ouverture', () => {
        it('le panel est visible (:popover-open) quand open=true', async () => {
            el = await fixture(html`
                <ar-dropdown>
                    <button slot="trigger">Trigger</button>
                    <p>Contenu</p>
                </ar-dropdown>
            `);
            await openDropdown(el);
            const panel = getPanel(el);
            expect(panel.matches(':popover-open')).to.equal(true);
        });

        it('le panel est masqué quand open=false', async () => {
            el = await fixture(html`
                <ar-dropdown>
                    <button slot="trigger">Trigger</button>
                    <p>Contenu</p>
                </ar-dropdown>
            `);
            await openDropdown(el);
            el.open = false;
            await el.updateComplete;
            await aTimeout(20);
            const panel = getPanel(el);
            expect(panel.matches(':popover-open')).to.equal(false);
        });
    });

    // ── Light-dismiss ─────────────────────────────────────────────────────────

    describe('light-dismiss', () => {
        it('un clic hors du panel ferme le dropdown (open sync)', async () => {
            el = await fixture(html`
                <ar-dropdown>
                    <button slot="trigger">Trigger</button>
                    <p>Contenu</p>
                </ar-dropdown>
            `);
            await openDropdown(el);

            // Clic sur le body hors du panel
            document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
            document.body.click();
            await aTimeout(50);

            expect(el.open).to.equal(false);
        });
    });

    // ── Escape ───────────────────────────────────────────────────────────────

    describe('Escape', () => {
        it('Escape ferme le dropdown via le toggle event natif', async () => {
            el = await fixture(html`
                <ar-dropdown>
                    <button slot="trigger">Trigger</button>
                    <p>Contenu</p>
                </ar-dropdown>
            `);
            await openDropdown(el);
            const panel = getPanel(el);

            panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            await aTimeout(50);

            expect(el.open).to.equal(false);
        });
    });

    // ── Retour de focus ───────────────────────────────────────────────────────

    describe('focus', () => {
        it('retourne le focus au trigger à la fermeture', async () => {
            el = await fixture(html`
                <ar-dropdown>
                    <button slot="trigger" id="trig">Trigger</button>
                    <p>Contenu</p>
                </ar-dropdown>
            `);
            const trigger = el.querySelector<HTMLButtonElement>('#trig');
            if (!trigger) throw new Error('trigger introuvable');
            trigger.focus();

            await openDropdown(el);
            el.open = false;
            await el.updateComplete;
            await aTimeout(20);

            expect(document.activeElement).to.equal(trigger);
        });
    });

    // ── Navigation clavier — mode menu ───────────────────────────────────────

    describe('navigation clavier menu', () => {
        let items: HTMLButtonElement[];

        beforeEach(async () => {
            el = await fixture(html`
                <ar-dropdown>
                    <button slot="trigger">Menu</button>
                    <ar-dropdown-item><button id="i1">Item 1</button></ar-dropdown-item>
                    <ar-dropdown-item><button id="i2">Item 2</button></ar-dropdown-item>
                    <ar-dropdown-item><button id="i3">Item 3</button></ar-dropdown-item>
                </ar-dropdown>
            `);
            await openDropdown(el);
            items = ['#i1', '#i2', '#i3'].map((s) => {
                const item = el.querySelector<HTMLButtonElement>(s);
                if (!item) throw new Error(`${s} introuvable`);
                return item;
            });
        });

        it("focus initial sur le premier item à l'ouverture", () => {
            expect(document.activeElement).to.equal(items[0]);
        });

        it('ArrowDown déplace le focus vers le bas', async () => {
            const panel = getPanel(el);
            panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
            await aTimeout(20);
            expect(document.activeElement).to.equal(items[1]);
        });

        it('ArrowUp déplace le focus vers le haut', async () => {
            items[1].focus();
            const panel = getPanel(el);
            panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
            await aTimeout(20);
            expect(document.activeElement).to.equal(items[0]);
        });

        it('Home place le focus sur le premier item', async () => {
            items[2].focus();
            const panel = getPanel(el);
            panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
            await aTimeout(20);
            expect(document.activeElement).to.equal(items[0]);
        });

        it('End place le focus sur le dernier item', async () => {
            const panel = getPanel(el);
            panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
            await aTimeout(20);
            expect(document.activeElement).to.equal(items[2]);
        });

        it('Tab ferme le dropdown', async () => {
            const panel = getPanel(el);
            panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
            await aTimeout(20);
            expect(el.open).to.equal(false);
        });
    });
});
