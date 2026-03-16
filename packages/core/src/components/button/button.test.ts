import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MrButton } from './button.js';

// L'import enregistre le custom element dans la registry happy-dom
import './button.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
async function fixture(html: string): Promise<MrButton> {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstElementChild as MrButton;
    document.body.appendChild(el);
    await (el as unknown as LitEl).updateComplete;
    return el;
}

/** Attend la fin du prochain cycle de rendu Lit sur un élément déjà monté. */
async function waitForUpdate(el: MrButton): Promise<void> {
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
function getPart(el: MrButton, part: string): Element {
    const shadow = el.shadowRoot as ShadowRoot;
    return shadow.querySelector(`[part="${part}"]`) as Element;
}

/** Retourne le <button> natif dans le Shadow DOM. */
function getButton(el: MrButton): HTMLButtonElement {
    return (el.shadowRoot as ShadowRoot).querySelector('button') as HTMLButtonElement;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MrButton', () => {
    let el: MrButton;

    afterEach(() => el?.remove());

    // ── Rendu ─────────────────────────────────────────────────────────────────

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<mr-button>Click me</mr-button>');
        });

        it('monte un shadow DOM', () => {
            expect(el.shadowRoot).not.toBeNull();
        });

        it('contient un élément <button> natif (part="base")', () => {
            expect(getPart(el, 'base')).not.toBeNull();
            expect(getPart(el, 'base').tagName.toLowerCase()).toBe('button');
        });

        it('contient un part="label"', () => {
            expect(getPart(el, 'label')).not.toBeNull();
        });

        it('contient un part="prefix"', () => {
            expect(getPart(el, 'prefix')).not.toBeNull();
        });

        it('contient un part="suffix"', () => {
            expect(getPart(el, 'suffix')).not.toBeNull();
        });
    });

    // ── Valeurs par défaut ────────────────────────────────────────────────────

    describe('valeurs par défaut', () => {
        beforeEach(async () => {
            el = await fixture('<mr-button>Label</mr-button>');
        });

        it('variant par défaut = "filled"', () => {
            expect(el.variant).toBe('filled');
        });

        it('size par défaut = "medium"', () => {
            expect(el.size).toBe('medium');
        });

        it('disabled par défaut = false', () => {
            expect(el.disabled).toBe(false);
        });

        it('type par défaut = "button"', () => {
            expect(el.type).toBe('button');
        });
    });

    // ── Réflexion des attributs ───────────────────────────────────────────────

    describe('réflexion des attributs', () => {
        beforeEach(async () => {
            el = await fixture('<mr-button>Label</mr-button>');
        });

        it("reflète variant sur l'attribut HTML", async () => {
            el.variant = 'outlined';
            await waitForUpdate(el);
            expect(el.getAttribute('variant')).toBe('outlined');
        });

        it("reflète size sur l'attribut HTML", async () => {
            el.size = 'large';
            await waitForUpdate(el);
            expect(el.getAttribute('size')).toBe('large');
        });

        it("reflète disabled sur l'attribut HTML", async () => {
            el.disabled = true;
            await waitForUpdate(el);
            expect(el.hasAttribute('disabled')).toBe(true);
        });

        it('type="submit" est appliqué sur le <button> natif', async () => {
            el = await fixture('<mr-button type="submit">Label</mr-button>');
            expect(getButton(el).type).toBe('submit');
        });
    });

    // ── État disabled ─────────────────────────────────────────────────────────

    describe('état disabled', () => {
        beforeEach(async () => {
            el = await fixture('<mr-button disabled>Label</mr-button>');
        });

        it('désactive le <button> natif (propriété disabled)', () => {
            expect(getButton(el).disabled).toBe(true);
        });

        it('ajoute aria-disabled="true" sur le <button> natif', () => {
            expect(getButton(el).getAttribute('aria-disabled')).toBe('true');
        });

        it("n'émet PAS mr-click quand disabled", () => {
            const handler = vi.fn();
            el.addEventListener('mr-click', handler);

            // Dispatch direct du click sur le bouton shadow pour simuler l'interaction
            getButton(el).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

            expect(handler).not.toHaveBeenCalled();
        });
    });

    // ── État enabled ──────────────────────────────────────────────────────────

    describe('état enabled (non disabled)', () => {
        beforeEach(async () => {
            el = await fixture('<mr-button>Label</mr-button>');
        });

        it('aria-disabled="false" quand le bouton est actif', () => {
            expect(getButton(el).getAttribute('aria-disabled')).toBe('false');
        });
    });

    // ── Événements ────────────────────────────────────────────────────────────

    describe('événements', () => {
        beforeEach(async () => {
            el = await fixture('<mr-button>Label</mr-button>');
        });

        it('émet mr-click au clic', () => {
            const handler = vi.fn();
            el.addEventListener('mr-click', handler);

            getButton(el).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

            expect(handler).toHaveBeenCalledOnce();
        });

        it('mr-click bulle et traverse le Shadow DOM (bubbles + composed)', () => {
            let captured: CustomEvent | null = null;
            // On écoute sur document pour vérifier que l'event traverse le shadow DOM
            document.addEventListener('mr-click', (e) => (captured = e as CustomEvent), {
                once: true,
            });

            getButton(el).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

            expect(captured).not.toBeNull();
        });

        it('émet mr-focus quand le bouton reçoit le focus', () => {
            const handler = vi.fn();
            el.addEventListener('mr-focus', handler);

            getButton(el).dispatchEvent(new FocusEvent('focus', { bubbles: true, composed: true }));

            expect(handler).toHaveBeenCalledOnce();
        });

        it('émet mr-blur quand le bouton perd le focus', () => {
            const handler = vi.fn();
            el.addEventListener('mr-blur', handler);

            getButton(el).dispatchEvent(new FocusEvent('blur', { bubbles: true, composed: true }));

            expect(handler).toHaveBeenCalledOnce();
        });
    });

    // ── Slots ─────────────────────────────────────────────────────────────────

    describe('slots', () => {
        it('affiche le contenu du slot principal (light DOM)', async () => {
            el = await fixture('<mr-button>Mon label</mr-button>');
            // Le contenu texte est dans le light DOM (slot), pas le shadow DOM
            expect(el.textContent?.trim()).toBe('Mon label');
        });

        it('contient un slot nommé "prefix"', () => {
            const shadow = el.shadowRoot as ShadowRoot;
            expect(shadow.querySelector('slot[name="prefix"]')).not.toBeNull();
        });

        it('contient un slot nommé "suffix"', () => {
            const shadow = el.shadowRoot as ShadowRoot;
            expect(shadow.querySelector('slot[name="suffix"]')).not.toBeNull();
        });
    });
});
