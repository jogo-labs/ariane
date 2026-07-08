/// <reference types="mocha" />
/**
 * dialog.browser.test.ts
 *
 * Tests nécessitant un vrai browser (Chromium via @web/test-runner) :
 *   - Animations CSS réelles (animationend natif, pas de dispatch manuel)
 *   - Cycle de vie des classes .opening / .closing / .shake
 *   - Comportements dépendants de l'ordre des événements d'animation
 *
 * Les timeouts sont volontairement conservateurs (> durée max des animations).
 */
import { fixture, html, expect, aTimeout } from '@open-wc/testing';
import type { ArDialog } from './dialog.js';
import './index.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ANIM_OPEN = 400; // showModal 250ms / showDrawer 300ms + marge
const ANIM_CLOSE = 350; // hideModal 200ms / hideDrawer 250ms + marge
const ANIM_SHAKE = 600; // dialogShake 400ms + marge

function getDialogEl(el: ArDialog): HTMLDialogElement {
    const dialogEl = el.shadowRoot?.querySelector('dialog');
    if (!(dialogEl instanceof HTMLDialogElement)) throw new Error('<dialog> introuvable');
    return dialogEl;
}

// ──────────────────────────────────────────────────────────────────────────────

describe('ar-dialog — browser', () => {
    let el: ArDialog;

    afterEach(() => el?.remove());

    // ── Fermeture avec animation réelle ───────────────────────────────────────

    describe('fermeture', () => {
        beforeEach(async () => {
            el = await fixture(html`<ar-dialog open></ar-dialog>`);
            await aTimeout(ANIM_OPEN);
        });

        it('ferme le <dialog> natif après animation de fermeture', async () => {
            el.open = false;
            await aTimeout(ANIM_CLOSE);
            expect(getDialogEl(el).open).to.equal(false);
        });

        it('restaure le scroll du body après fermeture', async () => {
            el.open = false;
            await aTimeout(ANIM_CLOSE);
            expect(document.body.style.overflow).not.to.equal('hidden');
        });

        it("émet ar-dialog-hidden après la fin de l'animation", async () => {
            let fired = false;
            el.addEventListener('ar-dialog-hidden', () => {
                fired = true;
            });
            el.open = false;
            await aTimeout(ANIM_CLOSE);
            expect(fired).to.equal(true);
        });

        it('_isClosing bloque un double-appel : ar-dialog-hidden émis une seule fois', async () => {
            let count = 0;
            el.addEventListener('ar-dialog-hidden', () => {
                count++;
            });
            el.open = false;
            el.open = false; // second appel immédiat pendant la fermeture
            await aTimeout(ANIM_CLOSE);
            expect(count).to.equal(1);
        });
    });

    // ── Scroll lock / unlock ─────────────────────────────────────────────────

    describe('scroll', () => {
        it("gèle le scroll à l'ouverture et le restaure à la fermeture", async () => {
            el = await fixture(html`<ar-dialog></ar-dialog>`);
            el.open = true;
            await aTimeout(50);
            expect(document.body.style.overflow).to.equal('hidden');

            el.open = false;
            await aTimeout(ANIM_CLOSE);
            expect(document.body.style.overflow).not.to.equal('hidden');
        });
    });

    // ── Animation d'ouverture (.opening) ─────────────────────────────────────

    describe('animation ouverture', () => {
        it("ajoute .opening à l'ouverture et la retire après animation", async () => {
            el = await fixture(html`<ar-dialog></ar-dialog>`);
            const dialogEl = getDialogEl(el);

            el.open = true;
            await aTimeout(20); // Lit update
            expect(dialogEl.classList.contains('opening')).to.equal(true);

            await aTimeout(ANIM_OPEN);
            expect(dialogEl.classList.contains('opening')).to.equal(false);
        });
    });

    // ── Shake ────────────────────────────────────────────────────────────────

    describe('shake', () => {
        beforeEach(async () => {
            el = await fixture(html`<ar-dialog open></ar-dialog>`);
            await aTimeout(ANIM_OPEN); // attendre la fin de l'animation d'ouverture
        });

        it("ajoute .shake lors d'un blocage de fermeture et la retire après animation", async () => {
            const dialogEl = getDialogEl(el);
            el.addEventListener('ar-dialog-hide', (e) => e.preventDefault());
            el.open = false;
            await aTimeout(20);
            expect(dialogEl.classList.contains('shake')).to.equal(true);

            await aTimeout(ANIM_SHAKE);
            expect(dialogEl.classList.contains('shake')).to.equal(false);
        });

        it("shake ne relance pas l'animation showModal (régression #opening)", async () => {
            const dialogEl = getDialogEl(el);

            // Écouter les animationstart après la fin de l'animation d'ouverture
            const started: string[] = [];
            dialogEl.addEventListener('animationstart', (e: AnimationEvent) => {
                started.push(e.animationName);
            });

            el.addEventListener('ar-dialog-hide', (e) => e.preventDefault());
            el.open = false;
            await aTimeout(ANIM_SHAKE);

            expect(started).to.include('dialogShake');
            expect(started).not.to.include('showModal');
        });
    });

    // ── Gestion du focus ─────────────────────────────────────────────────────

    describe('focus', () => {
        it("retourne le focus à l'élément déclencheur à la fermeture", async () => {
            const trigger = document.createElement('button');
            document.body.appendChild(trigger);
            trigger.focus();

            el = await fixture(html`<ar-dialog></ar-dialog>`);
            el.open = true;
            await aTimeout(50);

            el.open = false;
            await aTimeout(ANIM_CLOSE);

            expect(document.activeElement).to.equal(trigger);
            trigger.remove();
        });
    });
});
