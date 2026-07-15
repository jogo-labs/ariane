/// <reference types="mocha" />
import { fixture, html, expect, aTimeout } from '@open-wc/testing';
import './index.js';
import '../breadcrumb-item/index.js';
import type { ArBreadcrumb } from './breadcrumb.js';

function getBtn(el: ArBreadcrumb): HTMLButtonElement {
    const btn = el.shadowRoot?.querySelector<HTMLButtonElement>('#breadcrumb-dropdown');
    if (!btn) throw new Error('#breadcrumb-dropdown introuvable');
    return btn;
}

function getPanel(el: ArBreadcrumb): HTMLElement {
    const panel = el.shadowRoot?.querySelector<HTMLElement>('[part="panel"]');
    if (!panel) throw new Error('[part="panel"] introuvable');
    return panel;
}

async function mobileBreadcrumb(): Promise<ArBreadcrumb> {
    const el = await fixture<ArBreadcrumb>(html`
        <ar-breadcrumb style="width:400px">
            <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
            <ar-breadcrumb-item label="Catégorie" href="/cat"></ar-breadcrumb-item>
            <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
        </ar-breadcrumb>
    `);
    (el as ArBreadcrumb & { isMobile: boolean }).isMobile = true;
    await el.updateComplete;
    return el;
}

describe('ar-breadcrumb — browser', () => {
    let el: ArBreadcrumb;

    afterEach(() => el?.remove());

    describe('ouverture / fermeture', () => {
        it('le panel est en :popover-open après ouverture', async () => {
            el = await mobileBreadcrumb();
            getBtn(el).click();
            await aTimeout(50);
            expect(getPanel(el).matches(':popover-open')).to.equal(true);
        });

        it("le panel n'est plus en :popover-open après fermeture", async () => {
            el = await mobileBreadcrumb();
            getBtn(el).click();
            await aTimeout(50);
            getBtn(el).click();
            await aTimeout(50);
            expect(getPanel(el).matches(':popover-open')).to.equal(false);
        });

        it('aria-expanded="true" après ouverture', async () => {
            el = await mobileBreadcrumb();
            getBtn(el).click();
            await aTimeout(50);
            expect(getBtn(el).getAttribute('aria-expanded')).to.equal('true');
        });

        it('aria-expanded="false" après fermeture', async () => {
            el = await mobileBreadcrumb();
            getBtn(el).click();
            await aTimeout(50);
            getBtn(el).click();
            await aTimeout(50);
            expect(getBtn(el).getAttribute('aria-expanded')).to.equal('false');
        });
    });

    describe('structure', () => {
        it('le panel a part="panel"', async () => {
            el = await mobileBreadcrumb();
            const panel = el.shadowRoot?.querySelector('[part="panel"]');
            expect(panel).to.not.equal(null);
        });
    });

    describe('light-dismiss', () => {
        it('un hidePopover() externe ferme le panel et émet ar-breadcrumb-hide une seule fois', async () => {
            el = await mobileBreadcrumb();
            let callCount = 0;
            el.addEventListener('ar-breadcrumb-hide', () => {
                callCount += 1;
            });
            getBtn(el).click();
            await aTimeout(50);

            (getPanel(el) as HTMLElement & { hidePopover(): void }).hidePopover();
            await aTimeout(50);

            expect(callCount).to.equal(1);
            expect(getPanel(el).matches(':popover-open')).to.equal(false);
        });
    });
});
