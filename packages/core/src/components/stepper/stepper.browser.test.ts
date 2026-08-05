/// <reference types="mocha" />
/**
 * stepper.browser.test.ts
 *
 * Tests nécessitant un vrai browser (Chromium via @web/test-runner) :
 *   - API Popover native (showPopover / hidePopover / :popover-open)
 *   - Chargement initial en mode mobile (régression : attach différé)
 */
import { fixture, html, expect, aTimeout, elementUpdated } from '@open-wc/testing';
import type { ArStepper } from './stepper.js';
import './index.js';
import '../stepper-item/index.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPanel(el: ArStepper): HTMLElement {
    const panel = el.shadowRoot?.querySelector<HTMLElement>('#stepper-dropdown-menu');
    if (!panel) throw new Error('#stepper-dropdown-menu introuvable');
    return panel;
}

function getTrigger(el: ArStepper): HTMLElement {
    const btn = el.shadowRoot?.querySelector<HTMLElement>('[part="trigger"]');
    if (!btn) throw new Error('[part="trigger"] introuvable');
    return btn;
}

async function mobileStepper(): Promise<ArStepper> {
    const el = await fixture<ArStepper>(html`
        <ar-stepper current-path="/step2" desktop-from="9999">
            <ar-stepper-item label="Étape 1" href="/step1"></ar-stepper-item>
            <ar-stepper-item label="Étape 2" href="/step2"></ar-stepper-item>
            <ar-stepper-item label="Étape 3" href="/step3"></ar-stepper-item>
        </ar-stepper>
    `);
    await aTimeout(50);
    return el;
}

// ──────────────────────────────────────────────────────────────────────────────

describe('ar-stepper — browser', () => {
    let el: ArStepper;

    afterEach(() => el?.remove());

    describe('chargement initial en mode mobile', () => {
        it('le panel est attaché dès le premier affichage mobile (régression #attach-initial)', async () => {
            el = await mobileStepper();
            const panel = getPanel(el);
            // Le controller doit avoir posé popover="auto" via attach()
            expect(panel.hasAttribute('popover')).to.equal(true);
        });

        it('le trigger a aria-expanded="false" après attach initial', async () => {
            el = await mobileStepper();
            const trigger = getTrigger(el);
            expect(trigger.getAttribute('aria-expanded')).to.equal('false');
        });

        it('le panel est en :popover-open après un clic sur le trigger', async () => {
            el = await mobileStepper();
            getTrigger(el).click();
            await aTimeout(50);
            expect(getPanel(el).matches(':popover-open')).to.equal(true);
        });

        it('le panel se ferme après un deuxième clic', async () => {
            el = await mobileStepper();
            getTrigger(el).click();
            await aTimeout(50);
            getTrigger(el).click();
            await aTimeout(50);
            expect(getPanel(el).matches(':popover-open')).to.equal(false);
        });

        it('le panel a part="panel"', async () => {
            el = await mobileStepper();
            const panel = el.shadowRoot?.querySelector('[part="panel"]');
            expect(panel).to.not.equal(null);
        });
    });

    // ── Fallback CSS d'accessibilité ─────────────────────────────────────────

    describe('fallback CSS sans thème chargé', () => {
        it('le panel a un fond et une bordure visibles même sans default.css', async () => {
            el = await mobileStepper();
            getTrigger(el).click();
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
    });

    describe('focus après activation (#154)', () => {
        it('focalise le nouvel élément courant quand le consommateur répond à ar-stepper-step-change', async () => {
            // desktop-from="0" force le mode desktop : évite le chemin mobile (attach du
            // popover de navigation), qui ré-exécute `void this.updateComplete.then(...)`
            // sur chaque cycle tant que le dropdown n'est pas attaché — un pattern
            // réentrant équivalent à celui corrigé pour le focus (#154), non lié au
            // scénario testé ici. Le forcer en desktop isole le comportement vérifié.
            el = await fixture<ArStepper>(html`
                <ar-stepper current-path="/b" desktop-from="0">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            await elementUpdated(el);
            await elementUpdated(el);

            el.addEventListener('ar-stepper-step-change', (event: Event) => {
                el.currentPath = (event as CustomEvent<{ path: string }>).detail.path;
            });

            const shadowRoot = el.shadowRoot as ShadowRoot;
            const linkA = shadowRoot.querySelector('a[data-path="/a"]') as HTMLElement;
            linkA.focus();
            linkA.click();
            await elementUpdated(el);

            const newCurrent = shadowRoot.querySelector('[data-path="/a"]') as HTMLElement;
            expect(newCurrent.tagName.toLowerCase()).to.equal('div');
            expect(shadowRoot.activeElement).to.equal(newCurrent);
            expect(newCurrent.matches(':focus-visible')).to.equal(true);
        });
    });
});
