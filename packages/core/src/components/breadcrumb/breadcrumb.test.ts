import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArBreadcrumb } from './breadcrumb.js';
import { getPart } from '../../test-utils.js';
import './breadcrumb.js';
import '../breadcrumb-item/breadcrumb-item.js';

type LitEl = { updateComplete: Promise<boolean> };

/**
 * Double await nécessaire : le premier cycle initialise le composant, le second
 * absorbe le queueMicrotask de _scheduleRebuild déclenché par l'enregistrement
 * des ar-breadcrumb-item enfants.
 */
async function fixture(html: string): Promise<ArBreadcrumb> {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstElementChild as ArBreadcrumb;
    document.body.appendChild(el);
    await (el as unknown as LitEl).updateComplete;
    await (el as unknown as LitEl).updateComplete;
    return el;
}

async function waitForUpdate(el: ArBreadcrumb): Promise<void> {
    await (el as unknown as LitEl).updateComplete;
    await (el as unknown as LitEl).updateComplete;
}

function getShadow(el: ArBreadcrumb): ShadowRoot {
    return el.shadowRoot as ShadowRoot;
}

/** Crée un mock MediaQueryList minimal pour contrôler isMobile dans les tests. */
function mockMediaQuery(matches: boolean): MediaQueryList {
    return {
        matches,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    } as unknown as MediaQueryList;
}

