/// <reference types="mocha" />
/**
 * datepicker.browser.test.ts
 *
 * Tests nécessitant un vrai browser (Chromium via @web/test-runner) :
 *   - Focus à l'ouverture
 *   - Retour du focus au trigger à la fermeture
 *   - Navigation clavier dans la grille
 *   - Roving tabindex
 *   - Synchronisation input texte ↔ calendrier
 */
import { expect, fixture, html, aTimeout } from '@open-wc/testing';
import type { ArDatepicker } from './datepicker.js';
import './datepicker.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function openPicker(el: ArDatepicker): Promise<void> {
    el.open = true;
    await el.updateComplete;
    // Laisser le temps à _show() de terminer son flow async + focus
    await aTimeout(50);
}

// ──────────────────────────────────────────────────────────────────────────────

describe('ar-datepicker — browser', () => {
    let el: ArDatepicker;

    afterEach(() => el?.remove());

    // ── Focus à l'ouverture ───────────────────────────────────────────────────

    describe("focus à l'ouverture", () => {
        it("focus sur aujourd'hui quand aucune date sélectionnée", async () => {
            el = await fixture(html`<ar-datepicker></ar-datepicker>`);
            await openPicker(el);

            const focused = el.shadowRoot?.querySelector<HTMLButtonElement>(
                '[part="day"][tabindex="0"]',
            );
            expect(focused).to.not.equal(null);
            expect(el.shadowRoot?.activeElement).to.equal(focused);
        });

        it("focus sur la date sélectionnée à l'ouverture", async () => {
            el = await fixture(html`<ar-datepicker value="2026-06-12"></ar-datepicker>`);
            await openPicker(el);

            const focused = el.shadowRoot?.querySelector<HTMLButtonElement>(
                '[part="day"][tabindex="0"]',
            );
            expect(focused?.getAttribute('aria-label')).to.include('12');
        });
    });

    // ── Retour du focus au trigger à la fermeture ─────────────────────────────

    describe('focus retourné au trigger à la fermeture', () => {
        it('Escape retourne le focus au trigger', async () => {
            el = await fixture(html`<ar-datepicker></ar-datepicker>`);
            await openPicker(el);

            const panel = el.shadowRoot?.querySelector('[part="panel"]') as HTMLElement;
            panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            await el.updateComplete;
            await aTimeout(20);

            expect(el.shadowRoot?.activeElement).to.equal(
                el.shadowRoot?.querySelector('[part="trigger"]'),
            );
        });
    });

    // ── Navigation clavier ────────────────────────────────────────────────────

    describe('navigation clavier', () => {
        it("ArrowRight déplace le focus d'un jour", async () => {
            el = await fixture(html`<ar-datepicker value="2026-06-12"></ar-datepicker>`);
            await openPicker(el);

            const panel = el.shadowRoot?.querySelector('[part="panel"]') as HTMLElement;
            panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
            await el.updateComplete;
            await aTimeout(20);

            const focused = el.shadowRoot?.querySelector<HTMLButtonElement>(
                '[part="day"][tabindex="0"]',
            );
            expect(focused?.getAttribute('aria-label')).to.include('13');
        });

        it("ArrowDown déplace le focus d'une semaine", async () => {
            el = await fixture(html`<ar-datepicker value="2026-06-01"></ar-datepicker>`);
            await openPicker(el);

            const panel = el.shadowRoot?.querySelector('[part="panel"]') as HTMLElement;
            panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
            await el.updateComplete;
            await aTimeout(20);

            const focused = el.shadowRoot?.querySelector<HTMLButtonElement>(
                '[part="day"][tabindex="0"]',
            );
            expect(focused?.getAttribute('aria-label')).to.include('8');
        });

        it('PageDown navigue au mois suivant', async () => {
            // Forcer la locale fr pour que le label du mois soit en français
            el = await fixture(
                html`<ar-datepicker value="2026-06-12" locale="fr-FR"></ar-datepicker>`,
            );
            await openPicker(el);

            const panel = el.shadowRoot?.querySelector('[part="panel"]') as HTMLElement;
            panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }));
            await el.updateComplete;
            await aTimeout(20);

            const label = el.shadowRoot?.querySelector('[aria-live]');
            expect(label?.textContent?.toLowerCase()).to.include('juillet');
        });

        it("Shift+PageDown navigue à l'année suivante", async () => {
            el = await fixture(
                html`<ar-datepicker value="2026-06-12" locale="fr-FR"></ar-datepicker>`,
            );
            await openPicker(el);

            const panel = el.shadowRoot?.querySelector('[part="panel"]') as HTMLElement;
            panel.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'PageDown', shiftKey: true, bubbles: true }),
            );
            await el.updateComplete;
            await aTimeout(20);

            const label = el.shadowRoot?.querySelector('[aria-live]');
            expect(label?.textContent).to.include('2027');
        });

        it('Enter sélectionne le jour focalisé', async () => {
            el = await fixture(html`<ar-datepicker value="2026-06-12"></ar-datepicker>`);
            let changeDetail: Record<string, unknown> | null = null;
            el.addEventListener('ar-datepicker-input-change', (e) => {
                changeDetail = (e as CustomEvent).detail;
            });

            await openPicker(el);

            const panel = el.shadowRoot?.querySelector('[part="panel"]') as HTMLElement;
            panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            await el.updateComplete;
            await aTimeout(20);

            expect(changeDetail).to.not.equal(null);
            expect((changeDetail as Record<string, unknown>).value).to.equal('2026-06-12');
        });
    });

    // ── Mémorisation de la position de navigation ─────────────────────────────

    describe('mémorisation de position', () => {
        it('conserve le mois affiché après fermeture sans sélection', async () => {
            el = await fixture(html`<ar-datepicker locale="fr-FR"></ar-datepicker>`);
            await openPicker(el);

            // Naviguer 2 mois en avant via PageDown
            const panel = el.shadowRoot?.querySelector('[part="panel"]') as HTMLElement;
            panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }));
            await el.updateComplete;
            await aTimeout(20);
            panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }));
            await el.updateComplete;
            await aTimeout(20);

            const labelBefore = el.shadowRoot?.querySelector('[aria-live]')?.textContent;

            // Fermer sans sélectionner, puis rouvrir
            el.open = false;
            await el.updateComplete;
            await aTimeout(20);
            await openPicker(el);

            const labelAfter = el.shadowRoot?.querySelector('[aria-live]')?.textContent;
            expect(labelAfter).to.equal(labelBefore);
        });

        it('conserve le jour navigué après fermeture sans sélection', async () => {
            el = await fixture(html`<ar-datepicker value="2026-06-12"></ar-datepicker>`);
            await openPicker(el);

            // Naviguer au mois suivant via le bouton nav — focusedDate suit (même jour)
            const nextBtn = el.shadowRoot?.querySelector(
                '[part~="next-month"]',
            ) as HTMLButtonElement;
            nextBtn.click();
            await el.updateComplete;
            await aTimeout(20);

            const dayBefore = el.shadowRoot
                ?.querySelector('[part="day"][tabindex="0"]')
                ?.getAttribute('aria-label');

            // Fermer sans sélectionner, puis rouvrir
            el.open = false;
            await el.updateComplete;
            await aTimeout(20);
            await openPicker(el);

            const dayAfter = el.shadowRoot
                ?.querySelector('[part="day"][tabindex="0"]')
                ?.getAttribute('aria-label');
            expect(dayAfter).to.equal(dayBefore);
        });

        it('les boutons nav maintiennent le curseur dans le mois affiché', async () => {
            el = await fixture(html`<ar-datepicker value="2026-06-15"></ar-datepicker>`);
            await openPicker(el);

            // Simuler navigation souris : 2 clics sur "mois suivant"
            const nextBtn = el.shadowRoot?.querySelector(
                '[part~="next-month"]',
            ) as HTMLButtonElement;
            nextBtn.click();
            await el.updateComplete;
            await aTimeout(20);
            nextBtn.click();
            await el.updateComplete;
            await aTimeout(20);

            // Le curseur (tabindex="0") doit être dans le mois visible (août 2026)
            const focused = el.shadowRoot?.querySelector<HTMLButtonElement>(
                '[part="day"][tabindex="0"]',
            );
            expect(focused).to.not.equal(null);
            // Le jour doit être le 15 (même jour, mois décalé)
            expect(focused?.getAttribute('aria-label')).to.include('15');
        });

        it('revient au mois de la date sélectionnée à la réouverture', async () => {
            el = await fixture(
                html`<ar-datepicker value="2026-06-12" locale="fr-FR"></ar-datepicker>`,
            );
            await openPicker(el);

            // Naviguer 2 mois en avant
            const panel = el.shadowRoot?.querySelector('[part="panel"]') as HTMLElement;
            panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }));
            await el.updateComplete;
            await aTimeout(20);
            panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }));
            await el.updateComplete;
            await aTimeout(20);

            // Fermer sans sélectionner, puis rouvrir
            el.open = false;
            await el.updateComplete;
            await aTimeout(20);
            await openPicker(el);

            const label = el.shadowRoot?.querySelector('[aria-live]')?.textContent?.toLowerCase();
            expect(label).to.include('juin');
            expect(label).to.include('2026');
        });
    });

    // ── Roving tabindex ───────────────────────────────────────────────────────

    describe('roving tabindex', () => {
        it('un seul bouton day a tabindex="0" à la fois', async () => {
            el = await fixture(html`<ar-datepicker></ar-datepicker>`);
            await openPicker(el);

            const focused = el.shadowRoot?.querySelectorAll('[part="day"][tabindex="0"]') ?? [];
            expect(focused.length).to.equal(1);
        });
    });

    // ── Synchronisation input texte ↔ calendrier ──────────────────────────────

    describe('synchronisation', () => {
        it('blur sur input valide met à jour la sélection dans le calendrier', async () => {
            el = await fixture(html`<ar-datepicker></ar-datepicker>`);
            // Simuler une saisie complète suivie d'un blur (commit de la valeur)
            const input = el.inputElement;
            input.value = '12/06/2026';
            input.dispatchEvent(new Event('blur', { bubbles: true }));
            await el.updateComplete;

            await openPicker(el);

            // aria-selected est sur <td role="gridcell">, pas sur le bouton
            const selectedCell = el.shadowRoot?.querySelector(
                '[role="gridcell"][aria-selected="true"]',
            );
            const selectedBtn = selectedCell?.querySelector('[part="day"]');
            expect(selectedBtn?.getAttribute('aria-label')).to.include('12');
        });
    });
});
