import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArBreadcrumb } from './breadcrumb.js';
import { getPart, mockPopoverPanel } from '../../test-utils.js';
import './index.js';
import '../breadcrumb-item/index.js';

// LocalizeController résout la langue via document.documentElement.lang, avec
// navigator.language comme secours (happy-dom retourne 'en-US' par défaut).
// En production, le site de doc pose lang="fr" sur <html> ; on reproduit ça ici
// pour que les assertions FR par défaut restent valides sans lang explicite.
document.documentElement.lang = 'fr';

type LitEl = { updateComplete: Promise<boolean> };

/** Attend le rendu des items enfants : leur état de rendu est poussé par le parent, ils sont des éléments Lit à part entière. */
async function settleItems(el: ArBreadcrumb): Promise<void> {
    await Promise.all(
        [...el.querySelectorAll('ar-breadcrumb-item')].map(
            (item) => (item as unknown as LitEl).updateComplete,
        ),
    );
}

/**
 * Double await nécessaire : le premier cycle initialise le composant, le second
 * absorbe le queueMicrotask de _scheduleRebuild déclenché par l'enregistrement
 * des ar-breadcrumb-item enfants ; puis on attend le rendu de chaque item.
 */
async function fixture(html: string): Promise<ArBreadcrumb> {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const el = template.content.firstElementChild as ArBreadcrumb;
    document.body.appendChild(el);
    await (el as unknown as LitEl).updateComplete;
    await (el as unknown as LitEl).updateComplete;
    await settleItems(el);
    return el;
}

async function waitForUpdate(el: ArBreadcrumb): Promise<void> {
    await (el as unknown as LitEl).updateComplete;
    await (el as unknown as LitEl).updateComplete;
    await settleItems(el);
}