describe('ArBreadcrumb', () => {
    let el: ArBreadcrumb;

    beforeEach(() => {
        // Remplace la query globale par un mock desktop par défaut.
        // Les describe imbriqués peuvent la surcharger dans leur propre beforeEach.
        ArBreadcrumb.mobileQuery = mockMediaQuery(false);
    });

    afterEach(() => el?.remove());

    // ── Rendu sans items ──────────────────────────────────────────────────────

    describe('rendu sans items', () => {
        it('monte un shadow DOM', async () => {
            el = await fixture('<ar-breadcrumb></ar-breadcrumb>');
            expect(el.shadowRoot).not.toBeNull();
        });

        it('ne rend pas de nav si aucun item enfant', async () => {
            el = await fixture('<ar-breadcrumb></ar-breadcrumb>');
            expect(getShadow(el).querySelector('nav')).toBeNull();
        });
    });

    // ── Layout desktop ────────────────────────────────────────────────────────

    describe('layout desktop (isMobile = false)', () => {
        beforeEach(() => {
            ArBreadcrumb.mobileQuery = mockMediaQuery(false);
        });

        it('affiche une liste desktop (ol.breadcrumb-desktop)', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            expect(getShadow(el).querySelector('ol.breadcrumb-desktop')).not.toBeNull();
        });

        it('ne rend pas de dropdown en mode desktop', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            expect(getPart(el, 'dropdown')).toBeNull();
        });

        it("affiche le bon nombre d'items", async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Catégorie" href="/cat"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            const items = getShadow(el).querySelectorAll('[part="item"]');
            expect(items.length).toBe(3);
        });

        it('le dernier item a part="current" et est un span', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            const current = getPart(el, 'current');
            expect(current).not.toBeNull();
            expect(current?.tagName.toLowerCase()).toBe('span');
        });

        it('le dernier item a ariaCurrent="page"', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            const items = getShadow(el).querySelectorAll('[part="item"]');
            const lastItem = items[items.length - 1] as HTMLElement;
            // Lit assigne via .ariaCurrent (propriété DOM), pas setAttribute
            expect((lastItem as unknown as { ariaCurrent: string }).ariaCurrent).toBe('page');
        });

        it('les items intermédiaires ont part="link" avec le bon href', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/accueil"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Catégorie" href="/cat"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            const links = getShadow(el).querySelectorAll('[part="link"]');
            expect(links.length).toBe(2);
            expect(links[0]?.getAttribute('href')).toBe('/accueil');
            expect(links[1]?.getAttribute('href')).toBe('/cat');
        });

        it("le premier item n'a pas aria-current", async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            const firstItem = getShadow(el).querySelector('[part="item"]');
            expect(firstItem?.hasAttribute('aria-current')).toBe(false);
        });

        it('contient un part="nav"', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            expect(getPart(el, 'nav')).not.toBeNull();
        });
    });

    // ── Layout mobile ─────────────────────────────────────────────────────────

    describe('layout mobile (isMobile = true)', () => {
        beforeEach(() => {
            ArBreadcrumb.mobileQuery = mockMediaQuery(true);
        });

        it('affiche un part="dropdown" en mode mobile', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            expect(getPart(el, 'dropdown')).not.toBeNull();
        });

        it('ne rend pas de ol.breadcrumb-desktop en mode mobile', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            expect(getShadow(el).querySelector('ol.breadcrumb-desktop')).toBeNull();
        });

        it('affiche le bouton dropdown avec id="breadcrumb-dropdown"', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            expect(getShadow(el).querySelector('#breadcrumb-dropdown')).not.toBeNull();
        });

        it('affiche le lien "retour" pointant vers le premier item', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/accueil"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            const homeBtn = getShadow(el).querySelector('#mobile-home-btn');
            expect(homeBtn?.getAttribute('href')).toBe('/accueil');
        });
    });

    // ── Dropdown mobile ───────────────────────────────────────────────────────

    describe('dropdown mobile', () => {
        beforeEach(() => {
            ArBreadcrumb.mobileQuery = mockMediaQuery(true);
        });

        it("émet ar-breadcrumb-open à l'ouverture du dropdown", async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            const handler = vi.fn();
            el.addEventListener('ar-breadcrumb-open', handler);

            const btn = getShadow(el).querySelector('#breadcrumb-dropdown') as HTMLButtonElement;
            btn.click();
            await waitForUpdate(el);

            expect(handler).toHaveBeenCalledOnce();
        });

        it('émet ar-breadcrumb-close à la fermeture du dropdown', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            const openHandler = vi.fn();
            const closeHandler = vi.fn();
            el.addEventListener('ar-breadcrumb-open', openHandler);
            el.addEventListener('ar-breadcrumb-close', closeHandler);

            const btn = getShadow(el).querySelector('#breadcrumb-dropdown') as HTMLButtonElement;
            btn.click();
            await waitForUpdate(el);
            btn.click();
            await waitForUpdate(el);

            expect(openHandler).toHaveBeenCalledOnce();
            expect(closeHandler).toHaveBeenCalledOnce();
        });

        it('ajoute la classe "show" au dropdown après ouverture', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            const btn = getShadow(el).querySelector('#breadcrumb-dropdown') as HTMLButtonElement;
            btn.click();
            await waitForUpdate(el);

            expect(getPart(el, 'dropdown')?.classList.contains('show')).toBe(true);
        });

        it('retire la classe "show" du dropdown après fermeture', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            const btn = getShadow(el).querySelector('#breadcrumb-dropdown') as HTMLButtonElement;
            btn.click();
            await waitForUpdate(el);
            btn.click();
            await waitForUpdate(el);

            expect(getPart(el, 'dropdown')?.classList.contains('show')).toBe(false);
        });
    });

    // ── Prop dark ─────────────────────────────────────────────────────────────

    describe('prop dark', () => {
        beforeEach(() => {
            ArBreadcrumb.mobileQuery = mockMediaQuery(false);
        });

        it('dark vaut false par défaut', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            expect(el.dark).toBe(false);
        });

        it('dark=true reflète l\'attribut "dark" sur le host', async () => {
            el = await fixture(`
                <ar-breadcrumb dark>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            expect(el.hasAttribute('dark')).toBe(true);
        });

        it("dark=false retire l'attribut du host", async () => {
            el = await fixture(`
                <ar-breadcrumb dark>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            el.dark = false;
            await waitForUpdate(el);
            expect(el.hasAttribute('dark')).toBe(false);
        });
    });

    // ── Mise à jour réactive ──────────────────────────────────────────────────

    describe('mise à jour réactive', () => {
        beforeEach(() => {
            ArBreadcrumb.mobileQuery = mockMediaQuery(false);
        });

        it('met à jour le rendu quand le label du dernier item change', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page A"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            const item = el.querySelector('ar-breadcrumb-item:last-child') as ArBreadcrumb;
            (item as unknown as { label: string }).label = 'Page B';
            await waitForUpdate(el);
            expect(getPart(el, 'current')?.textContent?.trim()).toBe('Page B');
        });
    });

    // ── Accessibilité ─────────────────────────────────────────────────────────

    describe('accessibilité', () => {
        beforeEach(() => {
            ArBreadcrumb.mobileQuery = mockMediaQuery(false);
        });

        it('le nav a role="navigation"', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            expect(getPart(el, 'nav')?.getAttribute('role')).toBe('navigation');
        });

        it('le nav a aria-labelledby="breadcrumb-label"', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            expect(getPart(el, 'nav')?.getAttribute('aria-labelledby')).toBe('breadcrumb-label');
        });

        it('un label sr-only "Vous êtes ici" est présent', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            const label = getShadow(el).querySelector('#breadcrumb-label');
            expect(label?.textContent?.trim()).toBe('Vous êtes ici');
        });
    });
});
