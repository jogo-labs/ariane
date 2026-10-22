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
import { sendKeys } from '@web/test-runner-commands';
import type { ArDropdown } from './dropdown.js';
import './index.js';
import '../dropdown-item/index.js';

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
            const panel = getPanel(el);

            // Les événements synthétiques (isTrusted: false) ne déclenchent pas le light-dismiss
            // natif du popover. On simule via hidePopover() qui émet le vrai toggle event,
            // ce qui teste le chemin _onPanelToggle → onExternalClose → el.open = false.
            (panel as HTMLElement & { hidePopover(): void }).hidePopover();
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

    // ── Fallback CSS d'accessibilité ─────────────────────────────────────────

    // ── ar-dropdown-select (#333) ─────────────────────────────────────────────

    describe('ar-dropdown-select', () => {
        let selected: CustomEvent[];

        const menu = async (second = '<button id="i2">Item 2</button>'): Promise<void> => {
            el = await fixture(html`
                <ar-dropdown id="menu">
                    <button slot="trigger">Menu</button>
                    <ar-dropdown-item><button id="i1">Item 1</button></ar-dropdown-item>
                    <ar-dropdown-item .innerHTML=${second}></ar-dropdown-item>
                </ar-dropdown>
            `);
            selected = [];
            el.addEventListener('ar-dropdown-select', (e) => selected.push(e as CustomEvent));
            await openDropdown(el);
        };
        const control = (selector: string): HTMLElement => {
            const found = el.querySelector<HTMLElement>(selector);
            if (!found) throw new Error(`${selector} introuvable`);
            return found;
        };

        it('est émis au clic avec id et item, et ferme le menu', async () => {
            await menu();
            control('#i1').click();
            await aTimeout(20);
            expect(selected).to.have.length(1);
            expect(selected[0].detail.id).to.equal('menu');
            expect(selected[0].detail.item === control('#i1').parentElement).to.equal(true);
            expect(el.open).to.equal(false);
        });

        it('est émis à Entrée et à Espace sur un bouton', async () => {
            await menu();
            await sendKeys({ press: 'Enter' });
            await aTimeout(20);
            expect(selected).to.have.length(1);
            await openDropdown(el);
            await sendKeys({ press: 'Space' });
            await aTimeout(20);
            expect(selected).to.have.length(2);
        });

        it("Espace sur un lien active le lien et émet l'événement", async () => {
            await menu('<a id="i2" href="#espace">Item 2</a>');
            control('#i2').focus();
            await sendKeys({ press: 'Space' });
            await aTimeout(20);
            expect(selected).to.have.length(1);
            expect(location.hash).to.equal('#espace');
            history.replaceState(null, '', location.pathname + location.search);
        });

        it("annulé, le menu reste ouvert et le clic natif de l'item n'est pas annulé", async () => {
            await menu();
            el.addEventListener('ar-dropdown-select', (e) => e.preventDefault());
            let nativePrevented = true;
            control('#i1').addEventListener('click', (e) => {
                nativePrevented = e.defaultPrevented;
            });
            control('#i1').click();
            await aTimeout(20);
            expect(el.open).to.equal(true);
            expect(nativePrevented).to.equal(false);
        });

        it("n'est pas émis pour un item désactivé ni pour les flèches", async () => {
            await menu('<button id="i2" disabled>Item 2</button>');
            await sendKeys({ press: 'ArrowDown' });
            control('#i2').click();
            await aTimeout(20);
            expect(selected).to.have.length(0);
            expect(el.open).to.equal(true);
        });

        it("n'est pas émis hors mode menu", async () => {
            el = await fixture(html`
                <ar-dropdown>
                    <button slot="trigger">Menu</button>
                    <button id="free">Action</button>
                </ar-dropdown>
            `);
            const seen: Event[] = [];
            el.addEventListener('ar-dropdown-select', (e) => seen.push(e));
            await openDropdown(el);
            control('#free').click();
            expect(seen).to.have.length(0);
        });
    });

    describe('fallback CSS sans thème chargé', () => {
        it('le panel a un fond, un texte et une bordure visibles même sans ariane.css', async () => {
            el = await fixture(html`
                <ar-dropdown>
                    <button slot="trigger">Trigger</button>
                    <p>Contenu</p>
                </ar-dropdown>
            `);
            await openDropdown(el);
            const panel = getPanel(el);
            const computed = getComputedStyle(panel);

            // ariane.css n'est jamais chargé dans les tests (Vitest ni WTR) : ces
            // valeurs viennent uniquement du fallback système CSS4 posé dans
            // panel.styles.ts, pas d'un thème.
            expect(computed.backgroundColor).to.not.equal('');
            expect(computed.backgroundColor).to.not.equal('rgba(0, 0, 0, 0)');
            expect(computed.color).to.not.equal('');
            expect(computed.borderTopColor).to.not.equal('');
            expect(computed.borderTopColor).to.not.equal('rgba(0, 0, 0, 0)');
            expect(computed.borderTopWidth).to.equal('1px');
        });
    });

    // ── :state() cumulés (généralisation #251) ────────────────────────────────

    describe(':state() cumulés (open/disabled)', () => {
        it('expose :state(open) synchronisé avec open', async () => {
            el = await fixture(html`<ar-dropdown></ar-dropdown>`);
            expect(el.matches(':state(open)')).to.equal(false);

            el.open = true;
            await el.updateComplete;
            expect(el.matches(':state(open)')).to.equal(true);
        });

        it('expose :state(disabled) synchronisé avec disabled', async () => {
            el = await fixture(html`<ar-dropdown></ar-dropdown>`);
            el.disabled = true;
            await el.updateComplete;
            expect(el.matches(':state(disabled)')).to.equal(true);
        });
    });
});
