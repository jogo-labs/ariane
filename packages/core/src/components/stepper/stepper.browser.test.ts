/// <reference types="mocha" />
/**
 * stepper.browser.test.ts
 *
 * Tests nécessitant un vrai browser (Chromium via @web/test-runner) :
 *   - API Popover native (showPopover / hidePopover / :popover-open)
 *   - Chargement initial en mode mobile (régression : attach différé)
 */
import { fixture, html, expect, aTimeout } from '@open-wc/testing';
import type { ArStepper } from './stepper.js';
import './stepper.js';
import '../stepper-item/stepper-item.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPanel(el: ArStepper): HTMLElement {
    const panel = el.shadowRoot?.querySelector<HTMLElement>('#stepper-dropdown-menu');
    if (!panel) throw new Error('#stepper-dropdown-menu introuvable');
    return panel;
}

function getTrigger(el: ArStepper): HTMLElement {
    const btn = el.shadowRoot?.querySelector<HTMLElement>('.btn-stepper-mobile');
    if (!btn) throw new Error('.btn-stepper-mobile introuvable');
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
    });
});
