import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArButton } from './button.js';
import { fixture, waitForUpdate, getPart, requirePart } from '../../test-utils.js';

// L'import enregistre le custom element dans la registry happy-dom
import './button.js';

/** Retourne le <button> natif dans le Shadow DOM. */
function getButton(el: ArButton): HTMLButtonElement {
    return (el.shadowRoot as ShadowRoot).querySelector('button') as HTMLButtonElement;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ArButton', () => {
    let el: ArButton;

    afterEach(() => el?.remove());

    // ── Rendu ─────────────────────────────────────────────────────────────────

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<ar-button>Click me</ar-button>');
        });

        it('monte un shadow DOM', () => {
            expect(el.shadowRoot).not.toBeNull();
        });

        it('contient un élément <button> natif (part="base")', () => {
            expect(getPart(el, 'base')).not.toBeNull();
            expect(requirePart(el, 'base').tagName.toLowerCase()).toBe('button');
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
            el = await fixture('<ar-button>Label</ar-button>');
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
            el = await fixture('<ar-button>Label</ar-button>');
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
            el = await fixture('<ar-button type="submit">Label</ar-button>');
            expect(getButton(el).type).toBe('submit');
        });
    });

    // ── État disabled ─────────────────────────────────────────────────────────

    describe('état disabled', () => {
        beforeEach(async () => {
            el = await fixture('<ar-button disabled>Label</ar-button>');
        });

        it('désactive le <button> natif (propriété disabled)', () => {
            expect(getButton(el).disabled).toBe(true);
        });

        it('ajoute aria-disabled="true" sur le <button> natif', () => {
            expect(getButton(el).getAttribute('aria-disabled')).toBe('true');
        });

        it("n'émet PAS ar-click quand disabled", () => {
            const handler = vi.fn();
            el.addEventListener('ar-click', handler);

            // Dispatch direct du click sur le bouton shadow pour simuler l'interaction
            getButton(el).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

            expect(handler).not.toHaveBeenCalled();
        });
    });

    // ── État enabled ──────────────────────────────────────────────────────────

    describe('état enabled (non disabled)', () => {
        beforeEach(async () => {
            el = await fixture('<ar-button>Label</ar-button>');
        });

        it('aria-disabled="false" quand le bouton est actif', () => {
            expect(getButton(el).getAttribute('aria-disabled')).toBe('false');
        });
    });

    // ── Événements ────────────────────────────────────────────────────────────

    describe('événements', () => {
        beforeEach(async () => {
            el = await fixture('<ar-button>Label</ar-button>');
        });

        it('émet ar-click au clic', () => {
            const handler = vi.fn();
            el.addEventListener('ar-click', handler);

            getButton(el).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

            expect(handler).toHaveBeenCalledOnce();
        });

        it('ar-click bulle et traverse le Shadow DOM (bubbles + composed)', () => {
            let captured: CustomEvent | null = null;
            // On écoute sur document pour vérifier que l'event traverse le shadow DOM
            document.addEventListener('ar-click', (e) => (captured = e as CustomEvent), {
                once: true,
            });

            getButton(el).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

            expect(captured).not.toBeNull();
        });

        it('émet ar-focus quand le bouton reçoit le focus', () => {
            const handler = vi.fn();
            el.addEventListener('ar-focus', handler);

            getButton(el).dispatchEvent(new FocusEvent('focus', { bubbles: true, composed: true }));

            expect(handler).toHaveBeenCalledOnce();
        });

        it('émet ar-blur quand le bouton perd le focus', () => {
            const handler = vi.fn();
            el.addEventListener('ar-blur', handler);

            getButton(el).dispatchEvent(new FocusEvent('blur', { bubbles: true, composed: true }));

            expect(handler).toHaveBeenCalledOnce();
        });
    });

    // ── Slots ─────────────────────────────────────────────────────────────────

    describe('slots', () => {
        it('affiche le contenu du slot principal (light DOM)', async () => {
            el = await fixture('<ar-button>Mon label</ar-button>');
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
