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
            expect(numericCount).to.be.greaterThan(0);
            expect(numericCount).to.be.lessThan(15);
        });

        it('bascule sur le palier texte "Page X sur Y" à largeur extrême', async () => {
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
            const status = shadow.querySelector('[part~="page-status"]');
            expect(status).to.not.equal(null);
            expect(status?.textContent?.trim()).to.equal('Page 8 sur 15');
        });

        it('prev/next restent cliquables au palier texte', async () => {
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
        });

        it("[part='list'] ne wrap plus (flex-wrap: nowrap)", async () => {
            const el = await fixture(html`<ar-pagination current="1" total="5"></ar-pagination>`);
            const list = el.shadowRoot?.querySelector<HTMLElement>('[part="list"]');
            if (!list) throw new Error('[part="list"] introuvable');
            expect(getComputedStyle(list).flexWrap).to.equal('nowrap');
        });
    });
});
