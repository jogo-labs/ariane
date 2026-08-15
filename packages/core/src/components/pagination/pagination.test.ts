import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArPagination, type ArPaginationPageChangeDetail } from './pagination.js';
import { fixture, waitForUpdate, getPart, requirePart } from '../../test-utils.js';
import './index.js';

// LocalizeController résout la langue via document.documentElement.lang, avec
// navigator.language comme secours (happy-dom retourne 'en-US' par défaut).
// En production, le site de doc pose lang="fr" sur <html> ; on reproduit ça ici
// pour que les assertions FR par défaut restent valides sans lang explicite.
document.documentElement.lang = 'fr';

/**
 * Vérifie qu'un token est présent dans l'attribut `part` d'un élément, sans dépendre
 * de l'ordre de sérialisation. `Element.part` (DOMTokenList) n'est pas supporté par
 * happy-dom (environnement Vitest de ce projet) : on retombe donc sur un split de
 * l'attribut plutôt que sur `.part.contains()`.
 */
function partContains(el: Element, token: string): boolean {
    return (el.getAttribute('part') ?? '').split(/\s+/).includes(token);
}

/**
 * Retourne le `<span part="label">` du mode compact (`renderCompactLabel`).
 *
 * `requirePart(el, 'label')` ne convient pas ici : happy-dom scinde aussi `~=` sur les
 * tirets (mise en garde documentée dans test-utils.ts), donc `[part~="label"]` matche à
 * tort le `<li part="item page-label">` englobant — rencontré en premier dans l'ordre du
 * document — avant le `<span part="label">` réel. Sélecteur d'attribut exact (`=`) sur le
 * `<span>` pour contourner ce faux positif propre à l'environnement de test.
 */
