/// <reference types="mocha" />
/**
 * datepicker.a11y.test.ts
 *
 * Tests d'accessibilité structurels pour ar-datepicker, via @web/test-runner.
 * Utilise @open-wc/testing (axe-core intégré via expect(el).to.be.accessible()).
 */
import { expect, fixture, html, aTimeout } from '@open-wc/testing';
import type { ArDatepicker } from './datepicker.js';
import './datepicker.js';

// ─── Helper ───────────────────────────────────────────────────────────────────

async function openPicker(el: ArDatepicker): Promise<void> {
    el.open = true;
    await el.updateComplete;
    // Laisser le temps à _show() de terminer son flow async (AnchoredController + focus)
    await aTimeout(50);
}

// ──────────────────────────────────────────────────────────────────────────────

describe('ar-datepicker — accessibilité', () => {
    let el: ArDatepicker;

    afterEach(() => el?.remove());

    // ── Audit axe-core ────────────────────────────────────────────────────────

    it("aucune violation axe à l'état fermé", async () => {
        el = await fixture(html`
            <ar-datepicker label="Date de naissance">
                <span slot="hint">Format attendu : jj/mm/aaaa</span>
            </ar-datepicker>
        `);
        await expect(el).to.be.accessible();
    });

    it("aucune violation axe à l'état ouvert", async () => {
        el = await fixture(html`<ar-datepicker label="Date de naissance"></ar-datepicker>`);
        await openPicker(el);
        // color-contrast ignoré : composant headless sans tokens par défaut (pas de couleurs définies)
        await expect(el).to.be.accessible({ ignoredRules: ['color-contrast'] });
    });

    // ── aria-describedby ──────────────────────────────────────────────────────

    it('aria-describedby résolu — les IDs existent dans le shadow DOM', async () => {
        el = await fixture(html`<ar-datepicker></ar-datepicker>`);
        const input = el.inputElement;
        const describedBy = input.getAttribute('aria-describedby') ?? '';
        const ids = describedBy.split(' ').filter(Boolean);
        expect(ids.length).to.be.greaterThan(0);
        ids.forEach((id) => {
            const target = el.shadowRoot?.getElementById(id);
            expect(target, `#${id} introuvable dans le shadow DOM`).to.not.equal(null);
        });
    });

    // ── aria-live ─────────────────────────────────────────────────────────────

    it('aria-live="polite" sur le label mois/année quand le calendrier est ouvert', async () => {
        el = await fixture(html`<ar-datepicker></ar-datepicker>`);
        await openPicker(el);
        const live = el.shadowRoot?.querySelector('[aria-live="polite"]');
        expect(live).to.not.equal(null);
    });

    // ── Jours désactivés ──────────────────────────────────────────────────────

    it('aria-disabled="true" sur les jours désactivés (pas disabled natif)', async () => {
        el = await fixture(html`
            <ar-datepicker
                value="2026-06-12"
                .isDateDisabled=${(d: Date) => d.getDay() === 0}
            ></ar-datepicker>
        `);
        await openPicker(el);

        const disabledDays = el.shadowRoot?.querySelectorAll('[part="day"][aria-disabled="true"]');
        expect(
            disabledDays?.length,
            'au moins un dimanche doit être aria-disabled',
        ).to.be.greaterThan(0);

        const nativeDisabled = el.shadowRoot?.querySelectorAll('[part="day"][disabled]');
        expect(nativeDisabled?.length, 'disabled natif ne doit pas être utilisé').to.equal(0);
    });

    // ── aria-current ──────────────────────────────────────────────────────────

    it('aria-current="date" uniquement sur aujourd\'hui', async () => {
        el = await fixture(html`<ar-datepicker></ar-datepicker>`);
        await openPicker(el);
        const todayButtons = el.shadowRoot?.querySelectorAll('[aria-current="date"]');
        expect(todayButtons?.length).to.equal(1);
    });

    // ── aria-selected ─────────────────────────────────────────────────────────

    it('aria-selected="true" uniquement sur la cellule du jour sélectionné (gridcell)', async () => {
        el = await fixture(html`<ar-datepicker value="2026-06-12"></ar-datepicker>`);
        await openPicker(el);
        // aria-selected est sur <td role="gridcell">, pas sur le bouton
        const selected = el.shadowRoot?.querySelectorAll('[role="gridcell"][aria-selected="true"]');
        expect(selected?.length).to.equal(1);
    });

    it('aucun gridcell aria-selected="true" quand aucune valeur sélectionnée', async () => {
        el = await fixture(html`<ar-datepicker></ar-datepicker>`);
        await openPicker(el);
        const selected = el.shadowRoot?.querySelectorAll('[role="gridcell"][aria-selected="true"]');
        expect(selected?.length).to.equal(0);
    });

    // ── role="alert" ──────────────────────────────────────────────────────────

    it('role="alert" sur le wrapper du slot error', async () => {
        el = await fixture(html`<ar-datepicker></ar-datepicker>`);
        const alertEl = el.shadowRoot?.querySelector('[role="alert"]');
        expect(alertEl).to.not.equal(null);
    });

    // ── role="dialog" sur le panel ────────────────────────────────────────────

    it('le panel a role="dialog" et aria-modal="true"', async () => {
        el = await fixture(html`<ar-datepicker></ar-datepicker>`);
        const panel = el.shadowRoot?.querySelector('[part="panel"]');
        expect(panel?.getAttribute('role')).to.equal('dialog');
        expect(panel?.getAttribute('aria-modal')).to.equal('true');
    });

    // ── role="grid" sur la table ──────────────────────────────────────────────

    it('la table calendrier a role="grid" quand ouverte', async () => {
        el = await fixture(html`<ar-datepicker></ar-datepicker>`);
        await openPicker(el);
        const grid = el.shadowRoot?.querySelector('[part="grid"]');
        expect(grid?.getAttribute('role')).to.equal('grid');
    });

    // ── trigger ───────────────────────────────────────────────────────────────

    it('le bouton trigger a aria-haspopup="dialog"', async () => {
        el = await fixture(html`<ar-datepicker></ar-datepicker>`);
        const trigger = el.shadowRoot?.querySelector('[part="trigger"]');
        expect(trigger?.getAttribute('aria-haspopup')).to.equal('dialog');
    });
});