function itemsOf(el: ArBreadcrumb): HTMLElement[] {
    return [...el.querySelectorAll<HTMLElement>('ar-breadcrumb-item')];
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

        it("affiche une liste desktop (part='list list--desktop')", async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            const list = getShadow(el).querySelector('[part~="list--desktop"]');
            expect(list).not.toBeNull();
            expect(list?.tagName.toLowerCase()).toBe('div');
            expect(list?.getAttribute('role')).toBe('list');
        });

        it('ne rend pas de dropdown en mode desktop', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            expect(getPart(el, 'trigger')).toBeNull();
        });

        it('la liste desktop contient un slot pour les items', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            const list = getShadow(el).querySelector('[part~="list--desktop"]');
            expect(list?.querySelector('slot')).not.toBeNull();
        });

        it('pousse un rôle listitem à chaque item', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Catégorie" href="/cat"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            itemsOf(el).forEach((item) => expect(item.getAttribute('role')).toBe('listitem'));
        });

        it('seul le dernier item porte aria-current="page"', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Catégorie" href="/cat"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            const items = itemsOf(el);
            expect(items[0]?.hasAttribute('aria-current')).toBe(false);
            expect(items[1]?.hasAttribute('aria-current')).toBe(false);
            expect(items[2]?.getAttribute('aria-current')).toBe('page');
        });

        it('chaque item rend son contenu dans son propre shadow DOM', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/accueil"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Catégorie" href="/cat"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            const items = itemsOf(el);
            expect(getPart(items[0]!, 'link')?.getAttribute('href')).toBe('/accueil');
            expect(getPart(items[1]!, 'link')?.getAttribute('href')).toBe('/cat');
            expect(getPart(items[2]!, 'current')?.textContent?.trim()).toBe('Page courante');
        });

        it('desktop : pas de séparateur avant le premier item, un séparateur avant les suivants', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Catégorie" href="/cat"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            const items = itemsOf(el);
            expect(getPart(items[0]!, 'separator')).toBeNull();
            expect(getPart(items[1]!, 'separator')).not.toBeNull();
            expect(getPart(items[2]!, 'separator')).not.toBeNull();
        });

        it('contient un part="breadcrumb"', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            expect(getPart(el, 'breadcrumb')).not.toBeNull();
        });
    });

    // ── Layout mobile ─────────────────────────────────────────────────────────

    describe('layout mobile (isMobile = true)', () => {
        beforeEach(() => {
            ArBreadcrumb.mobileQuery = mockMediaQuery(true);
        });

        it('affiche un part="trigger" en mode mobile', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            expect(getPart(el, 'trigger')).not.toBeNull();
        });

        it('le lien home reçoit le href posé après le montage sur le premier item', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            (itemsOf(el)[0] as unknown as { href: string }).href = '/x';
            await new Promise((resolve) => setTimeout(resolve, 0));
            await waitForUpdate(el);
            expect(getPart(el, 'home')?.getAttribute('href')).toBe('/x');
        });

        it("le lien home n'a pas d'attribut href quand le premier item n'en a pas", async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            expect(getPart(el, 'home')?.hasAttribute('href')).toBe(false);
        });

        it("ne rend pas de part='list--desktop' en mode mobile", async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            expect(getShadow(el).querySelector('[part~="list--desktop"]')).toBeNull();
        });

        it("affiche la liste mobile (part='list list--mobile')", async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            expect(getShadow(el).querySelector('[part~="list--mobile"]')).not.toBeNull();
        });

        it("affiche le bouton dropdown avec part='trigger'", async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            expect(getPart(el, 'trigger')).not.toBeNull();
        });

        it('affiche le lien "retour" (part="home") pointant vers le premier item', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/accueil"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            const homeBtn = getPart(el, 'home');
            expect(homeBtn?.getAttribute('href')).toBe('/accueil');
        });

        it('la liste mobile contient un slot pour les items', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            const list = getShadow(el).querySelector('[part~="list--mobile"]');
            expect(list?.querySelector('slot')).not.toBeNull();
        });

        it('le premier item est masqué (le bouton home le remplace), les autres non', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Catégorie" href="/cat"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            const items = itemsOf(el);
            expect(items[0]?.hasAttribute('hidden')).toBe(true);
            expect(items[0]?.shadowRoot?.querySelector('.item')).toBeNull();
            expect(items[1]?.hasAttribute('hidden')).toBe(false);
            expect(getPart(items[1]!, 'indicator')).not.toBeNull();
            expect(getPart(items[2]!, 'indicator')?.getAttribute('part')).toBe(
                'indicator indicator--current',
            );
        });

        it('mobile : le panel porte un unique part="connector", pas un par item', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Catégorie" href="/cat"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Sous-catégorie" href="/cat/sub"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            const panel = getShadow(el).querySelector('[part="panel"]');
            const connectors = panel?.querySelectorAll('[part="connector"]');
            expect(connectors?.length).toBe(1);
            expect(connectors?.[0]?.getAttribute('aria-hidden')).toBe('true');
            itemsOf(el).forEach((item) => expect(getPart(item, 'connector')).toBeNull());
        });

        it('desktop : ne rend pas de part="connector"', async () => {
            ArBreadcrumb.mobileQuery = mockMediaQuery(false);
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            expect(getShadow(el).querySelector('[part="connector"]')).toBeNull();
        });
    });

    // ── Dropdown mobile ───────────────────────────────────────────────────────

    describe('dropdown mobile', () => {
        beforeEach(() => {
            ArBreadcrumb.mobileQuery = mockMediaQuery(true);
        });

        it("émet ar-breadcrumb-show à l'ouverture du dropdown", async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            mockPopoverPanel(el);
            const handler = vi.fn();
            el.addEventListener('ar-breadcrumb-show', handler);

            const btn = getShadow(el).querySelector('[part="trigger"]') as HTMLButtonElement;
            btn.click();
            await waitForUpdate(el);

            expect(handler).toHaveBeenCalledOnce();
        });

        it('émet ar-breadcrumb-hide à la fermeture du dropdown', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            mockPopoverPanel(el);
            const showHandler = vi.fn();
            const hideHandler = vi.fn();
            el.addEventListener('ar-breadcrumb-show', showHandler);
            el.addEventListener('ar-breadcrumb-hide', hideHandler);

            const btn = getShadow(el).querySelector('[part="trigger"]') as HTMLButtonElement;
            btn.click();
            await waitForUpdate(el);
            btn.click();
            await waitForUpdate(el);

            expect(showHandler).toHaveBeenCalledOnce();
            expect(hideHandler).toHaveBeenCalledOnce();
        });

        it('open vaut false par défaut', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            mockPopoverPanel(el);
            expect(el.open).toBe(false);
            expect(el.hasAttribute('open')).toBe(false);
        });

        it('open est reflété comme attribut HTML après clic', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            mockPopoverPanel(el);
            const btn = getShadow(el).querySelector('[part="trigger"]') as HTMLButtonElement;
            btn.click();
            await waitForUpdate(el);

            expect(el.open).toBe(true);
            expect(el.hasAttribute('open')).toBe(true);
        });

        it('open=true programmatique émet ar-breadcrumb-show', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            mockPopoverPanel(el);
            const handler = vi.fn();
            el.addEventListener('ar-breadcrumb-show', handler);

            el.open = true;
            await waitForUpdate(el);

            expect(handler).toHaveBeenCalledOnce();
        });

        it('open=false programmatique émet ar-breadcrumb-hide', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            mockPopoverPanel(el);
            const btn = getShadow(el).querySelector('[part="trigger"]') as HTMLButtonElement;
            btn.click();
            await waitForUpdate(el);

            const handler = vi.fn();
            el.addEventListener('ar-breadcrumb-hide', handler);
            el.open = false;
            await waitForUpdate(el);

            expect(handler).toHaveBeenCalledOnce();
        });

        it('émet ar-breadcrumb-shown après ar-breadcrumb-show, avec le bon detail.id', async () => {
            el = await fixture(`
                <ar-breadcrumb id="my-breadcrumb">
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            mockPopoverPanel(el);
            const order: string[] = [];
            el.addEventListener('ar-breadcrumb-show', () => order.push('show'));
            const shownHandler = vi.fn(() => order.push('shown'));
            const shownPromise = new Promise<void>((resolve) => {
                el.addEventListener('ar-breadcrumb-shown', () => resolve(), { once: true });
            });
            el.addEventListener('ar-breadcrumb-shown', shownHandler);

            const btn = getShadow(el).querySelector('[part="trigger"]') as HTMLButtonElement;
            btn.click();
            await shownPromise;

            expect(order).toEqual(['show', 'shown']);
            expect(shownHandler).toHaveBeenCalledOnce();
            const event = shownHandler.mock.calls[0][0] as CustomEvent;
            expect(event.detail).toEqual({ id: 'my-breadcrumb' });
        });

        it("preventDefault() sur ar-breadcrumb-show bloque l'ouverture", async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            mockPopoverPanel(el);
            el.addEventListener('ar-breadcrumb-show', (e) => e.preventDefault());

            const btn = getShadow(el).querySelector('[part="trigger"]') as HTMLButtonElement;
            btn.click();
            await waitForUpdate(el);

            expect(el.open).toBe(false);
        });

        it('preventDefault() sur ar-breadcrumb-hide bloque la fermeture', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            mockPopoverPanel(el);
            const btn = getShadow(el).querySelector('[part="trigger"]') as HTMLButtonElement;
            btn.click();
            await waitForUpdate(el);

            el.addEventListener('ar-breadcrumb-hide', (e) => e.preventDefault());
            btn.click();
            await waitForUpdate(el);

            expect(el.open).toBe(true);
        });

        it("n'émet pas ar-breadcrumb-hide/-hidden quand ar-breadcrumb-show est annulé", async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            mockPopoverPanel(el);
            el.addEventListener('ar-breadcrumb-show', (e) => e.preventDefault());
            const hideHandler = vi.fn();
            const hiddenHandler = vi.fn();
            el.addEventListener('ar-breadcrumb-hide', hideHandler);
            el.addEventListener('ar-breadcrumb-hidden', hiddenHandler);

            el.open = true;
            await waitForUpdate(el);
            await waitForUpdate(el);

            expect(hideHandler).not.toHaveBeenCalled();
            expect(hiddenHandler).not.toHaveBeenCalled();
        });

        it("n'émet pas ar-breadcrumb-show/-shown quand ar-breadcrumb-hide est annulé", async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            mockPopoverPanel(el);
            const btn = getShadow(el).querySelector('[part="trigger"]') as HTMLButtonElement;
            btn.click();
            await waitForUpdate(el);

            el.addEventListener('ar-breadcrumb-hide', (e) => e.preventDefault());
            const showHandler = vi.fn();
            const shownHandler = vi.fn();
            el.addEventListener('ar-breadcrumb-show', showHandler);
            el.addEventListener('ar-breadcrumb-shown', shownHandler);

            el.open = false;
            await waitForUpdate(el);
            await waitForUpdate(el);

            expect(showHandler).not.toHaveBeenCalled();
            expect(shownHandler).not.toHaveBeenCalled();
        });

        it('émet ar-breadcrumb-show-prevented (non cancelable) quand ar-breadcrumb-show est annulé', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            mockPopoverPanel(el);
            el.addEventListener('ar-breadcrumb-show', (e) => e.preventDefault());
            let event: CustomEvent | undefined;
            el.addEventListener('ar-breadcrumb-show-prevented', (e) => {
                event = e as CustomEvent;
            });
            el.open = true;
            await waitForUpdate(el);
            await waitForUpdate(el);
            expect(event).toBeDefined();
            expect(event?.cancelable).toBe(false);
        });

        it('émet ar-breadcrumb-hide-prevented (non cancelable) quand ar-breadcrumb-hide est annulé', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            mockPopoverPanel(el);
            const btn = getShadow(el).querySelector('[part="trigger"]') as HTMLButtonElement;
            btn.click();
            await waitForUpdate(el);
            el.addEventListener('ar-breadcrumb-hide', (e) => e.preventDefault());
            let event: CustomEvent | undefined;
            el.addEventListener('ar-breadcrumb-hide-prevented', (e) => {
                event = e as CustomEvent;
            });
            btn.click();
            await waitForUpdate(el);
            await waitForUpdate(el);
            expect(event).toBeDefined();
            expect(event?.cancelable).toBe(false);
        });
    });

    // ── Attribut open (desktop) ───────────────────────────────────────────────

    describe('attribut open — mode desktop', () => {
        beforeEach(() => {
            ArBreadcrumb.mobileQuery = mockMediaQuery(false);
        });

        it("open=true n'émet pas d'événement en mode desktop", async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            const handler = vi.fn();
            el.addEventListener('ar-breadcrumb-show', handler);

            el.open = true;
            await waitForUpdate(el);

            expect(handler).not.toHaveBeenCalled();
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
            const last = itemsOf(el)[1]!;
            (last as unknown as { label: string }).label = 'Page B';
            await waitForUpdate(el);
            expect(getPart(last, 'current')?.textContent?.trim()).toBe('Page B');
        });
    });

    // ── Slot separator ────────────────────────────────────────────────────────

    describe('slot separator', () => {
        beforeEach(() => {
            ArBreadcrumb.mobileQuery = mockMediaQuery(false);
        });

        const withSeparator = `
            <ar-breadcrumb>
                <span slot="separator">›</span>
                <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                <ar-breadcrumb-item label="Catégorie" href="/cat"></ar-breadcrumb-item>
                <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
            </ar-breadcrumb>
        `;

        it('affiche « / » par défaut entre les items', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            expect(getPart(itemsOf(el)[1]!, 'separator')?.textContent?.trim()).toBe('/');
        });

        it('clone le contenu du slot dans chaque item sauf le premier', async () => {
            el = await fixture(withSeparator);
            const items = itemsOf(el);
            expect(getPart(items[0]!, 'separator')).toBeNull();
            expect(getPart(items[1]!, 'separator')?.textContent?.trim()).toBe('›');
            expect(getPart(items[2]!, 'separator')?.textContent?.trim()).toBe('›');
        });

        it("laisse le nœud modèle dans le light DOM d'ar-breadcrumb", async () => {
            el = await fixture(withSeparator);
            const source = el.querySelector(':scope > [slot="separator"]');
            expect(source?.parentElement).toBe(el);
            expect(source?.textContent).toBe('›');
        });

        it('suit une mutation du contenu du séparateur', async () => {
            el = await fixture(withSeparator);
            const source = el.querySelector(':scope > [slot="separator"]') as HTMLElement;
            source.textContent = '»';
            await new Promise((resolve) => setTimeout(resolve, 0));
            await waitForUpdate(el);
            expect(getPart(itemsOf(el)[1]!, 'separator')?.textContent?.trim()).toBe('»');
        });

        it('ne re-clone pas le séparateur quand on ajoute un item ordinaire', async () => {
            el = await fixture(withSeparator);
            const before = getPart(itemsOf(el)[1]!, 'separator')?.firstElementChild;
            expect(before).toBeTruthy();
            const extra = document.createElement('ar-breadcrumb-item');
            extra.setAttribute('label', 'Extra');
            el.appendChild(extra);
            await new Promise((resolve) => setTimeout(resolve, 0));
            await waitForUpdate(el);
            const after = getPart(itemsOf(el)[1]!, 'separator')?.firstElementChild;
            expect(after).toBe(before);
        });

        it("ne re-clone pas le séparateur quand l'attribut slot d'un item ordinaire change", async () => {
            el = await fixture(withSeparator);
            const before = getPart(itemsOf(el)[1]!, 'separator')?.firstElementChild;
            expect(before).toBeTruthy();
            itemsOf(el)[2]!.setAttribute('slot', 'autre');
            await new Promise((resolve) => setTimeout(resolve, 0));
            await waitForUpdate(el);
            expect(getPart(itemsOf(el)[1]!, 'separator')?.firstElementChild).toBe(before);
        });

        it('retombe sur « / » quand slot="separator" est retiré du nœud modèle', async () => {
            el = await fixture(withSeparator);
            el.querySelector(':scope > [slot="separator"]')?.setAttribute('slot', 'autre');
            await new Promise((resolve) => setTimeout(resolve, 0));
            await waitForUpdate(el);
            expect(getPart(itemsOf(el)[1]!, 'separator')?.textContent?.trim()).toBe('/');
        });

        it('retombe sur « / » quand le nœud séparateur est retiré', async () => {
            el = await fixture(withSeparator);
            el.querySelector(':scope > [slot="separator"]')?.remove();
            await new Promise((resolve) => setTimeout(resolve, 0));
            await waitForUpdate(el);
            expect(getPart(itemsOf(el)[1]!, 'separator')?.textContent?.trim()).toBe('/');
        });

        it("n'affiche pas le séparateur en mobile (indicateur à la place)", async () => {
            ArBreadcrumb.mobileQuery = mockMediaQuery(true);
            el = await fixture(withSeparator);
            const items = itemsOf(el);
            expect(getPart(items[1]!, 'separator')).toBeNull();
            expect(getPart(items[1]!, 'indicator')).not.toBeNull();
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
            expect(getPart(el, 'breadcrumb')?.getAttribute('role')).toBe('navigation');
        });

        it('le nav a aria-labelledby="breadcrumb-label"', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            expect(getPart(el, 'breadcrumb')?.getAttribute('aria-labelledby')).toBe(
                'breadcrumb-label',
            );
        });

        it('un label sr-only "Vous êtes ici" est présent', async () => {
            el = await fixture(`
                <ar-breadcrumb>
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            const label = getShadow(el).querySelector('#breadcrumb-label');
            expect(label?.textContent).toBe('Vous êtes ici');
        });
    });

    describe('traduction', () => {
        it('lang="en" traduit le label de navigation', async () => {
            document.body.innerHTML = `
            <ar-breadcrumb lang="en">
                <ar-breadcrumb-item href="/" label="Home"></ar-breadcrumb-item>
                <ar-breadcrumb-item label="Current"></ar-breadcrumb-item>
            </ar-breadcrumb>`;
            const el = document.querySelector('ar-breadcrumb') as ArBreadcrumb & LitEl;
            await el.updateComplete;
            const label = el.shadowRoot?.querySelector('#breadcrumb-label');
            expect(label?.textContent).toBe('You are here');
        });

        it('lang="en" traduit le texte du trigger mobile', async () => {
            ArBreadcrumb.mobileQuery = mockMediaQuery(true);
            document.body.innerHTML = `
            <ar-breadcrumb lang="en">
                <ar-breadcrumb-item href="/" label="Home"></ar-breadcrumb-item>
                <ar-breadcrumb-item label="Current"></ar-breadcrumb-item>
            </ar-breadcrumb>`;
            const el = document.querySelector('ar-breadcrumb') as ArBreadcrumb & LitEl;
            await el.updateComplete;
            const trigger = el.shadowRoot?.querySelector('[part="trigger"] .sr-only');
            expect(trigger?.textContent).toBe('Show breadcrumb');
        });
    });
});
