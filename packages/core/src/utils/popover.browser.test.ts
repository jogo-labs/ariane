/// <reference types="mocha" />
import { LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { fixture, html, expect, aTimeout } from '@open-wc/testing';
import { Popover } from './popover.js';

@customElement('test-popover-host')
class TestPopoverHost extends LitElement {
    updateCount = 0;
    override requestUpdate() {
        this.updateCount++;
        return super.requestUpdate();
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'test-popover-host': TestPopoverHost;
    }
}

async function setupPopover(options: ConstructorParameters<typeof Popover>[1] = {}) {
    const host = await fixture<TestPopoverHost>(html`
        <test-popover-host>
            <button id="trigger">Trigger</button>
            <div id="panel">Panel</div>
        </test-popover-host>
    `);
    const trigger = host.querySelector<HTMLElement>('#trigger');
    const panel = host.querySelector<HTMLElement>('#panel');
    if (!trigger || !panel) throw new Error('setupPopover: trigger or panel not found');
    const popover = new Popover(host, options);
    popover.attach(trigger, panel);
    return { host, trigger, panel, popover };
}

describe('Popover', () => {
    describe('show / hide', () => {
        it('show() met le panel en :popover-open', async () => {
            const { panel, popover } = await setupPopover();
            await popover.show();
            expect(panel.matches(':popover-open')).to.equal(true);
        });

        it('hide() ferme le panel', async () => {
            const { panel, popover } = await setupPopover();
            await popover.show();
            popover.hide();
            expect(panel.matches(':popover-open')).to.equal(false);
        });

        it("isOpen reflète l'état", async () => {
            const { popover } = await setupPopover();
            expect(popover.isOpen).to.equal(false);
            await popover.show();
            expect(popover.isOpen).to.equal(true);
            popover.hide();
            expect(popover.isOpen).to.equal(false);
        });

        it('show() résout la promise après positionnement (transform posé)', async () => {
            const { panel, popover } = await setupPopover();
            await popover.show();
            expect(panel.style.transform).to.not.equal('');
        });

        it('host.requestUpdate() est appelé lors de show()', async () => {
            const { host, popover } = await setupPopover();
            const before = host.updateCount;
            await popover.show();
            expect(host.updateCount).to.be.greaterThan(before);
        });
    });

    describe('popoverType: auto — onExternalClose', () => {
        it("onExternalClose est appelé lors d'un light-dismiss", async () => {
            let called = false;
            const { panel, popover } = await setupPopover({
                popoverType: 'auto',
                onExternalClose: () => {
                    called = true;
                },
            });
            await popover.show();
            (panel as HTMLElement & { hidePopover(): void }).hidePopover();
            await aTimeout(50);
            expect(called).to.equal(true);
        });

        it('isOpen devient false après light-dismiss', async () => {
            const { panel, popover } = await setupPopover({ popoverType: 'auto' });
            await popover.show();
            (panel as HTMLElement & { hidePopover(): void }).hidePopover();
            await aTimeout(50);
            expect(popover.isOpen).to.equal(false);
        });
    });

    describe('popoverType: manual', () => {
        it("onExternalClose n'est pas appelé (pas de light-dismiss)", async () => {
            let called = false;
            const { popover } = await setupPopover({
                popoverType: 'manual',
                onExternalClose: () => {
                    called = true;
                },
            });
            await popover.show();
            popover.hide();
            await aTimeout(50);
            expect(called).to.equal(false);
        });
    });

    describe('attach()', () => {
        it('génère un id sur le panel si absent', async () => {
            const host = await fixture<TestPopoverHost>(
                html`<test-popover-host></test-popover-host>`,
            );
            const trigger = document.createElement('button');
            const panel = document.createElement('div');
            host.appendChild(trigger);
            host.appendChild(panel);
            const popover = new Popover(host);
            popover.attach(trigger, panel);
            expect(panel.id).to.match(/^ar-popover-/);
        });

        it('pose popover="auto" sur le panel', async () => {
            const { panel } = await setupPopover({ popoverType: 'auto' });
            expect(panel.getAttribute('popover')).to.equal('auto');
        });

        it('pose popover="manual" sur le panel', async () => {
            const { panel } = await setupPopover({ popoverType: 'manual' });
            expect(panel.getAttribute('popover')).to.equal('manual');
        });
    });

    describe('destroy()', () => {
        it('ferme le panel si ouvert', async () => {
            const { panel, popover } = await setupPopover();
            await popover.show();
            popover.destroy();
            expect(panel.matches(':popover-open')).to.equal(false);
        });
    });
});
