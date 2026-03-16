import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MrPagination, type MrPaginationPageChangeDetail } from './pagination.js';
import './pagination.js';

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
async function fixture(html: string): Promise<MrPagination> {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstElementChild as MrPagination;
    document.body.appendChild(el);
    await (el as unknown as LitEl).updateComplete;
    return el;
}

/** Attend la fin du prochain cycle de rendu Lit sur un élément déjà monté. */
async function waitForUpdate(el: MrPagination): Promise<void> {
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
function getPart(el: MrPagination, part: string): Element {
    const shadow = el.shadowRoot as ShadowRoot;
    return shadow.querySelector(`[part="${part}"]`) as Element;
}

describe('MrPagination', () => {
    let el: MrPagination;

    afterEach(() => el?.remove());

    // ── Rendu ─────────────────────────────────────────────────────────────────

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<mr-pagination></mr-pagination>');
        });

        it('monte un shadow DOM', () => {
            expect(el.shadowRoot).not.toBeNull();
        });

        it('contient un part="nav"', () => {
            expect(getPart(el, 'nav')).not.toBeNull();
        });

        it('contient un part="list"', () => {
            expect(getPart(el, 'list')).not.toBeNull();
        });

        it('contient un part="prev"', () => {
            expect(getPart(el, 'prev')).not.toBeNull();
        });

        it('contient un part="next"', () => {
            expect(getPart(el, 'next')).not.toBeNull();
        });
    });

    // ── Valeurs par défaut ────────────────────────────────────────────────────

    describe('valeurs par défaut', () => {
        beforeEach(async () => {
            el = await fixture('<mr-pagination></mr-pagination>');
        });

        it('current vaut DEFAULT_CURRENT (1)', () => {
            expect(el.current).toBe(MrPagination.DEFAULT_CURRENT);
        });

        it('total vaut DEFAULT_TOTAL (5)', () => {
            expect(el.total).toBe(MrPagination.DEFAULT_TOTAL);
        });

        it('variant vaut DEFAULT_VARIANT ("light")', () => {
            expect(el.variant).toBe(MrPagination.DEFAULT_VARIANT);
        });
    });

    // ── Réflexion des attributs ───────────────────────────────────────────────

    describe('réflexion des attributs', () => {
        it('reflète current en attribut HTML', async () => {
            el = await fixture('<mr-pagination current="3" total="10"></mr-pagination>');
            el.current = 5;
            await waitForUpdate(el);
            expect(el.getAttribute('current')).toBe('5');
        });

        it('reflète total en attribut HTML', async () => {
            el = await fixture('<mr-pagination></mr-pagination>');
            el.total = 20;
            await waitForUpdate(el);
            expect(el.getAttribute('total')).toBe('20');
        });

        it('reflète variant en attribut HTML', async () => {
            el = await fixture('<mr-pagination></mr-pagination>');
            el.variant = 'dark';
            await waitForUpdate(el);
            expect(el.getAttribute('variant')).toBe('dark');
        });
    });

    // ── Accessibilité ─────────────────────────────────────────────────────────

    describe('accessibilité', () => {
        it('le nav a role="navigation"', async () => {
            el = await fixture('<mr-pagination></mr-pagination>');
            expect(getPart(el, 'nav').getAttribute('role')).toBe('navigation');
        });

        it('prev est aria-disabled="true" en page 1', async () => {
            el = await fixture('<mr-pagination current="1" total="5"></mr-pagination>');
            expect(getPart(el, 'prev').getAttribute('aria-disabled')).toBe('true');
        });

        it("prev n'est pas aria-disabled en page > 1", async () => {
            el = await fixture('<mr-pagination current="2" total="5"></mr-pagination>');
            expect(getPart(el, 'prev').getAttribute('aria-disabled')).toBe('false');
        });

        it('next est aria-disabled="true" en dernière page', async () => {
            el = await fixture('<mr-pagination current="5" total="5"></mr-pagination>');
            expect(getPart(el, 'next').getAttribute('aria-disabled')).toBe('true');
        });

        it("next n'est pas aria-disabled avant la dernière page", async () => {
            el = await fixture('<mr-pagination current="3" total="5"></mr-pagination>');
            expect(getPart(el, 'next').getAttribute('aria-disabled')).toBe('false');
        });

        it('la page active a aria-current="true"', async () => {
            el = await fixture('<mr-pagination current="3" total="5"></mr-pagination>');
            expect(getPart(el, 'current').getAttribute('aria-current')).toBe('true');
        });
    });

    // ── Pages affichées ───────────────────────────────────────────────────────

    describe('pages affichées', () => {
        it('toutes les pages sont affichées si total < 10', async () => {
            el = await fixture('<mr-pagination current="1" total="5"></mr-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            const links = shadow.querySelectorAll('[part="link"], [part="current"]');
            expect(links.length).toBe(5);
        });

        it('la page courante utilise part="current" (span, non cliquable)', async () => {
            el = await fixture('<mr-pagination current="2" total="5"></mr-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            const currentPage = shadow.querySelector('[part="current"]') as Element;
            expect(currentPage.tagName.toLowerCase()).toBe('span');
        });

        it('les autres pages utilisent part="link" (lien cliquable)', async () => {
            el = await fixture('<mr-pagination current="1" total="5"></mr-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            const links = shadow.querySelectorAll('[part="link"]');
            // Toutes les pages sauf la 1ère sont des liens
            expect(links.length).toBe(4);
        });

        it('ellipses présentes si total >= 10 et current éloigné des bords', async () => {
            el = await fixture('<mr-pagination current="6" total="15"></mr-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            // Les ellipses ont aria-hidden="true"
            const ellipses = shadow.querySelectorAll('[aria-hidden="true"]');
            expect(ellipses.length).toBeGreaterThanOrEqual(2);
        });
    });

    // ── Navigation ────────────────────────────────────────────────────────────

    describe('navigation', () => {
        it('un clic sur prev décrémente current', async () => {
            el = await fixture('<mr-pagination current="3" total="5"></mr-pagination>');
            (getPart(el, 'prev') as HTMLElement).click();
            await waitForUpdate(el);
            expect(el.current).toBe(2);
        });

        it('un clic sur next incrémente current', async () => {
            el = await fixture('<mr-pagination current="3" total="5"></mr-pagination>');
            (getPart(el, 'next') as HTMLElement).click();
            await waitForUpdate(el);
            expect(el.current).toBe(4);
        });

        it('prev ne décrémente pas en dessous de 1', async () => {
            el = await fixture('<mr-pagination current="1" total="5"></mr-pagination>');
            (getPart(el, 'prev') as HTMLElement).click();
            await waitForUpdate(el);
            expect(el.current).toBe(1);
        });

        it('next ne dépasse pas total', async () => {
            el = await fixture('<mr-pagination current="5" total="5"></mr-pagination>');
            (getPart(el, 'next') as HTMLElement).click();
            await waitForUpdate(el);
            expect(el.current).toBe(5);
        });

        it('un clic sur un lien de page met à jour current', async () => {
            el = await fixture('<mr-pagination current="1" total="5"></mr-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            const pageLink = shadow.querySelector('[data-mr-pagination-page="3"]') as HTMLElement;
            pageLink.click();
            await waitForUpdate(el);
            expect(el.current).toBe(3);
        });
    });

    // ── Événement mr-pagination-page-change ──────────────────────────────────

    describe('événement mr-pagination-page-change', () => {
        it('émis avec {from, to} au clic sur next', async () => {
            el = await fixture('<mr-pagination current="2" total="5"></mr-pagination>');
            const handler = vi.fn();
            el.addEventListener('mr-pagination-page-change', handler);

            (getPart(el, 'next') as HTMLElement).click();
            await waitForUpdate(el);

            expect(handler).toHaveBeenCalledOnce();
            const detail = (handler.mock.calls[0][0] as CustomEvent<MrPaginationPageChangeDetail>)
                .detail;
            expect(detail.from).toBe(2);
            expect(detail.to).toBe(3);
        });

        it('émis avec {from, to} au clic sur prev', async () => {
            el = await fixture('<mr-pagination current="3" total="5"></mr-pagination>');
            const handler = vi.fn();
            el.addEventListener('mr-pagination-page-change', handler);

            (getPart(el, 'prev') as HTMLElement).click();
            await waitForUpdate(el);

            expect(handler).toHaveBeenCalledOnce();
            const detail = (handler.mock.calls[0][0] as CustomEvent<MrPaginationPageChangeDetail>)
                .detail;
            expect(detail.from).toBe(3);
            expect(detail.to).toBe(2);
        });

        it('émis avec {from, to} au clic sur un lien de page', async () => {
            el = await fixture('<mr-pagination current="1" total="5"></mr-pagination>');
            const handler = vi.fn();
            el.addEventListener('mr-pagination-page-change', handler);

            const shadow = el.shadowRoot as ShadowRoot;
            const pageLink = shadow.querySelector('[data-mr-pagination-page="4"]') as HTMLElement;
            pageLink.click();
            await waitForUpdate(el);

            expect(handler).toHaveBeenCalledOnce();
            const detail = (handler.mock.calls[0][0] as CustomEvent<MrPaginationPageChangeDetail>)
                .detail;
            expect(detail.from).toBe(1);
            expect(detail.to).toBe(4);
        });

        it("n'est pas émis si prev est cliqué en page 1", async () => {
            el = await fixture('<mr-pagination current="1" total="5"></mr-pagination>');
            const handler = vi.fn();
            el.addEventListener('mr-pagination-page-change', handler);

            (getPart(el, 'prev') as HTMLElement).click();
            await waitForUpdate(el);

            expect(handler).not.toHaveBeenCalled();
        });

        it("n'est pas émis si next est cliqué en dernière page", async () => {
            el = await fixture('<mr-pagination current="5" total="5"></mr-pagination>');
            const handler = vi.fn();
            el.addEventListener('mr-pagination-page-change', handler);

            (getPart(el, 'next') as HTMLElement).click();
            await waitForUpdate(el);

            expect(handler).not.toHaveBeenCalled();
        });

        it('bulle et traverse le Shadow DOM (bubbles + composed)', async () => {
            el = await fixture('<mr-pagination current="2" total="5"></mr-pagination>');
            let captured: CustomEvent | null = null;
            document.addEventListener(
                'mr-pagination-page-change',
                (e) => {
                    captured = e as CustomEvent;
                },
                { once: true },
            );

            (getPart(el, 'next') as HTMLElement).click();
            await waitForUpdate(el);

            expect(captured).not.toBeNull();
        });
    });
});
