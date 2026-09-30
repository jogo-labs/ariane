/// <reference types="mocha" />
/**
 * Un panneau flottant est masqué par défaut et n'est affiché que par `:popover-open`.
 *
 * Sur un navigateur sans API Popover, `:popover-open` est une pseudo-classe inconnue : une
 * règle qui la contient est ignorée. Le panneau doit donc rester masqué, pas s'afficher en
 * permanence (une règle `:not(:popover-open) { display: none }` est ignorée en entier).
 */
import { fixture, html, expect, aTimeout } from '@open-wc/testing';
import type { CSSResult, CSSResultGroup } from 'lit';
import type { ArDropdown } from '../../components/dropdown/dropdown.js';
import type { ArTooltip } from '../../components/tooltip/tooltip.js';
import '../../components/dropdown/index.js';
import '../../components/tooltip/index.js';
import panelStyles from './panel.styles.js';
import tooltipStyles from '../../components/tooltip/tooltip.styles.js';

function cssTextOf(group: CSSResultGroup): string {
    if (Array.isArray(group)) return group.map((g) => cssTextOf(g)).join('\n');
    return (group as CSSResult).cssText;
}

/** Monte `<div part=…>` dans un shadow root avec le CSS réel, `:popover-open` rendue inconnue. */
function mountWithoutPopoverSupport(styles: CSSResultGroup, part: string): HTMLElement {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = host.attachShadow({ mode: 'open' });
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssTextOf(styles).replaceAll(':popover-open', ':popover-indisponible'));
    root.adoptedStyleSheets = [sheet];
    const el = document.createElement('div');
    el.setAttribute('part', part);
    el.textContent = 'Contenu';
    root.appendChild(el);
    return el;
}

describe('panneaux flottants — masqués par défaut', () => {
    describe('navigateur sans :popover-open (émulé)', () => {
        let panel: HTMLElement;
        afterEach(
            () => panel?.getRootNode() instanceof ShadowRoot && panel.getRootNode().host.remove(),
        );

        it('[part=panel] reste en display: none', () => {
            panel = mountWithoutPopoverSupport(panelStyles, 'panel');
            expect(getComputedStyle(panel).display).to.equal('none');
        });

        it('[part=tooltip] reste en display: none', () => {
            panel = mountWithoutPopoverSupport(tooltipStyles, 'tooltip');
            expect(getComputedStyle(panel).display).to.equal('none');
        });
    });

    // Floating UI mesure le panneau : il doit être affiché (donc mesurable) dès showPopover().
    describe('positionnement Floating UI avec le CSS réel', () => {
        it('ar-dropdown : panneau affiché, mesuré et placé sous le trigger', async () => {
            const el = await fixture<ArDropdown>(html`
                <ar-dropdown>
                    <button slot="trigger">Trigger</button>
                    <p>Contenu</p>
                </ar-dropdown>
            `);
            const panel = el.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!;
            expect(getComputedStyle(panel).display).to.equal('none');
            el.open = true;
            await el.updateComplete;
            await aTimeout(50);
            const box = panel.getBoundingClientRect();
            const trigger = el.querySelector('button')!.getBoundingClientRect();
            expect(getComputedStyle(panel).display).to.equal('block');
            expect(box.width).to.be.greaterThan(0);
            expect(box.height).to.be.greaterThan(0);
            expect(panel.style.transform).to.match(/^translate\(/);
            expect(box.top).to.be.at.least(trigger.bottom - 1);
            el.remove();
        });

        it('ar-tooltip : bulle affichée, mesurée et placée au-dessus du trigger', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div style="padding-top: 80px">
                    <button id="pv-btn">x</button>
                    <ar-tooltip for="pv-btn" show-delay="0">Aide</ar-tooltip>
                </div>
            `);
            const tip = wrapper.querySelector<ArTooltip>('ar-tooltip')!;
            const bubble = tip.shadowRoot!.querySelector<HTMLElement>('[part="tooltip"]')!;
            expect(getComputedStyle(bubble).display).to.equal('none');
            wrapper.querySelector('#pv-btn')!.dispatchEvent(new MouseEvent('mouseenter'));
            await aTimeout(80);
            const box = bubble.getBoundingClientRect();
            const trigger = wrapper.querySelector('#pv-btn')!.getBoundingClientRect();
            expect(getComputedStyle(bubble).display).to.equal('block');
            expect(box.width).to.be.greaterThan(0);
            expect(box.height).to.be.greaterThan(0);
            expect(bubble.style.transform).to.match(/^translate\(/);
            expect(box.bottom).to.be.at.most(trigger.top + 1);
        });
    });
});
