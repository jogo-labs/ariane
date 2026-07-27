import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ArStepper } from './stepper.js';
import { fixture, waitForUpdate } from '../../test-utils.js';
import './index.js';
import '../stepper-item/index.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Retourne le shadowRoot ou lance une erreur de test. */
function shadow(el: Element): ShadowRoot {
    if (!el.shadowRoot) throw new Error(`No shadowRoot on <${el.tagName.toLowerCase()}>`);
    return el.shadowRoot;
}

function requireQuery<T extends Element>(root: ParentNode, selector: string): T {
    const el = root.querySelector<T>(selector);
    if (!el) throw new Error(`Missing element for selector: ${selector}`);
    return el;
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

        it('rend part="list" sur la liste des étapes', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            expect(shadow(el).querySelector('[part="list"]')).not.toBeNull();
        });

        it('rend part="step" sur un item de premier niveau et part="substep" sur une sous-étape', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a/1">
                    <ar-stepper-item path="/a" label="Étape A">
                        <ar-stepper-item path="/a/1" label="Sous-étape 1"></ar-stepper-item>
                        <ar-stepper-item path="/a/2" label="Sous-étape 2"></ar-stepper-item>
                    </ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            const topLevel = shadow(el).querySelectorAll('[part="list"] > li[part="step"]');
            expect(topLevel.length).toBeGreaterThan(0);
            const nested = shadow(el).querySelectorAll('[part="list"] li[part="substep"]');
            expect(nested.length).toBe(2);
            // Vérifie que la sous-liste imbriquée porte bien part="list list--substep"
            const nestedList = shadow(el).querySelector('li[part="step"] > [part~="list"]');
            expect(nestedList?.getAttribute('part')).toBe('list list--substep');
        });

        it('rend part="step-link" sur le lien d\'une étape complétée, jamais sur une étape non cliquable', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            const link = shadow(el).querySelector('a[part~="step-link"]');
            // En mode edit, isGroupActive() rend "active" toujours vrai pour un step top-level
            // (tous les groupes sont navigables) : le lien porte donc aussi le part d'état
            // step-link--current — cf. le test dédié plus bas pour la variante "inactive".
            expect(link?.getAttribute('part')).toContain('step-link');
            const currentItemInner = shadow(el).querySelector('div.stepper-item-header');
            expect(currentItemInner?.hasAttribute('part')).toBe(false);
        });

        it('rend part="bullet" sur la puce de chaque étape', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            expect(shadow(el).querySelector('[part="bullet"]')).not.toBeNull();
        });

        it('rend le part d\'état "bullet--current" uniquement sur la puce de l\'étape active', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);
            const steps = shadow(el).querySelectorAll('[part="list"] > li[part="step"]');
            expect(steps.length).toBe(2);

            const bulletA = requireQuery<HTMLElement>(steps[0]!, '[part~="bullet"]');
            expect(bulletA.getAttribute('part')).toBe('bullet bullet--current');

            const bulletB = requireQuery<HTMLElement>(steps[1]!, '[part~="bullet"]');
            expect(bulletB.getAttribute('part')).toBe('bullet');
        });

        it('rend le part d\'état "step-link--current" sur le lien de la sous-étape active en mode edit', async () => {
            // Au niveau top-level, isGroupActive() rend "active" toujours vrai en mode edit
            // (tous les groupes sont navigables) : impossible d'y observer un lien "actif" vs
            // "non actif" côte à côte. Au niveau sous-étape, sub.state === 'current' est un
            // état littéral par sous-étape : c'est le seul niveau où deux liens rendus
            // simultanément peuvent différer sur ce part d'état — exactement le scénario visé
            // par le correctif (plusieurs liens actifs simultanément en mode edit).
            const el = await fixtureWithItems(`
                        <ar-stepper current-path="/a/2" mode="edit">
                            <ar-stepper-item path="/a" label="Étape A">
                                <ar-stepper-item path="/a/1" label="Sous-étape 1"></ar-stepper-item>
                                <ar-stepper-item path="/a/2" label="Sous-étape 2"></ar-stepper-item>
                            </ar-stepper-item>
                        </ar-stepper>
                    `);
            const links = shadow(el).querySelectorAll('li[part~="substep"] a[part~="step-link"]');
            expect(links.length).toBe(2);

            const link1 = [...links].find((l) => l.getAttribute('data-path') === '/a/1');
            const link2 = [...links].find((l) => l.getAttribute('data-path') === '/a/2');
            expect(link1?.getAttribute('part')).toBe('step-link');
            expect(link2?.getAttribute('part')).toBe('step-link step-link--current');
        });

        it('rend le part d\'état "bullet--current" sur la puce d\'une sous-étape active', async () => {
            const el = await fixtureWithItems(`
                        <ar-stepper current-path="/a/1">
                            <ar-stepper-item path="/a" label="Étape A">
                                <ar-stepper-item path="/a/1" label="Sous-étape 1"></ar-stepper-item>
                                <ar-stepper-item path="/a/2" label="Sous-étape 2"></ar-stepper-item>
                            </ar-stepper-item>
                        </ar-stepper>
                    `);
            const substepBullets = shadow(el).querySelectorAll(
                'li[part~="substep"] [part~="bullet"]',
            );
            expect(substepBullets.length).toBe(2);
            const [bullet1, bullet2] = substepBullets;
            expect(bullet1?.getAttribute('part')).toBe('bullet bullet--current');
            expect(bullet2?.getAttribute('part')).toBe('bullet');
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

        it('followScroll par défaut vaut false', async () => {
            const el = await fixture<ArStepper>('<ar-stepper></ar-stepper>');
            expect(el.followScroll).toBe(false);
        });

        it("version n'est plus une propriété du composant", async () => {
            const el = await fixture<ArStepper>('<ar-stepper></ar-stepper>');
            expect('version' in el).toBe(false);
        });

        it('lit les attributs depuis le HTML', async () => {
            const el = await fixture<ArStepper>(
                '<ar-stepper current-path="/b" mode="edit" follow-scroll></ar-stepper>',
            );
            expect(el.currentPath).toBe('/b');
            expect(el.mode).toBe('edit');
            expect(el.followScroll).toBe(true);
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
        it('émet ar-stepper-step-change au clic sur un lien', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);

            const handler = vi.fn();
            el.addEventListener('ar-stepper-step-change', handler);

            const link = shadow(el).querySelector<HTMLAnchorElement>('a[part~="step-link"]');
            if (link) {
                link.click();
                expect(handler).toHaveBeenCalledOnce();
                const event = handler.mock.calls[0][0] as CustomEvent;
                expect(event.detail).toHaveProperty('path');
            }

            el.removeEventListener('ar-stepper-step-change', handler);
        });

        it("n'émet plus step-changed (nom court) au clic", async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);

            const handler = vi.fn();
            el.addEventListener('step-changed', handler);

            const link = shadow(el).querySelector<HTMLAnchorElement>('a[part~="step-link"]');
            if (link) {
                link.click();
                expect(handler).not.toHaveBeenCalled();
            }

            el.removeEventListener('step-changed', handler);
        });
    });

    describe('navigation — preventDefault sur les liens sans href réel', () => {
        it("appelle preventDefault() au clic sur un lien d'étape (empêche le scroll-to-top natif)", async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);

            const link = shadow(el).querySelector<HTMLAnchorElement>('a[part~="step-link"]');
            expect(link).not.toBeNull();
            const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
            const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');

            link!.dispatchEvent(clickEvent);

            expect(preventDefaultSpy).toHaveBeenCalledOnce();
        });

        it("appelle preventDefault() quand href vaut explicitement '#' (convention documentée)", async () => {
            // La doc (ar-stepper.mdx) pose systématiquement href="#" plutôt que de l'omettre —
            // ce cas doit être traité comme décoratif au même titre qu'un href absent.
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" href="#" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);

            const link = shadow(el).querySelector<HTMLAnchorElement>('a[part~="step-link"]');
            expect(link).not.toBeNull();
            const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
            const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');

            link!.dispatchEvent(clickEvent);

            expect(preventDefaultSpy).toHaveBeenCalledOnce();
        });

        it("n'appelle pas preventDefault() quand l'étape a un href réel fourni par le consommateur", async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" href="/etape-a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);

            const link = shadow(el).querySelector<HTMLAnchorElement>('a[part~="step-link"]');
            expect(link).not.toBeNull();
            const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
            const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');

            link!.dispatchEvent(clickEvent);

            expect(preventDefaultSpy).not.toHaveBeenCalled();
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

    // ── Téléportation ─────────────────────────────────────────────────────────

    describe('téléportation', () => {
        function mockMatchMedia(matches: boolean) {
            return vi.spyOn(window, 'matchMedia').mockReturnValue({
                matches,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            } as unknown as MediaQueryList);
        }

        it('desktopTarget vaut undefined par défaut', async () => {
            const el = await fixture<ArStepper>('<ar-stepper></ar-stepper>');
            expect(el.desktopTarget).toBeUndefined();
        });

        it('desktopFrom vaut 992 par défaut', async () => {
            const el = await fixture<ArStepper>('<ar-stepper></ar-stepper>');
            expect(el.desktopFrom).toBe(992);
        });

        it('sans desktop-target : écoute le breakpoint mais ne déplace pas le composant', async () => {
            const spy = mockMatchMedia(false);
            const el = await fixture<ArStepper>('<ar-stepper></ar-stepper>');
            expect(spy).toHaveBeenCalled();
            expect(el.parentElement).toBe(document.body);
        });

        it('avec desktop-target valide + viewport desktop : téléporte dans la cible', async () => {
            mockMatchMedia(true);

            const target = document.createElement('div');
            target.id = 'sidebar';
            document.body.appendChild(target);

            const el = await fixtureWithItems(`
                <ar-stepper desktop-target="sidebar" current-path="/a">
                    <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                </ar-stepper>
            `);

            expect(el.parentElement).toBe(target);
            expect((el as unknown as { _isDesktop: boolean })._isDesktop).toBe(true);
        });

        it('avec desktop-target valide + viewport mobile : reste à sa position', async () => {
            mockMatchMedia(false);

            const target = document.createElement('div');
            target.id = 'sidebar2';
            document.body.appendChild(target);

            const container = document.createElement('div');
            document.body.appendChild(container);
            container.innerHTML = `
                <ar-stepper desktop-target="sidebar2" current-path="/a">
                    <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                </ar-stepper>
            `;
            const el = requireQuery<ArStepper>(container, 'ar-stepper');
            await waitForUpdate(el as ArStepper);

            expect(el.parentElement).toBe(container);
            expect((el as unknown as { _isDesktop: boolean })._isDesktop).toBe(false);
        });

        it('desktop-target avec ID inexistant : console.warn, composant non déplacé, rendu desktop', async () => {
            mockMatchMedia(true);
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const container = document.createElement('div');
            document.body.appendChild(container);
            container.innerHTML = `
                <ar-stepper desktop-target="inexistant" current-path="/a">
                    <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                </ar-stepper>
            `;
            const el = requireQuery<ArStepper>(container, 'ar-stepper');
            await waitForUpdate(el as ArStepper);

            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('inexistant'));
            expect(el.parentElement).toBe(container);
            // La téléportation échoue mais le rendu suit quand même le viewport
            expect((el as unknown as { _isDesktop: boolean })._isDesktop).toBe(true);
        });

        it('suppression de desktop-target après téléportation : restaure la position originale', async () => {
            mockMatchMedia(true);

            const target = document.createElement('div');
            target.id = 'sidebar-restore';
            document.body.appendChild(target);

            // fixture() appende dans document.body → _originalParent = document.body
            const el = await fixtureWithItems(`
                <ar-stepper desktop-target="sidebar-restore" current-path="/a">
                    <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                </ar-stepper>
            `);

            expect(el.parentElement).toBe(target);

            el.removeAttribute('desktop-target');
            await waitForUpdate(el);

            expect(el.parentElement).toBe(document.body);
            // Le viewport est toujours desktop → _isDesktop reste true, seule la téléportation est annulée
            expect((el as unknown as { _isDesktop: boolean })._isDesktop).toBe(true);
        });

        it('disconnectedCallback débranche le listener matchMedia', async () => {
            const removeListenerSpy = vi.fn();
            vi.spyOn(window, 'matchMedia').mockReturnValue({
                matches: false,
                addEventListener: vi.fn(),
                removeEventListener: removeListenerSpy,
            } as unknown as MediaQueryList);

            const target = document.createElement('div');
            target.id = 'sidebar3';
            document.body.appendChild(target);

            const el = await fixture<ArStepper>(
                '<ar-stepper desktop-target="sidebar3"></ar-stepper>',
            );
            el.remove();

            expect(removeListenerSpy).toHaveBeenCalledOnce();
        });
    });

    // ── Alignement ────────────────────────────────────────────────────────────

    describe('align', () => {
        it('vaut "left" par défaut', async () => {
            const el = await fixture<ArStepper>(`<ar-stepper></ar-stepper>`);
            expect(el.align).toBe('left');
        });

        it('est réfléchi comme attribut HTML', async () => {
            const el = await fixture<ArStepper>(`<ar-stepper align="right"></ar-stepper>`);
            expect(el.getAttribute('align')).toBe('right');
            expect(el.align).toBe('right');
        });
    });

    describe('rendu responsive', () => {
        it('sans desktop-target + viewport mobile : rendu dropdown', async () => {
            vi.spyOn(window, 'matchMedia').mockReturnValue({
                matches: false,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            } as unknown as MediaQueryList);

            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="B"></ar-stepper-item>
                </ar-stepper>
            `);

            expect(shadow(el).querySelector('.stepper-dropdown')).not.toBeNull();
            expect(shadow(el).querySelector('.stepper-desktop')).toBeNull();
        });

        it('sans desktop-target + viewport desktop : rendu liste desktop sans téléportation', async () => {
            vi.spyOn(window, 'matchMedia').mockReturnValue({
                matches: true,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            } as unknown as MediaQueryList);

            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="B"></ar-stepper-item>
                </ar-stepper>
            `);

            expect(shadow(el).querySelector('.stepper-desktop')).not.toBeNull();
            expect(shadow(el).querySelector('.stepper-dropdown')).toBeNull();
            // Pas de téléportation : reste dans document.body (où fixture() l'a inséré)
            expect(el.parentElement).toBe(document.body);
        });

        it('avec desktop-target + viewport mobile : rend le dropdown mobile', async () => {
            vi.spyOn(window, 'matchMedia').mockReturnValue({
                matches: false,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            } as unknown as MediaQueryList);

            const target = document.createElement('div');
            target.id = 'sidebar-mobile';
            document.body.appendChild(target);

            const el = await fixtureWithItems(`
                <ar-stepper desktop-target="sidebar-mobile" current-path="/a">
                    <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="B"></ar-stepper-item>
                </ar-stepper>
            `);

            expect(shadow(el).querySelector('.stepper-dropdown')).not.toBeNull();
            expect(shadow(el).querySelector('.stepper-desktop')).toBeNull();
        });

        it('avec desktop-target + viewport desktop : rend la liste desktop', async () => {
            vi.spyOn(window, 'matchMedia').mockReturnValue({
                matches: true,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            } as unknown as MediaQueryList);

            const target = document.createElement('div');
            target.id = 'sidebar-desktop';
            document.body.appendChild(target);

            const el = await fixtureWithItems(`
                <ar-stepper desktop-target="sidebar-desktop" current-path="/a">
                    <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="B"></ar-stepper-item>
                </ar-stepper>
            `);

            expect(shadow(el).querySelector('.stepper-desktop')).not.toBeNull();
            expect(shadow(el).querySelector('.stepper-dropdown')).toBeNull();
        });

        it('réinsère le composant à sa position d’origine quand le viewport repasse en mobile', async () => {
            let matches = true;
            let listener: ((event: MediaQueryListEvent) => void) | undefined;
            vi.spyOn(window, 'matchMedia').mockReturnValue({
                get matches() {
                    return matches;
                },
                addEventListener: vi.fn((_type, cb) => {
                    listener = cb as (event: MediaQueryListEvent) => void;
                }),
                removeEventListener: vi.fn(),
            } as unknown as MediaQueryList);

            const target = document.createElement('div');
            target.id = 'sidebar-roundtrip';
            document.body.appendChild(target);

            const marker = document.createElement('div');
            marker.id = 'marker';

            const container = document.createElement('div');
            document.body.append(container);
            container.append(marker);
            container.insertAdjacentHTML(
                'beforeend',
                `
                    <ar-stepper desktop-target="sidebar-roundtrip" current-path="/a">
                        <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                        <ar-stepper-item path="/b" label="B"></ar-stepper-item>
                    </ar-stepper>
                `,
            );

            const el = document.querySelector('ar-stepper') as ArStepper;
            await waitForUpdate(el);
            await waitForUpdate(el);

            matches = false;
            listener?.({ matches: false } as MediaQueryListEvent);
            await waitForUpdate(el);

            expect(el.parentElement).toBe(container);
            expect(marker.nextElementSibling).toBe(el);
            expect(shadow(el).querySelector('.stepper-dropdown')).not.toBeNull();
        });
    });

    // ── Attribut open ─────────────────────────────────────────────────────────

    describe('attribut open', () => {
        it('vaut false par défaut', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="B"></ar-stepper-item>
                </ar-stepper>
            `);
            expect(el.open).toBe(false);
            expect(el.hasAttribute('open')).toBe(false);
        });

        it('est reflété comme attribut HTML quand posé programmatiquement', async () => {
            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="B"></ar-stepper-item>
                </ar-stepper>
            `);
            el.open = true;
            await waitForUpdate(el);

            expect(el.open).toBe(true);
            expect(el.hasAttribute('open')).toBe(true);
        });

        it("open=true n'a pas d'effet en mode desktop", async () => {
            vi.spyOn(window, 'matchMedia').mockReturnValue({
                matches: true,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            } as unknown as MediaQueryList);

            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="B"></ar-stepper-item>
                </ar-stepper>
            `);
            el.open = true;
            await waitForUpdate(el);

            expect(el.open).toBe(true);
            expect(shadow(el).querySelector('[part="trigger"]')).toBeNull();
        });
    });

    // ── Annonces a11y ─────────────────────────────────────────────────────────

    describe('annonces a11y', () => {
        afterEach(() => {
            document.querySelectorAll('[data-ar-live-region]').forEach((node) => node.remove());
        });

        it('un clic sur une étape de premier niveau annonce son label', async () => {
            vi.spyOn(window, 'matchMedia').mockReturnValue({
                matches: true,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            } as unknown as MediaQueryList);

            const el = await fixtureWithItems(`
                <ar-stepper current-path="/b" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);

            const link = shadow(el).querySelector<HTMLAnchorElement>('a[data-path="/a"]');
            if (!link) throw new Error('Lien vers /a introuvable');
            link.click();
            await new Promise((resolve) => setTimeout(resolve, 60));

            expect(document.getElementById('ar-live-region-polite')?.textContent).toBe('Étape A');
        });

        it('un clic sur une sous-étape annonce son label (branche flatMap)', async () => {
            vi.spyOn(window, 'matchMedia').mockReturnValue({
                matches: true,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            } as unknown as MediaQueryList);

            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a" mode="edit">
                    <ar-stepper-item path="/a" label="Étape A">
                        <ar-stepper-item path="/a/1" label="Sous-étape 1"></ar-stepper-item>
                        <ar-stepper-item path="/a/2" label="Sous-étape 2"></ar-stepper-item>
                    </ar-stepper-item>
                    <ar-stepper-item path="/b" label="Étape B"></ar-stepper-item>
                </ar-stepper>
            `);

            const link = shadow(el).querySelector<HTMLAnchorElement>('a[data-path="/a/2"]');
            if (!link) throw new Error('Lien vers /a/2 introuvable');
            link.click();
            await new Promise((resolve) => setTimeout(resolve, 60));

            expect(document.getElementById('ar-live-region-polite')?.textContent).toBe(
                'Sous-étape 2',
            );
        });
    });

    describe('warn() — desktop-target introuvable', () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('émet un warn si desktop-target pointe vers un ID inexistant', async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const el = await fixture<ArStepper>(
                '<ar-stepper desktop-target="conteneur-inexistant"></ar-stepper>',
            );
            (el as unknown as Record<string, () => void>)['_teleportToTarget']?.();

            expect(spy).toHaveBeenCalled();
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('[ar-stepper]'));
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('conteneur-inexistant'));
        });
    });

    describe('régressions change-in-update', () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        it("ne déclenche pas de warning Lit 'change-in-update' lors de l'enregistrement des items", async () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="B"></ar-stepper-item>
                    <ar-stepper-item path="/c" label="C"></ar-stepper-item>
                </ar-stepper>
            `);

            expect(
                spy.mock.calls
                    .flat()
                    .filter((v) => typeof v === 'string')
                    .some((v) => v.includes('scheduled an update')),
            ).toBe(false);
        });

        it("ne déclenche pas de warning Lit 'change-in-update' lors du toggle open en mode mobile", async () => {
            vi.spyOn(window, 'matchMedia').mockReturnValue({
                matches: false,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            } as unknown as MediaQueryList);

            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const el = await fixtureWithItems(`
                <ar-stepper current-path="/a">
                    <ar-stepper-item path="/a" label="A"></ar-stepper-item>
                    <ar-stepper-item path="/b" label="B"></ar-stepper-item>
                </ar-stepper>
            `);

            el.open = true;
            await waitForUpdate(el);
            el.open = false;
            await waitForUpdate(el);

            expect(
                spy.mock.calls
                    .flat()
                    .filter((v) => typeof v === 'string')
                    .some((v) => v.includes('scheduled an update')),
            ).toBe(false);
        });
    });
});
