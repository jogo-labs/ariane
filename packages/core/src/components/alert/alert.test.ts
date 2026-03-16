import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type MrAlert } from './alert.js';
import './alert.js';

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
async function fixture(html: string): Promise<MrAlert> {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstElementChild as MrAlert;
    document.body.appendChild(el);
    await (el as unknown as LitEl).updateComplete;
    return el;
}

/** Attend la fin du prochain cycle de rendu Lit sur un élément déjà monté. */
async function waitForUpdate(el: MrAlert): Promise<void> {
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
function getPart(el: MrAlert, part: string): Element {
    const shadow = el.shadowRoot as ShadowRoot;
    return shadow.querySelector(`[part="${part}"]`) as Element;
}

describe('MrAlert', () => {
    let el: MrAlert;

    afterEach(() => el?.remove());

    // ── Rendu ─────────────────────────────────────────────────────────────────

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<mr-alert></mr-alert>');
        });

        it('monte un shadow DOM', () => {
            expect(el.shadowRoot).not.toBeNull();
        });

        it('contient un part="container"', () => {
            expect(getPart(el, 'container')).not.toBeNull();
        });

        it('contient un part="icon"', () => {
            expect(getPart(el, 'icon')).not.toBeNull();
        });

        it('contient un part="body"', () => {
            expect(getPart(el, 'body')).not.toBeNull();
        });

        it('contient un slot nommé "title"', () => {
            const shadow = el.shadowRoot as ShadowRoot;
            expect(shadow.querySelector('slot[name="title"]')).not.toBeNull();
        });

        it('contient un slot nommé "content"', () => {
            const shadow = el.shadowRoot as ShadowRoot;
            expect(shadow.querySelector('slot[name="content"]')).not.toBeNull();
        });
    });

    // ── Valeurs par défaut ────────────────────────────────────────────────────

    describe('valeurs par défaut', () => {
        beforeEach(async () => {
            el = await fixture('<mr-alert></mr-alert>');
        });

        it('version est undefined par défaut (la valeur par défaut est appliquée au rendu uniquement)', () => {
            // La propriété JS est undefined — DEFAULT_VERSION est utilisé dans le template,
            // pas comme valeur initiale de la propriété.
            expect(el.version).toBeUndefined();
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

    // ── Propriété version ─────────────────────────────────────────────────────

    describe('propriété version', () => {
        it("reflète version en attribut HTML depuis l'attribut initial", async () => {
            el = await fixture('<mr-alert version="success"></mr-alert>');
            expect(el.getAttribute('version')).toBe('success');
        });

        it('version="success" applique la classe alert-success au container', async () => {
            el = await fixture('<mr-alert version="success"></mr-alert>');
            expect(getPart(el, 'container').classList.contains('alert-success')).toBe(true);
        });

        it('version="warning" applique la classe alert-warning au container', async () => {
            el = await fixture('<mr-alert version="warning"></mr-alert>');
            expect(getPart(el, 'container').classList.contains('alert-warning')).toBe(true);
        });

        it('version="error" applique la classe alert-error au container', async () => {
            el = await fixture('<mr-alert version="error"></mr-alert>');
            expect(getPart(el, 'container').classList.contains('alert-error')).toBe(true);
        });

        it('version="info" applique la classe alert-info au container', async () => {
            el = await fixture('<mr-alert version="info"></mr-alert>');
            expect(getPart(el, 'container').classList.contains('alert-info')).toBe(true);
        });
    });

    // ── Accessibilité ARIA ────────────────────────────────────────────────────

    describe('accessibilité ARIA', () => {
        it('version="error" donne role="alert" au container', async () => {
            el = await fixture('<mr-alert version="error"></mr-alert>');
            expect(getPart(el, 'container').getAttribute('role')).toBe('alert');
        });

        it('version="warning" donne role="alert" au container', async () => {
            el = await fixture('<mr-alert version="warning"></mr-alert>');
            expect(getPart(el, 'container').getAttribute('role')).toBe('alert');
        });

        it('version="success" donne role="alert" au container', async () => {
            el = await fixture('<mr-alert version="success"></mr-alert>');
            expect(getPart(el, 'container').getAttribute('role')).toBe('alert');
        });

        it('version="info" donne role="status" au container', async () => {
            el = await fixture('<mr-alert version="info"></mr-alert>');
            expect(getPart(el, 'container').getAttribute('role')).toBe('status');
        });

        it('without-notification supprime le role du container', async () => {
            el = await fixture('<mr-alert without-notification></mr-alert>');
            // Lit utilise `nothing` pour ne pas rendre l'attribut du tout
            expect(getPart(el, 'container').hasAttribute('role')).toBe(false);
        });

        it('l\'icône a aria-hidden="true"', async () => {
            el = await fixture('<mr-alert></mr-alert>');
            const icon = (el.shadowRoot as ShadowRoot).querySelector('.icon') as Element;
            expect(icon.getAttribute('aria-hidden')).toBe('true');
        });
    });

    // ── Bouton close ──────────────────────────────────────────────────────────

    describe('bouton close', () => {
        it("n'est pas rendu sans l'attribut next-focus", async () => {
            el = await fixture('<mr-alert></mr-alert>');
            expect(getPart(el, 'close')).toBeNull();
        });

        it('est rendu quand next-focus est défini', async () => {
            el = await fixture('<mr-alert next-focus="btn-retour"></mr-alert>');
            expect(getPart(el, 'close')).not.toBeNull();
        });

        it("n'est pas rendu si next-focus est une chaîne vide", async () => {
            el = await fixture('<mr-alert next-focus=""></mr-alert>');
            expect(getPart(el, 'close')).toBeNull();
        });

        it("n'est pas rendu si next-focus ne contient que des espaces", async () => {
            el = await fixture('<mr-alert next-focus="   "></mr-alert>');
            expect(getPart(el, 'close')).toBeNull();
        });

        it('le bouton close a aria-label="Fermer l\'alerte"', async () => {
            el = await fixture('<mr-alert next-focus="btn-retour"></mr-alert>');
            expect(getPart(el, 'close').getAttribute('aria-label')).toBe("Fermer l'alerte");
        });

        it('reflète next-focus en attribut HTML', async () => {
            el = await fixture('<mr-alert></mr-alert>');
            el.nextFocus = 'mon-bouton';
            await waitForUpdate(el);
            expect(el.getAttribute('next-focus')).toBe('mon-bouton');
        });
    });

    // ── canBeHidden ───────────────────────────────────────────────────────────

    describe('canBeHidden', () => {
        it('est false sans next-focus', async () => {
            el = await fixture('<mr-alert></mr-alert>');
            expect(el.canBeHidden).toBe(false);
        });

        it('est true avec un next-focus valide', async () => {
            el = await fixture('<mr-alert next-focus="btn-retour"></mr-alert>');
            expect(el.canBeHidden).toBe(true);
        });

        it('est false si next-focus est vide', async () => {
            el = await fixture('<mr-alert next-focus=""></mr-alert>');
            expect(el.canBeHidden).toBe(false);
        });

        it('est false si next-focus ne contient que des espaces', async () => {
            el = await fixture('<mr-alert next-focus="   "></mr-alert>');
            expect(el.canBeHidden).toBe(false);
        });
    });

    // ── Fermeture ─────────────────────────────────────────────────────────────

    describe('fermeture', () => {
        it('un clic sur close passe hiding à true', async () => {
            el = await fixture('<mr-alert next-focus="btn-retour"></mr-alert>');
            (getPart(el, 'close') as HTMLButtonElement).click();
            await waitForUpdate(el);
            // hiding est un protected property — on y accède via cast
            expect((el as unknown as { hiding: boolean }).hiding).toBe(true);
        });

        it('hiding=true applique l\'attribut "hiding" sur le host', async () => {
            el = await fixture('<mr-alert next-focus="btn-retour"></mr-alert>');
            (getPart(el, 'close') as HTMLButtonElement).click();
            await waitForUpdate(el);
            expect(el.hasAttribute('hiding')).toBe(true);
        });

        it('émet mr-alert-close après transitionend quand hiding=true', async () => {
            el = await fixture('<mr-alert next-focus="btn-retour"></mr-alert>');
            const handler = vi.fn();
            el.addEventListener('mr-alert-close', handler);

            // Simule le clic → hiding=true
            (getPart(el, 'close') as HTMLButtonElement).click();
            await waitForUpdate(el);

            // Simule la fin de la transition CSS (transitionend)
            el.dispatchEvent(new Event('transitionend'));

            expect(handler).toHaveBeenCalledOnce();
        });

        it("n'émet pas mr-alert-close si hiding=false au transitionend", async () => {
            el = await fixture('<mr-alert next-focus="btn-retour"></mr-alert>');
            const handler = vi.fn();
            el.addEventListener('mr-alert-close', handler);

            // Pas de clic → hiding reste false
            el.dispatchEvent(new Event('transitionend'));

            expect(handler).not.toHaveBeenCalled();
        });

        it('logue une erreur si next-focus pointe vers un ID inexistant', async () => {
            const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
            el = await fixture('<mr-alert next-focus="id-inexistant"></mr-alert>');

            (getPart(el, 'close') as HTMLButtonElement).click();
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

            el = await fixture('<mr-alert next-focus="btn-retour-focus"></mr-alert>');

            (getPart(el, 'close') as HTMLButtonElement).click();
            await waitForUpdate(el);
            el.dispatchEvent(new Event('transitionend'));

            expect(document.activeElement).toBe(target);

            target.remove();
        });
    });
});
