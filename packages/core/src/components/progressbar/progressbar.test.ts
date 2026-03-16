import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MrProgressbar } from './progressbar.js';
import './progressbar.js';

// Alias pour éviter la répétition du cast updateComplete dans chaque test.
// LitElement expose updateComplete en protected — on contourne via unknown.
type LitEl = { updateComplete: Promise<boolean> };

/**
 * Monte un composant dans le DOM de test et attend son premier rendu Lit.
 *
 * On passe par un <template> pour éviter que le parser HTML upgrade le custom
 * element avant qu'il soit inséré dans le document (comportement imprévisible).
 *
 * `updateComplete` est une Promise propre à LitElement : elle se résout après
 * que le cycle de rendu réactif en cours soit terminé. Sans ce await, le
 * shadowRoot existe mais son contenu peut ne pas encore être dans le DOM.
 */
async function fixture(html: string): Promise<MrProgressbar> {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstElementChild as MrProgressbar;
    document.body.appendChild(el);
    await (el as unknown as LitEl).updateComplete;
    return el;
}

/** Attend la fin du prochain cycle de rendu Lit sur un élément déjà monté. */
async function waitForUpdate(el: MrProgressbar): Promise<void> {
    // Lit batchifie les mises à jour : le re-render (reflect:true, DOM shadow)
    // est asynchrone. Sans ce await, les assertions liraient l'ancienne valeur.
    await (el as unknown as LitEl).updateComplete;
}

/**
 * Retourne un élément du Shadow DOM ciblé par son attribut part="…".
 *
 * el.shadowRoot donne accès au Shadow DOM du composant. Les éléments rendus
 * par Lit (html`...`) y vivent — isolés du document principal et invisibles
 * à un querySelector lancé sur document.
 *
 * On cible par part="…" plutôt que par classe CSS ou tag : c'est l'API
 * publique stable du composant (contrat CSS parts).
 */
function getPart(el: MrProgressbar, part: string): Element {
    const shadow = el.shadowRoot as ShadowRoot;
    return shadow.querySelector(`[part="${part}"]`) as Element;
}

describe('MrProgressbar', () => {
    let el: MrProgressbar;

    afterEach(() => el?.remove());

    // ── Rendu ─────────────────────────────────────────────────────────────────

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<mr-progressbar></mr-progressbar>');
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
            el = await fixture('<mr-progressbar></mr-progressbar>');
        });

        it('percent vaut 0 par défaut', () => {
            expect(el.percent).toBe(0);
        });

        it('affiche "0%" dans le part="percent"', () => {
            expect(getPart(el, 'percent').textContent).toBe('0%');
        });

        it('la barre a une largeur de 0%', () => {
            expect((getPart(el, 'bar') as HTMLElement).style.width).toBe('0%');
        });
    });

    // ── Propriété percent ─────────────────────────────────────────────────────

    describe('propriété percent', () => {
        it('affiche la valeur correcte à 50', async () => {
            el = await fixture('<mr-progressbar percent="50"></mr-progressbar>');
            expect(getPart(el, 'percent').textContent).toBe('50%');
        });

        it('la barre a une largeur de 50% quand percent=50', async () => {
            el = await fixture('<mr-progressbar percent="50"></mr-progressbar>');
            expect((getPart(el, 'bar') as HTMLElement).style.width).toBe('50%');
        });

        it('reflète la propriété en attribut HTML', async () => {
            el = await fixture('<mr-progressbar></mr-progressbar>');
            el.percent = 75;
            await waitForUpdate(el);
            expect(el.getAttribute('percent')).toBe('75');
        });

        it('met à jour la largeur de la barre après changement de propriété', async () => {
            el = await fixture('<mr-progressbar percent="20"></mr-progressbar>');
            el.percent = 80;
            await waitForUpdate(el);
            expect((getPart(el, 'bar') as HTMLElement).style.width).toBe('80%');
        });
    });

    // ── Clamp 0–100 ───────────────────────────────────────────────────────────

    describe('clamp entre 0 et 100', () => {
        it('clamp à 100 si percent > 100', async () => {
            el = await fixture('<mr-progressbar percent="150"></mr-progressbar>');
            expect(getPart(el, 'percent').textContent).toBe('100%');
            expect((getPart(el, 'bar') as HTMLElement).style.width).toBe('100%');
        });

        it('clamp à 0 si percent < 0', async () => {
            el = await fixture('<mr-progressbar percent="-20"></mr-progressbar>');
            expect(getPart(el, 'percent').textContent).toBe('0%');
            expect((getPart(el, 'bar') as HTMLElement).style.width).toBe('0%');
        });
    });

    // ── Accessibilité ─────────────────────────────────────────────────────────

    describe('accessibilité', () => {
        it('la barre a role="progressbar"', async () => {
            el = await fixture('<mr-progressbar></mr-progressbar>');
            expect(getPart(el, 'bar').getAttribute('role')).toBe('progressbar');
        });

        it('aria-valuenow correspond à percent', async () => {
            el = await fixture('<mr-progressbar percent="42"></mr-progressbar>');
            expect(getPart(el, 'bar').getAttribute('aria-valuenow')).toBe('42');
        });

        it('aria-valuemin vaut 0', async () => {
            el = await fixture('<mr-progressbar></mr-progressbar>');
            expect(getPart(el, 'bar').getAttribute('aria-valuemin')).toBe('0');
        });

        it('aria-valuemax vaut 100', async () => {
            el = await fixture('<mr-progressbar></mr-progressbar>');
            expect(getPart(el, 'bar').getAttribute('aria-valuemax')).toBe('100');
        });

        it('aria-valuenow est clampé à 100 si percent > 100', async () => {
            el = await fixture('<mr-progressbar percent="999"></mr-progressbar>');
            expect(getPart(el, 'bar').getAttribute('aria-valuenow')).toBe('100');
        });
    });
});
