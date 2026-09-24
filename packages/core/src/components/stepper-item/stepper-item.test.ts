import { afterEach, describe, expect, it, vi } from 'vitest';
import { type ArStepperItem } from './stepper-item.js';
import { fixture, waitForUpdate } from '../../test-utils.js';
import './index.js';

describe('ArStepperItem', () => {
    let el: ArStepperItem;

    afterEach(() => el?.remove());

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

    describe('rendu shadow DOM', () => {
        it('a un shadow DOM (plus de createRenderRoot() = this)', async () => {
            const el = await fixture<ArStepperItem>(
                '<ar-stepper-item path="a" label="Étape A"></ar-stepper-item>',
            );
            expect(el.shadowRoot).not.toBeNull();
        });

        it('affiche le label en texte par défaut, sans lien (indicatorState default)', async () => {
            const el = await fixture<ArStepperItem>(
                '<ar-stepper-item path="a" label="Étape A"></ar-stepper-item>',
            );
            const header = el.shadowRoot!.querySelector('.item-header')!;
            expect(header.tagName).toBe('DIV');
            expect(header.textContent).toContain('Étape A');
        });

        it('setRenderState({ isLink: true }) rend un <a> plutôt qu’un <div>', async () => {
            const el = await fixture<ArStepperItem>(
                '<ar-stepper-item path="a" label="Étape A" href="#a"></ar-stepper-item>',
            );
            el.setRenderState({
                indicatorState: 'completed',
                isLink: true,
                showSubsteps: false,
                srLabel: 'étape 1:',
            });
            await el.updateComplete;

            const header = el.shadowRoot!.querySelector('.item-header')!;
            expect(header.tagName).toBe('A');
            expect(header.getAttribute('href')).toBe('#a');
        });

        it('showSubsteps: true entoure le slot par défaut d’un <div role="list" part="list list--substep">', async () => {
            const el = await fixture<ArStepperItem>(
                '<ar-stepper-item path="a" label="Étape A"></ar-stepper-item>',
            );
            el.setRenderState({
                indicatorState: 'current',
                isLink: false,
                showSubsteps: true,
                srLabel: 'étape 1:',
            });
            await el.updateComplete;

            expect(
                el.shadowRoot!.querySelector('div[role="list"][part~="list--substep"] slot'),
            ).not.toBeNull();
        });

        it('indicatorState: "current" pose aria-current="step" sur le host', async () => {
            const el = await fixture<ArStepperItem>(
                '<ar-stepper-item path="a" label="Étape A"></ar-stepper-item>',
            );
            el.setRenderState({
                indicatorState: 'current',
                isLink: false,
                showSubsteps: false,
                srLabel: 'étape 1:',
            });
            await el.updateComplete;

            expect(el.getAttribute('aria-current')).toBe('step');
        });

        it('indicatorState !== "current" ne pose pas aria-current', async () => {
            const el = await fixture<ArStepperItem>(
                '<ar-stepper-item path="a" label="Étape A"></ar-stepper-item>',
            );
            el.setRenderState({
                indicatorState: 'completed',
                isLink: true,
                showSubsteps: false,
                srLabel: 'étape 1:',
            });
            await el.updateComplete;

            expect(el.hasAttribute('aria-current')).toBe(false);
        });
    });

    describe('notifyItemActivated', () => {
        it('appelle registry.notifyItemActivated(this, event) au clic sur le lien', async () => {
            const el = await fixture<ArStepperItem>(
                '<ar-stepper-item path="a" label="Étape A" href="#a"></ar-stepper-item>',
            );
            el.setRenderState({
                indicatorState: 'completed',
                isLink: true,
                showSubsteps: false,
                srLabel: 'étape 1:',
            });
            await el.updateComplete;

            const notifyItemActivated = vi.fn();
            el.setRegistry({
                registerItem: () => {},
                unregisterItem: () => {},
                notifyItemChanged: () => {},
                notifyItemActivated,
            });

            const link = el.shadowRoot!.querySelector('a')!;
            link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

            expect(notifyItemActivated).toHaveBeenCalledOnce();
            expect(notifyItemActivated.mock.calls[0]![0]).toBe(el);
            expect(notifyItemActivated.mock.calls[0]![1]).toBeInstanceOf(MouseEvent);
        });

        it.each([undefined, '#'])(
            'rend un <button type="button"> (pas un <a>) quand href vaut %s',
            async (href) => {
                const attr = href === undefined ? '' : ` href="${href}"`;
                const el = await fixture<ArStepperItem>(
                    `<ar-stepper-item path="a" label="Étape A"${attr}></ar-stepper-item>`,
                );
                el.setRenderState({
                    indicatorState: 'completed',
                    isLink: true,
                    showSubsteps: false,
                    srLabel: 'étape 1:',
                });
                await el.updateComplete;

                const header = el.shadowRoot!.querySelector('.item-header')!;
                expect(header.tagName).toBe('BUTTON');
                expect(header.getAttribute('type')).toBe('button');
                expect(header.getAttribute('part')).toBe('step-link control');
                expect(el.shadowRoot!.querySelector('a')).toBeNull();
            },
        );

        it('ignore un clic avec touche modificatrice sur un <a> à href réel', async () => {
            const el = await fixture<ArStepperItem>(
                '<ar-stepper-item path="a" label="Étape A" href="/a"></ar-stepper-item>',
            );
            el.setRenderState({
                indicatorState: 'completed',
                isLink: true,
                showSubsteps: false,
                srLabel: 'étape 1:',
            });
            await el.updateComplete;
            const notifyItemActivated = vi.fn();
            el.setRegistry({
                registerItem: () => {},
                unregisterItem: () => {},
                notifyItemChanged: () => {},
                notifyItemActivated,
            });

            const link = el.shadowRoot!.querySelector('a')!;
            link.dispatchEvent(
                new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true }),
            );
            expect(notifyItemActivated).not.toHaveBeenCalled();

            link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            expect(notifyItemActivated).toHaveBeenCalledOnce();
        });
    });

    describe('focusControl', () => {
        it('déplace le focus sur le .item-header interne', async () => {
            const el = await fixture<ArStepperItem>(
                '<ar-stepper-item path="a" label="Étape A" href="#a"></ar-stepper-item>',
            );
            el.setRenderState({
                indicatorState: 'completed',
                isLink: true,
                showSubsteps: false,
                srLabel: 'étape 1:',
            });
            await el.updateComplete;

            el.focusControl();

            expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('.item-header'));
        });
    });
});
