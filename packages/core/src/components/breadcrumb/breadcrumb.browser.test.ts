/// <reference types="mocha" />
import { fixture, html, expect, aTimeout, elementUpdated } from '@open-wc/testing';
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
            // panel.styles.ts, pas d'un thème.
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

    // ── Collision hover/focus (#157) ─────────────────────────────────────────

    describe('collision hover/focus (#157)', () => {
        // Vérifie que :focus-visible seul (clavier, sans souris) applique bien le token
        // bg-focus. Ne vérifie PAS la combinaison réelle hover+focus simultanés (un clic
        // souris) : nécessiterait @web/test-runner-commands (sendMouse), non installé,
        // hors scope de ce correctif — vérifié manuellement via Playwright contre le
        // serveur de dev de la documentation (background attendu : token hover, pas
        // focus, après un clic souris réel).
        it(':focus-visible seul applique le token bg-focus, indépendamment de :hover', async () => {
            el = await mobileBreadcrumb();
            el.style.setProperty('--ar-breadcrumb-toggle-bg', 'rgb(1, 1, 1)');
            el.style.setProperty('--ar-breadcrumb-toggle-bg-hover', 'rgb(2, 2, 2)');
            el.style.setProperty('--ar-breadcrumb-toggle-bg-focus', 'rgb(3, 3, 3)');
            const trigger = getBtn(el);

            trigger.focus();
            await elementUpdated(el);

            expect(trigger.matches(':focus-visible')).to.equal(true);
            expect(getComputedStyle(trigger).backgroundColor).to.equal('rgb(3, 3, 3)');
        });
    });

    describe('propriétés logiques (RTL)', () => {
        it('[part="breadcrumb"] utilise padding-inline-end : bascule à gauche sous dir="rtl"', async () => {
            el = await fixture<ArBreadcrumb>(html`
                <ar-breadcrumb dir="rtl">
                    <ar-breadcrumb-item href="/" label="Accueil"></ar-breadcrumb-item>
                    <ar-breadcrumb-item current label="Page"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            const nav = el.shadowRoot?.querySelector<HTMLElement>('[part="breadcrumb"]');
            if (!nav) throw new Error('[part="breadcrumb"] introuvable');
            const style = getComputedStyle(nav);
            // padding-inline-end sous dir="rtl" se résout physiquement à GAUCHE — un
            // padding-right physique resterait à droite quel que soit dir. Seule une
            // propriété logique peut produire ce résultat ; un test purement en LTR ne
            // distingue pas logique/physique (les deux donnent le même résultat en LTR).
            expect(style.paddingLeft).to.equal('4px');
            expect(style.paddingRight).to.equal('0px');
        });
    });
});