function requireLabel(el: ArPagination): Element {
    const found = el.shadowRoot?.querySelector('span[part="label"]');
    if (!found) throw new Error('Part "label" (span) not found in shadow DOM');
    return found;
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

        it('contient un part="pagination"', () => {
            expect(getPart(el, 'pagination')).not.toBeNull();
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

        it('contient un part="prev nav-button" et part="next nav-button"', () => {
            expect(partContains(requirePart(el, 'prev'), 'prev')).toBe(true);
            expect(partContains(requirePart(el, 'prev'), 'nav-button')).toBe(true);
            expect(partContains(requirePart(el, 'next'), 'next')).toBe(true);
            expect(partContains(requirePart(el, 'next'), 'nav-button')).toBe(true);
        });

        it('prev/next portent aussi le rôle transverse "action-button"', () => {
            expect(partContains(requirePart(el, 'prev'), 'action-button')).toBe(true);
            expect(partContains(requirePart(el, 'next'), 'action-button')).toBe(true);
        });

        it('part="list" n\'a pas de margin-top (repli UA du <ul> non réinitialisé sinon)', () => {
            const list = requirePart(el, 'list') as HTMLElement;
            expect(getComputedStyle(list).marginTop).toBe('0px');
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
            expect(requirePart(el, 'pagination').getAttribute('role')).toBe('navigation');
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

        it('la page active a aria-current="page"', async () => {
            el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            const current = shadow.querySelector('span[part~="current"]') as Element;
            expect(current).not.toBeNull();
            expect(current.getAttribute('aria-current')).toBe('page');
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
            const links = shadow.querySelectorAll('[part~="link"], span[part~="current"]');
            expect(links.length).toBe(5);
        });

        it('la page courante utilise part="current" (span, non cliquable)', async () => {
            el = await fixture('<ar-pagination current="2" total="5"></ar-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            // Qualifié par balise (`span[part~=...]`, pas juste `[part~=...]`) : happy-dom
            // (Vitest) a une implémentation non conforme de `~=` qui matche aussi
            // "item--current" pour le token "current" (cf. mise en garde dans test-utils.ts) —
            // un vrai navigateur ne matcherait pas le <li part="item item--current"> ici, mais
            // happy-dom le ferait et casserait la distinction span/li que ce test vérifie
            // précisément. La qualification par balise écarte le <li>, qui n'est pas un <span>.
            const currentPage = shadow.querySelector('span[part~="current"]') as Element;
            expect(currentPage.tagName.toLowerCase()).toBe('span');
        });

        it('les autres pages utilisent part="link" (lien cliquable)', async () => {
            el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            const links = shadow.querySelectorAll('[part~="link"]');
            // Toutes les pages sauf la 1ère sont des liens
            expect(links.length).toBe(4);
        });

        it('link/current portent le rôle transverse "control"', async () => {
            el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            const link = shadow.querySelector('[part~="link"]');
            expect(link && partContains(link, 'control')).toBe(true);
            // span[part~="current"] plutôt que [part~="current"] seul : happy-dom scinde aussi
            // `~=` sur les tirets (cf. requireLabel plus haut), donc un sélecteur non qualifié
            // matcherait à tort le `<li part="item item--current">` englobant en premier.
            const current = shadow.querySelector('span[part~="current"]');
            expect(current && partContains(current, 'control')).toBe(true);
        });

        it('ellipses présentes si total >= 10 et current éloigné des bords, avec part="ellipsis"', async () => {
            el = await fixture('<ar-pagination current="6" total="15"></ar-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            const ellipses = shadow.querySelectorAll('[part="ellipsis"]');
            expect(ellipses.length).toBeGreaterThanOrEqual(2);
        });
    });

    // ── Labels accessibles enrichis ──────────────────────────────────────────

    describe('labels accessibles enrichis (total dans le contexte)', () => {
        it('le sr-only d\'un lien de page inclut le total ("Page X sur Y")', async () => {
            el = await fixture('<ar-pagination current="3" total="12"></ar-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            const link = shadow.querySelector('[data-ar-pagination-page="4"]') as Element;
            const srOnly = link.querySelector('.sr-only');
            expect(srOnly?.textContent).toBe('Page 4 sur 12');
        });

        it("le span aria-hidden d'un lien de page ne contient que le numéro (rendu visuel inchangé)", async () => {
            el = await fixture('<ar-pagination current="3" total="12"></ar-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            const link = shadow.querySelector('[data-ar-pagination-page="4"]') as Element;
            const visible = link.querySelector('[aria-hidden="true"]');
            expect(visible?.textContent).toBe('4');
        });

        it('le sr-only de la page active inclut le total ("Page X sur Y")', async () => {
            el = await fixture('<ar-pagination current="3" total="12"></ar-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            const current = shadow.querySelector('span[part~="current"]') as Element;
            const srOnly = current.querySelector('.sr-only');
            expect(srOnly?.textContent).toBe('Page 3 sur 12');
        });

        it('le sr-only de "précédent" inclut le total', async () => {
            el = await fixture('<ar-pagination current="3" total="12"></ar-pagination>');
            const srOnly = requirePart(el, 'prev').querySelector('.sr-only');
            expect(srOnly?.textContent).toBe('Page précédente (page 2 sur 12)');
        });

        it('le sr-only de "suivant" inclut le total', async () => {
            el = await fixture('<ar-pagination current="3" total="12"></ar-pagination>');
            const srOnly = requirePart(el, 'next').querySelector('.sr-only');
            expect(srOnly?.textContent).toBe('Page suivante (page 4 sur 12)');
        });

        it('le nom du landmark (aria-labelledby) reflète current/total', async () => {
            el = await fixture('<ar-pagination current="3" total="12"></ar-pagination>');
            const label = (el.shadowRoot as ShadowRoot).getElementById('ar-pagination');
            expect(label?.textContent).toBe('Pagination, page 3 sur 12');
        });

        it('le nom du landmark se met à jour après un changement de page', async () => {
            el = await fixture('<ar-pagination current="3" total="12"></ar-pagination>');
            el.current = 4;
            await waitForUpdate(el);
            const label = (el.shadowRoot as ShadowRoot).getElementById('ar-pagination');
            expect(label?.textContent).toBe('Pagination, page 4 sur 12');
        });
    });

    // ── Palier select (budget très restreint) ────────────────────────────────

    describe('palier select sous le plancher', () => {
        it('bascule sur un <select> de saut de page quand _budget est sous le plancher', async () => {
            el = await fixture('<ar-pagination current="3" total="15"></ar-pagination>');
            // @ts-expect-error accès à un champ privé pour simuler une mesure ResizeObserver
            el._budget = 2;
            el.requestUpdate();
            await waitForUpdate(el);

            const shadow = el.shadowRoot as ShadowRoot;
            // Qualifié par balise (`select[part~=...]`, pas juste `[part~=...]`) : happy-dom
            // scinde aussi sur les tirets dans son implémentation de `~=`, donc `[part~="select"]`
            // seul matcherait à tort le `<li part="item page-select">` (voir mise en garde dans
            // test-utils.ts) avant même d'atteindre le `<select part="select field">` imbriqué.
            const select = shadow.querySelector('select[part~="select"]');
            expect(select).not.toBeNull();
            expect(select?.tagName.toLowerCase()).toBe('select');
            expect(shadow.querySelectorAll('[part~="link"], span[part~="current"]').length).toBe(0);
        });

        it("peuple le select avec le même jeu de pages qu'à largeur confortable, pas la fenêtre réduite au budget actuel", async () => {
            el = await fixture('<ar-pagination current="3" total="15"></ar-pagination>');
            // @ts-expect-error accès à un champ privé pour simuler une mesure ResizeObserver
            el._budget = 2;
            el.requestUpdate();
            await waitForUpdate(el);

            // Qualifié par balise, cf. mise en garde `~=`/happy-dom ci-dessus.
            const select = (el.shadowRoot as ShadowRoot).querySelector(
                'select[part~="select"]',
            ) as HTMLSelectElement;
            const options = Array.from(select.querySelectorAll('option'));
            // _calculatePages(3, 15) SANS budget (donc budget par défaut 9) = [1, 2, 3, 4, 5, 6, 7, -2, 15]
            // — pas _minimalPages(3, 15) : le select ne doit pas être moins capable que le
            // desktop à largeur confortable, même si le conteneur réel est très étroit.
            expect(options).toHaveLength(9);
            expect(options.map((o) => o.disabled)).toEqual([
                false,
                false,
                false,
                false,
                false,
                false,
                false,
                true,
                false,
            ]);
            expect(options.map((o) => o.value)).toEqual([
                '1',
                '2',
                '3',
                '4',
                '5',
                '6',
                '7',
                '',
                '15',
            ]);
            // Attribut `selected` (pas la propriété IDL `.selected`) : happy-dom ne recalcule pas
            // correctement la "selectedness" d'un <select> au fil de l'insertion incrémentale de
            // ses <option> (bug reproduit indépendamment de ce composant, y compris sans binding
            // `.value` sur le <select>, avec un simple `render()` Lit) — `.selected` y retombe sur
            // un index arbitraire. L'attribut HTML reflète fidèlement ce que le template pose via
            // `?selected`, ce qu'un vrai navigateur traduirait correctement en `.selected === true`.
            expect(options[2]?.hasAttribute('selected')).toBe(true);
            expect(options.filter((o) => o.hasAttribute('selected'))).toHaveLength(1);
        });

        it('le contenu du select ne dépend pas de _budget (toujours le jeu à largeur confortable)', async () => {
            el = await fixture('<ar-pagination current="3" total="15"></ar-pagination>');
            // @ts-expect-error accès à un champ privé pour simuler une mesure ResizeObserver
            el._budget = 0;
            el.requestUpdate();
            await waitForUpdate(el);

            const select = (el.shadowRoot as ShadowRoot).querySelector(
                'select[part~="select"]',
            ) as HTMLSelectElement;
            const options = Array.from(select.querySelectorAll('option'));
            // Même jeu de 9 options qu'avec _budget = 2 ci-dessus : le contenu du select ne varie
            // pas avec la largeur réelle, seul le déclenchement du palier select en dépend.
            expect(options).toHaveLength(9);
            expect(options.map((o) => o.value)).toEqual([
                '1',
                '2',
                '3',
                '4',
                '5',
                '6',
                '7',
                '',
                '15',
            ]);
        });

        it('le label de chaque option contient "Page X sur Y"', async () => {
            el = await fixture('<ar-pagination current="3" total="15"></ar-pagination>');
            // @ts-expect-error accès à un champ privé pour simuler une mesure ResizeObserver
            el._budget = 2;
            el.requestUpdate();
            await waitForUpdate(el);

            // Qualifié par balise, cf. mise en garde `~=`/happy-dom plus haut dans ce describe.
            const select = (el.shadowRoot as ShadowRoot).querySelector(
                'select[part~="select"]',
            ) as HTMLSelectElement;
            const options = Array.from(select.querySelectorAll('option'));
            expect(options[0]?.textContent?.trim()).toBe('Page 1 sur 15');
            expect(options[2]?.textContent?.trim()).toBe('Page 3 sur 15');
            expect(options[8]?.textContent?.trim()).toBe('Page 15 sur 15');
        });

        it('ne bascule pas en palier select si _budget est au-dessus du plancher et que la fenêtre a une seule ellipse', async () => {
            // current=3 est assez proche du bord pour que la fenêtre à budget=5 n'ait besoin
            // que d'une seule ellipse ([1, 2, 3, -2, 15]) — 4 pages réelles, pas le cas
            // problématique des 2 ellipses ci-dessous.
            el = await fixture('<ar-pagination current="3" total="15"></ar-pagination>');
            // @ts-expect-error accès à un champ privé pour simuler une mesure ResizeObserver
            el._budget = 5;
            el.requestUpdate();
            await waitForUpdate(el);

            const shadow = el.shadowRoot as ShadowRoot;
            expect(shadow.querySelector('select[part~="select"]')).toBeNull();
        });

        it('bascule en palier select si le budget suffirait techniquement mais la fenêtre obtenue a 2 ellipses (seulement 3 pages réelles)', async () => {
            // current=8, total=15, loin des deux bords : à budget=5, _calculatePages retombe sur
            // sa fenêtre minimale [1, -1, 8, -2, 15] — 2 ellipses pour seulement 3 pages
            // cliquables. Le select devient préférable même si les 5 slots tiendraient.
            el = await fixture('<ar-pagination current="8" total="15"></ar-pagination>');
            // @ts-expect-error accès à un champ privé pour simuler une mesure ResizeObserver
            el._budget = 5;
            el.requestUpdate();
            await waitForUpdate(el);

            const shadow = el.shadowRoot as ShadowRoot;
            // Qualifié par balise, cf. mise en garde `~=`/happy-dom plus haut dans ce describe.
            expect(shadow.querySelector('select[part~="select"]')).not.toBeNull();
            expect(shadow.querySelectorAll('[part~="link"], span[part~="current"]').length).toBe(0);
        });

        it('select porte le rôle transverse "field"', async () => {
            el = await fixture('<ar-pagination current="8" total="15"></ar-pagination>');
            // @ts-expect-error accès à un champ privé pour simuler une mesure ResizeObserver
            el._budget = 5;
            el.requestUpdate();
            await waitForUpdate(el);

            const shadow = el.shadowRoot as ShadowRoot;
            const select = shadow.querySelector('select[part~="select"]');
            expect(select && partContains(select, 'field')).toBe(true);
        });

        it('le plancher est identique en bord de liste et en position intermédiaire (pas de dépendance à la position de current)', async () => {
            // Avant uniformisation, current en bord (1 ou total) avait un plancher de 3, contre
            // 5 en position intermédiaire — à budget égal (4 ici), une page en bord restait donc
            // en boutons pendant qu'une page intermédiaire basculait déjà en select. Le plancher
            // uniforme (5) élimine cette dépendance à la position.
            el = await fixture('<ar-pagination current="1" total="15"></ar-pagination>');
            // @ts-expect-error accès à un champ privé pour simuler une mesure ResizeObserver
            el._budget = 4;
            el.requestUpdate();
            await waitForUpdate(el);

            // Qualifié par balise, cf. mise en garde `~=`/happy-dom plus haut dans ce describe.
            expect(
                (el.shadowRoot as ShadowRoot).querySelector('select[part~="select"]'),
            ).not.toBeNull();
        });
    });

    // ── Mode compact — cycle de vie ResizeObserver ──────────────────────────

    describe('mode compact — cycle de vie ResizeObserver', () => {
        it('compact vaut false par défaut', async () => {
            el = await fixture('<ar-pagination></ar-pagination>');
            expect(el.compact).toBe(false);
        });

        it('reflète compact en attribut HTML', async () => {
            el = await fixture('<ar-pagination></ar-pagination>');
            el.compact = true;
            await waitForUpdate(el);
            expect(el.hasAttribute('compact')).toBe(true);
        });

        it('compact=false (défaut) : instancie un ResizeObserver au montage', async () => {
            el = await fixture('<ar-pagination></ar-pagination>');
            // @ts-expect-error accès à un champ privé pour vérifier l'instanciation du ResizeObserver
            expect(el._resizeObserver).toBeInstanceOf(ResizeObserver);
        });

        it("compact=true : n'instancie aucun ResizeObserver au montage", async () => {
            el = await fixture('<ar-pagination compact></ar-pagination>');
            // @ts-expect-error accès à un champ privé pour vérifier l'absence de ResizeObserver
            expect(el._resizeObserver).toBeUndefined();
        });

        it('passer compact de true à false attache le ResizeObserver', async () => {
            el = await fixture('<ar-pagination compact></ar-pagination>');
            // @ts-expect-error accès à un champ privé pour vérifier l'absence de ResizeObserver
            expect(el._resizeObserver).toBeUndefined();

            el.compact = false;
            await waitForUpdate(el);

            // @ts-expect-error accès à un champ privé pour vérifier l'instanciation du ResizeObserver
            expect(el._resizeObserver).toBeInstanceOf(ResizeObserver);
        });

        it('passer compact de false à true déconnecte le ResizeObserver existant', async () => {
            el = await fixture('<ar-pagination></ar-pagination>');
            // @ts-expect-error accès à un champ privé pour récupérer le ResizeObserver interne
            const observer = el._resizeObserver;
            expect(observer).toBeInstanceOf(ResizeObserver);
            const disconnectSpy = vi.spyOn(observer as ResizeObserver, 'disconnect');

            el.compact = true;
            await waitForUpdate(el);

            expect(disconnectSpy).toHaveBeenCalled();
            // @ts-expect-error accès à un champ privé pour vérifier la déconnexion
            expect(el._resizeObserver).toBeUndefined();
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

    describe("part d'état nav-button--disabled", () => {
        it('prev porte le part nav-button--disabled en page 1', async () => {
            el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
            expect(partContains(requirePart(el, 'prev'), 'nav-button--disabled')).toBe(true);
        });

        it('prev ne porte pas nav-button--disabled quand current > 1', async () => {
            el = await fixture('<ar-pagination current="2" total="5"></ar-pagination>');
            expect(partContains(requirePart(el, 'prev'), 'nav-button--disabled')).toBe(false);
        });

        it('next porte le part nav-button--disabled en dernière page', async () => {
            el = await fixture('<ar-pagination current="5" total="5"></ar-pagination>');
            expect(partContains(requirePart(el, 'next'), 'nav-button--disabled')).toBe(true);
        });

        it('next ne porte pas nav-button--disabled avant la dernière page', async () => {
            el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
            expect(partContains(requirePart(el, 'next'), 'nav-button--disabled')).toBe(false);
        });
    });

    // ── Navigation (current reste contrôlé de l'extérieur) ──────────────────

    describe('navigation (current contrôlé)', () => {
        it('un clic sur prev ne mute pas current tout seul', async () => {
            el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
            (requirePart(el, 'prev') as HTMLElement).click();
            await waitForUpdate(el);
            expect(el.current).toBe(3);
        });

        it('un clic sur next ne mute pas current tout seul', async () => {
            el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
            (requirePart(el, 'next') as HTMLElement).click();
            await waitForUpdate(el);
            expect(el.current).toBe(3);
        });

        it('un clic sur un lien de page ne mute pas current tout seul', async () => {
            el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            const pageLink = shadow.querySelector('[data-ar-pagination-page="3"]') as HTMLElement;
            pageLink.click();
            await waitForUpdate(el);
            expect(el.current).toBe(1);
        });

        it("un clic sur le span imbriqué (numéro visible) résout tout de même l'ancre via closest()", async () => {
            // Régression : `renderPageLabel` enveloppe le numéro visible dans un
            // `<span aria-hidden="true">` nichée dans le `<a part="link">`. `_onPageChange`
            // doit résoudre l'ancre via `closest()` même quand `event.target` est ce span.
            el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            const handler = vi.fn();
            el.addEventListener('ar-pagination-page-change', handler);
            const pageLink = shadow.querySelector('[data-ar-pagination-page="3"]') as HTMLElement;
            const visibleNumber = pageLink.querySelector('[aria-hidden="true"]') as HTMLElement;
            visibleNumber.click();
            await waitForUpdate(el);
            expect(handler).toHaveBeenCalledOnce();
            const detail = (handler.mock.calls[0][0] as CustomEvent<ArPaginationPageChangeDetail>)
                .detail;
            expect(detail).toEqual({ from: 1, to: 3 });
        });

        it('réassigner current depuis un handler ar-pagination-page-change met à jour le rendu', async () => {
            el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
            el.addEventListener('ar-pagination-page-change', (e) => {
                el.current = (e as CustomEvent<ArPaginationPageChangeDetail>).detail.to;
            });
            const shadow = el.shadowRoot as ShadowRoot;
            const pageLink = shadow.querySelector('[data-ar-pagination-page="3"]') as HTMLElement;
            pageLink.click();
            await waitForUpdate(el);
            expect(el.current).toBe(3);
        });

        it("un clic sur prev/next ne modifie pas le focus (l'élément cliqué reste focalisable)", async () => {
            el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
            const nextBtn = requirePart(el, 'next') as HTMLElement;
            nextBtn.focus();
            nextBtn.click();
            await waitForUpdate(el);
            expect(el.shadowRoot?.activeElement).toBe(nextBtn);
        });

        it("un clic sur next confirmé ne déplace pas non plus le focus (garde d'origine)", async () => {
            el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
            el.addEventListener('ar-pagination-page-change', (e) => {
                el.current = (e as CustomEvent<ArPaginationPageChangeDetail>).detail.to;
            });
            const nextBtn = requirePart(el, 'next') as HTMLElement;
            nextBtn.focus();
            nextBtn.click();
            await waitForUpdate(el);
            expect(el.current).toBe(4);
            expect(el.shadowRoot?.activeElement).toBe(nextBtn);
        });
    });

    describe('mode compact — rendu', () => {
        it('rend le label "Page X / Y" avec part="label"', async () => {
            el = await fixture('<ar-pagination compact current="3" total="12"></ar-pagination>');
            const label = requireLabel(el);
            expect(label.textContent?.trim()).toBe('Page 3 / 12');
        });

        it('le <li> englobant du label porte part="item page-label" et aria-hidden', async () => {
            el = await fixture('<ar-pagination compact current="3" total="12"></ar-pagination>');
            const label = requireLabel(el);
            const li = label.closest('[part~="page-label"]');
            expect(li?.getAttribute('part')).toBe('item page-label');
            expect(li?.getAttribute('aria-hidden')).toBe('true');
        });

        it('ordre DOM : label, prev, next', async () => {
            el = await fixture('<ar-pagination compact current="3" total="12"></ar-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            const items = Array.from(shadow.querySelectorAll('[part~="item"]'));
            expect(items).toHaveLength(3);
            expect(items[0]?.getAttribute('part')).toBe('item page-label');
            expect((items[1] as Element).querySelector('[part~="prev"]')).not.toBeNull();
            expect((items[2] as Element).querySelector('[part~="next"]')).not.toBeNull();
        });

        it("n'affiche aucun numéro de page ni <select> de saut de page", async () => {
            el = await fixture('<ar-pagination compact current="3" total="12"></ar-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            expect(shadow.querySelectorAll('[part~="link"], span[part~="current"]').length).toBe(0);
            expect(shadow.querySelector('select[part~="select"]')).toBeNull();
        });

        it('total=1 : label affiche "Page 1 / 1", prev et next désactivés', async () => {
            el = await fixture('<ar-pagination compact current="1" total="1"></ar-pagination>');
            expect(requireLabel(el).textContent?.trim()).toBe('Page 1 / 1');
            expect(partContains(requirePart(el, 'prev'), 'nav-button--disabled')).toBe(true);
            expect(partContains(requirePart(el, 'next'), 'nav-button--disabled')).toBe(true);
        });

        it('prev désactivé en page 1, next actif', async () => {
            el = await fixture('<ar-pagination compact current="1" total="12"></ar-pagination>');
            expect(requirePart(el, 'prev').getAttribute('aria-disabled')).toBe('true');
            expect(requirePart(el, 'next').getAttribute('aria-disabled')).toBe('false');
        });

        it('next désactivé en dernière page, prev actif', async () => {
            el = await fixture('<ar-pagination compact current="12" total="12"></ar-pagination>');
            expect(requirePart(el, 'next').getAttribute('aria-disabled')).toBe('true');
            expect(requirePart(el, 'prev').getAttribute('aria-disabled')).toBe('false');
        });

        it('le label se met à jour après un changement de page confirmé', async () => {
            el = await fixture('<ar-pagination compact current="3" total="12"></ar-pagination>');
            el.addEventListener('ar-pagination-page-change', (e) => {
                el.current = (e as CustomEvent<ArPaginationPageChangeDetail>).detail.to;
            });
            (requirePart(el, 'next') as HTMLElement).click();
            await waitForUpdate(el);
            expect(requireLabel(el).textContent?.trim()).toBe('Page 4 / 12');
        });

        it('prev/next émettent ar-pagination-page-change en mode compact ({from, to})', async () => {
            el = await fixture('<ar-pagination compact current="3" total="12"></ar-pagination>');
            const handler = vi.fn();
            el.addEventListener('ar-pagination-page-change', handler);
            (requirePart(el, 'next') as HTMLElement).click();
            await waitForUpdate(el);
            expect(handler).toHaveBeenCalledOnce();
            const detail = (handler.mock.calls[0][0] as CustomEvent<ArPaginationPageChangeDetail>)
                .detail;
            expect(detail).toEqual({ from: 3, to: 4 });
        });
    });

    // ── Événement ar-pagination-page-change ──────────────────────────────────

    describe('événement ar-pagination-page-change', () => {
        it('est cancelable', async () => {
            el = await fixture('<ar-pagination current="2" total="5"></ar-pagination>');
            const handler = vi.fn();
            el.addEventListener('ar-pagination-page-change', handler);
            (requirePart(el, 'next') as HTMLElement).click();
            await waitForUpdate(el);
            const event = handler.mock.calls[0]?.[0] as CustomEvent;
            expect(event.cancelable).toBe(true);
        });

        it('émis avec {from, to} au clic sur next', async () => {
            el = await fixture('<ar-pagination current="2" total="5"></ar-pagination>');
            const handler = vi.fn();
            el.addEventListener('ar-pagination-page-change', handler);

            (requirePart(el, 'next') as HTMLElement).click();
            await waitForUpdate(el);

            expect(handler).toHaveBeenCalledOnce();
            const detail = (handler.mock.calls[0][0] as CustomEvent<ArPaginationPageChangeDetail>)
                .detail;
            expect(detail).toEqual({ from: 2, to: 3 });
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
            expect(detail).toEqual({ from: 3, to: 2 });
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
            expect(detail).toEqual({ from: 1, to: 4 });
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

        it("preventDefault() bloque l'interaction : current ne change pas, le focus reste sur l'élément cliqué", async () => {
            el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
            el.addEventListener('ar-pagination-page-change', (e) => e.preventDefault());
            const shadow = el.shadowRoot as ShadowRoot;
            const pageLink = shadow.querySelector('[data-ar-pagination-page="3"]') as HTMLElement;
            pageLink.focus();
            pageLink.click();
            await waitForUpdate(el);

            expect(el.current).toBe(1);
            expect(shadow.activeElement).toBe(pageLink);
        });
    });

    describe('palier select — modèle contrôlé', () => {
        it('changer la valeur du select émet ar-pagination-page-change sans muter current', async () => {
            el = await fixture('<ar-pagination current="3" total="15"></ar-pagination>');
            // @ts-expect-error accès à un champ privé pour simuler une mesure ResizeObserver
            el._budget = 2;
            el.requestUpdate();
            await waitForUpdate(el);

            const handler = vi.fn();
            el.addEventListener('ar-pagination-page-change', handler);
            const select = (el.shadowRoot as ShadowRoot).querySelector(
                'select[part~="select"]',
            ) as HTMLSelectElement;
            select.value = '15';
            select.dispatchEvent(new Event('change'));
            await waitForUpdate(el);

            expect(el.current).toBe(3);
            expect(handler).toHaveBeenCalledOnce();
            const detail = (handler.mock.calls[0][0] as CustomEvent<ArPaginationPageChangeDetail>)
                .detail;
            expect(detail).toEqual({ from: 3, to: 15 });
        });

        it('preventDefault() sur le select revert sa valeur DOM affichée', async () => {
            el = await fixture('<ar-pagination current="3" total="15"></ar-pagination>');
            // @ts-expect-error accès à un champ privé pour simuler une mesure ResizeObserver
            el._budget = 2;
            el.requestUpdate();
            await waitForUpdate(el);
            el.addEventListener('ar-pagination-page-change', (e) => e.preventDefault());

            const select = (el.shadowRoot as ShadowRoot).querySelector(
                'select[part~="select"]',
            ) as HTMLSelectElement;
            select.value = '15';
            select.dispatchEvent(new Event('change'));
            await waitForUpdate(el);

            expect(el.current).toBe(3);
            expect(select.value).toBe('3');
        });

        it('réassigner current depuis le handler du select met à jour le rendu', async () => {
            el = await fixture('<ar-pagination current="3" total="15"></ar-pagination>');
            // @ts-expect-error accès à un champ privé pour simuler une mesure ResizeObserver
            el._budget = 2;
            el.requestUpdate();
            await waitForUpdate(el);
            el.addEventListener('ar-pagination-page-change', (e) => {
                el.current = (e as CustomEvent<ArPaginationPageChangeDetail>).detail.to;
            });

            const select = (el.shadowRoot as ShadowRoot).querySelector(
                'select[part~="select"]',
            ) as HTMLSelectElement;
            select.value = '15';
            select.dispatchEvent(new Event('change'));
            await waitForUpdate(el);

            expect(el.current).toBe(15);
        });

        it('prev/next au palier select ne mutent plus current tout seuls', async () => {
            el = await fixture('<ar-pagination current="3" total="15"></ar-pagination>');
            // @ts-expect-error accès à un champ privé pour simuler une mesure ResizeObserver
            el._budget = 2;
            el.requestUpdate();
            await waitForUpdate(el);

            expect(getPart(el, 'prev')).not.toBeNull();
            expect(getPart(el, 'next')).not.toBeNull();
            (requirePart(el, 'next') as HTMLElement).click();
            await waitForUpdate(el);
            expect(el.current).toBe(3);
        });
    });

    // ── Annonces a11y (après confirmation externe de current) ───────────────

    describe('annonces a11y', () => {
        // D'autres describes plus haut dans ce fichier réassignent aussi `current` en réponse
        // à `ar-pagination-page-change`, ce qui déclenche désormais `_announcePageChange()`
        // (Task 3) — leur écriture asynchrone (setTimeout 50ms dans announceA11y) peut
        // atterrir dans la région live partagée après leur propre test. `beforeEach` purge
        // ce résidu avant chaque assertion de ce describe, en plus de l'`afterEach` qui
        // nettoie sa propre pollution.
        beforeEach(() => {
            document.querySelectorAll('[data-ar-live-region]').forEach((node) => node.remove());
        });

        afterEach(() => {
            document.querySelectorAll('[data-ar-live-region]').forEach((node) => node.remove());
        });

        it("n'annonce rien tant que current n'est pas confirmé par le consommateur", async () => {
            el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
            (requirePart(el, 'prev') as HTMLElement).click();
            await waitForUpdate(el);
            await new Promise((resolve) => setTimeout(resolve, 60));

            expect(document.getElementById('ar-live-region-polite')).toBeNull();
        });

        it('un clic sur prev confirmé annonce "Page N-1 sur M"', async () => {
            el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
            el.addEventListener('ar-pagination-page-change', (e) => {
                el.current = (e as CustomEvent<ArPaginationPageChangeDetail>).detail.to;
            });
            (requirePart(el, 'prev') as HTMLElement).click();
            await waitForUpdate(el);
            await new Promise((resolve) => setTimeout(resolve, 60));

            expect(document.getElementById('ar-live-region-polite')?.textContent).toBe(
                'Page 2 sur 5',
            );
        });

        it('un clic sur next confirmé annonce "Page N+1 sur M"', async () => {
            el = await fixture('<ar-pagination current="2" total="5"></ar-pagination>');
            el.addEventListener('ar-pagination-page-change', (e) => {
                el.current = (e as CustomEvent<ArPaginationPageChangeDetail>).detail.to;
            });
            (requirePart(el, 'next') as HTMLElement).click();
            await waitForUpdate(el);
            await new Promise((resolve) => setTimeout(resolve, 60));

            expect(document.getElementById('ar-live-region-polite')?.textContent).toBe(
                'Page 3 sur 5',
            );
        });

        it('un clic direct sur un numéro de page confirmé annonce "Page N sur M"', async () => {
            el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
            el.addEventListener('ar-pagination-page-change', (e) => {
                el.current = (e as CustomEvent<ArPaginationPageChangeDetail>).detail.to;
            });
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

    describe('événement ar-pagination-page-changed', () => {
        it("n'est pas émis tant que current n'a pas réellement changé", async () => {
            el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
            const handler = vi.fn();
            el.addEventListener('ar-pagination-page-changed', handler);
            (requirePart(el, 'next') as HTMLElement).click();
            await waitForUpdate(el);
            expect(handler).not.toHaveBeenCalled();
        });

        it('est émis avec {from, to}, non cancelable, quand current change (réassignation externe)', async () => {
            el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
            const handler = vi.fn();
            el.addEventListener('ar-pagination-page-changed', handler);
            el.current = 3;
            await waitForUpdate(el);

            expect(handler).toHaveBeenCalledOnce();
            const event = handler.mock.calls[0][0] as CustomEvent<ArPaginationPageChangeDetail>;
            expect(event.cancelable).toBe(false);
            expect(event.detail).toEqual({ from: 1, to: 3 });
        });

        it("n'est pas émis au premier rendu", async () => {
            const handler = vi.fn();
            el = await fixture('<ar-pagination current="3" total="5"></ar-pagination>');
            el.addEventListener('ar-pagination-page-changed', handler);
            await waitForUpdate(el);
            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe('focus après confirmation externe', () => {
        it('focalise le nouvel élément part="current" une fois current réassigné en réponse à page-change', async () => {
            el = await fixture('<ar-pagination current="1" total="5"></ar-pagination>');
            el.addEventListener('ar-pagination-page-change', (e) => {
                el.current = (e as CustomEvent<ArPaginationPageChangeDetail>).detail.to;
            });
            const shadow = el.shadowRoot as ShadowRoot;
            const pageLink = shadow.querySelector('[data-ar-pagination-page="3"]') as HTMLElement;
            pageLink.click();
            await waitForUpdate(el);

            const current = shadow.querySelector('span[part~="current"]') as HTMLElement;
            expect(shadow.activeElement).toBe(current);
        });

        it('le nouvel élément part="current" porte tabindex="-1"', async () => {
            el = await fixture('<ar-pagination current="2" total="5"></ar-pagination>');
            const shadow = el.shadowRoot as ShadowRoot;
            const current = shadow.querySelector('span[part~="current"]') as HTMLElement;
            expect(current.getAttribute('tabindex')).toBe('-1');
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
            expect(el.shadowRoot?.querySelector('[part="pagination"]')).not.toBeNull();

            const prevLabel = el.shadowRoot?.querySelector('[part~="prev"] .sr-only')?.textContent;
            const nextLabel = el.shadowRoot?.querySelector('[part~="next"] .sr-only')?.textContent;
            expect(prevLabel).not.toMatch(/-\d/);
            expect(nextLabel).not.toMatch(/-\d/);
        });
    });

    describe('traduction', () => {
        afterEach(() => {
            el.removeAttribute('lang');
        });

        it('lang="en" traduit les sr-only prev/next et le label du select', async () => {
            el = await fixture('<ar-pagination current="8" total="15" lang="en"></ar-pagination>');
            const prevSrOnly = requirePart(el, 'prev').querySelector('.sr-only');
            const nextSrOnly = requirePart(el, 'next').querySelector('.sr-only');
            expect(prevSrOnly?.textContent).toBe('Previous page (page 7 of 15)');
            expect(nextSrOnly?.textContent).toBe('Next page (page 9 of 15)');
        });

        it('lang="en" traduit le label compact', async () => {
            el = await fixture(
                '<ar-pagination current="2" total="5" compact lang="en"></ar-pagination>',
            );
            const label = getPart(el, 'label');
            expect(label?.textContent?.trim()).toBe('Page 2 / 5');
        });

        it('lang="en" traduit le label du landmark nav', async () => {
            el = await fixture('<ar-pagination current="8" total="15" lang="en"></ar-pagination>');
            const landmark = el.shadowRoot?.querySelector('#ar-pagination');
            expect(landmark?.textContent).toBe('Pagination, page 8 of 15');
        });
    });
});
