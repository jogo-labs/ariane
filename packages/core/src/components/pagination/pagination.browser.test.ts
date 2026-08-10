/// <reference types="mocha" />
/**
 * pagination.browser.test.ts
 *
 * Tests nécessitant un vrai browser (Chromium via @web/test-runner) :
 *   - Focus + :focus-visible après activation d'un lien de page (#154),
 *     vérifiable uniquement avec un vrai `:focus-visible` (absent de happy-dom).
 *   - Propriétés CSS logiques (RTL).
 */
import { fixture, html, expect, elementUpdated } from '@open-wc/testing';
import './index.js';

describe('ar-pagination — browser', () => {
    describe('focus après activation (#154)', () => {
        // Vérifie que le focus atterrit sur le nouvel élément part="current" et que
        // :focus-visible matche après un focus() + click() programmatiques. Ne vérifie PAS
        // l'ordre de tabulation réel ni la distinction clavier/souris — nécessiterait
        // @web/test-runner-commands (sendKeys/sendMouse), non installé, hors scope de ce
        // correctif.
        it('focalise le nouvel élément part="current" et :focus-visible matche après activation', async () => {
            const el = await fixture(html`<ar-pagination current="1" total="5"></ar-pagination>`);
            const shadowRoot = el.shadowRoot as ShadowRoot;
            const pageLink = shadowRoot.querySelector(
                '[data-ar-pagination-page="3"]',
            ) as HTMLElement;

            pageLink.focus();
            pageLink.click();
            await elementUpdated(el);

            const current = shadowRoot.querySelector('[part~="current"]') as HTMLElement;
            expect(shadowRoot.activeElement).to.equal(current);
            expect(current.matches(':focus-visible')).to.equal(true);
        });
    });

    describe('clic sur le contenu imbriqué du lien (régression)', () => {
        // `renderPageLabel` enveloppe le numéro visible dans un `<span aria-hidden="true">`
        // (structure : `<a part="link">` > `<span aria-hidden>`). Un clic utilisateur réel sur
        // le chiffre affiché a pour `event.target` ce `<span>` imbriqué, pas le `<a>` lui-même —
        // contrairement aux autres tests de ce fichier/suite qui appellent `.click()`
        // directement sur le `<a>`. Vérifie que `_onPageChange` résout bien l'ancre via
        // `closest()` et change effectivement la page dans ce cas.
        it('un clic sur le numéro visible (span aria-hidden imbriqué) change la page', async () => {
            const el = await fixture(html`<ar-pagination current="1" total="5"></ar-pagination>`);
            const shadow = el.shadowRoot as ShadowRoot;
            const link = shadow.querySelector('[data-ar-pagination-page="3"]') as HTMLElement;
            const visibleNumber = link.querySelector('[aria-hidden="true"]') as HTMLElement;

            visibleNumber.click();
            await elementUpdated(el);

            expect((el as unknown as { current: number }).current).to.equal(3);
        });
    });

    describe('propriétés logiques (RTL)', () => {
        it('[part="list"] utilise padding-inline-start plutôt que padding-left', async () => {
            const el = await fixture(html`<ar-pagination current="1" total="5"></ar-pagination>`);
            const list = el.shadowRoot?.querySelector<HTMLElement>('[part="list"]');
            if (!list) throw new Error('[part="list"] introuvable');
            const style = getComputedStyle(list);
            expect(style.paddingInlineStart).to.equal('0px');
        });

        it('la règle CSS source déclare padding-inline-start, pas padding-left', async () => {
            const el = await fixture(html`<ar-pagination current="1" total="5"></ar-pagination>`);
            const sheet = [...(el.shadowRoot?.adoptedStyleSheets ?? [])];
            const cssText = sheet.flatMap((s) => [...s.cssRules]).map((r) => r.cssText);
            const listRule = cssText.find((rule) => rule.includes('[part="list"]'));
            if (!listRule) {
                throw new Error(
                    `[part="list"] rule not found in CSS. Available rules: ${cssText.join(', ')}`,
                );
            }
            expect(listRule).to.include('padding-inline-start');
            expect(listRule).to.not.include('padding-left');
        });
    });

    describe('masquage responsive progressif (#152)', () => {
        async function waitForResize(): Promise<void> {
            // Laisse le temps au ResizeObserver de déclencher son callback et à Lit de re-render.
            await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
            await new Promise((resolve) => setTimeout(resolve, 50));
        }

        it('affiche la liste complète des numéros dans un conteneur large', async () => {
            const wrapper = await fixture(
                html`<div style="width: 900px;">
                    <ar-pagination current="8" total="15"></ar-pagination>
                </div>`,
            );
            const el = wrapper.querySelector('ar-pagination') as HTMLElement;
            await elementUpdated(el);
            await waitForResize();

            // 900px mesuré en Chromium (btn-size fallback headless 2.5rem = 40px, aucun thème
            // chargé dans ce test) suffit à afficher les 15 pages sans troncature : le budget
            // calculé par le ResizeObserver dépasse `total`, donc `_calculatePages` renvoie la
            // liste complète (cf. `_calculatePages`, branche `total <= effectiveBudget`).
            const shadow = el.shadowRoot as ShadowRoot;
            expect(shadow.querySelectorAll('[part~="link"], [part~="current"]').length).to.equal(
                15,
            );
        });

        it('réduit le nombre de pages affichées quand le conteneur est rétréci', async () => {
            const wrapper = await fixture(
                html`<div style="width: 900px;">
                    <ar-pagination current="8" total="15"></ar-pagination>
                </div>`,
            );
            const el = wrapper.querySelector('ar-pagination') as HTMLElement;
            await elementUpdated(el);
            await waitForResize();

            // 400px mesuré empiriquement : budget suffisant pour rester au-dessus du plancher
            // texte (5 slots, `current` non en bord) mais insuffisant pour les 15 pages —
            // produit une liste tronquée avec ellipses, contrairement à 260px (cf. test
            // suivant) qui passe déjà sous le plancher.
            wrapper.style.width = '400px';
            await waitForResize();

            const shadow = el.shadowRoot as ShadowRoot;
            const numericCount = shadow.querySelectorAll(
                '[part~="link"], [part~="current"]',
            ).length;
            // Valeur exacte mesurée empiriquement à 400px avec le repli headless figé
            // (`--ar-pagination-btn-size` = 2.5rem = 40px, aucune police variable dans WTR) :
            // déterministe. Une régression dans `_pagesWithSiblings` (ex. `siblingCount` qui ne
            // retire qu'une page, 14 au lieu de 5) passerait inaperçue avec une simple borne
            // `lessThan(15)` — l'égalité stricte est nécessaire pour couvrir ce cas.
            expect(numericCount).to.equal(5);
        });

        it('bascule sur un <select> de saut de page à largeur extrême', async () => {
            const wrapper = await fixture(
                html`<div style="width: 900px;">
                    <ar-pagination current="8" total="15"></ar-pagination>
                </div>`,
            );
            const el = wrapper.querySelector('ar-pagination') as HTMLElement;
            await elementUpdated(el);
            await waitForResize();

            wrapper.style.width = '90px';
            await waitForResize();

            const shadow = el.shadowRoot as ShadowRoot;
            const select = shadow.querySelector('[part~="select"]') as HTMLSelectElement;
            expect(select).to.not.equal(null);
            expect(select.tagName.toLowerCase()).to.equal('select');
            expect(shadow.querySelectorAll('[part~="link"], [part~="current"]').length).to.equal(0);

            // _calculatePages(8, 15) SANS budget (donc budget par défaut 9, pas la fenêtre
            // réduite au budget réel de la largeur actuelle) = [1, -1, 6, 7, 8, 9, 10, -2, 15] —
            // le select doit rester aussi riche qu'à largeur confortable.
            const options = Array.from(select.querySelectorAll('option'));
            expect(options).to.have.lengthOf(9);
            expect(options[4]?.selected).to.equal(true);
            expect(options[4]?.textContent?.trim()).to.equal('Page 8 sur 15');
            expect(options[1]?.disabled).to.equal(true);
            expect(options[7]?.disabled).to.equal(true);
        });

        it('sélectionner une option du select change la page', async () => {
            const wrapper = await fixture(
                html`<div style="width: 90px;">
                    <ar-pagination current="8" total="15"></ar-pagination>
                </div>`,
            );
            const el = wrapper.querySelector('ar-pagination') as HTMLElement;
            await elementUpdated(el);
            await waitForResize();

            const shadow = el.shadowRoot as ShadowRoot;
            const select = shadow.querySelector('[part~="select"]') as HTMLSelectElement;
            select.value = '15';
            select.dispatchEvent(new Event('change', { bubbles: true }));
            await elementUpdated(el);

            expect((el as unknown as { current: number }).current).to.equal(15);
            expect(select.selectedIndex).to.not.equal(-1);
            expect(select.options[select.selectedIndex]?.textContent?.trim()).to.equal(
                'Page 15 sur 15',
            );
        });

        it('prev/next restent cliquables au palier select', async () => {
            const wrapper = await fixture(
                html`<div style="width: 90px;">
                    <ar-pagination current="8" total="15"></ar-pagination>
                </div>`,
            );
            const el = wrapper.querySelector('ar-pagination') as HTMLElement;
            await elementUpdated(el);
            await waitForResize();

            const shadow = el.shadowRoot as ShadowRoot;
            const next = shadow.querySelector('[part~="next"]') as HTMLElement;
            next.click();
            await elementUpdated(el);

            expect((el as unknown as { current: number }).current).to.equal(9);

            const select = shadow.querySelector('[part~="select"]') as HTMLSelectElement;
            expect(select.selectedIndex).to.not.equal(-1);
            expect(select.options[select.selectedIndex]?.textContent?.trim()).to.equal(
                'Page 9 sur 15',
            );
        });

        it("[part='list'] ne wrap plus (flex-wrap: nowrap)", async () => {
            const el = await fixture(html`<ar-pagination current="1" total="5"></ar-pagination>`);
            const list = el.shadowRoot?.querySelector<HTMLElement>('[part="list"]');
            if (!list) throw new Error('[part="list"] introuvable');
            expect(getComputedStyle(list).flexWrap).to.equal('nowrap');
        });

        it("ne reste pas bloqué au palier select après un changement d'ordre de grandeur de total suivi d'un réélargissement", async () => {
            // Régression : `total` qui change d'ordre de grandeur (9 → 10, 99 → 100, ...)
            // pendant que le composant est déjà au palier select marquait `_itemWidth` comme à
            // remesurer, mais aucun item numérique n'est rendu à ce palier — sans item à
            // mesurer, `_recalculateBudget` ne recalculait plus jamais `_budget`, bloquant le
            // composant sur le select même après un réélargissement massif du conteneur.
            const wrapper = await fixture(
                html`<div style="width: 700px;">
                    <ar-pagination current="100" total="200"></ar-pagination>
                </div>`,
            );
            const el = wrapper.querySelector('ar-pagination') as HTMLElement;
            await elementUpdated(el);
            await waitForResize();

            const shadow = el.shadowRoot as ShadowRoot;

            // 1. Conteneur large → numéros affichés, `_itemWidth` mesuré normalement.
            expect(
                shadow.querySelectorAll('[part~="link"], [part~="current"]').length,
            ).to.be.greaterThan(0);

            // 2. Rétrécir jusqu'au palier select.
            wrapper.style.width = '90px';
            await waitForResize();
            expect(shadow.querySelector('[part~="select"]')).to.not.equal(null);
            expect(shadow.querySelectorAll('[part~="link"], [part~="current"]').length).to.equal(0);

            // 3. Changer `total` (et `current`, pour rester valide) d'ordre de grandeur pendant
            //    que le composant est au palier select (déclenche l'invalidation de
            //    `_itemWidth`) — toujours aucun item numérique disponible pour remesurer
            //    immédiatement.
            (el as unknown as { total: number; current: number }).total = 15;
            (el as unknown as { total: number; current: number }).current = 8;
            await elementUpdated(el);
            await waitForResize();

            // 4. Réélargir le conteneur → les numéros doivent réapparaître normalement, pas
            //    rester bloqués sur le select.
            wrapper.style.width = '700px';
            await waitForResize();

            expect(shadow.querySelector('[part~="select"]')).to.equal(null);
            expect(
                shadow.querySelectorAll('[part~="link"], [part~="current"]').length,
            ).to.be.greaterThan(0);
        });
    });

    describe('labels accessibles enrichis (total dans le contexte)', () => {
        it('le sr-only d\'un lien de page se lit "Page X sur Y" en layout réel (innerText)', async () => {
            const el = await fixture(html`<ar-pagination current="3" total="12"></ar-pagination>`);
            const link = el.shadowRoot?.querySelector(
                '[data-ar-pagination-page="4"]',
            ) as HTMLElement;
            const srOnly = link.querySelector('.sr-only') as HTMLElement;
            // `innerText` (pas `textContent`) : reflète le rendu réel appliqué par le layout,
            // seul moyen fiable de détecter une régression du bug historique #152 ("8sur15") où
            // plusieurs bindings adjacents dans un conteneur flex perdaient leurs espaces.
            expect(srOnly.innerText.trim()).to.equal('Page 4 sur 12');
        });

        it('la page active porte aria-current="page"', async () => {
            const el = await fixture(html`<ar-pagination current="3" total="12"></ar-pagination>`);
            const current = el.shadowRoot?.querySelector('[part="current"]') as HTMLElement;
            expect(current.getAttribute('aria-current')).to.equal('page');
        });
    });

    describe('invariant anti-débordement avec le thème par défaut (#152, Finding Critical #1/#3)', () => {
        async function waitForResize(): Promise<void> {
            await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
            await new Promise((resolve) => setTimeout(resolve, 50));
        }

        // Reproduit les règles pertinentes de packages/core/src/styles/themes/default.css pour
        // ar-pagination (column-gap sur [part='list'], padding sur link/current/ellipsis) sans
        // charger le thème complet : ce sont précisément les règles non budgétées par
        // `_recalculateBudget` avant le fix (Finding Critical #1), à l'origine d'un débordement
        // horizontal mesuré jusqu'à 61px. `--ar-pagination-btn-size` n'a pas besoin d'être
        // redéclaré ici : le composant a déjà un repli interne à 2.5rem, valeur identique à
        // celle du thème par défaut.
        let themeStyle: HTMLStyleElement;

        beforeEach(() => {
            themeStyle = document.createElement('style');
            themeStyle.textContent = `
                ar-pagination::part(list) { column-gap: 0.25rem; }
                ar-pagination::part(link),
                ar-pagination::part(current),
                ar-pagination::part(ellipsis) { padding: 0 0.75rem; }
            `;
            document.head.appendChild(themeStyle);
        });

        afterEach(() => {
            themeStyle.remove();
        });

        it('list.scrollWidth ne dépasse jamais list.clientWidth sur un balayage de largeurs (total=15)', async () => {
            const wrapper = await fixture(
                html`<div style="width: 700px;">
                    <ar-pagination current="8" total="15"></ar-pagination>
                </div>`,
            );
            const el = wrapper.querySelector('ar-pagination') as HTMLElement;
            await elementUpdated(el);
            await waitForResize();

            for (const width of [280, 360, 440, 480, 700]) {
                wrapper.style.width = `${width}px`;
                await waitForResize();

                const list = el.shadowRoot?.querySelector<HTMLElement>('[part="list"]');
                if (!list) throw new Error('[part="list"] introuvable');
                // Tolérance de 1px pour les arrondis sous-pixel de layout.
                expect(list.scrollWidth, `débordement à ${width}px`).to.be.at.most(
                    list.clientWidth + 1,
                );
            }
        });

        it('list.scrollWidth ne dépasse jamais list.clientWidth avec un total à 3 chiffres (total=999)', async () => {
            const wrapper = await fixture(
                html`<div style="width: 700px;">
                    <ar-pagination current="500" total="999"></ar-pagination>
                </div>`,
            );
            const el = wrapper.querySelector('ar-pagination') as HTMLElement;
            await elementUpdated(el);
            await waitForResize();

            for (const width of [280, 360, 440, 480, 700]) {
                wrapper.style.width = `${width}px`;
                await waitForResize();

                const list = el.shadowRoot?.querySelector<HTMLElement>('[part="list"]');
                if (!list) throw new Error('[part="list"] introuvable');
                expect(list.scrollWidth, `débordement à ${width}px`).to.be.at.most(
                    list.clientWidth + 1,
                );
            }
        });
    });
});
