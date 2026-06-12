/// <reference types="mocha" />
import { fixture, html, expect, aTimeout } from '@open-wc/testing';
import type { ArCollapse } from './collapse.js';
import './collapse.js';

const ANIM_MS = 400;

// La transition est sur ::part(panel) dans le thème consommateur.
// On l'injecte globalement pour que _shouldAnimate() retourne true.
let styleEl: HTMLStyleElement;
before(() => {
    styleEl = document.createElement('style');
    styleEl.textContent = 'ar-collapse::part(panel) { transition: height 100ms ease; }';
    document.head.appendChild(styleEl);
});
after(() => styleEl.remove());

function getPanel(el: ArCollapse): HTMLElement {
    const p = el.shadowRoot?.querySelector<HTMLElement>('[part="panel"]');
    if (!p) throw new Error('panel introuvable');
    return p;
}

describe('ar-collapse — browser', () => {
    let el: ArCollapse;

    afterEach(() => el?.remove());

    // ── Ouverture avec animation ───────────────────────────────────────────────

    describe('ouverture', () => {
        beforeEach(async () => {
            el = await fixture(html`
                <ar-collapse>
                    <button slot="trigger">Toggle</button>
                    <p>Contenu</p>
                </ar-collapse>
            `);
        });

        it('retire hidden du panel', async () => {
            el.show();
            await aTimeout(10);
            expect(getPanel(el).hasAttribute('hidden')).to.equal(false);
        });

        it('émet ar-collapse-shown après transitionend', async () => {
            let fired = false;
            el.addEventListener('ar-collapse-shown', () => {
                fired = true;
            });
            el.show();
            await aTimeout(ANIM_MS);
            expect(fired).to.equal(true);
        });

        it('height est "auto" après la fin de l\'animation', async () => {
            el.show();
            await aTimeout(ANIM_MS);
            expect(getPanel(el).style.height).to.equal('auto');
        });

        it('_animating bloque un double appel', async () => {
            let count = 0;
            el.addEventListener('ar-collapse-shown', () => count++);
            el.show();
            el.show(); // second appel immédiat
            await aTimeout(ANIM_MS);
            expect(count).to.equal(1);
        });
    });

    // ── Fermeture avec animation ──────────────────────────────────────────────

    describe('fermeture', () => {
        beforeEach(async () => {
            el = await fixture(html`
                <ar-collapse open>
                    <button slot="trigger">Toggle</button>
                    <p>Contenu</p>
                </ar-collapse>
            `);
            await aTimeout(ANIM_MS); // attendre fin ouverture initiale
        });

        it('émet ar-collapse-hidden après transitionend', async () => {
            let fired = false;
            el.addEventListener('ar-collapse-hidden', () => {
                fired = true;
            });
            el.hide();
            await aTimeout(ANIM_MS);
            expect(fired).to.equal(true);
        });

        it('repose hidden sur le panel après fermeture', async () => {
            el.hide();
            await aTimeout(ANIM_MS);
            expect(getPanel(el).hasAttribute('hidden')).to.equal(true);
        });

        it('height inline est vidé après fermeture', async () => {
            el.hide();
            await aTimeout(ANIM_MS);
            expect(getPanel(el).style.height).to.equal('');
        });
    });
});
