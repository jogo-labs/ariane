import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ArProgressbar } from './progressbar.js';
import { fixture, waitForUpdate, getPart, requirePart } from '../../test-utils.js';
import './progressbar.js';

describe('ArProgressbar', () => {
    let el: ArProgressbar;

    afterEach(() => el?.remove());

    // ── Rendu ─────────────────────────────────────────────────────────────────

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<ar-progressbar></ar-progressbar>');
        });

        it('monte un shadow DOM', () => {
            expect(el.shadowRoot).not.toBeNull();
        });

        it('contient un part="container"', () => {
            expect(getPart(el, 'container')).not.toBeNull();
        });

        it('contient un part="track"', () => {
            expect(getPart(el, 'track')).not.toBeNull();
        });

        it('contient un part="bar"', () => {
            expect(getPart(el, 'bar')).not.toBeNull();
        });

        it('contient un part="label"', () => {
            expect(getPart(el, 'label')).not.toBeNull();
        });

        it('contient un part="percent"', () => {
            expect(getPart(el, 'percent')).not.toBeNull();
        });

        it('contient un slot par défaut', () => {
            const shadow = el.shadowRoot as ShadowRoot;
            expect(shadow.querySelector('slot:not([name])')).not.toBeNull();
        });
    });

    // ── Valeur par défaut ─────────────────────────────────────────────────────

    describe('valeur par défaut', () => {
        beforeEach(async () => {
            el = await fixture('<ar-progressbar></ar-progressbar>');
        });

        it('percent vaut 0 par défaut', () => {
            expect(el.percent).toBe(0);
        });

        it('affiche "0%" dans le part="percent"', () => {
            expect(requirePart(el, 'percent').textContent).toBe('0%');
        });

        it('la barre a une largeur de 0%', () => {
            expect((requirePart(el, 'bar') as HTMLElement).style.width).toBe('0%');
        });
    });

    // ── Propriété percent ─────────────────────────────────────────────────────

    describe('propriété percent', () => {
        it('affiche la valeur correcte à 50', async () => {
            el = await fixture('<ar-progressbar percent="50"></ar-progressbar>');
            expect(requirePart(el, 'percent').textContent).toBe('50%');
        });

        it('la barre a une largeur de 50% quand percent=50', async () => {
            el = await fixture('<ar-progressbar percent="50"></ar-progressbar>');
            expect((requirePart(el, 'bar') as HTMLElement).style.width).toBe('50%');
        });

        it('reflète la propriété en attribut HTML', async () => {
            el = await fixture('<ar-progressbar></ar-progressbar>');
            el.percent = 75;
            await waitForUpdate(el);
            expect(el.getAttribute('percent')).toBe('75');
        });

        it('met à jour la largeur de la barre après changement de propriété', async () => {
            el = await fixture('<ar-progressbar percent="20"></ar-progressbar>');
            el.percent = 80;
            await waitForUpdate(el);
            expect((requirePart(el, 'bar') as HTMLElement).style.width).toBe('80%');
        });
    });

    // ── Clamp 0–100 ───────────────────────────────────────────────────────────

    describe('clamp entre 0 et 100', () => {
        it('clamp à 100 si percent > 100', async () => {
            el = await fixture('<ar-progressbar percent="150"></ar-progressbar>');
            expect(requirePart(el, 'percent').textContent).toBe('100%');
            expect((requirePart(el, 'bar') as HTMLElement).style.width).toBe('100%');
        });

        it('clamp à 0 si percent < 0', async () => {
            el = await fixture('<ar-progressbar percent="-20"></ar-progressbar>');
            expect(requirePart(el, 'percent').textContent).toBe('0%');
            expect((requirePart(el, 'bar') as HTMLElement).style.width).toBe('0%');
        });
    });

    // ── Accessibilité ─────────────────────────────────────────────────────────

    describe('accessibilité', () => {
        it('la barre a role="progressbar"', async () => {
            el = await fixture('<ar-progressbar></ar-progressbar>');
            expect(requirePart(el, 'bar').getAttribute('role')).toBe('progressbar');
        });

        it('aria-valuenow correspond à percent', async () => {
            el = await fixture('<ar-progressbar percent="42"></ar-progressbar>');
            expect(requirePart(el, 'bar').getAttribute('aria-valuenow')).toBe('42');
        });

        it('aria-valuemin vaut 0', async () => {
            el = await fixture('<ar-progressbar></ar-progressbar>');
            expect(requirePart(el, 'bar').getAttribute('aria-valuemin')).toBe('0');
        });

        it('aria-valuemax vaut 100', async () => {
            el = await fixture('<ar-progressbar></ar-progressbar>');
            expect(requirePart(el, 'bar').getAttribute('aria-valuemax')).toBe('100');
        });

        it('aria-valuenow est clampé à 100 si percent > 100', async () => {
            el = await fixture('<ar-progressbar percent="999"></ar-progressbar>');
            expect(requirePart(el, 'bar').getAttribute('aria-valuenow')).toBe('100');
        });
    });
});
