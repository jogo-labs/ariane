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
            expect(getPart(el, 'close')).toBeNull();
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

        it('variant="success" donne role="alert" au host', async () => {
            el = await fixture('<ar-alert variant="success"></ar-alert>');
            expect(el.getAttribute('role')).toBe('alert');
        });

        it('variant="info" donne role="status" au host', async () => {
            el = await fixture('<ar-alert variant="info"></ar-alert>');
            expect(el.getAttribute('role')).toBe('status');
        });

        it('without-notification supprime le role du host', async () => {
            el = await fixture('<ar-alert without-notification></ar-alert>');
            // Lit utilise `nothing` pour ne pas rendre l'attribut du tout
            expect(el.hasAttribute('role')).toBe(false);
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
    });

    // ── Bouton close ──────────────────────────────────────────────────────────

    describe('bouton close', () => {
        it("n'est pas rendu sans l'attribut next-focus", async () => {
            el = await fixture('<ar-alert></ar-alert>');
            expect(getPart(el, 'close')).toBeNull();
        });

        it('est rendu quand next-focus est défini', async () => {
            el = await fixture('<ar-alert next-focus="btn-retour"></ar-alert>');
            expect(getPart(el, 'close')).not.toBeNull();
        });

        it("n'est pas rendu si next-focus est une chaîne vide", async () => {
            el = await fixture('<ar-alert next-focus=""></ar-alert>');
            expect(getPart(el, 'close')).toBeNull();
        });

        it("n'est pas rendu si next-focus ne contient que des espaces", async () => {
            el = await fixture('<ar-alert next-focus="   "></ar-alert>');
            expect(getPart(el, 'close')).toBeNull();
        });

        it('le bouton close a aria-label="Fermer l\'alerte"', async () => {
            el = await fixture('<ar-alert next-focus="btn-retour"></ar-alert>');
            expect(requirePart(el, 'close').getAttribute('aria-label')).toBe("Fermer l'alerte");
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
    });

    // ── Fermeture ─────────────────────────────────────────────────────────────

    describe('fermeture', () => {
        it('un clic sur close passe hiding à true', async () => {
            el = await fixture('<ar-alert next-focus="btn-retour"></ar-alert>');
            (requirePart(el, 'close') as HTMLButtonElement).click();
            await waitForUpdate(el);
            // hiding est un protected property — on y accède via cast
            expect((el as unknown as { hiding: boolean }).hiding).toBe(true);
        });

        it('hiding=true applique l\'attribut "hiding" sur le host', async () => {
            el = await fixture('<ar-alert next-focus="btn-retour"></ar-alert>');
            (requirePart(el, 'close') as HTMLButtonElement).click();
            await waitForUpdate(el);
            expect(el.hasAttribute('hiding')).toBe(true);
        });

        it('émet ar-alert-close après transitionend quand hiding=true', async () => {
            el = await fixture('<ar-alert next-focus="btn-retour"></ar-alert>');
            const handler = vi.fn();
            el.addEventListener('ar-alert-close', handler);

            // Simule le clic → hiding=true
            (requirePart(el, 'close') as HTMLButtonElement).click();
            await waitForUpdate(el);

            // Simule la fin de la transition CSS (transitionend)
            el.dispatchEvent(new Event('transitionend'));

            expect(handler).toHaveBeenCalledOnce();
        });

        it("n'émet pas ar-alert-close si hiding=false au transitionend", async () => {
            el = await fixture('<ar-alert next-focus="btn-retour"></ar-alert>');
            const handler = vi.fn();
            el.addEventListener('ar-alert-close', handler);

            // Pas de clic → hiding reste false
            el.dispatchEvent(new Event('transitionend'));

            expect(handler).not.toHaveBeenCalled();
        });

        it('logue un avertissement si next-focus pointe vers un ID inexistant', async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            el = await fixture('<ar-alert next-focus="id-inexistant"></ar-alert>');

            (requirePart(el, 'close') as HTMLButtonElement).click();
            await waitForUpdate(el);
            el.dispatchEvent(new Event('transitionend'));

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

            (requirePart(el, 'close') as HTMLButtonElement).click();
            await waitForUpdate(el);
            el.dispatchEvent(new Event('transitionend'));

            expect(document.activeElement).toBe(target);

            target.remove();
        });
    });

    // ── next-focus invalide ──────────────────────────────────────────────────

    describe('next-focus invalide', () => {
        it("n'appelle pas console.error directement", async () => {
            el = await fixture(
                '<ar-alert next-focus="id-inexistant"><span slot="close-icon">x</span></ar-alert>',
            );
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const closeButton = getPart(el, 'close') as HTMLButtonElement;

            closeButton.click();
            await waitForUpdate(el);
            el.dispatchEvent(new Event('transitionend'));

            expect(consoleErrorSpy).not.toHaveBeenCalled();
            consoleErrorSpy.mockRestore();
        });
    });
});
