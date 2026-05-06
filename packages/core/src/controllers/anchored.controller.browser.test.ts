/// <reference types="mocha" />
import { LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { fixture, html, expect, aTimeout } from '@open-wc/testing';
import { AnchoredController } from './anchored.controller.js';

@customElement('test-anchored-host')
class TestAnchoredHost extends LitElement {
    override requestUpdate() {
        return super.requestUpdate();
    }
}
declare global {
    interface HTMLElementTagNameMap {
        'test-anchored-host': TestAnchoredHost;
    }
}

async function setupAnchored(options: ConstructorParameters<typeof AnchoredController>[1] = {}) {
    const host = await fixture<TestAnchoredHost>(html`
        <test-anchored-host>
            <button id="trigger">Trigger</button>
            <div id="panel">Panel</div>
        </test-anchored-host>
    `);
    const trigger = host.querySelector<HTMLElement>('#trigger');
    const panel = host.querySelector<HTMLElement>('#panel');
    if (!trigger) throw new Error('#trigger introuvable');
    if (!panel) throw new Error('#panel introuvable');
    const ctrl = new AnchoredController(host, options);
    ctrl.attach(trigger, panel);
    return { host, trigger, panel, ctrl };
}

describe('AnchoredController', () => {
    describe('ARIA — popupMode: menu (défaut)', () => {
        it('attach() pose aria-haspopup="true"', async () => {
            const { trigger } = await setupAnchored({ popupMode: 'menu' });
            expect(trigger.getAttribute('aria-haspopup')).to.equal('true');
        });

        it('attach() ne pose pas aria-controls (non supporté cross-shadow-DOM)', async () => {
            const { trigger } = await setupAnchored({ popupMode: 'menu' });
            expect(trigger.hasAttribute('aria-controls')).to.equal(false);
        });

        it('attach() pose aria-expanded="false"', async () => {
            const { trigger } = await setupAnchored({ popupMode: 'menu' });
            expect(trigger.getAttribute('aria-expanded')).to.equal('false');
        });

        it('show() met aria-expanded="true"', async () => {
            const { trigger, ctrl } = await setupAnchored({ popupMode: 'menu' });
            await ctrl.show();
            expect(trigger.getAttribute('aria-expanded')).to.equal('true');
            ctrl.hide();
        });

        it('hide() remet aria-expanded="false"', async () => {
            const { trigger, ctrl } = await setupAnchored({ popupMode: 'menu' });
            await ctrl.show();
            ctrl.hide();
            expect(trigger.getAttribute('aria-expanded')).to.equal('false');
        });
    });

    describe('ARIA — popupMode: dialog', () => {
        it('attach() pose aria-haspopup="dialog"', async () => {
            const { trigger } = await setupAnchored({ popupMode: 'dialog' });
            expect(trigger.getAttribute('aria-haspopup')).to.equal('dialog');
        });
    });

    describe('isOpen', () => {
        it('isOpen est false avant show()', async () => {
            const { ctrl } = await setupAnchored();
            expect(ctrl.isOpen).to.equal(false);
        });

        it('isOpen est true après show(), false après hide()', async () => {
            const { ctrl } = await setupAnchored();
            await ctrl.show();
            expect(ctrl.isOpen).to.equal(true);
            ctrl.hide();
            expect(ctrl.isOpen).to.equal(false);
        });
    });

    describe('toggle()', () => {
        it('toggle() ouvre si fermé', async () => {
            const { ctrl } = await setupAnchored();
            ctrl.toggle();
            await aTimeout(50);
            expect(ctrl.isOpen).to.equal(true);
            ctrl.hide();
        });

        it('toggle() ferme si ouvert', async () => {
            const { ctrl } = await setupAnchored();
            await ctrl.show();
            ctrl.toggle();
            expect(ctrl.isOpen).to.equal(false);
        });
    });

    describe('scroll lock — multi-instance', () => {
        it("deux controllers sur le même conteneur : le conteneur reste locké après hide() d'un seul", async () => {
            const container = document.createElement('div');
            container.style.overflowY = 'auto';
            document.body.appendChild(container);

            const makeHost = async () => {
                const h = await fixture<TestAnchoredHost>(html`
                    <test-anchored-host>
                        <button id="t">T</button>
                        <div id="p">P</div>
                    </test-anchored-host>
                `);
                container.appendChild(h);
                return h;
            };

            const h1 = await makeHost();
            const h2 = await makeHost();
            const ctrl1 = new AnchoredController(h1, { lockScroll: true });
            const ctrl2 = new AnchoredController(h2, { lockScroll: true });
            const t1 = h1.querySelector<HTMLElement>('#t');
            const p1 = h1.querySelector<HTMLElement>('#p');
            const t2 = h2.querySelector<HTMLElement>('#t');
            const p2 = h2.querySelector<HTMLElement>('#p');
            if (!t1 || !p1 || !t2 || !p2) throw new Error('éléments introuvables');
            ctrl1.attach(t1, p1);
            ctrl2.attach(t2, p2);

            await ctrl1.show();
            await ctrl2.show();
            expect(container.style.overflowY).to.equal('hidden');

            ctrl1.hide();
            expect(container.style.overflowY).to.equal('hidden');

            ctrl2.hide();
            expect(container.style.overflowY).to.equal('auto');

            container.remove();
        });
    });

    describe('onExternalClose', () => {
        it("onExternalClose est appelé lors d'un light-dismiss et met aria-expanded à false", async () => {
            let called = false;
            const { trigger, panel, ctrl } = await setupAnchored({
                onExternalClose: () => {
                    called = true;
                },
            });
            await ctrl.show();
            (panel as HTMLElement & { hidePopover(): void }).hidePopover();
            await aTimeout(50);
            expect(called).to.equal(true);
            expect(trigger.getAttribute('aria-expanded')).to.equal('false');
        });
    });
});
