/// <reference types="mocha" />
import { fixture, html, expect, aTimeout } from '@open-wc/testing';
import './index.js';
import '../breadcrumb-item/index.js';
import type { ArBreadcrumb } from './breadcrumb.js';

function getBtn(el: ArBreadcrumb): HTMLButtonElement {
    const btn = el.shadowRoot?.querySelector<HTMLButtonElement>('[part="trigger"]');
    if (!btn) throw new Error('[part="trigger"] introuvable');
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

    // ── Fallback CSS d'accessibilité ─────────────────────────────────────────

    describe('fallback CSS sans thème chargé', () => {
        it('le panel a un fond et une bordure visibles même sans default.css', async () => {
            el = await mobileBreadcrumb();
            getBtn(el).click();
            await aTimeout(50);
            const panel = getPanel(el);
            const computed = getComputedStyle(panel);

            // default.css n'est jamais chargé dans les tests (Vitest ni WTR) : ces
            // valeurs viennent uniquement du fallback système CSS4 posé dans
            // breadcrumb.styles.ts, pas d'un thème.
            expect(computed.backgroundColor).to.not.equal('');
            expect(computed.backgroundColor).to.not.equal('rgba(0, 0, 0, 0)');
            expect(computed.borderTopColor).to.not.equal('');
            expect(computed.borderTopColor).to.not.equal('rgba(0, 0, 0, 0)');
            expect(computed.borderTopWidth).to.equal('1px');
        });

        it('le bouton home a une taille de cible tactile même sans default.css', async () => {
            el = await mobileBreadcrumb();
            const home = el.shadowRoot?.querySelector<HTMLElement>('[part="home"]');
            if (!home) throw new Error('[part="home"] introuvable');
            const computed = getComputedStyle(home);
            expect(parseFloat(computed.minHeight)).to.be.greaterThan(0);
        });

        it('le bouton trigger a une taille de cible tactile même sans default.css', async () => {
            el = await mobileBreadcrumb();
            const trigger = getBtn(el);
            const computed = getComputedStyle(trigger);
            expect(parseFloat(computed.minHeight)).to.be.greaterThan(0);
            expect(parseFloat(computed.minWidth)).to.be.greaterThan(0);
        });
    });
});
