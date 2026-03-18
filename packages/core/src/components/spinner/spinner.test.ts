import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ArSpinner } from './spinner.js';
import { fixture, waitForUpdate, getPart, requirePart } from '../../test-utils.js';
import './spinner.js';

describe('ArSpinner', () => {
    let el: ArSpinner;

    afterEach(() => el?.remove());

    // ── Rendu ─────────────────────────────────────────────────────────────────

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<ar-spinner></ar-spinner>');
        });

        it('monte un shadow DOM', () => {
            expect(el.shadowRoot).not.toBeNull();
        });

        it('contient un part="spinner"', () => {
            expect(getPart(el, 'spinner')).not.toBeNull();
        });

        it('contient un part="status"', () => {
            expect(getPart(el, 'status')).not.toBeNull();
        });
    });

    // ── Valeurs par défaut ────────────────────────────────────────────────────

    describe('valeurs par défaut', () => {
        beforeEach(async () => {
            el = await fixture('<ar-spinner></ar-spinner>');
        });

        it('done vaut false par défaut', () => {
            expect(el.done).toBe(false);
        });

        it('loadingLabel vaut la constante DEFAULT_LOADING_LABEL', () => {
            expect(el.loadingLabel).toBe(ArSpinner.DEFAULT_LOADING_LABEL);
        });

        it('doneLabel vaut la constante DEFAULT_DONE_LABEL', () => {
            expect(el.doneLabel).toBe(ArSpinner.DEFAULT_DONE_LABEL);
        });

        it('size est undefined par défaut', () => {
            expect(el.size).toBeUndefined();
        });
    });

    // ── État chargement (done=false) ──────────────────────────────────────────

    describe('état chargement (done=false)', () => {
        beforeEach(async () => {
            el = await fixture('<ar-spinner></ar-spinner>');
        });

        it("le SVG spinner est visible (pas d'attribut hidden)", () => {
            expect(requirePart(el, 'spinner').hasAttribute('hidden')).toBe(false);
        });

        it('le div status a role="alert"', () => {
            expect(requirePart(el, 'status').getAttribute('role')).toBe('alert');
        });

        // happy-dom ne sérialise pas les Text nodes dynamiques de Lit en textContent.
        // On teste la propriété JS directement — c'est ce que le template consomme.
        it('la propriété loadingLabel contient le texte annoncé en chargement', () => {
            expect(el.loadingLabel).toBe(ArSpinner.DEFAULT_LOADING_LABEL);
        });
    });

    // ── État terminé (done=true) ──────────────────────────────────────────────

    describe('état terminé (done=true)', () => {
        beforeEach(async () => {
            el = await fixture('<ar-spinner done></ar-spinner>');
        });

        it('le SVG spinner est masqué (attribut hidden présent)', () => {
            expect(requirePart(el, 'spinner').hasAttribute('hidden')).toBe(true);
        });

        it('la propriété doneLabel contient le texte annoncé à la fin', () => {
            expect(el.doneLabel).toBe(ArSpinner.DEFAULT_DONE_LABEL);
        });
    });

    // ── Propriété done ────────────────────────────────────────────────────────

    describe('propriété done', () => {
        it('reflète done=true en attribut HTML', async () => {
            el = await fixture('<ar-spinner></ar-spinner>');
            el.done = true;
            await waitForUpdate(el);
            expect(el.hasAttribute('done')).toBe(true);
        });

        it("reflète done=false : supprime l'attribut HTML", async () => {
            el = await fixture('<ar-spinner done></ar-spinner>');
            el.done = false;
            await waitForUpdate(el);
            expect(el.hasAttribute('done')).toBe(false);
        });

        it('masque le SVG après passage à done=true', async () => {
            el = await fixture('<ar-spinner></ar-spinner>');
            expect(requirePart(el, 'spinner').hasAttribute('hidden')).toBe(false);
            el.done = true;
            await waitForUpdate(el);
            expect(requirePart(el, 'spinner').hasAttribute('hidden')).toBe(true);
        });

        it('affiche le SVG après retour à done=false', async () => {
            el = await fixture('<ar-spinner done></ar-spinner>');
            expect(requirePart(el, 'spinner').hasAttribute('hidden')).toBe(true);
            el.done = false;
            await waitForUpdate(el);
            expect(requirePart(el, 'spinner').hasAttribute('hidden')).toBe(false);
        });
    });

    // ── Labels personnalisés ──────────────────────────────────────────────────

    describe('labels personnalisés', () => {
        it("loadingLabel est bien assigné depuis l'attribut HTML", async () => {
            el = await fixture('<ar-spinner loading-label="Veuillez patienter"></ar-spinner>');
            expect(el.loadingLabel).toBe('Veuillez patienter');
        });

        it("doneLabel est bien assigné depuis l'attribut HTML", async () => {
            el = await fixture('<ar-spinner done-label="Succès !"></ar-spinner>');
            expect(el.doneLabel).toBe('Succès !');
        });

        it('reflète loading-label en attribut HTML', async () => {
            el = await fixture('<ar-spinner></ar-spinner>');
            el.loadingLabel = 'Chargement...';
            await waitForUpdate(el);
            expect(el.getAttribute('loading-label')).toBe('Chargement...');
        });

        it('reflète done-label en attribut HTML', async () => {
            el = await fixture('<ar-spinner></ar-spinner>');
            el.doneLabel = 'Terminé !';
            await waitForUpdate(el);
            expect(el.getAttribute('done-label')).toBe('Terminé !');
        });
    });

    // ── Accessibilité ─────────────────────────────────────────────────────────

    describe('accessibilité', () => {
        it('le SVG a aria-hidden="true"', async () => {
            el = await fixture('<ar-spinner></ar-spinner>');
            expect(requirePart(el, 'spinner').getAttribute('aria-hidden')).toBe('true');
        });

        it('le SVG a focusable="false"', async () => {
            el = await fixture('<ar-spinner></ar-spinner>');
            expect(requirePart(el, 'spinner').getAttribute('focusable')).toBe('false');
        });
    });
});
