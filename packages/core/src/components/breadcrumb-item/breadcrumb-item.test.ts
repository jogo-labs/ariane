import { afterEach, describe, expect, it, vi } from 'vitest';
import { type MrBreadcrumbItem } from './breadcrumb-item.js';
import { fixture, waitForUpdate } from '../../test-utils.js';
import './breadcrumb-item.js';

describe('MrBreadcrumbItem', () => {
    let el: MrBreadcrumbItem;

    afterEach(() => el?.remove());

    // ── Rendu ─────────────────────────────────────────────────────────────────

    describe('rendu', () => {
        it("n'a pas de shadow DOM (createRenderRoot retourne this)", async () => {
            el = await fixture('<mr-breadcrumb-item label="Accueil"></mr-breadcrumb-item>');
            expect(el.shadowRoot).toBeNull();
        });
    });

    // ── Valeurs par défaut ────────────────────────────────────────────────────

    describe('valeurs par défaut', () => {
        it('label vaut une chaîne vide par défaut', async () => {
            el = await fixture('<mr-breadcrumb-item></mr-breadcrumb-item>');
            expect(el.label).toBe('');
        });

        it('href est undefined par défaut', async () => {
            el = await fixture('<mr-breadcrumb-item></mr-breadcrumb-item>');
            expect(el.href).toBeUndefined();
        });
    });

    // ── Propriétés ────────────────────────────────────────────────────────────

    describe('propriétés', () => {
        it("lit label depuis l'attribut HTML", async () => {
            el = await fixture('<mr-breadcrumb-item label="Mon label"></mr-breadcrumb-item>');
            expect(el.label).toBe('Mon label');
        });

        it("lit href depuis l'attribut HTML", async () => {
            el = await fixture(
                '<mr-breadcrumb-item label="Accueil" href="/accueil"></mr-breadcrumb-item>',
            );
            expect(el.href).toBe('/accueil');
        });

        it('met à jour label via la propriété JS', async () => {
            el = await fixture('<mr-breadcrumb-item></mr-breadcrumb-item>');
            el.label = 'Nouveau label';
            await waitForUpdate(el);
            expect(el.label).toBe('Nouveau label');
        });

        it('met à jour href via la propriété JS', async () => {
            el = await fixture('<mr-breadcrumb-item></mr-breadcrumb-item>');
            el.href = '/nouveau';
            await waitForUpdate(el);
            expect(el.href).toBe('/nouveau');
        });
    });

    // ── setRegistry ───────────────────────────────────────────────────────────

    describe('setRegistry', () => {
        it('appelle registerItem lors du premier enregistrement', async () => {
            el = await fixture('<mr-breadcrumb-item label="Accueil"></mr-breadcrumb-item>');
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
            el = await fixture('<mr-breadcrumb-item label="Accueil"></mr-breadcrumb-item>');
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
            el = await fixture('<mr-breadcrumb-item label="Accueil"></mr-breadcrumb-item>');
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
            el = await fixture('<mr-breadcrumb-item label="Accueil"></mr-breadcrumb-item>');
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
                '<mr-breadcrumb-item label="Accueil" href="/accueil"></mr-breadcrumb-item>',
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
            // Pas d'appel à setRegistry — ne doit pas planter
            el = await fixture('<mr-breadcrumb-item label="Accueil"></mr-breadcrumb-item>');
            el.label = 'Autre';
            await waitForUpdate(el);
            // Si on arrive ici sans exception, le test passe
            expect(el.label).toBe('Autre');
        });
    });
});
