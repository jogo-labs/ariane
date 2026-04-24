import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArDialog } from './dialog.js';
import { fixture, waitForUpdate, getPart, requireShadow } from '../../test-utils.js';
import './dialog.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDialogEl(el: ArDialog): HTMLDialogElement {
    return requireShadow(el).querySelector('dialog') as HTMLDialogElement;
}

/** Simule la fin de l'animation de fermeture. */
function fireAnimationEnd(el: ArDialog): void {
    getDialogEl(el).dispatchEvent(new Event('animationend'));
}

// ──────────────────────────────────────────────────────────────────────────────

describe('ArDialog', () => {
    let el: ArDialog;

    afterEach(() => el?.remove());

    // ── Rendu ─────────────────────────────────────────────────────────────────

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<ar-dialog></ar-dialog>');
        });

        it('monte un shadow DOM', () => {
            expect(el.shadowRoot).not.toBeNull();
        });

        it('contient part="dialog"', () => {
            expect(getPart(el, 'dialog')).not.toBeNull();
        });

        it('contient part="header"', () => {
            expect(getPart(el, 'header')).not.toBeNull();
        });

        it('contient part="title"', () => {
            expect(getPart(el, 'title')).not.toBeNull();
        });

        it('contient part="body"', () => {
            expect(getPart(el, 'body')).not.toBeNull();
        });

        it('ne contient pas part="footer" sans slot footer', () => {
            expect(getPart(el, 'footer')).toBeNull();
        });

        it('contient un bouton close avec data-ar-dismiss', () => {
            expect(requireShadow(el).querySelector('[data-ar-dismiss]')).not.toBeNull();
        });

        it("le bouton close n'a pas d'aria-describedby", async () => {
            el = await fixture('<ar-dialog></ar-dialog>');
            const closeBtn = requireShadow(el).querySelector('[data-ar-dismiss]');
            expect(closeBtn).not.toBeNull();
            expect((closeBtn as HTMLElement).hasAttribute('aria-describedby')).toBe(false);
        });
    });

    // ── Valeurs par défaut ────────────────────────────────────────────────────

    describe('valeurs par défaut', () => {
        beforeEach(async () => {
            el = await fixture('<ar-dialog></ar-dialog>');
        });

        it('open est false', () => expect(el.open).toBe(false));
        it('closeOnBackdrop est false', () => expect(el.closeOnBackdrop).toBe(false));
        it('label est vide', () => expect(el.label).toBe(''));
        it('mode est modal', () => expect(el.mode).toBe('modal'));
        it('placement est right', () => expect(el.placement).toBe('right'));
        it('size est md', () => expect(el.size).toBe('md'));
    });

    // ── Propriétés reflect ────────────────────────────────────────────────────

    describe('propriétés reflect', () => {
        it('label reflète en attribut', async () => {
            el = await fixture('<ar-dialog label="Mon titre"></ar-dialog>');
            expect(el.getAttribute('label')).toBe('Mon titre');
        });

        it('mode reflète en attribut', async () => {
            el = await fixture('<ar-dialog mode="drawer"></ar-dialog>');
            expect(el.getAttribute('mode')).toBe('drawer');
        });

        it('size reflète en attribut', async () => {
            el = await fixture('<ar-dialog size="lg"></ar-dialog>');
            expect(el.getAttribute('size')).toBe('lg');
        });

        it('placement reflète en attribut', async () => {
            el = await fixture('<ar-dialog placement="left"></ar-dialog>');
            expect(el.getAttribute('placement')).toBe('left');
        });

        it('close-on-backdrop reflète en attribut', async () => {
            el = await fixture('<ar-dialog close-on-backdrop></ar-dialog>');
            expect(el.hasAttribute('close-on-backdrop')).toBe(true);
            expect(el.closeOnBackdrop).toBe(true);
        });
    });

    // ── Footer conditionnel ───────────────────────────────────────────────────

    describe('footer conditionnel', () => {
        it('est absent du DOM si aucun enfant slot="footer"', async () => {
            el = await fixture('<ar-dialog></ar-dialog>');
            expect(getPart(el, 'footer')).toBeNull();
        });

        it('est présent si un enfant slot="footer" est fourni', async () => {
            el = await fixture(`
                <ar-dialog>
                    <button slot="footer">OK</button>
                </ar-dialog>
            `);
            expect(getPart(el, 'footer')).not.toBeNull();
        });

        it('apparaît dynamiquement après injection d\'un enfant slot="footer"', async () => {
            el = await fixture('<ar-dialog></ar-dialog>');
            expect(getPart(el, 'footer')).toBeNull();

            const btn = document.createElement('button');
            btn.setAttribute('slot', 'footer');
            el.appendChild(btn);
            await waitForUpdate(el);

            expect(getPart(el, 'footer')).not.toBeNull();
        });

        it('disparaît dynamiquement si le slot="footer" est retiré', async () => {
            el = await fixture(`
                <ar-dialog>
                    <button slot="footer" id="f">OK</button>
                </ar-dialog>
            `);
            expect(getPart(el, 'footer')).not.toBeNull();

            (el.querySelector('#f') as Element).remove();
            await waitForUpdate(el);

            expect(getPart(el, 'footer')).toBeNull();
        });
    });

    // ── Ouverture ─────────────────────────────────────────────────────────────

    describe('ouverture', () => {
        it('open=true appelle showModal et dialog.open est true', async () => {
            el = await fixture('<ar-dialog></ar-dialog>');
            const spy = vi.spyOn(getDialogEl(el), 'showModal');
            el.open = true;
            await waitForUpdate(el);
            expect(spy).toHaveBeenCalledOnce();
        });

        it('firstUpdated ouvre le dialog si open=true au chargement', async () => {
            el = await fixture('<ar-dialog open></ar-dialog>');
            expect(getDialogEl(el).open).toBe(true);
        });

        it("gèle le scroll body à l'ouverture", async () => {
            el = await fixture('<ar-dialog></ar-dialog>');
            el.open = true;
            await waitForUpdate(el);
            expect(document.body.style.overflow).toBe('hidden');
        });

        it("émet ar-dialog-show avant l'ouverture", async () => {
            el = await fixture('<ar-dialog></ar-dialog>');
            const handler = vi.fn();
            el.addEventListener('ar-dialog-show', handler);
            el.open = true;
            await waitForUpdate(el);
            expect(handler).toHaveBeenCalledOnce();
        });

        it("émet ar-dialog-shown après l'ouverture", async () => {
            el = await fixture('<ar-dialog></ar-dialog>');
            const handler = vi.fn();
            el.addEventListener('ar-dialog-shown', handler);
            el.open = true;
            await waitForUpdate(el);
            expect(handler).toHaveBeenCalledOnce();
        });

        it("ar-dialog-show annulable empêche l'ouverture", async () => {
            el = await fixture('<ar-dialog></ar-dialog>');
            el.addEventListener('ar-dialog-show', (e) => e.preventDefault());
            el.open = true;
            await waitForUpdate(el);
            expect(getDialogEl(el).open).toBe(false);
        });

        it('open=true deux fois ne double-appelle pas showModal', async () => {
            el = await fixture('<ar-dialog></ar-dialog>');
            el.open = true;
            await waitForUpdate(el);
            const spy = vi.spyOn(getDialogEl(el), 'showModal');
            el.open = true;
            await waitForUpdate(el);
            expect(spy).not.toHaveBeenCalled();
        });
    });

    // ── Fermeture ─────────────────────────────────────────────────────────────

    describe('fermeture', () => {
        beforeEach(async () => {
            el = await fixture('<ar-dialog open></ar-dialog>');
        });

        it('ferme le <dialog> natif après animationend', async () => {
            el.open = false;
            await waitForUpdate(el);
            fireAnimationEnd(el);
            await waitForUpdate(el);
            expect(getDialogEl(el).open).toBe(false);
        });

        it('restaure le scroll après fermeture', async () => {
            el.open = false;
            await waitForUpdate(el);
            fireAnimationEnd(el);
            await waitForUpdate(el);
            expect(document.body.style.overflow).not.toBe('hidden');
        });

        it('émet ar-dialog-hide avant la fermeture', async () => {
            const handler = vi.fn();
            el.addEventListener('ar-dialog-hide', handler);
            el.open = false;
            await waitForUpdate(el);
            expect(handler).toHaveBeenCalledOnce();
        });

        it('émet ar-dialog-hidden après la fermeture', async () => {
            const handler = vi.fn();
            el.addEventListener('ar-dialog-hidden', handler);
            el.open = false;
            await waitForUpdate(el);
            fireAnimationEnd(el);
            await waitForUpdate(el);
            expect(handler).toHaveBeenCalledOnce();
        });

        it('ar-dialog-hide annulable maintient el.open=true et émet ar-dialog-hide-prevented', async () => {
            const prevented = vi.fn();
            el.addEventListener('ar-dialog-hide', (e) => e.preventDefault());
            el.addEventListener('ar-dialog-hide-prevented', prevented);
            el.open = false;
            await waitForUpdate(el);
            expect(el.open).toBe(true);
            expect(prevented).toHaveBeenCalledOnce();
        });

        it('_isClosing bloque un double-appel à _close', async () => {
            el.open = false;
            await waitForUpdate(el);
            const spy = vi.spyOn(getDialogEl(el), 'close');
            // Tenter de refermer pendant que la fermeture est déjà en cours
            el.open = false;
            await waitForUpdate(el);
            fireAnimationEnd(el);
            await waitForUpdate(el);
            // close() ne doit être appelé qu'une seule fois
            expect(spy).toHaveBeenCalledOnce();
        });

        it('fermeture immédiate avec prefers-reduced-motion', async () => {
            vi.spyOn(window, 'matchMedia').mockReturnValue({
                matches: true,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            } as unknown as MediaQueryList);

            el.open = false;
            await waitForUpdate(el);
            // Pas besoin d'animationend — fermeture synchrone
            expect(getDialogEl(el).open).toBe(false);

            vi.restoreAllMocks();
        });

        it('le fallback timeout déclenche _finishClose si animationend ne tire pas', async () => {
            vi.useFakeTimers();
            el.open = false;
            await waitForUpdate(el);
            expect(getDialogEl(el).open).toBe(true); // pas encore fermé
            vi.advanceTimersByTime(600);
            await waitForUpdate(el);
            expect(getDialogEl(el).open).toBe(false);
            vi.useRealTimers();
        });
    });

    // ── data-ar-dismiss / data-ar-accept ──────────────────────────────────────

    describe('dismiss / accept', () => {
        beforeEach(async () => {
            el = await fixture('<ar-dialog open></ar-dialog>');
        });

        it('clic sur data-ar-dismiss émet ar-dialog-dismissed et ferme', async () => {
            const handler = vi.fn();
            el.addEventListener('ar-dialog-dismissed', handler);
            (requireShadow(el).querySelector('[data-ar-dismiss]') as HTMLElement).click();
            await waitForUpdate(el);
            expect(handler).toHaveBeenCalledOnce();
        });

        it('clic sur data-ar-accept émet ar-dialog-accepted', async () => {
            // happy-dom ne propage pas les clicks slottés dans le shadow DOM.
            // On simule data-ar-accept sur un élément shadow DOM (même code path que composedPath).
            const handler = vi.fn();
            el.addEventListener('ar-dialog-accepted', handler);
            const body = requireShadow(el).querySelector('.dialog-body') as HTMLElement;
            body.setAttribute('data-ar-accept', '');
            body.click();
            body.removeAttribute('data-ar-accept');
            await waitForUpdate(el);
            expect(handler).toHaveBeenCalledOnce();
        });

        it('ar-dialog-dismissed annulable émet ar-dialog-dismissed-prevented', async () => {
            const prevented = vi.fn();
            el.addEventListener('ar-dialog-dismissed', (e) => e.preventDefault());
            el.addEventListener('ar-dialog-dismissed-prevented', prevented);
            (requireShadow(el).querySelector('[data-ar-dismiss]') as HTMLElement).click();
            await waitForUpdate(el);
            expect(prevented).toHaveBeenCalledOnce();
            expect(el.open).toBe(true);
        });

        it('ar-dialog-accepted annulable émet ar-dialog-accepted-prevented', async () => {
            const prevented = vi.fn();
            el.addEventListener('ar-dialog-accepted', (e) => e.preventDefault());
            el.addEventListener('ar-dialog-accepted-prevented', prevented);
            const body = requireShadow(el).querySelector('.dialog-body') as HTMLElement;
            body.setAttribute('data-ar-accept', '');
            body.click();
            body.removeAttribute('data-ar-accept');
            await waitForUpdate(el);
            expect(prevented).toHaveBeenCalledOnce();
            expect(el.open).toBe(true);
        });
    });

    // ── Backdrop click ────────────────────────────────────────────────────────

    describe('backdrop', () => {
        beforeEach(async () => {
            el = await fixture('<ar-dialog open></ar-dialog>');
        });

        it('backdrop ne ferme pas par défaut', async () => {
            const dialogEl = getDialogEl(el);
            dialogEl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
            dialogEl.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
            await waitForUpdate(el);
            expect((el as unknown as { _isClosing: boolean })._isClosing).toBe(false);
        });

        it('close-on-backdrop : backdrop click ferme', async () => {
            el.closeOnBackdrop = true;
            await waitForUpdate(el);
            const dialogEl = getDialogEl(el);
            dialogEl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
            dialogEl.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
            await waitForUpdate(el);
            expect((el as unknown as { _isClosing: boolean })._isClosing).toBe(true);
        });

        it('pointerdown sur enfant + pointerup sur dialog (drag) ne ferme pas', async () => {
            el.closeOnBackdrop = true;
            await waitForUpdate(el);
            const dialogEl = getDialogEl(el);
            const body = requireShadow(el).querySelector('.dialog-body') as Element;
            body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
            dialogEl.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
            await waitForUpdate(el);
            expect((el as unknown as { _isClosing: boolean })._isClosing).toBe(false);
        });
    });

    // ── Clavier ───────────────────────────────────────────────────────────────

    describe('clavier', () => {
        it('Escape ferme le dialog ouvert', async () => {
            el = await fixture('<ar-dialog open></ar-dialog>');
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            await waitForUpdate(el);
            expect((el as unknown as { _isClosing: boolean })._isClosing).toBe(true);
        });

        it('Escape ignoré si dialog fermé', async () => {
            el = await fixture('<ar-dialog></ar-dialog>');
            const spy = vi.spyOn(getDialogEl(el), 'close');
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            await waitForUpdate(el);
            expect(spy).not.toHaveBeenCalled();
        });

        it('cancel natif sur le dialog est annulé (empêche fermeture native)', async () => {
            el = await fixture('<ar-dialog open></ar-dialog>');
            const event = new Event('cancel', { cancelable: true, bubbles: true });
            getDialogEl(el).dispatchEvent(event);
            expect(event.defaultPrevented).toBe(true);
        });
    });

    // ── Scroll management ─────────────────────────────────────────────────────

    describe('scroll', () => {
        it("gèle le scroll à l'ouverture et le restaure à la fermeture", async () => {
            el = await fixture('<ar-dialog></ar-dialog>');
            el.open = true;
            await waitForUpdate(el);
            expect(document.body.style.overflow).toBe('hidden');

            el.open = false;
            await waitForUpdate(el);
            fireAnimationEnd(el);
            await waitForUpdate(el);
            expect(document.body.style.overflow).not.toBe('hidden');
        });
    });

    // ── Gestion du focus ──────────────────────────────────────────────────────

    describe('gestion du focus', () => {
        it("retourne le focus à l'élément déclencheur à la fermeture", async () => {
            el = await fixture('<ar-dialog></ar-dialog>');
            const trigger = document.createElement('button');
            document.body.appendChild(trigger);
            trigger.focus();

            el.open = true;
            await waitForUpdate(el);

            el.open = false;
            await waitForUpdate(el);
            fireAnimationEnd(el);
            await waitForUpdate(el);

            expect(document.activeElement).toBe(trigger);
            trigger.remove();
        });

        it("déplace le focus sur le premier élément focalisable du contenu à l'ouverture", async () => {
            el = await fixture(`
                <ar-dialog>
                    <button id="first-btn">Premier</button>
                </ar-dialog>
            `);
            const firstBtn = el.querySelector<HTMLButtonElement>('#first-btn');
            if (!firstBtn) throw new Error('button#first-btn introuvable');
            const focusSpy = vi.spyOn(firstBtn, 'focus');
            el.open = true;
            await waitForUpdate(el);
            await waitForUpdate(el);
            expect(focusSpy).toHaveBeenCalled();
        });

        it('déplace le focus sur le bouton fermer si aucun élément focalisable dans le slot', async () => {
            el = await fixture('<ar-dialog><p>Texte</p></ar-dialog>');
            const closeBtn = requireShadow(el).querySelector<HTMLElement>('[data-ar-dismiss]');
            if (!closeBtn) throw new Error('[data-ar-dismiss] introuvable');
            const focusSpy = vi.spyOn(closeBtn, 'focus');
            el.open = true;
            await waitForUpdate(el);
            await waitForUpdate(el);
            expect(focusSpy).toHaveBeenCalled();
        });
    });

    // ── Trigger externe ───────────────────────────────────────────────────────

    describe('trigger externe data-ar-dialog-open', () => {
        it('un bouton data-ar-dialog-open="id" ouvre le dialog correspondant', async () => {
            el = await fixture('<ar-dialog id="test-dialog-ext"></ar-dialog>');
            const btn = document.createElement('button');
            btn.setAttribute('data-ar-dialog-open', 'test-dialog-ext');
            document.body.appendChild(btn);

            btn.click();
            await waitForUpdate(el);
            expect(el.open).toBe(true);

            btn.remove();
        });

        it('le module se charge sans erreur (guard SSR)', () => {
            // Guard: le listener module-level est protégé par typeof
            // document !== 'undefined'
            expect(customElements.get('ar-dialog')).toBeDefined();
        });
    });
});
