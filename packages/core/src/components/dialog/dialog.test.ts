import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArDialog } from './dialog.js';
import { fixture, waitForUpdate, getPart, requireShadow } from '../../test-utils.js';
import './dialog.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDialogEl(el: ArDialog): HTMLDialogElement {
    return requireShadow(el).querySelector('dialog') as HTMLDialogElement;
}

// ──────────────────────────────────────────────────────────────────────────────

describe('ArDialog', () => {
    let el: ArDialog;

    afterEach(() => {
        el?.remove();
        document.querySelectorAll('[data-ar-live-region]').forEach((node) => node.remove());
    });

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
        it('preventedMessage a sa valeur par défaut', () =>
            expect(el.preventedMessage).toBe('Fermeture bloquée.'));
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

        it("prevented-message est lu depuis l'attribut", async () => {
            el = await fixture('<ar-dialog prevented-message="Action refusée."></ar-dialog>');
            expect(el.preventedMessage).toBe('Action refusée.');
        });

        it('preventedMessage reflète en attribut', async () => {
            el = await fixture('<ar-dialog></ar-dialog>');
            el.preventedMessage = 'Bloqué.';
            await waitForUpdate(el);
            expect(el.getAttribute('prevented-message')).toBe('Bloqué.');
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
            expect(document.body.style.overflowY).toBe('hidden');
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

        it("ne déclenche pas de warning Lit 'change-in-update' lors d'un cycle open/close", async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            el = await fixture('<ar-dialog label="Titre" open></ar-dialog>');
            await waitForUpdate(el);

            el.open = false;
            await waitForUpdate(el);
            await new Promise((resolve) => setTimeout(resolve, 550));

            expect(
                spy.mock.calls
                    .flat()
                    .filter((value) => typeof value === 'string')
                    .some((value) => value.includes('scheduled an update')),
            ).toBe(false);

            spy.mockRestore();
        });

        it("ne déclenche pas de warning Lit 'change-in-update' quand l'ouverture est annulée", async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            el = await fixture('<ar-dialog label="Titre"></ar-dialog>');
            el.addEventListener('ar-dialog-show', (e) => e.preventDefault());
            el.open = true;
            await waitForUpdate(el);
            await waitForUpdate(el);

            expect(getDialogEl(el).open).toBe(false);
            expect(el.open).toBe(false);
            expect(
                spy.mock.calls
                    .flat()
                    .filter((value) => typeof value === 'string')
                    .some((value) => value.includes('scheduled an update')),
            ).toBe(false);

            spy.mockRestore();
        });

        it("ar-dialog-show annulable empêche l'ouverture", async () => {
            el = await fixture('<ar-dialog></ar-dialog>');
            el.addEventListener('ar-dialog-show', (e) => e.preventDefault());
            el.open = true;
            await waitForUpdate(el);
            expect(getDialogEl(el).open).toBe(false);
            expect(el.open).toBe(false);
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

        it("ar-dialog-show expose l'id du composant dans detail", async () => {
            el = await fixture('<ar-dialog id="dialog-events"></ar-dialog>');
            let detailId: string | undefined;
            el.addEventListener('ar-dialog-show', (event) => {
                detailId = (event as CustomEvent<{ id?: string }>).detail.id;
            });
            el.open = true;
            await waitForUpdate(el);
            expect(detailId).toBe('dialog-events');
        });

        it('peut être rouvert après une ouverture annulée', async () => {
            el = await fixture('<ar-dialog></ar-dialog>');
            let prevented = true;
            el.addEventListener('ar-dialog-show', (e) => {
                if (prevented) {
                    e.preventDefault();
                    prevented = false;
                }
            });

            el.open = true;
            await waitForUpdate(el);
            expect(el.open).toBe(false);

            el.open = true;
            await waitForUpdate(el);
            expect(getDialogEl(el).open).toBe(true);
        });
    });

    // ── Fermeture ─────────────────────────────────────────────────────────────

    describe('fermeture', () => {
        beforeEach(async () => {
            el = await fixture('<ar-dialog open></ar-dialog>');
        });

        it('émet ar-dialog-hide avant la fermeture', async () => {
            const handler = vi.fn();
            el.addEventListener('ar-dialog-hide', handler);
            el.open = false;
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

        it('restaure la valeur précédente de body.style.overflow à la fermeture', async () => {
            el.remove();
            document.body.style.overflow = 'clip';
            el = await fixture('<ar-dialog open></ar-dialog>');

            el.open = false;
            await waitForUpdate(el);
            await new Promise((resolve) => setTimeout(resolve, 550));
            expect(document.body.style.overflow).toBe('clip');
        });

        it('réannonce le message par défaut si preventedMessage est vide', async () => {
            el.preventedMessage = '   ';

            el.addEventListener('ar-dialog-hide', (e) => e.preventDefault());
            el.open = false;
            await waitForUpdate(el);
            await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

            expect(document.getElementById('ar-live-region-assertive')?.textContent).toBe(
                'Fermeture bloquée.',
            );
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
            const body = requireShadow(el).querySelector('[part="body"]') as HTMLElement;
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
            const body = requireShadow(el).querySelector('[part="body"]') as HTMLElement;
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
            const body = requireShadow(el).querySelector('[part="body"]') as Element;
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

        it('Escape ne ferme que le dialog au sommet quand plusieurs dialogs sont ouverts', async () => {
            const first = await fixture<ArDialog>('<ar-dialog id="dialog-1" open></ar-dialog>');
            const second = await fixture<ArDialog>('<ar-dialog id="dialog-2" open></ar-dialog>');

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            await waitForUpdate(first);
            await waitForUpdate(second);

            expect((first as unknown as { _isClosing: boolean })._isClosing).toBe(false);
            expect((second as unknown as { _isClosing: boolean })._isClosing).toBe(true);

            second.remove();
            first.remove();
        });
    });

    // ── Gestion du focus ──────────────────────────────────────────────────────

    describe('gestion du focus', () => {
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

    // ── Label accessible ─────────────────────────────────────────────────────

    describe('label accessible', () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        it("affiche un fallback visible si aucun label n'est fourni", async () => {
            el = await fixture('<ar-dialog></ar-dialog>');
            const title = requireShadow(el).getElementById('dialog-heading');
            expect(title?.textContent?.trim()).toBe('Dialogue');
        });

        it('utilise le slot label quand un libellé slotté est fourni', async () => {
            el = await fixture(
                '<ar-dialog><span slot="label">Titre personnalisé</span></ar-dialog>',
            );
            await waitForUpdate(el);
            const slot = requireShadow(el).querySelector<HTMLSlotElement>('slot[name="label"]');
            expect(slot).not.toBeNull();
            const text = slot
                ?.assignedNodes({ flatten: true })
                .map((n) => n.textContent)
                .join('')
                .trim();
            expect(text).toBe('Titre personnalisé');
        });

        it("affiche un warning si aucun label explicite n'est fourni", async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            el = await fixture('<ar-dialog></ar-dialog>');
            expect(spy).toHaveBeenCalledWith(
                expect.stringContaining('[ar-dialog] Aucun libellé accessible fourni'),
            );
        });

        it('ne répète pas le warning plusieurs fois pour la même instance', async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            el = await fixture('<ar-dialog></ar-dialog>');
            el.appendChild(document.createTextNode(' '));
            await waitForUpdate(el);
            expect(spy).toHaveBeenCalledTimes(1);
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

        it("ignore un trigger data-ar-dialog-open si l'id ne correspond à aucun dialog", async () => {
            el = await fixture('<ar-dialog id="dialog-existant"></ar-dialog>');
            const btn = document.createElement('button');
            btn.setAttribute('data-ar-dialog-open', 'dialog-introuvable');
            document.body.appendChild(btn);

            btn.click();
            await waitForUpdate(el);

            expect(el.open).toBe(false);
            btn.remove();
        });
    });

    describe('warn() — label manquant et placement/modal', () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        it("émet un warn si aucun label ni slot label n'est fourni", async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            await fixture('<ar-dialog open></ar-dialog>');

            expect(spy).toHaveBeenCalledOnce();
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-dialog]'));
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('label'));
        });

        it("n'émet pas de warn si label est fourni", async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            await fixture('<ar-dialog open label="Titre du dialog"></ar-dialog>');

            expect(spy).not.toHaveBeenCalled();
        });

        it('émet un warn si placement est défini hors mode drawer', async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            await fixture('<ar-dialog label="Test" placement="left" mode="modal"></ar-dialog>');

            const placementWarns = spy.mock.calls.filter((c) => String(c[0]).includes('placement'));
            expect(placementWarns.length).toBeGreaterThan(0);
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-dialog]'));
        });

        it("n'émet pas de warn placement si mode est drawer", async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            await fixture('<ar-dialog label="Test" placement="left" mode="drawer"></ar-dialog>');

            const placementWarns = spy.mock.calls.filter((c) => String(c[0]).includes('placement'));
            expect(placementWarns).toHaveLength(0);
        });
    });
});
