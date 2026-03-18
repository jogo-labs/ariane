import { afterEach, describe, expect, it, vi } from 'vitest';
import { type ArStepperItem } from './stepper-item.js';
import { fixture, waitForUpdate } from '../../test-utils.js';
import './stepper-item.js';

describe('ArStepperItem', () => {
    let el: ArStepperItem;

    afterEach(() => el?.remove());

    // ── Rendu ─────────────────────────────────────────────────────────────────

    describe('rendu', () => {
        it("n'a pas de shadow DOM (createRenderRoot retourne this)", async () => {
            el = await fixture(
                '<ar-stepper-item label="Étape 1" path="/step-1"></ar-stepper-item>',
            );
            expect(el.shadowRoot).toBeNull();
        });
    });

    // ── Valeurs par défaut ────────────────────────────────────────────────────

    describe('valeurs par défaut', () => {
        it('path vaut une chaîne vide par défaut', async () => {
            el = await fixture('<ar-stepper-item></ar-stepper-item>');
            expect(el.path).toBe('');
        });

        it('label vaut une chaîne vide par défaut', async () => {
            el = await fixture('<ar-stepper-item></ar-stepper-item>');
            expect(el.label).toBe('');
        });

        it('href est undefined par défaut', async () => {
            el = await fixture('<ar-stepper-item></ar-stepper-item>');
            expect(el.href).toBeUndefined();
        });
    });

    // ── Propriétés ────────────────────────────────────────────────────────────

    describe('propriétés', () => {
        it("lit path depuis l'attribut HTML", async () => {
            el = await fixture('<ar-stepper-item path="/mon-chemin"></ar-stepper-item>');
            expect(el.path).toBe('/mon-chemin');
        });

        it("lit label depuis l'attribut HTML", async () => {
            el = await fixture('<ar-stepper-item label="Mon étape"></ar-stepper-item>');
            expect(el.label).toBe('Mon étape');
        });

        it("lit href depuis l'attribut HTML", async () => {
            el = await fixture('<ar-stepper-item href="/lien"></ar-stepper-item>');
            expect(el.href).toBe('/lien');
        });

        it('met à jour path via la propriété JS', async () => {
            el = await fixture('<ar-stepper-item path="/a"></ar-stepper-item>');
            el.path = '/b';
            await waitForUpdate(el);
            expect(el.path).toBe('/b');
        });

        it('met à jour label via la propriété JS', async () => {
            el = await fixture('<ar-stepper-item label="Avant"></ar-stepper-item>');
            el.label = 'Après';
            await waitForUpdate(el);
            expect(el.label).toBe('Après');
        });

        it('met à jour href via la propriété JS', async () => {
            el = await fixture('<ar-stepper-item></ar-stepper-item>');
            el.href = '/nouveau';
            await waitForUpdate(el);
            expect(el.href).toBe('/nouveau');
        });
    });

    // ── setRegistry ───────────────────────────────────────────────────────────

    describe('setRegistry', () => {
        it('appelle registerItem lors du premier enregistrement', async () => {
            el = await fixture('<ar-stepper-item path="/a" label="A"></ar-stepper-item>');
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
            el = await fixture('<ar-stepper-item path="/a" label="A"></ar-stepper-item>');
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
            el = await fixture('<ar-stepper-item path="/a" label="A"></ar-stepper-item>');
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

        it("ne plante pas si aucun registry n'est défini", async () => {
            el = await fixture('<ar-stepper-item path="/a"></ar-stepper-item>');
            // Pas d'appel à setRegistry — remove() ne doit pas lever d'exception
            expect(() => el.remove()).not.toThrow();
        });
    });

    // ── Notification lors des changements de props ────────────────────────────

    describe('notification des changements', () => {
        it('appelle notifyItemChanged avec "path" quand path change après l\'init', async () => {
            el = await fixture('<ar-stepper-item path="/a" label="A"></ar-stepper-item>');
            const registry = {
                registerItem: vi.fn(),
                unregisterItem: vi.fn(),
                notifyItemChanged: vi.fn(),
            };
            el.setRegistry(registry);
            registry.notifyItemChanged.mockClear();

            el.path = '/b';
            await waitForUpdate(el);
            expect(registry.notifyItemChanged).toHaveBeenCalledOnce();
            expect(registry.notifyItemChanged).toHaveBeenCalledWith(el, 'path');
        });

        it('appelle notifyItemChanged avec "label" quand label change après l\'init', async () => {
            el = await fixture('<ar-stepper-item path="/a" label="Avant"></ar-stepper-item>');
            const registry = {
                registerItem: vi.fn(),
                unregisterItem: vi.fn(),
                notifyItemChanged: vi.fn(),
            };
            el.setRegistry(registry);
            registry.notifyItemChanged.mockClear();

            el.label = 'Après';
            await waitForUpdate(el);
            expect(registry.notifyItemChanged).toHaveBeenCalledOnce();
            expect(registry.notifyItemChanged).toHaveBeenCalledWith(el, 'label');
        });

        it('appelle notifyItemChanged avec "href" quand href change après l\'init', async () => {
            el = await fixture('<ar-stepper-item path="/a" href="/lien-a"></ar-stepper-item>');
            const registry = {
                registerItem: vi.fn(),
                unregisterItem: vi.fn(),
                notifyItemChanged: vi.fn(),
            };
            el.setRegistry(registry);
            registry.notifyItemChanged.mockClear();

            el.href = '/lien-b';
            await waitForUpdate(el);
            expect(registry.notifyItemChanged).toHaveBeenCalledOnce();
            expect(registry.notifyItemChanged).toHaveBeenCalledWith(el, 'href');
        });

        it('ne notifie pas au premier rendu (oldValue === undefined)', async () => {
            el = await fixture('<ar-stepper-item path="/a" label="A"></ar-stepper-item>');
            const registry = {
                registerItem: vi.fn(),
                unregisterItem: vi.fn(),
                notifyItemChanged: vi.fn(),
            };
            // setRegistry déclenche registerItem mais pas notifyItemChanged
            el.setRegistry(registry);
            expect(registry.notifyItemChanged).not.toHaveBeenCalled();
        });

        it("ne notifie pas si aucun registry n'est défini", async () => {
            el = await fixture('<ar-stepper-item path="/a"></ar-stepper-item>');
            el.path = '/b';
            await waitForUpdate(el);
            // Si on arrive ici sans exception, le test passe
            expect(el.path).toBe('/b');
        });
    });
});
