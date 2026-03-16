import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MrBreadcrumb } from './breadcrumb.js';
import { getPart } from '../../test-utils.js';
import './breadcrumb.js';
import '../breadcrumb-item/breadcrumb-item.js';

type LitEl = { updateComplete: Promise<boolean> };

/**
 * Double await nécessaire : le premier cycle initialise le composant, le second
 * absorbe le queueMicrotask de _scheduleRebuild déclenché par l'enregistrement
 * des mr-breadcrumb-item enfants.
 */
async function fixture(html: string): Promise<MrBreadcrumb> {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstElementChild as MrBreadcrumb;
    document.body.appendChild(el);
    await (el as unknown as LitEl).updateComplete;
    await (el as unknown as LitEl).updateComplete;
    return el;
}

async function waitForUpdate(el: MrBreadcrumb): Promise<void> {
    await (el as unknown as LitEl).updateComplete;
    await (el as unknown as LitEl).updateComplete;
}

function getShadow(el: MrBreadcrumb): ShadowRoot {
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

describe('MrBreadcrumb', () => {
    let el: MrBreadcrumb;

    beforeEach(() => {
        // Remplace la query globale par un mock desktop par défaut.
        // Les describe imbriqués peuvent la surcharger dans leur propre beforeEach.
        MrBreadcrumb.mobileQuery = mockMediaQuery(false);
    });

    afterEach(() => el?.remove());

    // ── Rendu sans items ──────────────────────────────────────────────────────

    describe('rendu sans items', () => {
        it('monte un shadow DOM', async () => {
            el = await fixture('<mr-breadcrumb></mr-breadcrumb>');
            expect(el.shadowRoot).not.toBeNull();
        });

        it('ne rend pas de nav si aucun item enfant', async () => {
            el = await fixture('<mr-breadcrumb></mr-breadcrumb>');
            expect(getShadow(el).querySelector('nav')).toBeNull();
        });
    });

    // ── Layout desktop ────────────────────────────────────────────────────────

    describe('layout desktop (isMobile = false)', () => {
        beforeEach(() => {
            MrBreadcrumb.mobileQuery = mockMediaQuery(false);
        });

        it('affiche une liste desktop (ol.breadcrumb-desktop)', async () => {
            el = await fixture(`
                <mr-breadcrumb>
                    <mr-breadcrumb-item label="Accueil" href="/"></mr-breadcrumb-item>
                    <mr-breadcrumb-item label="Page courante"></mr-breadcrumb-item>
                </mr-breadcrumb>
            `);
            expect(getShadow(el).querySelector('ol.breadcrumb-desktop')).not.toBeNull();
        });

        it('ne rend pas de dropdown en mode desktop', async () => {
            el = await fixture(`
                <mr-breadcrumb>
                    <mr-breadcrumb-item label="Accueil" href="/"></mr-breadcrumb-item>
                    <mr-breadcrumb-item label="Page courante"></mr-breadcrumb-item>
                </mr-breadcrumb>
            `);
            expect(getPart(el, 'dropdown')).toBeNull();
        });

        it("affiche le bon nombre d'items", async () => {
            el = await fixture(`
                <mr-breadcrumb>
                    <mr-breadcrumb-item label="Accueil" href="/"></mr-breadcrumb-item>
                    <mr-breadcrumb-item label="Catégorie" href="/cat"></mr-breadcrumb-item>
                    <mr-breadcrumb-item label="Page courante"></mr-breadcrumb-item>
                </mr-breadcrumb>
            `);
            const items = getShadow(el).querySelectorAll('[part="item"]');
            expect(items.length).toBe(3);
        });

        it('le dernier item a part="current" et est un span', async () => {
            el = await fixture(`
                <mr-breadcrumb>
                    <mr-breadcrumb-item label="Accueil" href="/"></mr-breadcrumb-item>
                    <mr-breadcrumb-item label="Page courante"></mr-breadcrumb-item>
                </mr-breadcrumb>
            `);
            const current = getPart(el, 'current');
            expect(current).not.toBeNull();
            expect(current?.tagName.toLowerCase()).toBe('span');
        });

        it('le dernier item a ariaCurrent="page"', async () => {
            el = await fixture(`
                <mr-breadcrumb>
                    <mr-breadcrumb-item label="Accueil" href="/"></mr-breadcrumb-item>
                    <mr-breadcrumb-item label="Page courante"></mr-breadcrumb-item>
                </mr-breadcrumb>
            `);
            const items = getShadow(el).querySelectorAll('[part="item"]');
            const lastItem = items[items.length - 1] as HTMLElement;
            // Lit assigne via .ariaCurrent (propriété DOM), pas setAttribute
            expect((lastItem as unknown as { ariaCurrent: string }).ariaCurrent).toBe('page');
        });

        it('les items intermédiaires ont part="link" avec le bon href', async () => {
            el = await fixture(`
                <mr-breadcrumb>
                    <mr-breadcrumb-item label="Accueil" href="/accueil"></mr-breadcrumb-item>
                    <mr-breadcrumb-item label="Catégorie" href="/cat"></mr-breadcrumb-item>
                    <mr-breadcrumb-item label="Page courante"></mr-breadcrumb-item>
                </mr-breadcrumb>
            `);
            const links = getShadow(el).querySelectorAll('[part="link"]');
            expect(links.length).toBe(2);
            expect(links[0]?.getAttribute('href')).toBe('/accueil');
            expect(links[1]?.getAttribute('href')).toBe('/cat');
        });

        it("le premier item n'a pas aria-current", async () => {
            el = await fixture(`
                <mr-breadcrumb>
                    <mr-breadcrumb-item label="Accueil" href="/"></mr-breadcrumb-item>
                    <mr-breadcrumb-item label="Page courante"></mr-breadcrumb-item>
                </mr-breadcrumb>
            `);
            const firstItem = getShadow(el).querySelector('[part="item"]');
            expect(firstItem?.hasAttribute('aria-current')).toBe(false);
        });

        it('contient un part="nav"', async () => {
            el = await fixture(`
                <mr-breadcrumb>
                    <mr-breadcrumb-item label="Accueil" href="/"></mr-breadcrumb-item>
                    <mr-breadcrumb-item label="Page courante"></mr-breadcrumb-item>
                </mr-breadcrumb>
            `);
            expect(getPart(el, 'nav')).not.toBeNull();
        });
    });

    // ── Layout mobile ─────────────────────────────────────────────────────────

    describe('layout mobile (isMobile = true)', () => {
        beforeEach(() => {
            MrBreadcrumb.mobileQuery = mockMediaQuery(true);
        });

        it('affiche un part="dropdown" en mode mobile', async () => {
            el = await fixture(`
                <mr-breadcrumb>
                    <mr-breadcrumb-item label="Accueil" href="/"></mr-breadcrumb-item>
                    <mr-breadcrumb-item label="Page courante"></mr-breadcrumb-item>
                </mr-breadcrumb>
            `);
            expect(getPart(el, 'dropdown')).not.toBeNull();
        });

        it('ne rend pas de ol.breadcrumb-desktop en mode mobile', async () => {
            el = await fixture(`
                <mr-breadcrumb>
                    <mr-breadcrumb-item label="Accueil" href="/"></mr-breadcrumb-item>
                    <mr-breadcrumb-item label="Page courante"></mr-breadcrumb-item>
                </mr-breadcrumb>
            `);
            expect(getShadow(el).querySelector('ol.breadcrumb-desktop')).toBeNull();
        });

        it('affiche le bouton dropdown avec id="breadcrumb-dropdown"', async () => {
            el = await fixture(`
                <mr-breadcrumb>
                    <mr-breadcrumb-item label="Accueil" href="/"></mr-breadcrumb-item>
                    <mr-breadcrumb-item label="Page courante"></mr-breadcrumb-item>
                </mr-breadcrumb>
            `);
            expect(getShadow(el).querySelector('#breadcrumb-dropdown')).not.toBeNull();
        });

        it('affiche le lien "retour" pointant vers le premier item', async () => {
            el = await fixture(`
                <mr-breadcrumb>
                    <mr-breadcrumb-item label="Accueil" href="/accueil"></mr-breadcrumb-item>
                    <mr-breadcrumb-item label="Page courante"></mr-breadcrumb-item>
                </mr-breadcrumb>
            `);
            const homeBtn = getShadow(el).querySelector('#mobile-home-btn');
            expect(homeBtn?.getAttribute('href')).toBe('/accueil');
        });
    });

    // ── Dropdown mobile ───────────────────────────────────────────────────────

    describe('dropdown mobile', () => {
        beforeEach(() => {
            MrBreadcrumb.mobileQuery = mockMediaQuery(true);
        });

        it("émet mr-breadcrumb-open à l'ouverture du dropdown", async () => {
            el = await fixture(`
                <mr-breadcrumb>
                    <mr-breadcrumb-item label="Accueil" href="/"></mr-breadcrumb-item>
                    <mr-breadcrumb-item label="Page courante"></mr-breadcrumb-item>
                </mr-breadcrumb>
            `);
            const handler = vi.fn();
            el.addEventListener('mr-breadcrumb-open', handler);

            const btn = getShadow(el).querySelector('#breadcrumb-dropdown') as HTMLButtonElement;
            btn.click();
            await waitForUpdate(el);

            expect(handler).toHaveBeenCalledOnce();
        });

        it('émet mr-breadcrumb-close à la fermeture du dropdown', async () => {
            el = await fixture(`
                <mr-breadcrumb>
                    <mr-breadcrumb-item label="Accueil" href="/"></mr-breadcrumb-item>
                    <mr-breadcrumb-item label="Page courante"></mr-breadcrumb-item>
                </mr-breadcrumb>
            `);
            const openHandler = vi.fn();
            const closeHandler = vi.fn();
            el.addEventListener('mr-breadcrumb-open', openHandler);
            el.addEventListener('mr-breadcrumb-close', closeHandler);

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
                <mr-breadcrumb>
                    <mr-breadcrumb-item label="Accueil" href="/"></mr-breadcrumb-item>
                    <mr-breadcrumb-item label="Page courante"></mr-breadcrumb-item>
                </mr-breadcrumb>
            `);
            const btn = getShadow(el).querySelector('#breadcrumb-dropdown') as HTMLButtonElement;
            btn.click();
            await waitForUpdate(el);

            expect(getPart(el, 'dropdown')?.classList.contains('show')).toBe(true);
        });

        it('retire la classe "show" du dropdown après fermeture', async () => {
            el = await fixture(`
                <mr-breadcrumb>
                    <mr-breadcrumb-item label="Accueil" href="/"></mr-breadcrumb-item>
                    <mr-breadcrumb-item label="Page courante"></mr-breadcrumb-item>
                </mr-breadcrumb>
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
            MrBreadcrumb.mobileQuery = mockMediaQuery(false);
        });

        it('dark vaut false par défaut', async () => {
            el = await fixture(`
                <mr-breadcrumb>
                    <mr-breadcrumb-item label="Accueil" href="/"></mr-breadcrumb-item>
                    <mr-breadcrumb-item label="Page courante"></mr-breadcrumb-item>
                </mr-breadcrumb>
            `);
            expect(el.dark).toBe(false);
        });

        it('dark=true reflète l\'attribut "dark" sur le host', async () => {
            el = await fixture(`
                <mr-breadcrumb dark>
                    <mr-breadcrumb-item label="Accueil" href="/"></mr-breadcrumb-item>
                    <mr-breadcrumb-item label="Page courante"></mr-breadcrumb-item>
                </mr-breadcrumb>
            `);
            expect(el.hasAttribute('dark')).toBe(true);
        });

        it("dark=false retire l'attribut du host", async () => {
            el = await fixture(`
                <mr-breadcrumb dark>
                    <mr-breadcrumb-item label="Accueil" href="/"></mr-breadcrumb-item>
                    <mr-breadcrumb-item label="Page courante"></mr-breadcrumb-item>
                </mr-breadcrumb>
            `);
            el.dark = false;
            await waitForUpdate(el);
            expect(el.hasAttribute('dark')).toBe(false);
        });
    });

    // ── Mise à jour réactive ──────────────────────────────────────────────────

    describe('mise à jour réactive', () => {
        beforeEach(() => {
            MrBreadcrumb.mobileQuery = mockMediaQuery(false);
        });

        it('met à jour le rendu quand le label du dernier item change', async () => {
            el = await fixture(`
                <mr-breadcrumb>
                    <mr-breadcrumb-item label="Accueil" href="/"></mr-breadcrumb-item>
                    <mr-breadcrumb-item label="Page A"></mr-breadcrumb-item>
                </mr-breadcrumb>
            `);
            const item = el.querySelector('mr-breadcrumb-item:last-child') as MrBreadcrumb;
            (item as unknown as { label: string }).label = 'Page B';
            await waitForUpdate(el);
            expect(getPart(el, 'current')?.textContent?.trim()).toBe('Page B');
        });
    });

    // ── Accessibilité ─────────────────────────────────────────────────────────

    describe('accessibilité', () => {
        beforeEach(() => {
            MrBreadcrumb.mobileQuery = mockMediaQuery(false);
        });

        it('le nav a role="navigation"', async () => {
            el = await fixture(`
                <mr-breadcrumb>
                    <mr-breadcrumb-item label="Accueil" href="/"></mr-breadcrumb-item>
                    <mr-breadcrumb-item label="Page courante"></mr-breadcrumb-item>
                </mr-breadcrumb>
            `);
            expect(getPart(el, 'nav')?.getAttribute('role')).toBe('navigation');
        });

        it('le nav a aria-labelledby="breadcrumb-label"', async () => {
            el = await fixture(`
                <mr-breadcrumb>
                    <mr-breadcrumb-item label="Accueil" href="/"></mr-breadcrumb-item>
                    <mr-breadcrumb-item label="Page courante"></mr-breadcrumb-item>
                </mr-breadcrumb>
            `);
            expect(getPart(el, 'nav')?.getAttribute('aria-labelledby')).toBe('breadcrumb-label');
        });

        it('un label sr-only "Vous êtes ici" est présent', async () => {
            el = await fixture(`
                <mr-breadcrumb>
                    <mr-breadcrumb-item label="Accueil" href="/"></mr-breadcrumb-item>
                    <mr-breadcrumb-item label="Page courante"></mr-breadcrumb-item>
                </mr-breadcrumb>
            `);
            const label = getShadow(el).querySelector('#breadcrumb-label');
            expect(label?.textContent?.trim()).toBe('Vous êtes ici');
        });
    });
});
