import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArPagination, type ArPaginationPageChangeDetail } from './pagination.js';
import { fixture, waitForUpdate, getPart, requirePart } from '../../test-utils.js';
import './index.js';

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
            expect(requirePart(el, 'current').getAttribute('aria-current')).toBe('true');
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

        it('ellipses présentes si total >= 10 et current éloigné des bords', async () => {
            el = await fixture('<ar-pagination current="6" total="15"></ar-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            // Les ellipses ont aria-hidden="true"
            const ellipses = shadow.querySelectorAll('[aria-hidden="true"]');
            expect(ellipses.length).toBeGreaterThanOrEqual(2);
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
    });
});
