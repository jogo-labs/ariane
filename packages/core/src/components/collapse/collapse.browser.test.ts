/// <reference types="mocha" />
import { fixture, html, expect, aTimeout } from '@open-wc/testing';
import type { ArCollapse } from './collapse.js';
import './index.js';

const ANIM_MS = 400;

// La transition est sur ::part(collapsible) dans le thème consommateur.
// On l'injecte globalement pour que _shouldAnimate() retourne true.
let styleEl: HTMLStyleElement;
before(() => {
    styleEl = document.createElement('style');
    styleEl.textContent = 'ar-collapse::part(collapsible) { transition: height 100ms ease; }';
    document.head.appendChild(styleEl);
});
after(() => styleEl.remove());

function getPanel(el: ArCollapse): HTMLElement {
    const p = el.shadowRoot?.querySelector<HTMLElement>('[part="collapsible"]');
    if (!p) throw new Error('panel introuvable');
    return p;
}

describe('ar-collapse — browser', () => {
    let el: ArCollapse;

    afterEach(() => el?.remove());

    // ── Robustesse animation ──────────────────────────────────────────────────

    describe('robustesse animation', () => {
        it('disconnect mid-animation ne bloque pas le composant après reconnect', async () => {
            el = await fixture(html`
                <ar-collapse>
                    <button slot="trigger">T</button>
                    <p>Contenu</p>
                </ar-collapse>
            `);
            el.show();
            await aTimeout(30); // mi-animation
            const parent = el.parentElement!;
            el.remove();
            parent.appendChild(el);
            el.show();
            await aTimeout(ANIM_MS);
            expect(getPanel(el).style.height).to.equal('auto');
        });

        it('assigner el.open=true pendant animation émet ar-collapse-shown une seule fois', async () => {
            el = await fixture(html`
                <ar-collapse>
                    <button slot="trigger">T</button>
                    <p>Contenu</p>
                </ar-collapse>
            `);
            el.show();
            await aTimeout(30); // mi-ouverture

            let count = 0;
            el.addEventListener('ar-collapse-shown', () => count++);
            el.open = true; // forcer pendant animation
            await aTimeout(ANIM_MS * 2);
            expect(count).to.equal(1);
        });
    });

    // ── Accordéon — snap mid-animation ───────────────────────────────────────

    describe('accordéon — snap mid-animation', () => {
        it('ouvrir item B ferme item A même si A est mid-animation', async () => {
            const elA = await fixture<ArCollapse>(html`
                <ar-collapse name="snap-grp">
                    <button slot="trigger">A</button>
                    <p>Contenu A</p>
                </ar-collapse>
            `);
            const elB = await fixture<ArCollapse>(html`
                <ar-collapse name="snap-grp">
                    <button slot="trigger">B</button>
                    <p>Contenu B</p>
                </ar-collapse>
            `);

            elA.show();
            await aTimeout(30); // A mid-animation

            elB.show(); // doit fermer A immédiatement
            await aTimeout(ANIM_MS);

            expect(elA.open).to.equal(false);
            expect(getPanel(elA).hasAttribute('hidden')).to.equal(true);
            expect(elB.open).to.equal(true);
            elA.remove();
            elB.remove();
        });
    });

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

    // ── Largeur du panel ────────────────────────────────────────────────────

    describe('largeur du panel', () => {
        it('[part="collapsible"] s\'étire sur toute la largeur du host, indépendamment de la largeur du trigger', async () => {
            // [part='collapse'] utilise align-items: flex-start (garde le trigger à sa largeur
            // naturelle) — sans align-self: stretch sur [part='collapsible'], ce même align-items
            // rétrécit aussi le panel (et tout contenu large qu'il contient, ex. un bloc de
            // code) à la largeur de son propre contenu au lieu de la largeur du host.
            const wrapper = await fixture(html`
                <div style="width: 400px;">
                    <ar-collapse open>
                        <button slot="trigger">T</button>
                        <p>Contenu</p>
                    </ar-collapse>
                </div>
            `);
            const collapseEl = wrapper.querySelector('ar-collapse') as ArCollapse;
            const panel = getPanel(collapseEl);
            expect(panel.getBoundingClientRect().width).to.be.closeTo(
                collapseEl.getBoundingClientRect().width,
                1,
            );
        });

        it('le trigger conserve sa largeur naturelle (pas étiré par le fix du panel)', async () => {
            const wrapper = await fixture(html`
                <div style="width: 400px;">
                    <ar-collapse>
                        <button slot="trigger">T</button>
                        <p>Contenu</p>
                    </ar-collapse>
                </div>
            `);
            const collapseEl = wrapper.querySelector('ar-collapse') as ArCollapse;
            const trigger = collapseEl.querySelector('[slot="trigger"]') as HTMLElement;
            expect(trigger.getBoundingClientRect().width).to.be.lessThan(
                collapseEl.getBoundingClientRect().width,
            );
        });
    });
});
