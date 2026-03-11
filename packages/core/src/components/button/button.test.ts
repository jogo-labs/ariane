import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MrButton } from './button.js';

// L'import enregistre le custom element dans la registry happy-dom
import './button.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Monte le composant, attend le premier render, retourne l'instance. */
async function fixture(html: string): Promise<MrButton> {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstElementChild as MrButton;
    document.body.appendChild(el);
    // updateComplete est la promise LitElement qui se résout après le render initial
    await (el as unknown as { updateComplete: Promise<boolean> }).updateComplete;
    return el;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MrButton', () => {
    let el: MrButton;

    afterEach(() => {
        el?.remove();
    });

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<mr-button>Click me</mr-button>');
        });

        it('monte un shadow DOM', () => {
            expect(el.shadowRoot).not.toBeNull();
        });

        it('contient un élément <button> natif', () => {
            expect(el.shadowRoot!.querySelector('button')).not.toBeNull();
        });

        it('expose les parts CSS', () => {
            const button = el.shadowRoot!.querySelector('[part="base"]');
            expect(button).not.toBeNull();
        });
    });

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

    describe('réflexion des attributs', () => {
        beforeEach(async () => {
            el = await fixture('<mr-button>Label</mr-button>');
        });

        it('reflète variant sur l\'attribut HTML', async () => {
            el.variant = 'outlined';
            await (el as unknown as { updateComplete: Promise<boolean> }).updateComplete;
            expect(el.getAttribute('variant')).toBe('outlined');
        });

        it('reflète size sur l\'attribut HTML', async () => {
            el.size = 'large';
            await (el as unknown as { updateComplete: Promise<boolean> }).updateComplete;
            expect(el.getAttribute('size')).toBe('large');
        });

        it('reflète disabled sur l\'attribut HTML', async () => {
            el.disabled = true;
            await (el as unknown as { updateComplete: Promise<boolean> }).updateComplete;
            expect(el.hasAttribute('disabled')).toBe(true);
        });
    });

    describe('état disabled', () => {
        beforeEach(async () => {
            el = await fixture('<mr-button disabled>Label</mr-button>');
        });

        it('désactive le bouton natif', () => {
            const button = el.shadowRoot!.querySelector('button')!;
            expect(button.disabled).toBe(true);
        });

        it('ajoute aria-disabled="true"', () => {
            const button = el.shadowRoot!.querySelector('button')!;
            expect(button.getAttribute('aria-disabled')).toBe('true');
        });

        it('n\'émet PAS mr-click quand disabled', () => {
            const handler = vi.fn();
            el.addEventListener('mr-click', handler);

            // Dispatch direct du click sur le bouton shadow pour simuler l'interaction
            el.shadowRoot!.querySelector('button')!.dispatchEvent(
                new MouseEvent('click', { bubbles: true, composed: true }),
            );

            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe('événements', () => {
        beforeEach(async () => {
            el = await fixture('<mr-button>Label</mr-button>');
        });

        it('émet mr-click au clic', () => {
            const handler = vi.fn();
            el.addEventListener('mr-click', handler);

            el.shadowRoot!.querySelector('button')!.dispatchEvent(
                new MouseEvent('click', { bubbles: true, composed: true }),
            );

            expect(handler).toHaveBeenCalledOnce();
        });

        it('mr-click bulle et est composé (traverse le shadow DOM)', () => {
            let capturedEvent: CustomEvent | null = null;
            // On écoute sur document pour vérifier que l'event traverse le shadow DOM
            document.addEventListener('mr-click', (e) => {
                capturedEvent = e as CustomEvent;
            }, { once: true });

            el.shadowRoot!.querySelector('button')!.dispatchEvent(
                new MouseEvent('click', { bubbles: true, composed: true }),
            );

            expect(capturedEvent).not.toBeNull();
        });
    });

    describe('slots', () => {
        it('affiche le contenu du slot principal', async () => {
            el = await fixture('<mr-button>Mon label</mr-button>');
            // Le contenu texte est dans le light DOM (slot), pas le shadow DOM
            expect(el.textContent?.trim()).toBe('Mon label');
        });
    });
});
