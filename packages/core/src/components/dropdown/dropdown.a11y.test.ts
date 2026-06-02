/// <reference types="mocha" />
/**
 * dropdown.a11y.test.ts
 *
 * Tests d'accessibilité structurels pour ar-dropdown, via @web/test-runner.
 */
import { fixture, html, expect, aTimeout } from '@open-wc/testing';
import type { ArDropdown } from './dropdown.js';
import './dropdown.js';
import '../dropdown-item/dropdown-item.js';

function getPanel(el: ArDropdown): HTMLElement {
    const panel = el.shadowRoot?.querySelector('[part="panel"]');
    if (!(panel instanceof HTMLElement)) throw new Error('[part="panel"] introuvable');
    return panel;
}

function getTrigger(el: ArDropdown): HTMLElement {
    const slot = el.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]');
    const trigger = slot?.assignedElements({ flatten: true })[0];
    if (!(trigger instanceof HTMLElement)) throw new Error('trigger introuvable');
    return trigger;
}

describe('ar-dropdown — accessibilité', () => {
    let el: ArDropdown;

    afterEach(() => el?.remove());

    // ── ARIA trigger ─────────────────────────────────────────────────────────

    describe('trigger ARIA', () => {
        beforeEach(async () => {
            el = await fixture(html`
                <ar-dropdown>
                    <button slot="trigger">Ouvrir</button>
                    <p>Contenu</p>
                </ar-dropdown>
            `);
        });

        it('le trigger a aria-haspopup="true"', () => {
            expect(getTrigger(el).getAttribute('aria-haspopup')).to.equal('true');
        });

        it("le trigger n'a pas aria-controls (non supporté cross-shadow-DOM)", () => {
            expect(getTrigger(el).hasAttribute('aria-controls')).to.equal(false);
        });

        it('aria-expanded="false" à l\'état fermé', () => {
            expect(getTrigger(el).getAttribute('aria-expanded')).to.equal('false');
        });

        it('aria-expanded="true" après ouverture', async () => {
            el.open = true;
            await el.updateComplete;
            await aTimeout(20);
            expect(getTrigger(el).getAttribute('aria-expanded')).to.equal('true');
        });

        it('aria-expanded="false" après fermeture', async () => {
            el.open = true;
            await el.updateComplete;
            await aTimeout(20);
            el.open = false;
            await el.updateComplete;
            await aTimeout(20);
            expect(getTrigger(el).getAttribute('aria-expanded')).to.equal('false');
        });
    });

    // ── Mode menu ────────────────────────────────────────────────────────────

    describe('mode menu', () => {
        beforeEach(async () => {
            el = await fixture(html`
                <ar-dropdown>
                    <button slot="trigger">Menu</button>
                    <ar-dropdown-item><button>Item 1</button></ar-dropdown-item>
                    <ar-dropdown-item><button>Item 2</button></ar-dropdown-item>
                </ar-dropdown>
            `);
            await el.updateComplete;
            await aTimeout(20);
        });

        it('le panel a role="menu" en mode menu', () => {
            expect(getPanel(el).getAttribute('role')).to.equal('menu');
        });

        it('chaque enfant focusable a role="menuitem"', () => {
            const buttons = el.querySelectorAll<HTMLButtonElement>('ar-dropdown-item button');
            buttons.forEach((btn) => {
                expect(btn.getAttribute('role')).to.equal('menuitem');
            });
        });

        it('chaque menuitem a tabIndex=-1 au repos', () => {
            const buttons = el.querySelectorAll<HTMLButtonElement>('ar-dropdown-item button');
            buttons.forEach((btn) => {
                expect(btn.tabIndex).to.equal(-1);
            });
        });
    });

    // ── Contenu libre ────────────────────────────────────────────────────────

    describe('contenu libre', () => {
        it('le panel n\'a pas de role="menu" sans ar-dropdown-item', async () => {
            el = await fixture(html`
                <ar-dropdown>
                    <button slot="trigger">Panel</button>
                    <p>Contenu libre</p>
                </ar-dropdown>
            `);
            await el.updateComplete;
            expect(getPanel(el).getAttribute('role')).to.equal(null);
        });
    });
});
