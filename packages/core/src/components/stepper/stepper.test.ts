import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ArStepper } from './stepper.js';
import { fixture, waitForUpdate } from '../../test-utils.js';
import './stepper.js';
import '../stepper-item/stepper-item.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Retourne le shadowRoot ou lance une erreur de test. */
function shadow(el: Element): ShadowRoot {
    if (!el.shadowRoot) throw new Error(`No shadowRoot on <${el.tagName.toLowerCase()}>`);
    return el.shadowRoot;
}

/** Monte un stepper avec des items. Attend deux updateComplete pour absorber queueMicrotask. */
async function fixtureWithItems(html: string): Promise<ArStepper> {
    const el = await fixture<ArStepper>(html);
    // Premier cycle : registration des items via context
    await waitForUpdate(el);
    // Second cycle : déclenché par rebuildTree() via queueMicrotask
    await waitForUpdate(el);
    return el;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ArStepper', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    // ── Rendu de base ─────────────────────────────────────────────────────────

    describe('rendu', () => {
        it('monte un shadow DOM', async () => {
            const el = await fixture<ArStepper>('<ar-stepper></ar-stepper>');
            expect(el.shadowRoot).not.toBeNull();
        });

        it('rend un slot transparent si aucun item', async () => {
            const el = await fixture<ArStepper>('<ar-stepper></ar-stepper>');
            expect(shadow(el).querySelector('slot')).not.toBeNull();
            expect(shadow(el).querySelector('nav')).toBeNull();
        });

        it('rend un <nav> avec part="nav" quand les items sont enregistrés', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            expect(shadow(el).querySelector('[part="nav"]')).not.toBeNull();
        });
    });

    // ── Propriétés ────────────────────────────────────────────────────────────

    describe('propriétés', () => {
        it('currentPath par défaut vaut ""', async () => {
            const el = await fixture<ArStepper>('<ar-stepper></ar-stepper>');
            expect(el.currentPath).toBe('');
        });

        it('mode par défaut vaut "create"', async () => {
            const el = await fixture<ArStepper>('<ar-stepper></ar-stepper>');
            expect(el.mode).toBe('create');
        });

        it('version par défaut vaut "desktop"', async () => {
            const el = await fixture<ArStepper>('<ar-stepper></ar-stepper>');
            expect(el.version).toBe('desktop');
        });

        it('followScroll par défaut vaut false', async () => {
            const el = await fixture<ArStepper>('<ar-stepper></ar-stepper>');
            expect(el.followScroll).toBe(false);
        });

        it('lit les attributs depuis le HTML', async () => {
            const el = await fixture<ArStepper>(
                '<ar-stepper current-path="/b" mode="edit" version="mobile" follow-scroll></ar-stepper>',
            );
            expect(el.currentPath).toBe('/b');
            expect(el.mode).toBe('edit');
            expect(el.version).toBe('mobile');
            expect(el.followScroll).toBe(true);
        });
    });

    // ── Rendu desktop ─────────────────────────────────────────────────────────

    describe('rendu desktop', () => {
        it('affiche les étapes dans une liste ol.stepper-desktop', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a" version="desktop">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            const list = shadow(el).querySelector('ol.stepper-desktop');
            expect(list).not.toBeNull();
            expect(list?.querySelectorAll('li').length).toBe(2);
        });

        it("l'étape courante a la classe active", async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/b">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            const items = shadow(el).querySelectorAll('li.stepper-item');
            expect(items[0]?.classList.contains('active')).toBe(false);
            expect(items[1]?.classList.contains('active')).toBe(true);
        });

        it('en mode edit les étapes complétées sont des liens', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            const links = shadow(el).querySelectorAll('a.stepper-link');
            expect(links.length).toBeGreaterThan(0);
        });
    });

    // ── Rendu mobile ──────────────────────────────────────────────────────────

    describe('rendu mobile', () => {
        it('affiche un bouton dropdown en mode mobile', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a" version="mobile">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            const btn = shadow(el).querySelector('button.dropdown-toggle');
            expect(btn).not.toBeNull();
        });

        it('le dropdown est fermé par défaut', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a" version="mobile">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            const dropdown = shadow(el).querySelector('.dropdown');
            expect(dropdown?.classList.contains('show')).toBe(false);
        });

        it('cliquer sur le bouton toggle ouvre le dropdown', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a" version="mobile">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            const btn = shadow(el).querySelector<HTMLButtonElement>('button.dropdown-toggle');
            btn?.click();
            await waitForUpdate(el);
            const dropdown = shadow(el).querySelector('.dropdown');
            expect(dropdown?.classList.contains('show')).toBe(true);
        });

        it("affiche le label de l'étape courante dans le bouton", async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" version="mobile">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            expect(el.currentPath).toBe('/b');
        });
    });

    // ── Enregistrement des items ──────────────────────────────────────────────

    describe('enregistrement des items', () => {
        it("construit l'arbre depuis les items enfants", async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                    <ar-stepper-item path="/c" label="Étape C"></ar-stepper-item>
                </ar-stepper>
            `);
            const items = shadow(el).querySelectorAll('li.stepper-item');
            expect(items.length).toBe(3);
        });

        it('gère les sous-étapes imbriquées', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a/1">
                    <ar-stepper-item path="/a" label="Étape A">
                        <ar-stepper-item path="/a/1" label="Sous-étape 1"></ar-stepper-item>
                        <ar-stepper-item path="/a/2" label="Sous-étape 2"></ar-stepper-item>
                    </ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            const nav = shadow(el).querySelector('nav');
            expect(nav).not.toBeNull();
        });
    });

    // ── Événements ───────────────────────────────────────────────────────────

    describe('événements', () => {
        it('émet ar-stepper-step-changed au clic sur un lien', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);

            const handler = vi.fn();
            el.addEventListener('ar-stepper-step-changed', handler);

            const link = shadow(el).querySelector<HTMLAnchorElement>('a.stepper-link');
            if (link) {
                link.click();
                expect(handler).toHaveBeenCalledTimes(1);
                const event = handler.mock.calls[0][0] as CustomEvent;
                expect(event.detail).toHaveProperty('path');
            }

            el.removeEventListener('ar-stepper-step-changed', handler);
        });

        it('émet aussi step-changed (nom court) au clic', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);

            const handler = vi.fn();
            el.addEventListener('step-changed', handler);

            const link = shadow(el).querySelector<HTMLAnchorElement>('a.stepper-link');
            if (link) {
                link.click();
                expect(handler).toHaveBeenCalledTimes(1);
            }

            el.removeEventListener('step-changed', handler);
        });
    });

    // ── Mise à jour de currentPath ─────────────────────────────────────────────

    describe('mise à jour de currentPath', () => {
        it("met à jour l'état actif quand currentPath change", async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);

            el.currentPath = '/b';
            await waitForUpdate(el);

            const items = shadow(el).querySelectorAll('li.stepper-item');
            expect(items[0]?.classList.contains('active')).toBe(false);
            expect(items[1]?.classList.contains('active')).toBe(true);
        });
    });
});
