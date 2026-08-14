import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type ArAlert } from './alert.js';
import { fixture, waitForUpdate, getPart, requirePart, requireShadow } from '../../test-utils.js';
import './index.js';

describe('ArAlert', () => {
    let el: ArAlert;

    afterEach(() => el?.remove());

    // ── Rendu ─────────────────────────────────────────────────────────────────

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<ar-alert></ar-alert>');
        });

        it('monte un shadow DOM', () => {
            expect(el.shadowRoot).not.toBeNull();
        });

        it('contient un part="icon"', () => {
            expect(getPart(el, 'icon')).not.toBeNull();
        });

        it('contient un part="body"', () => {
            expect(getPart(el, 'body')).not.toBeNull();
        });
    });

    // ── Valeurs par défaut ────────────────────────────────────────────────────

    describe('valeurs par défaut', () => {
        beforeEach(async () => {
            el = await fixture('<ar-alert></ar-alert>');
        });

        it('variant est error par défaut (la valeur par défaut est appliquée au rendu uniquement)', () => {
            // La propriété JS est undefined — DEFAULT_VARIANT est utilisé dans le template,
            // pas comme valeur initiale de la propriété.
            expect(el.variant).toBe('error');
        });

        it('nextFocus est undefined par défaut', () => {
            expect(el.nextFocus).toBeUndefined();
        });

        it('withoutNotification vaut false par défaut', () => {
            expect(el.withoutNotification).toBe(false);
        });

        it('le bouton close est absent sans next-focus', () => {
            expect(getPart(el, 'close-button')).toBeNull();
        });
    });

    // ── Propriété variant ─────────────────────────────────────────────────────

    describe('propriété variant', () => {
        it("reflète variant en attribut HTML depuis l'attribut initial", async () => {
            el = await fixture('<ar-alert variant="success"></ar-alert>');
            expect(el.getAttribute('variant')).toBe('success');
        });
    });

    // ── Accessibilité ARIA ────────────────────────────────────────────────────

    describe('accessibilité ARIA', () => {
        it('variant="error" donne role="alert" au host', async () => {
            el = await fixture('<ar-alert variant="error"></ar-alert>');
            expect(el.getAttribute('role')).toBe('alert');
        });

        it('variant="warning" donne role="alert" au host', async () => {
            el = await fixture('<ar-alert variant="warning"></ar-alert>');
            expect(el.getAttribute('role')).toBe('alert');
        });

        it('variant="success" donne role="status" au host', async () => {
            el = await fixture('<ar-alert variant="success"></ar-alert>');
            expect(el.getAttribute('role')).toBe('status');
        });

        it('variant="info" donne role="status" au host', async () => {
            el = await fixture('<ar-alert variant="info"></ar-alert>');
            expect(el.getAttribute('role')).toBe('status');
        });

        it('un variant custom inconnu donne role="status" (défaut sûr)', async () => {
            el = await fixture('<ar-alert variant="promo"></ar-alert>');
            expect(el.getAttribute('role')).toBe('status');
        });

        it('without-notification supprime le role du host', async () => {
            el = await fixture('<ar-alert without-notification></ar-alert>');
            expect(el.hasAttribute('role')).toBe(false);
        });
    });

    // ── Prop urgent (override du rôle) ──────────────────────────────────────

    describe('prop urgent', () => {
        it('urgent est undefined par défaut', async () => {
            el = await fixture('<ar-alert></ar-alert>');
            expect(el.urgent).toBeUndefined();
        });

        it('la seule présence de l\'attribut urgent force role="alert"', async () => {
            el = await fixture('<ar-alert variant="success" urgent></ar-alert>');
            expect(el.getAttribute('role')).toBe('alert');
        });

        it('urgent en absence ne force pas role="status" (retombe sur la table)', async () => {
            el = await fixture('<ar-alert variant="error"></ar-alert>');
            expect(el.getAttribute('role')).toBe('alert');
        });

        it('urgent=false (JS) force role="status" même sur un variant "error"', async () => {
            el = await fixture('<ar-alert variant="error"></ar-alert>');
            el.urgent = false;
            await waitForUpdate(el);
            expect(el.getAttribute('role')).toBe('status');
        });

        it("urgent est prioritaire sur withoutNotification=false mais pas l'inverse", async () => {
            el = await fixture(
                '<ar-alert variant="success" urgent without-notification></ar-alert>',
            );
            expect(el.hasAttribute('role')).toBe(false);
        });

        it("removeAttribute('urgent') retombe sur undefined (pas sur false)", async () => {
            el = await fixture('<ar-alert variant="error" urgent></ar-alert>');
            expect(el.getAttribute('role')).toBe('alert');
            el.removeAttribute('urgent');
            await waitForUpdate(el);
            expect(el.urgent).toBeUndefined();
            expect(el.getAttribute('role')).toBe('alert'); // retombe sur la table (error -> alert), pas force à status
        });
    });

    // ── Avertissement role manuel ─────────────────────────────────────────────

    describe('avertissement role manuel', () => {
        it('avertit si role est posé manuellement dans le markup initial', async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            try {
                el = await fixture('<ar-alert role="banner" variant="error"></ar-alert>');
                expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-alert]'));
                expect(spy.mock.calls[0][0]).toContain('role="banner"');
            } finally {
                spy.mockRestore();
            }
        });

        it("n'avertit pas si role n'est pas posé dans le markup initial", async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            try {
                el = await fixture('<ar-alert></ar-alert>');
                // Le warning pour variant custom ne doit pas être appelé (pas de variant custom)
                expect(spy).not.toHaveBeenCalled();
            } finally {
                spy.mockRestore();
            }
        });

        it('role posé manuellement est bien écrasé par la logique interne malgré le warning', async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            try {
                el = await fixture('<ar-alert role="banner" variant="info"></ar-alert>');
                expect(el.getAttribute('role')).toBe('status');
                expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-alert]'));
                expect(spy.mock.calls[0][0]).toContain('role="banner"');
            } finally {
                spy.mockRestore();
            }
        });

        it("n'avertit qu'une seule fois, même si variant change ensuite", async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            try {
                el = await fixture('<ar-alert role="banner"></ar-alert>');
                expect(spy).toHaveBeenCalledOnce();
                spy.mockClear();

                el.variant = 'info';
                await waitForUpdate(el);
                expect(spy).not.toHaveBeenCalled();
            } finally {
                spy.mockRestore();
            }
        });

        it("l'avertissement n'empêche pas la fermeture du role par withoutNotification", async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            try {
                el = await fixture('<ar-alert role="banner" without-notification></ar-alert>');
                expect(el.hasAttribute('role')).toBe(false);
                expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-alert]'));
                expect(spy.mock.calls[0][0]).toContain('role="banner"');
            } finally {
                spy.mockRestore();
            }
        });
    });

    // ── Icône ─────────────────────────────────────────────────────────────────

    describe('icône', () => {
        it('contient un slot nommé "icon"', async () => {
            el = await fixture('<ar-alert></ar-alert>');
            expect(requireShadow(el).querySelector('slot[name="icon"]')).not.toBeNull();
        });

        it('rend un svg par défaut dans le slot icon', async () => {
            el = await fixture('<ar-alert></ar-alert>');
            expect(requireShadow(el).querySelector('slot[name="icon"] svg')).not.toBeNull();
        });

        it('le svg par défaut a aria-hidden="true"', async () => {
            el = await fixture('<ar-alert></ar-alert>');
            const svg = requireShadow(el).querySelector('slot[name="icon"] svg');
            expect(svg?.getAttribute('aria-hidden')).toBe('true');
        });

        it('le path svg change quand variant change', async () => {
            el = await fixture('<ar-alert variant="success"></ar-alert>');
            const pathSuccess = requireShadow(el)
                .querySelector('slot[name="icon"] svg path')
                ?.getAttribute('d');

            el.variant = 'warning';
            await waitForUpdate(el);
            const pathWarning = requireShadow(el)
                .querySelector('slot[name="icon"] svg path')
                ?.getAttribute('d');

            expect(pathSuccess).not.toBe(pathWarning);
        });

        it('un slot icon custom remplace le svg par défaut', async () => {
            el = await fixture(`
                <ar-alert>
                    <svg slot="icon" data-custom="true" aria-hidden="true"></svg>
                </ar-alert>
            `);
            const slotEl = requireShadow(el).querySelector('slot[name="icon"]') as HTMLSlotElement;
            const assigned = slotEl.assignedElements();
            expect(assigned).toHaveLength(1);
            expect((assigned[0] as HTMLElement).dataset.custom).toBe('true');
        });

        it("n'affiche pas d'icône par défaut pour un variant custom inconnu", async () => {
            el = await fixture('<ar-alert variant="promo"></ar-alert>');
            expect(requireShadow(el).querySelector('slot[name="icon"] svg')).toBeNull();
        });

        it('logue un avertissement pour un variant custom inconnu', async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            el = await fixture('<ar-alert variant="promo"></ar-alert>');
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('promo'));
            spy.mockRestore();
        });

        it("n'avertit pas pour un variant connu", async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            el = await fixture('<ar-alert variant="success"></ar-alert>');
            expect(spy).not.toHaveBeenCalled();
            spy.mockRestore();
        });

        it('n\'avertit pas pour un variant custom si slot="icon" est fourni', async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            el = await fixture(`
                <ar-alert variant="promo">
                    <svg slot="icon" aria-hidden="true"></svg>
                </ar-alert>
            `);
            expect(spy).not.toHaveBeenCalled();
            spy.mockRestore();
        });
    });

    // ── Bouton close ──────────────────────────────────────────────────────────

    describe('bouton close', () => {
        it("n'est pas rendu sans l'attribut next-focus", async () => {
            el = await fixture('<ar-alert></ar-alert>');
            expect(getPart(el, 'close-button')).toBeNull();
        });

        it('est rendu quand next-focus est défini', async () => {
            el = await fixture('<ar-alert next-focus="btn-retour"></ar-alert>');
            expect(getPart(el, 'close-button')).not.toBeNull();
        });

        it("n'est pas rendu si next-focus est une chaîne vide", async () => {
            el = await fixture('<ar-alert next-focus=""></ar-alert>');
            expect(getPart(el, 'close-button')).toBeNull();
        });

        it("n'est pas rendu si next-focus ne contient que des espaces", async () => {
            el = await fixture('<ar-alert next-focus="   "></ar-alert>');
            expect(getPart(el, 'close-button')).toBeNull();
        });

        it('le bouton close a aria-label="Fermer l\'alerte"', async () => {
            el = await fixture('<ar-alert next-focus="btn-retour"></ar-alert>');
            expect(requirePart(el, 'close-button').getAttribute('aria-label')).toBe(
                "Fermer l'alerte",
            );
        });

        it('porte le part combiné "close-button action-button"', async () => {
            el = await fixture('<ar-alert next-focus="btn-retour"></ar-alert>');
            expect(requirePart(el, 'close-button').getAttribute('part')).toBe(
                'close-button action-button',
            );
        });

        it('reflète next-focus en attribut HTML', async () => {
            el = await fixture('<ar-alert></ar-alert>');
            el.nextFocus = 'mon-bouton';
            await waitForUpdate(el);
            expect(el.getAttribute('next-focus')).toBe('mon-bouton');
        });
    });

    // ── canBeHidden ───────────────────────────────────────────────────────────

    describe('canBeHidden', () => {
        it('est false sans next-focus', async () => {
            el = await fixture('<ar-alert></ar-alert>');
            expect(el.canBeHidden).toBe(false);
        });

        it('est true avec un next-focus valide', async () => {
            el = await fixture('<ar-alert next-focus="btn-retour"></ar-alert>');
            expect(el.canBeHidden).toBe(true);
        });

        it('est false si next-focus est vide', async () => {
            el = await fixture('<ar-alert next-focus=""></ar-alert>');
            expect(el.canBeHidden).toBe(false);
        });

        it('est false si next-focus ne contient que des espaces', async () => {
            el = await fixture('<ar-alert next-focus="   "></ar-alert>');
            expect(el.canBeHidden).toBe(false);
        });

        it('redevient false après retrait de next-focus (attribut supprimé, pas juste vidé)', async () => {
            el = await fixture('<ar-alert next-focus="btn-retour"></ar-alert>');
            expect(el.canBeHidden).toBe(true);
            el.removeAttribute('next-focus');
            await waitForUpdate(el);
            expect(el.nextFocus).toBeNull();
            expect(el.canBeHidden).toBe(false);
        });

        it('ne plante pas si on ferme après que next-focus a été retiré (nextFocus null)', async () => {
            el = await fixture('<ar-alert next-focus="btn-retour"></ar-alert>');
            el.removeAttribute('next-focus');
            await waitForUpdate(el);
            // canBeHidden est false donc le bouton close n'est pas rendu — pas d'appel possible à _hide()
            expect(getPart(el, 'close-button')).toBeNull();
        });
    });

    // ── Fermeture ─────────────────────────────────────────────────────────────

    describe('fermeture', () => {
        it('un clic sur close passe hiding à true', async () => {
            el = await fixture('<ar-alert next-focus="btn-retour"></ar-alert>');
            // Force une durée de transition non nulle (simule un thème chargé) : sans thème,
            // _shouldAnimate() renvoie false et _finishHide() s'exécute de façon synchrone,
            // ce qui repasserait hiding à false avant même l'assertion ci-dessous.
            el.style.transitionDuration = '0.3s';
            (requirePart(el, 'close-button') as HTMLButtonElement).click();
            await waitForUpdate(el);
            // hiding est un protected property — on y accède via cast
            expect((el as unknown as { hiding: boolean }).hiding).toBe(true);
        });

        it('hiding=true applique l\'attribut "hiding" sur le host', async () => {
            el = await fixture('<ar-alert next-focus="btn-retour"></ar-alert>');
            // Cf. commentaire ci-dessus : durée de transition non nulle requise pour que
            // hiding reste true (chemin asynchrone) au moment de l'assertion.
            el.style.transitionDuration = '0.3s';
            (requirePart(el, 'close-button') as HTMLButtonElement).click();
            await waitForUpdate(el);
            expect(el.hasAttribute('hiding')).toBe(true);
        });

        it('émet ar-alert-close après transitionend quand hiding=true (thème avec transition réelle)', async () => {
            el = await fixture('<ar-alert next-focus="btn-retour"></ar-alert>');
            // Force une durée de transition non nulle (simule un thème chargé) pour exercer
            // le chemin asynchrone : sans ça, _shouldAnimate() renverrait false en happy-dom
            // (aucune feuille de style chargée) et la fermeture serait synchrone.
            el.style.transitionDuration = '0.3s';
            const handler = vi.fn();
            el.addEventListener('ar-alert-close', handler);

            // Simule le clic → hiding=true
            (requirePart(el, 'close-button') as HTMLButtonElement).click();
            await waitForUpdate(el);

            // La fermeture attend bien la transition : rien n'est émis avant transitionend.
            expect(handler).not.toHaveBeenCalled();

            // Simule la fin de la transition CSS (transitionend)
            el.dispatchEvent(new Event('transitionend'));

            expect(handler).toHaveBeenCalledOnce();
        });

        it('ignore un second transitionend dans la même tâche (thème anime opacity ET transform)', async () => {
            // Régression #129 : le thème déclenche la transition sur deux propriétés
            // simultanément (opacity + transform). Par spec, `transitionend` se déclenche
            // une fois PAR PROPRIÉTÉ transitionnée — donc deux fois de suite ici. Sans reset
            // de `hiding` dans `_finishHide`, le second appel repasserait la garde et
            // ré-émettrait ar-alert-close / redonnerait le focus une seconde fois.
            el = await fixture('<ar-alert next-focus="btn-retour"></ar-alert>');
            el.style.transitionDuration = '0.3s';
            const handler = vi.fn();
            el.addEventListener('ar-alert-close', handler);

            (requirePart(el, 'close-button') as HTMLButtonElement).click();
            await waitForUpdate(el);

            // Simule les deux transitionend (opacity, puis transform) dans la même tâche.
            el.dispatchEvent(new Event('transitionend'));
            el.dispatchEvent(new Event('transitionend'));

            expect(handler).toHaveBeenCalledOnce();
        });

        it("ferme instantanément (sans transitionend) quand aucun thème n'est chargé (durée de transition à 0)", async () => {
            // Régression #129 : si default.css n'est pas chargé, la transition CSS externalisée
            // (opacity/transform) ne s'applique jamais et la durée calculée reste à 0 — sans
            // garde JS, transitionend ne se déclencherait jamais et l'alerte resterait bloquée.
            const target = document.createElement('button');
            target.id = 'btn-retour-sans-theme';
            document.body.appendChild(target);

            el = await fixture('<ar-alert next-focus="btn-retour-sans-theme"></ar-alert>');
            const handler = vi.fn();
            el.addEventListener('ar-alert-close', handler);

            // Aucun style inline, aucune feuille de thème chargée en environnement de test :
            // getComputedStyle(el).transitionDuration vaut '' (→ 0) en happy-dom par défaut.
            (requirePart(el, 'close-button') as HTMLButtonElement).click();
            await waitForUpdate(el);

            // La fermeture doit être synchrone : pas de transitionend nécessaire.
            expect(handler).toHaveBeenCalledOnce();
            expect(el.isConnected).toBe(false);
            expect(document.activeElement).toBe(target);

            target.remove();
        });

        it("n'émet pas ar-alert-close si hiding=false au transitionend", async () => {
            el = await fixture('<ar-alert next-focus="btn-retour"></ar-alert>');
            const handler = vi.fn();
            el.addEventListener('ar-alert-close', handler);

            // Pas de clic → hiding reste false
            el.dispatchEvent(new Event('transitionend'));

            expect(handler).not.toHaveBeenCalled();
        });

        it('un transitionend qui bubble sans clic sur close (hiding=false) ne vole pas le focus', async () => {
            const target = document.createElement('button');
            target.id = 'btn-cible-survol';
            document.body.appendChild(target);

            el = await fixture('<ar-alert next-focus="btn-cible-survol"></ar-alert>');
            const initiallyFocused = document.activeElement;

            // Simule un transitionend qui bubble jusqu'à l'hôte SANS clic préalable sur le bouton
            // close (ex: transition CSS de survol/focus sur le bouton lui-même) — hiding reste false.
            el.dispatchEvent(new Event('transitionend'));

            expect(document.activeElement).toBe(initiallyFocused);
            expect(document.activeElement).not.toBe(target);

            target.remove();
        });

        it('logue un avertissement si next-focus pointe vers un ID inexistant', async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            el = await fixture('<ar-alert next-focus="id-inexistant"></ar-alert>');

            // Sans thème chargé (durée de transition à 0 en happy-dom), la fermeture se termine
            // synchroniquement au clic — pas besoin de simuler transitionend.
            (requirePart(el, 'close-button') as HTMLButtonElement).click();
            await waitForUpdate(el);

            expect(spy).toHaveBeenCalledOnce();
            expect(spy.mock.calls[0][0]).toContain('id-inexistant');
            spy.mockRestore();
        });

        it("reporte le focus sur l'élément cible à la fermeture", async () => {
            // Crée un bouton focusable avec l'ID attendu dans le document de test
            const target = document.createElement('button');
            target.id = 'btn-retour-focus';
            document.body.appendChild(target);

            el = await fixture('<ar-alert next-focus="btn-retour-focus"></ar-alert>');

            // Sans thème chargé (durée de transition à 0 en happy-dom), la fermeture se termine
            // synchroniquement au clic — pas besoin de simuler transitionend.
            (requirePart(el, 'close-button') as HTMLButtonElement).click();
            await waitForUpdate(el);

            expect(document.activeElement).toBe(target);

            target.remove();
        });
    });
});
