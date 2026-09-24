import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { afterEach, describe, expect, it } from 'vitest';
import { TooltipController } from './tooltip.controller.js';
import { fixture, mockPopoverPanel } from '../test-utils.js';

// ── Fixture component ──────────────────────────────────────────────────────────

@customElement('test-tooltip-controller')
class TestTooltipHost extends LitElement {
    readonly tooltip = new TooltipController(this, { cssVarPrefix: 'tooltip' });

    override render() {
        return html`
            <button part="trigger">Trigger</button>
            <div part="panel">Contenu</div>
        `;
    }
}

@customElement('test-tooltip-controller-no-prefix')
class TestTooltipHostNoPrefix extends LitElement {
    readonly tooltip = new TooltipController(this);

    override render() {
        return html`
            <button part="trigger">Trigger</button>
            <div part="panel">Contenu</div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'test-tooltip-controller': TestTooltipHost;
        'test-tooltip-controller-no-prefix': TestTooltipHostNoPrefix;
    }
}

type ControllerInternals = { _readCssVar(kind: 'distance' | 'offset'): number };

// ──────────────────────────────────────────────────────────────────────────────

describe('TooltipController', () => {
    let el: TestTooltipHost;

    afterEach(() => {
        el?.remove();
    });

    describe('attach()', () => {
        it('ajoute role="tooltip" sur le panel et aria-describedby sur le trigger', async () => {
            el = await fixture('<test-tooltip-controller></test-tooltip-controller>');
            const trigger = el.shadowRoot?.querySelector('[part="trigger"]') as HTMLElement;
            const panel = el.shadowRoot?.querySelector('[part="panel"]') as HTMLElement;
            el.tooltip.attach(trigger, panel);

            expect(panel.getAttribute('role')).toBe('tooltip');
            expect(trigger.getAttribute('aria-describedby')).toBe(el.id);
        });

        it("génère un id sur l'hôte si absent", async () => {
            el = await fixture('<test-tooltip-controller></test-tooltip-controller>');
            expect(el.id).toBe('');
            const trigger = el.shadowRoot?.querySelector('[part="trigger"]') as HTMLElement;
            const panel = el.shadowRoot?.querySelector('[part="panel"]') as HTMLElement;
            el.tooltip.attach(trigger, panel);

            expect(el.id).toMatch(/^ar-tooltip-/);
        });

        it("conserve l'id existant s'il est déjà défini", async () => {
            el = await fixture(
                '<test-tooltip-controller id="custom-id"></test-tooltip-controller>',
            );
            const trigger = el.shadowRoot?.querySelector('[part="trigger"]') as HTMLElement;
            const panel = el.shadowRoot?.querySelector('[part="panel"]') as HTMLElement;
            el.tooltip.attach(trigger, panel);

            expect(el.id).toBe('custom-id');
            expect(trigger.getAttribute('aria-describedby')).toBe('custom-id');
        });
    });

    describe('isOpen / show() / hide()', () => {
        it('reflète le cycle show() → hide() une fois attaché', async () => {
            el = await fixture('<test-tooltip-controller></test-tooltip-controller>');
            const trigger = el.shadowRoot?.querySelector('[part="trigger"]') as HTMLElement;
            const panel = el.shadowRoot?.querySelector('[part="panel"]') as HTMLElement;
            el.tooltip.attach(trigger, panel);
            mockPopoverPanel(el, 'panel');

            expect(el.tooltip.isOpen).toBe(false);

            await el.tooltip.show();
            expect(el.tooltip.isOpen).toBe(true);

            el.tooltip.hide();
            expect(el.tooltip.isOpen).toBe(false);
        });
    });

    describe('_readCssVar (lecture --ar-<prefix>-distance/offset)', () => {
        it("résout les valeurs numériques définies sur l'hôte", async () => {
            el = await fixture('<test-tooltip-controller></test-tooltip-controller>');
            el.style.setProperty('--ar-tooltip-distance', '12px');
            el.style.setProperty('--ar-tooltip-offset', '4px');

            const internals = el.tooltip as unknown as ControllerInternals;
            expect(internals._readCssVar('distance')).toBe(12);
            expect(internals._readCssVar('offset')).toBe(4);
        });

        it('retombe à 0 quand la custom property est absente', async () => {
            el = await fixture('<test-tooltip-controller></test-tooltip-controller>');

            const internals = el.tooltip as unknown as ControllerInternals;
            expect(internals._readCssVar('distance')).toBe(0);
            expect(internals._readCssVar('offset')).toBe(0);
        });

        it('retombe à 0 sans cssVarPrefix configuré', async () => {
            const noPrefixEl = await fixture<TestTooltipHostNoPrefix>(
                '<test-tooltip-controller-no-prefix></test-tooltip-controller-no-prefix>',
            );
            noPrefixEl.style.setProperty('--ar-tooltip-distance', '12px');

            const internals = noPrefixEl.tooltip as unknown as ControllerInternals;
            expect(internals._readCssVar('distance')).toBe(0);

            noPrefixEl.remove();
        });
    });
});
