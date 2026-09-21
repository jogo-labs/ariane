import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ArBreadcrumbItem } from './breadcrumb-item.js';
import { fixture, getPart, waitForUpdate } from '../../test-utils.js';
import './index.js';

describe('ArBreadcrumbItem', () => {
    let el: ArBreadcrumbItem;

    afterEach(() => el?.remove());

    // ── Rendu ─────────────────────────────────────────────────────────────────

    describe('rendu', () => {
        it('a un shadow DOM', async () => {
            el = await fixture('<ar-breadcrumb-item label="Accueil"></ar-breadcrumb-item>');
            expect(el.shadowRoot).not.toBeNull();
        });

        it("ne rend rien tant qu'il n'a pas reçu d'état de rendu", async () => {
            el = await fixture(
                '<ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>',
            );
            expect(el.shadowRoot?.querySelector('.item')).toBeNull();
            expect(getPart(el, 'link')).toBeNull();
        });

        it('rend un lien part="link" avec le bon href quand il est intermédiaire', async () => {
            el = await fixture(
                '<ar-breadcrumb-item label="Catégorie" href="/cat"></ar-breadcrumb-item>',
            );
            el.setRenderState({
                isFirst: false,
                isCurrent: false,
                isMobile: false,
                hasPrevious: true,
                hasNext: false,
                separator: undefined,
                separatorVersion: 0,
            });
            await waitForUpdate(el);
            const link = getPart(el, 'link');
            expect(link?.tagName.toLowerCase()).toBe('a');
            expect(link?.getAttribute('href')).toBe('/cat');
            expect(link?.textContent?.trim()).toBe('Catégorie');
        });

        it("n'a pas d'attribut href sur le lien quand href est absent", async () => {
            el = await fixture('<ar-breadcrumb-item label="Catégorie"></ar-breadcrumb-item>');
            el.setRenderState({
                isFirst: false,
                isCurrent: false,
                isMobile: false,
                hasPrevious: true,
                hasNext: false,
                separator: undefined,
                separatorVersion: 0,
            });
            await waitForUpdate(el);
            const link = getPart(el, 'link');
            expect(link).not.toBeNull();
            expect(link?.hasAttribute('href')).toBe(false);
        });

        it('rend un span part="current" (pas un lien) quand il est le dernier', async () => {
            el = await fixture(
                '<ar-breadcrumb-item label="Page courante" href="/x"></ar-breadcrumb-item>',
            );
            el.setRenderState({
                isFirst: false,
                isCurrent: true,
                isMobile: false,
                hasPrevious: true,
                hasNext: false,
                separator: undefined,
                separatorVersion: 0,
            });
            await waitForUpdate(el);
            const current = getPart(el, 'current');
            expect(current?.tagName.toLowerCase()).toBe('span');
            expect(current?.textContent?.trim()).toBe('Page courante');
            expect(getPart(el, 'link')).toBeNull();
        });

        it('desktop : rend un séparateur part="separator" sauf sur le premier item', async () => {
            el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
            el.setRenderState({
                isFirst: true,
                isCurrent: false,
                isMobile: false,
                hasPrevious: false,
                hasNext: false,
                separator: undefined,
                separatorVersion: 0,
            });
            await waitForUpdate(el);
            expect(getPart(el, 'separator')).toBeNull();

            el.setRenderState({
                isFirst: false,
                isCurrent: false,
                isMobile: false,
                hasPrevious: true,
                hasNext: false,
                separator: undefined,
                separatorVersion: 0,
            });
            await waitForUpdate(el);
            expect(getPart(el, 'separator')).not.toBeNull();
            expect(getPart(el, 'separator')?.getAttribute('aria-hidden')).toBe('true');
        });

        it("mobile : rend un indicateur à la place du séparateur, avec la variante d'état sur le dernier", async () => {
            el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
            el.setRenderState({
                isFirst: false,
                isCurrent: false,
                isMobile: true,
                hasPrevious: true,
                hasNext: false,
                separator: undefined,
                separatorVersion: 0,
            });
            await waitForUpdate(el);
            expect(getPart(el, 'separator')).toBeNull();
            expect(getPart(el, 'indicator')?.getAttribute('part')).toBe('indicator');
            // aria-hidden est porté par la colonne décorative qui contient l'indicateur.
            expect(getPart(el, 'indicator')?.parentElement?.getAttribute('aria-hidden')).toBe(
                'true',
            );

            el.setRenderState({
                isFirst: false,
                isCurrent: true,
                isMobile: true,
                hasPrevious: true,
                hasNext: false,
                separator: undefined,
                separatorVersion: 0,
            });
            await waitForUpdate(el);
            expect(getPart(el, 'indicator')?.getAttribute('part')).toBe(
                'indicator indicator--current',
            );
        });

        it('mobile : le premier item ne rend rien et porte hidden', async () => {
            el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
            el.setRenderState({
                isFirst: true,
                isCurrent: false,
                isMobile: true,
                hasPrevious: false,
                hasNext: false,
                separator: undefined,
                separatorVersion: 0,
            });
            await waitForUpdate(el);
            expect(el.shadowRoot?.querySelector('.item')).toBeNull();
            expect(el.hasAttribute('hidden')).toBe(true);
        });

        it('desktop : le premier item ne porte pas hidden', async () => {
            el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
            el.setRenderState({
                isFirst: true,
                isCurrent: false,
                isMobile: false,
                hasPrevious: false,
                hasNext: false,
                separator: undefined,
                separatorVersion: 0,
            });
            await waitForUpdate(el);
            expect(el.hasAttribute('hidden')).toBe(false);
        });

        it('desktop : le séparateur par défaut est un « / » visible', async () => {
            el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
            el.setRenderState({
                isFirst: false,
                isCurrent: false,
                isMobile: false,
                hasPrevious: true,
                hasNext: false,
                separator: undefined,
                separatorVersion: 0,
            });
            await waitForUpdate(el);
            expect(getPart(el, 'separator')?.textContent?.trim()).toBe('/');
        });

        it('desktop : clone le nœud séparateur fourni, sans le déplacer ni garder son attribut slot', async () => {
            el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
            const source = document.createElement('span');
            source.setAttribute('slot', 'separator');
            source.textContent = '›';
            el.setRenderState({
                isFirst: false,
                isCurrent: false,
                isMobile: false,
                hasPrevious: true,
                hasNext: false,
                separator: source,
                separatorVersion: 1,
            });
            await waitForUpdate(el);

            const rendered = getPart(el, 'separator');
            expect(rendered?.textContent?.trim()).toBe('›');
            const clone = rendered?.firstElementChild as HTMLElement;
            expect(clone).not.toBe(source);
            expect(clone.hasAttribute('slot')).toBe(false);
            expect(source.getAttribute('slot')).toBe('separator');
        });

        it('re-clone quand la version du séparateur change', async () => {
            el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
            const source = document.createElement('span');
            source.textContent = '›';
            const base = {
                isFirst: false,
                isCurrent: false,
                isMobile: false,
                hasPrevious: true,
                hasNext: false,
                separator: source,
            };
            el.setRenderState({ ...base, separatorVersion: 1 });
            await waitForUpdate(el);
            expect(getPart(el, 'separator')?.textContent?.trim()).toBe('›');

            source.textContent = '»';
            el.setRenderState({ ...base, separatorVersion: 2 });
            await waitForUpdate(el);
            expect(getPart(el, 'separator')?.textContent?.trim()).toBe('»');
        });

        it('retombe sur « / » quand le nœud séparateur disparaît', async () => {
            el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
            const source = document.createElement('span');
            source.textContent = '›';
            el.setRenderState({
                isFirst: false,
                isCurrent: false,
                isMobile: false,
                hasPrevious: true,
                hasNext: false,
                separator: source,
                separatorVersion: 1,
            });
            await waitForUpdate(el);
            el.setRenderState({
                isFirst: false,
                isCurrent: false,
                isMobile: false,
                hasPrevious: true,
                hasNext: false,
                separator: undefined,
                separatorVersion: 2,
            });
            await waitForUpdate(el);
            expect(getPart(el, 'separator')?.textContent?.trim()).toBe('/');
        });

        it("mobile : encadre l'indicateur de deux segments, dans une colonne décorative", async () => {
            el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
            el.setRenderState({
                isFirst: false,
                isCurrent: false,
                isMobile: true,
                hasPrevious: true,
                hasNext: true,
                separator: undefined,
                separatorVersion: 0,
            });
            await waitForUpdate(el);
            const indicator = getPart(el, 'indicator')!;
            const rail = indicator.parentElement!;
            expect(rail.getAttribute('aria-hidden')).toBe('true');
            expect([...rail.children]).toHaveLength(3);
            expect(rail.children[1]).toBe(indicator);
        });

        it('mobile : un voisin de chaque côté donne deux segments part="connector"', async () => {
            el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
            el.setRenderState({
                isFirst: false,
                isCurrent: false,
                isMobile: true,
                hasPrevious: true,
                hasNext: true,
                separator: undefined,
                separatorVersion: 0,
            });
            await waitForUpdate(el);
            const rail = getPart(el, 'indicator')!.parentElement!;
            expect(rail.children[0]?.getAttribute('part')).toBe('connector');
            expect(rail.children[2]?.getAttribute('part')).toBe('connector');
        });

        it("mobile : le premier item visible n'a pas de segment connecteur au-dessus", async () => {
            el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
            el.setRenderState({
                isFirst: false,
                isCurrent: false,
                isMobile: true,
                hasPrevious: false,
                hasNext: true,
                separator: undefined,
                separatorVersion: 0,
            });
            await waitForUpdate(el);
            const rail = getPart(el, 'indicator')!.parentElement!;
            expect(rail.children[0]?.hasAttribute('part')).toBe(false);
            expect(rail.children[2]?.getAttribute('part')).toBe('connector');
        });

        it("mobile : le dernier item visible n'a pas de segment connecteur en dessous", async () => {
            el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
            el.setRenderState({
                isFirst: false,
                isCurrent: true,
                isMobile: true,
                hasPrevious: true,
                hasNext: false,
                separator: undefined,
                separatorVersion: 0,
            });
            await waitForUpdate(el);
            const rail = getPart(el, 'indicator')!.parentElement!;
            expect(rail.children[0]?.getAttribute('part')).toBe('connector');
            expect(rail.children[2]?.hasAttribute('part')).toBe(false);
        });

        it('mobile : un item visible sans voisin visible a un indicateur mais pas de connecteur', async () => {
            el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
            el.setRenderState({
                isFirst: false,
                isCurrent: false,
                isMobile: true,
                hasPrevious: false,
                hasNext: false,
                separator: undefined,
                separatorVersion: 0,
            });
            await waitForUpdate(el);
            expect(getPart(el, 'indicator')).not.toBeNull();
            expect(getPart(el, 'connector')).toBeNull();
        });

        it('desktop : ne rend pas de connecteur', async () => {
            el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
            el.setRenderState({
                isFirst: false,
                isCurrent: false,
                isMobile: false,
                hasPrevious: true,
                hasNext: false,
                separator: undefined,
                separatorVersion: 0,
            });
            await waitForUpdate(el);
            expect(getPart(el, 'connector')).toBeNull();
        });
    });

    // ── Attributs d'hôte ──────────────────────────────────────────────────────

    describe("attributs d'hôte", () => {
        it('pose role="listitem"', async () => {
            el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
            el.setRenderState({
                isFirst: true,
                isCurrent: false,
                isMobile: false,
                hasPrevious: false,
                hasNext: false,
                separator: undefined,
                separatorVersion: 0,
            });
            await waitForUpdate(el);
            expect(el.getAttribute('role')).toBe('listitem');
        });

        it('pose role="listitem" dès la connexion, avant tout rendu', () => {
            el = document.createElement('ar-breadcrumb-item') as ArBreadcrumbItem;
            document.body.appendChild(el);
            expect(el.getAttribute('role')).toBe('listitem');
        });

        it('pose aria-current="page" sur le dernier item seulement', async () => {
            el = await fixture('<ar-breadcrumb-item label="A"></ar-breadcrumb-item>');
            el.setRenderState({
                isFirst: false,
                isCurrent: true,
                isMobile: false,
                hasPrevious: true,
                hasNext: false,
                separator: undefined,
                separatorVersion: 0,
            });
            await waitForUpdate(el);
            expect(el.getAttribute('aria-current')).toBe('page');

            el.setRenderState({
                isFirst: false,
                isCurrent: false,
                isMobile: false,
                hasPrevious: true,
                hasNext: false,
                separator: undefined,
                separatorVersion: 0,
            });
            await waitForUpdate(el);
            expect(el.hasAttribute('aria-current')).toBe(false);
        });
    });

    // ── Valeurs par défaut ────────────────────────────────────────────────────

    describe('valeurs par défaut', () => {
        it('label vaut une chaîne vide par défaut', async () => {
            el = await fixture('<ar-breadcrumb-item></ar-breadcrumb-item>');
            expect(el.label).toBe('');
        });

        it('href est undefined par défaut', async () => {
            el = await fixture('<ar-breadcrumb-item></ar-breadcrumb-item>');
            expect(el.href).toBeUndefined();
        });
    });

    // ── Propriétés ────────────────────────────────────────────────────────────

    describe('propriétés', () => {
        it("lit label depuis l'attribut HTML", async () => {
            el = await fixture('<ar-breadcrumb-item label="Mon label"></ar-breadcrumb-item>');
            expect(el.label).toBe('Mon label');
        });

        it("lit href depuis l'attribut HTML", async () => {
            el = await fixture(
                '<ar-breadcrumb-item label="Accueil" href="/accueil"></ar-breadcrumb-item>',
            );
            expect(el.href).toBe('/accueil');
        });

        it('met à jour label via la propriété JS', async () => {
            el = await fixture('<ar-breadcrumb-item></ar-breadcrumb-item>');
            el.label = 'Nouveau label';
            await waitForUpdate(el);
            expect(el.label).toBe('Nouveau label');
        });

        it('met à jour href via la propriété JS', async () => {
            el = await fixture('<ar-breadcrumb-item></ar-breadcrumb-item>');
            el.href = '/nouveau';
            await waitForUpdate(el);
            expect(el.href).toBe('/nouveau');
        });
    });

    // ── setRegistry ───────────────────────────────────────────────────────────

    describe('setRegistry', () => {
        it('appelle registerItem lors du premier enregistrement', async () => {
            el = await fixture('<ar-breadcrumb-item label="Accueil"></ar-breadcrumb-item>');
            const registry = {
                registerItem: vi.fn(),
                unregisterItem: vi.fn(),
                notifyItemChanged: vi.fn(),
            };
            el.setRegistry(registry);
            expect(registry.registerItem).toHaveBeenCalledOnce();
            expect(registry.registerItem).toHaveBeenCalledWith(el);
        });

        it("appelle unregisterItem sur l'ancien registry avant de s'enregistrer dans le nouveau", async () => {
            el = await fixture('<ar-breadcrumb-item label="Accueil"></ar-breadcrumb-item>');
            const registry1 = {
                registerItem: vi.fn(),
                unregisterItem: vi.fn(),
                notifyItemChanged: vi.fn(),
            };
            const registry2 = {
                registerItem: vi.fn(),
                unregisterItem: vi.fn(),
                notifyItemChanged: vi.fn(),
            };

            el.setRegistry(registry1);
            el.setRegistry(registry2);

            expect(registry1.unregisterItem).toHaveBeenCalledOnce();
            expect(registry1.unregisterItem).toHaveBeenCalledWith(el);
            expect(registry2.registerItem).toHaveBeenCalledOnce();
            expect(registry2.registerItem).toHaveBeenCalledWith(el);
        });
    });

    // ── disconnectedCallback ──────────────────────────────────────────────────

    describe('disconnectedCallback', () => {
        it('appelle unregisterItem lors du retrait du DOM', async () => {
            el = await fixture('<ar-breadcrumb-item label="Accueil"></ar-breadcrumb-item>');
            const registry = {
                registerItem: vi.fn(),
                unregisterItem: vi.fn(),
                notifyItemChanged: vi.fn(),
            };
            el.setRegistry(registry);
            el.remove();
            expect(registry.unregisterItem).toHaveBeenCalledOnce();
            expect(registry.unregisterItem).toHaveBeenCalledWith(el);
        });
    });

    // ── Notification lors des changements de props ────────────────────────────

    describe('notification des changements', () => {
        it("appelle notifyItemChanged quand label change après l'init", async () => {
            el = await fixture('<ar-breadcrumb-item label="Accueil"></ar-breadcrumb-item>');
            const registry = {
                registerItem: vi.fn(),
                unregisterItem: vi.fn(),
                notifyItemChanged: vi.fn(),
            };
            el.setRegistry(registry);
            // Premier updated() déclenché à la registration — on reset le compteur
            registry.notifyItemChanged.mockClear();

            el.label = 'Nouveau label';
            await waitForUpdate(el);
            expect(registry.notifyItemChanged).toHaveBeenCalledOnce();
        });

        it("appelle notifyItemChanged quand href change après l'init", async () => {
            el = await fixture(
                '<ar-breadcrumb-item label="Accueil" href="/accueil"></ar-breadcrumb-item>',
            );
            const registry = {
                registerItem: vi.fn(),
                unregisterItem: vi.fn(),
                notifyItemChanged: vi.fn(),
            };
            el.setRegistry(registry);
            registry.notifyItemChanged.mockClear();

            el.href = '/nouveau';
            await waitForUpdate(el);
            expect(registry.notifyItemChanged).toHaveBeenCalledOnce();
        });

        it("ne notifie pas si aucun registry n'est défini", async () => {
            el = await fixture('<ar-breadcrumb-item label="Accueil"></ar-breadcrumb-item>');
            expect(() => {
                el.label = 'Autre';
            }).not.toThrow();
            await waitForUpdate(el);
        });

        it('notifie quand href passe de undefined à une valeur après le premier rendu', async () => {
            el = await fixture('<ar-breadcrumb-item label="Accueil"></ar-breadcrumb-item>');
            const registry = {
                registerItem: vi.fn(),
                unregisterItem: vi.fn(),
                notifyItemChanged: vi.fn(),
            };
            el.setRegistry(registry);
            registry.notifyItemChanged.mockClear();

            el.href = '/x';
            await waitForUpdate(el);
            expect(registry.notifyItemChanged).toHaveBeenCalledOnce();
        });

        it('ne notifie pas pendant le rendu initial', async () => {
            const registry = {
                registerItem: vi.fn(),
                unregisterItem: vi.fn(),
                notifyItemChanged: vi.fn(),
            };
            el = document.createElement('ar-breadcrumb-item') as ArBreadcrumbItem;
            el.label = 'Accueil';
            el.href = '/';
            el.setRegistry(registry);
            document.body.appendChild(el);
            await waitForUpdate(el);
            expect(registry.notifyItemChanged).not.toHaveBeenCalled();
        });
    });

    // ── hidden et role appartenant à l'auteur ─────────────────────────────────

    describe('hidden et role', () => {
        const desktop = {
            isFirst: false,
            isCurrent: false,
            isMobile: false,
            hasPrevious: true,
            hasNext: false,
            separator: undefined,
            separatorVersion: 0,
        };

        it("conserve un hidden posé par l'auteur lors des mises à jour", async () => {
            el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
            el.setRenderState(desktop);
            await waitForUpdate(el);
            el.hidden = true;
            el.label = 'B';
            await waitForUpdate(el);
            expect(el.hasAttribute('hidden')).toBe(true);
        });

        it('masque le premier item en mobile puis retire hidden en desktop', async () => {
            el = await fixture('<ar-breadcrumb-item label="A" href="/a"></ar-breadcrumb-item>');
            el.setRenderState({ ...desktop, isFirst: true, isMobile: true, hasPrevious: false });
            await waitForUpdate(el);
            expect(el.hasAttribute('hidden')).toBe(true);

            el.setRenderState({ ...desktop, isFirst: true, hasPrevious: false });
            await waitForUpdate(el);
            expect(el.hasAttribute('hidden')).toBe(false);
        });

        it("garde le role posé par l'auteur", async () => {
            el = await fixture('<ar-breadcrumb-item role="none" label="A"></ar-breadcrumb-item>');
            expect(el.getAttribute('role')).toBe('none');
        });

        it('pose role="listitem" par défaut', async () => {
            el = await fixture('<ar-breadcrumb-item label="A"></ar-breadcrumb-item>');
            expect(el.getAttribute('role')).toBe('listitem');
        });
    });
});
