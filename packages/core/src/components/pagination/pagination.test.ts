import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArPagination, type ArPaginationPageChangeDetail } from './pagination.js';
import { fixture, waitForUpdate, getPart, requirePart } from '../../test-utils.js';
import './index.js';

/**
 * Vérifie qu'un token est présent dans l'attribut `part` d'un élément, sans dépendre
 * de l'ordre de sérialisation. `Element.part` (DOMTokenList) n'est pas supporté par
 * happy-dom (environnement Vitest de ce projet) : on retombe donc sur un split de
 * l'attribut plutôt que sur `.part.contains()`.
 */
function partContains(el: Element, token: string): boolean {
    return (el.getAttribute('part') ?? '').split(/\s+/).includes(token);
}

describe('ArPagination', () => {
    let el: ArPagination;

    afterEach(() => el?.remove());

    // ── Rendu ─────────────────────────────────────────────────────────────────

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<ar-pagination></ar-pagination>');
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

        it('contient un part="prev nav-btn" et part="next nav-btn"', () => {
            expect(partContains(requirePart(el, 'prev'), 'prev')).toBe(true);
            expect(partContains(requirePart(el, 'prev'), 'nav-btn')).toBe(true);
            expect(partContains(requirePart(el, 'next'), 'next')).toBe(true);
            expect(partContains(requirePart(el, 'next'), 'nav-btn')).toBe(true);
        });
    });

    // ── Slots d'icônes prev/next ─────────────────────────────────────────────

    describe('slots prev-icon / next-icon', () => {
        beforeEach(async () => {
            el = await fixture('<ar-pagination></ar-pagination>');
        });

        it('contient un slot nommé "prev-icon" et "next-icon"', () => {
            const shadow = el.shadowRoot as ShadowRoot;
            expect(shadow.querySelector('slot[name="prev-icon"]')).not.toBeNull();
            expect(shadow.querySelector('slot[name="next-icon"]')).not.toBeNull();
        });

        it('rend un svg par défaut, décoratif (aria-hidden), dans chaque slot', () => {
            const shadow = el.shadowRoot as ShadowRoot;
            const prevSvg = shadow.querySelector('slot[name="prev-icon"] svg');
            const nextSvg = shadow.querySelector('slot[name="next-icon"] svg');
            expect(prevSvg).not.toBeNull();
            expect(nextSvg).not.toBeNull();
            expect(prevSvg?.getAttribute('aria-hidden')).toBe('true');
            expect(nextSvg?.getAttribute('aria-hidden')).toBe('true');
        });

        it('un slot prev-icon custom remplace le svg par défaut', async () => {
            el = await fixture(
                '<ar-pagination><svg slot="prev-icon" data-custom="true" aria-hidden="true"></svg></ar-pagination>',
            );
            const shadow = el.shadowRoot as ShadowRoot;
            const slotEl = shadow.querySelector('slot[name="prev-icon"]') as HTMLSlotElement;
            const assigned = slotEl.assignedElements();
            expect(assigned.length).toBe(1);
            expect(assigned[0]?.getAttribute('data-custom')).toBe('true');
        });
    });

    // ── Valeurs par défaut ────────────────────────────────────────────────────

    describe('valeurs par défaut', () => {
        beforeEach(async () => {
            el = await fixture('<ar-pagination></ar-pagination>');
        });

        it('current vaut DEFAULT_CURRENT (1)', () => {
            expect(el.current).toBe(ArPagination.DEFAULT_CURRENT);
        });

        it('total vaut DEFAULT_TOTAL (5)', () => {
            expect(el.total).toBe(ArPagination.DEFAULT_TOTAL);
        });
    });

    // ── Réflexion des attributs ───────────────────────────────────────────────

    describe('réflexion des attributs', () => {
        it('reflète current en attribut HTML', async () => {
            el = await fixture('<ar-pagination current="3" total="10"></ar-pagination>');
            el.current = 5;
            await waitForUpdate(el);
            expect(el.getAttribute('current')).toBe('5');
        });

        it('reflète total en attribut HTML', async () => {
            el = await fixture('<ar-pagination></ar-pagination>');
            el.total = 20;
            await waitForUpdate(el);
            expect(el.getAttribute('total')).toBe('20');
        });

        it('ne pose pas de classe light/dark sur prev/next (variant retiré au profit de tokens)', async () => {
            el = await fixture('<ar-pagination></ar-pagination>');
            expect(requirePart(el, 'prev').classList.contains('light')).toBe(false);
            expect(requirePart(el, 'prev').classList.contains('dark')).toBe(false);
            expect(requirePart(el, 'next').classList.contains('light')).toBe(false);
            expect(requirePart(el, 'next').classList.contains('dark')).toBe(false);
        });
    });

    // ── Accessibilité ─────────────────────────────────────────────────────────

    describe('accessibilité', () => {
        it('le nav a role="navigation"', async () => {
            el = await fixture('<ar-pagination></ar-pagination>');
            expect(requirePart(el, 'nav').getAttribute('role')).toBe('navigation');
        });

        it('prev est aria-disabled="true" en page 1', async () => {
            el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
            expect(requirePart(el, 'prev').getAttribute('aria-disabled')).toBe('true');
        });

        it("prev n'est pas aria-disabled en page > 1", async () => {
            el = await fixture('<ar-pagination current="2" total="5"></ar-pagination>');
            expect(requirePart(el, 'prev').getAttribute('aria-disabled')).toBe('false');
        });

        it('next est aria-disabled="true" en dernière page', async () => {
            el = await fixture('<ar-pagination current="5" total="5"></ar-pagination>');
            expect(requirePart(el, 'next').getAttribute('aria-disabled')).toBe('true');
        });

        it("next n'est pas aria-disabled avant la dernière page", async () => {
            el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
            expect(requirePart(el, 'next').getAttribute('aria-disabled')).toBe('false');
        });

        it('la page active a aria-current="true"', async () => {
            el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            const current = shadow.querySelector('[part="current"]') as Element;
            expect(current).not.toBeNull();
            expect(current.getAttribute('aria-current')).toBe('true');
        });
    });

    describe('aria-disabled', () => {
        it('pose uniquement l\'attribut aria-disabled sur le lien "prev" à la première page', async () => {
            el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
            const prevLink = getPart(el, 'prev') as HTMLAnchorElement;

            expect(prevLink.getAttribute('aria-disabled')).toBe('true');
        });
    });

    // ── Pages affichées ───────────────────────────────────────────────────────

    describe('pages affichées', () => {
        it('toutes les pages sont affichées si total < 10', async () => {
            el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            const links = shadow.querySelectorAll('[part="link"], [part="current"]');
            expect(links.length).toBe(5);
        });

        it('la page courante utilise part="current" (span, non cliquable)', async () => {
            el = await fixture('<ar-pagination current="2" total="5"></ar-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            // Volontairement `=` strict (pas `~=`) : happy-dom (Vitest) a une implémentation
            // non conforme de `~=` qui matche aussi "item--current" pour le token "current"
            // (cf. mise en garde dans test-utils.ts) — un vrai navigateur ne matcherait pas
            // le <li part="item item--current"> ici, mais happy-dom le ferait et casserait
            // la distinction span/li que ce test vérifie précisément.
            const currentPage = shadow.querySelector('[part="current"]') as Element;
            expect(currentPage.tagName.toLowerCase()).toBe('span');
        });

        it('les autres pages utilisent part="link" (lien cliquable)', async () => {
            el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            const links = shadow.querySelectorAll('[part="link"]');
            // Toutes les pages sauf la 1ère sont des liens
            expect(links.length).toBe(4);
        });

        it('ellipses présentes si total >= 10 et current éloigné des bords, avec part="ellipsis"', async () => {
            el = await fixture('<ar-pagination current="6" total="15"></ar-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            const ellipses = shadow.querySelectorAll('[part="ellipsis"]');
            expect(ellipses.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe("part d'état item--current", () => {
        it('le <li> de la page active porte part="item item--current"', async () => {
            el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            const currentLi = shadow.querySelector('[part~="item--current"]') as Element;
            expect(currentLi).not.toBeNull();
            expect(currentLi.getAttribute('part')).toBe('item item--current');
        });

        it('les <li> non actifs ne portent que part="item"', async () => {
            el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            const items = Array.from(shadow.querySelectorAll('[part~="item"]'));
            const nonCurrent = items.filter(
                (item) => !item.getAttribute('part')?.includes('item--current'),
            );
            expect(nonCurrent.length).toBeGreaterThan(0);
            nonCurrent.forEach((item) => expect(item.getAttribute('part')).toBe('item'));
        });
    });

    describe("part d'état nav-btn--disabled", () => {
        it('prev porte le part nav-btn--disabled en page 1', async () => {
            el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
            expect(partContains(requirePart(el, 'prev'), 'nav-btn--disabled')).toBe(true);
        });

        it('prev ne porte pas nav-btn--disabled quand current > 1', async () => {
            el = await fixture('<ar-pagination current="2" total="5"></ar-pagination>');
            expect(partContains(requirePart(el, 'prev'), 'nav-btn--disabled')).toBe(false);
        });

        it('next porte le part nav-btn--disabled en dernière page', async () => {
            el = await fixture('<ar-pagination current="5" total="5"></ar-pagination>');
            expect(partContains(requirePart(el, 'next'), 'nav-btn--disabled')).toBe(true);
        });

        it('next ne porte pas nav-btn--disabled avant la dernière page', async () => {
            el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
            expect(partContains(requirePart(el, 'next'), 'nav-btn--disabled')).toBe(false);
        });
    });

    // ── Navigation ────────────────────────────────────────────────────────────

    describe('navigation', () => {
        it('un clic sur prev décrémente current', async () => {
            el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
            (requirePart(el, 'prev') as HTMLElement).click();
            await waitForUpdate(el);
            expect(el.current).toBe(2);
        });

        it('un clic sur next incrémente current', async () => {
            el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
            (requirePart(el, 'next') as HTMLElement).click();
            await waitForUpdate(el);
            expect(el.current).toBe(4);
        });

        it('prev ne décrémente pas en dessous de 1', async () => {
            el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
            (requirePart(el, 'prev') as HTMLElement).click();
            await waitForUpdate(el);
            expect(el.current).toBe(1);
        });

        it('next ne dépasse pas total', async () => {
            el = await fixture('<ar-pagination current="5" total="5"></ar-pagination>');
            (requirePart(el, 'next') as HTMLElement).click();
            await waitForUpdate(el);
            expect(el.current).toBe(5);
        });

        it('un clic sur un lien de page met à jour current', async () => {
            el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            const pageLink = shadow.querySelector('[data-ar-pagination-page="3"]') as HTMLElement;
            pageLink.click();
            await waitForUpdate(el);
            expect(el.current).toBe(3);
        });

        it('un clic sur un lien de page focalise le nouvel élément part="current"', async () => {
            el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            const pageLink = shadow.querySelector('[data-ar-pagination-page="3"]') as HTMLElement;
            pageLink.click();
            await waitForUpdate(el);

            const current = shadow.querySelector('[part~="current"]') as HTMLElement;
            expect(shadow.activeElement).toBe(current);
        });

        it('le nouvel élément part="current" porte tabindex="-1"', async () => {
            el = await fixture('<ar-pagination current="2" total="5"></ar-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            const current = shadow.querySelector('[part="current"]') as HTMLElement;
            expect(current.getAttribute('tabindex')).toBe('-1');
        });

        it("un clic sur prev/next ne modifie pas le focus (l'élément cliqué reste focalisable)", async () => {
            el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
            const nextBtn = requirePart(el, 'next') as HTMLElement;
            nextBtn.focus();
            nextBtn.click();
            await waitForUpdate(el);

            expect(el.shadowRoot?.activeElement).toBe(nextBtn);
        });
    });

    // ── Événement ar-pagination-page-change ──────────────────────────────────

    describe('événement ar-pagination-page-change', () => {
        it('émis avec {from, to} au clic sur next', async () => {
            el = await fixture('<ar-pagination current="2" total="5"></ar-pagination>');
            const handler = vi.fn();
            el.addEventListener('ar-pagination-page-change', handler);

            (requirePart(el, 'next') as HTMLElement).click();
            await waitForUpdate(el);

            expect(handler).toHaveBeenCalledOnce();
            const detail = (handler.mock.calls[0][0] as CustomEvent<ArPaginationPageChangeDetail>)
                .detail;
            expect(detail.from).toBe(2);
            expect(detail.to).toBe(3);
        });

        it('émis avec {from, to} au clic sur prev', async () => {
            el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
            const handler = vi.fn();
            el.addEventListener('ar-pagination-page-change', handler);

            (requirePart(el, 'prev') as HTMLElement).click();
            await waitForUpdate(el);

            expect(handler).toHaveBeenCalledOnce();
            const detail = (handler.mock.calls[0][0] as CustomEvent<ArPaginationPageChangeDetail>)
                .detail;
            expect(detail.from).toBe(3);
            expect(detail.to).toBe(2);
        });

        it('émis avec {from, to} au clic sur un lien de page', async () => {
            el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
            const handler = vi.fn();
            el.addEventListener('ar-pagination-page-change', handler);

            const shadow = el.shadowRoot as ShadowRoot;
            const pageLink = shadow.querySelector('[data-ar-pagination-page="4"]') as HTMLElement;
            pageLink.click();
            await waitForUpdate(el);

            expect(handler).toHaveBeenCalledOnce();
            const detail = (handler.mock.calls[0][0] as CustomEvent<ArPaginationPageChangeDetail>)
                .detail;
            expect(detail.from).toBe(1);
            expect(detail.to).toBe(4);
        });

        it("n'est pas émis si prev est cliqué en page 1", async () => {
            el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
            const handler = vi.fn();
            el.addEventListener('ar-pagination-page-change', handler);

            (requirePart(el, 'prev') as HTMLElement).click();
            await waitForUpdate(el);

            expect(handler).not.toHaveBeenCalled();
        });

        it("n'est pas émis si next est cliqué en dernière page", async () => {
            el = await fixture('<ar-pagination current="5" total="5"></ar-pagination>');
            const handler = vi.fn();
            el.addEventListener('ar-pagination-page-change', handler);

            (requirePart(el, 'next') as HTMLElement).click();
            await waitForUpdate(el);

            expect(handler).not.toHaveBeenCalled();
        });

        it('bulle et traverse le Shadow DOM (bubbles + composed)', async () => {
            el = await fixture('<ar-pagination current="2" total="5"></ar-pagination>');
            let captured: CustomEvent | null = null;
            document.addEventListener(
                'ar-pagination-page-change',
                (e) => {
                    captured = e as CustomEvent;
                },
                { once: true },
            );

            (requirePart(el, 'next') as HTMLElement).click();
            await waitForUpdate(el);

            expect(captured).not.toBeNull();
        });
    });

    // ── Annonces a11y ─────────────────────────────────────────────────────────

    describe('annonces a11y', () => {
        afterEach(() => {
            document.querySelectorAll('[data-ar-live-region]').forEach((node) => node.remove());
        });

        it('un clic sur prev annonce "Page N-1 sur M"', async () => {
            el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
            (requirePart(el, 'prev') as HTMLElement).click();
            await waitForUpdate(el);
            await new Promise((resolve) => setTimeout(resolve, 60));

            expect(document.getElementById('ar-live-region-polite')?.textContent).toBe(
                'Page 2 sur 5',
            );
        });

        it('un clic sur next annonce "Page N+1 sur M"', async () => {
            el = await fixture('<ar-pagination current="2" total="5"></ar-pagination>');
            (requirePart(el, 'next') as HTMLElement).click();
            await waitForUpdate(el);
            await new Promise((resolve) => setTimeout(resolve, 60));

            expect(document.getElementById('ar-live-region-polite')?.textContent).toBe(
                'Page 3 sur 5',
            );
        });

        it('un clic direct sur un numéro de page annonce "Page N sur M"', async () => {
            el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            const pageLink = shadow.querySelector('[data-ar-pagination-page="4"]') as HTMLElement;
            pageLink.click();
            await waitForUpdate(el);
            await new Promise((resolve) => setTimeout(resolve, 60));

            expect(document.getElementById('ar-live-region-polite')?.textContent).toBe(
                'Page 4 sur 5',
            );
        });
    });

    describe('warn() — bornes numériques', () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('émet un warn si total < 1', async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            await fixture('<ar-pagination total="0"></ar-pagination>');

            expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-pagination]'));
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('total'));
        });

        it('émet un warn si current < 1', async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            await fixture('<ar-pagination current="0" total="5"></ar-pagination>');

            expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-pagination]'));
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('current'));
        });

        it('émet un warn si current > total', async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            await fixture('<ar-pagination current="10" total="5"></ar-pagination>');

            expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-pagination]'));
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('current'));
        });

        it("n'émet pas de warn pour des valeurs valides", async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            await fixture('<ar-pagination current="3" total="10"></ar-pagination>');

            expect(spy).not.toHaveBeenCalled();
        });

        it('total négatif : render() reste fonctionnel et ne montre aucun numéro de page négatif', async () => {
            el = await fixture('<ar-pagination total="-3"></ar-pagination>');
            expect(el.shadowRoot?.querySelector('[part="nav"]')).not.toBeNull();

            const prevLabel = el.shadowRoot?.querySelector('[part~="prev"] .sr-only')?.textContent;
            const nextLabel = el.shadowRoot?.querySelector('[part~="next"] .sr-only')?.textContent;
            expect(prevLabel).not.toMatch(/-\d/);
            expect(nextLabel).not.toMatch(/-\d/);
        });
    });
});
