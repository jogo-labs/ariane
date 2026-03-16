import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MrSpinner } from './spinner.js';
import './spinner.js';

type LitEl = { updateComplete: Promise<boolean> };

async function fixture(html: string): Promise<MrSpinner> {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstElementChild as MrSpinner;
    document.body.appendChild(el);
    await (el as unknown as LitEl).updateComplete;
    return el;
}

async function waitForUpdate(el: MrSpinner): Promise<void> {
    await (el as unknown as LitEl).updateComplete;
}

function getPart(el: MrSpinner, part: string): Element {
    const shadow = el.shadowRoot as ShadowRoot;
    return shadow.querySelector(`[part="${part}"]`) as Element;
}

describe('MrSpinner', () => {
    let el: MrSpinner;

    afterEach(() => el?.remove());

    // ── Rendu ─────────────────────────────────────────────────────────────────

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<mr-spinner></mr-spinner>');
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
            el = await fixture('<mr-spinner></mr-spinner>');
        });

        it('done vaut false par défaut', () => {
            expect(el.done).toBe(false);
        });

        it('loadingLabel vaut la constante DEFAULT_LOADING_LABEL', () => {
            expect(el.loadingLabel).toBe(MrSpinner.DEFAULT_LOADING_LABEL);
        });

        it('doneLabel vaut la constante DEFAULT_DONE_LABEL', () => {
            expect(el.doneLabel).toBe(MrSpinner.DEFAULT_DONE_LABEL);
        });

        it('size est undefined par défaut', () => {
            expect(el.size).toBeUndefined();
        });
    });

    // ── État chargement (done=false) ──────────────────────────────────────────

    describe('état chargement (done=false)', () => {
        beforeEach(async () => {
            el = await fixture('<mr-spinner></mr-spinner>');
        });

        it("le SVG spinner est visible (pas d'attribut hidden)", () => {
            expect(getPart(el, 'spinner').hasAttribute('hidden')).toBe(false);
        });

        it('le div status a role="alert"', () => {
            expect(getPart(el, 'status').getAttribute('role')).toBe('alert');
        });

        // happy-dom ne sérialise pas les Text nodes dynamiques de Lit en textContent.
        // On teste la propriété JS directement — c'est ce que le template consomme.
        it('la propriété loadingLabel contient le texte annoncé en chargement', () => {
            expect(el.loadingLabel).toBe(MrSpinner.DEFAULT_LOADING_LABEL);
        });
    });

    // ── État terminé (done=true) ──────────────────────────────────────────────

    describe('état terminé (done=true)', () => {
        beforeEach(async () => {
            el = await fixture('<mr-spinner done></mr-spinner>');
        });

        it('le SVG spinner est masqué (attribut hidden présent)', () => {
            expect(getPart(el, 'spinner').hasAttribute('hidden')).toBe(true);
        });

        it('la propriété doneLabel contient le texte annoncé à la fin', () => {
            expect(el.doneLabel).toBe(MrSpinner.DEFAULT_DONE_LABEL);
        });
    });

    // ── Propriété done ────────────────────────────────────────────────────────

    describe('propriété done', () => {
        it('reflète done=true en attribut HTML', async () => {
            el = await fixture('<mr-spinner></mr-spinner>');
            el.done = true;
            await waitForUpdate(el);
            expect(el.hasAttribute('done')).toBe(true);
        });

        it("reflète done=false : supprime l'attribut HTML", async () => {
            el = await fixture('<mr-spinner done></mr-spinner>');
            el.done = false;
            await waitForUpdate(el);
            expect(el.hasAttribute('done')).toBe(false);
        });

        it('masque le SVG après passage à done=true', async () => {
            el = await fixture('<mr-spinner></mr-spinner>');
            expect(getPart(el, 'spinner').hasAttribute('hidden')).toBe(false);
            el.done = true;
            await waitForUpdate(el);
            expect(getPart(el, 'spinner').hasAttribute('hidden')).toBe(true);
        });

        it('affiche le SVG après retour à done=false', async () => {
            el = await fixture('<mr-spinner done></mr-spinner>');
            expect(getPart(el, 'spinner').hasAttribute('hidden')).toBe(true);
            el.done = false;
            await waitForUpdate(el);
            expect(getPart(el, 'spinner').hasAttribute('hidden')).toBe(false);
        });
    });

    // ── Labels personnalisés ──────────────────────────────────────────────────

    describe('labels personnalisés', () => {
        it("loadingLabel est bien assigné depuis l'attribut HTML", async () => {
            el = await fixture('<mr-spinner loading-label="Veuillez patienter"></mr-spinner>');
            expect(el.loadingLabel).toBe('Veuillez patienter');
        });

        it("doneLabel est bien assigné depuis l'attribut HTML", async () => {
            el = await fixture('<mr-spinner done-label="Succès !"></mr-spinner>');
            expect(el.doneLabel).toBe('Succès !');
        });

        it('reflète loading-label en attribut HTML', async () => {
            el = await fixture('<mr-spinner></mr-spinner>');
            el.loadingLabel = 'Chargement...';
            await waitForUpdate(el);
            expect(el.getAttribute('loading-label')).toBe('Chargement...');
        });

        it('reflète done-label en attribut HTML', async () => {
            el = await fixture('<mr-spinner></mr-spinner>');
            el.doneLabel = 'Terminé !';
            await waitForUpdate(el);
            expect(el.getAttribute('done-label')).toBe('Terminé !');
        });
    });

    // ── Accessibilité ─────────────────────────────────────────────────────────

    describe('accessibilité', () => {
        it('le SVG a aria-hidden="true"', async () => {
            el = await fixture('<mr-spinner></mr-spinner>');
            expect(getPart(el, 'spinner').getAttribute('aria-hidden')).toBe('true');
        });

        it('le SVG a focusable="false"', async () => {
            el = await fixture('<mr-spinner></mr-spinner>');
            expect(getPart(el, 'spinner').getAttribute('focusable')).toBe('false');
        });
    });
});
