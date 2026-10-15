import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixture, getPart, waitForUpdate } from '../../test-utils.js';
import type { ArTab } from './tab.js';
import './index.js';

describe('ArTab', () => {
    let el: ArTab;
    afterEach(() => el?.remove());

    describe('rendu', () => {
        it('monte un shadow DOM avec un slot', async () => {
            el = await fixture('<ar-tab panel="a">Tab A</ar-tab>');
            expect(el.shadowRoot).not.toBeNull();
            expect(el.shadowRoot?.querySelector('slot')).not.toBeNull();
        });
    });

    describe('setRegistry (rattachement par le groupe)', () => {
        it('enregistre le tab auprès du registre fourni', async () => {
            el = await fixture('<ar-tab panel="a">Tab A</ar-tab>');
            const registry = {
                registerTab: vi.fn(),
                unregisterTab: vi.fn(),
                registerPanel: vi.fn(),
                unregisterPanel: vi.fn(),
                activate: vi.fn(),
                notifyTabChanged: vi.fn(),
            };
            el.setRegistry(registry);
            expect(registry.registerTab).toHaveBeenCalledWith(el);
        });

        it("se désinscrit de l'ancien registre avant de s'inscrire au nouveau", async () => {
            el = await fixture('<ar-tab panel="a">Tab A</ar-tab>');
            const make = () => ({
                registerTab: vi.fn(),
                unregisterTab: vi.fn(),
                registerPanel: vi.fn(),
                unregisterPanel: vi.fn(),
                activate: vi.fn(),
                notifyTabChanged: vi.fn(),
            });
            const first = make();
            const second = make();
            el.setRegistry(first);
            el.setRegistry(second);
            expect(first.unregisterTab).toHaveBeenCalledWith(el);
            expect(second.registerTab).toHaveBeenCalledWith(el);
        });
    });

    describe('valeurs par défaut', () => {
        it('panel vaut chaîne vide', async () => {
            el = await fixture('<ar-tab>Tab</ar-tab>');
            expect(el.panel).toBe('');
        });

        it('disabled vaut false', async () => {
            el = await fixture('<ar-tab panel="a">Tab A</ar-tab>');
            expect(el.disabled).toBe(false);
        });

        it('active vaut false', async () => {
            el = await fixture('<ar-tab panel="a">Tab A</ar-tab>');
            expect(el.active).toBe(false);
        });
    });

    describe('active', () => {
        it('reflète active en attribut', async () => {
            el = await fixture('<ar-tab panel="a">Tab</ar-tab>');
            el.active = true;
            await waitForUpdate(el);
            expect(el.hasAttribute('active')).toBe(true);
        });

        it('n\'émet pas part="tab--selected" quand active est false', async () => {
            el = await fixture('<ar-tab panel="a">Tab</ar-tab>');
            expect(getPart(el, 'tab--selected')).toBeNull();
        });

        it('émet part="tab tab--selected" quand active est true', async () => {
            el = await fixture('<ar-tab panel="a">Tab</ar-tab>');
            el.active = true;
            await waitForUpdate(el);
            expect(getPart(el, 'tab--selected')).not.toBeNull();
        });
    });

    describe('attribut panel', () => {
        it("lit panel depuis l'attribut HTML", async () => {
            el = await fixture('<ar-tab panel="intro">Tab</ar-tab>');
            expect(el.panel).toBe('intro');
        });

        it('reflète panel en attribut', async () => {
            el = await fixture('<ar-tab panel="intro">Tab</ar-tab>');
            el.panel = 'usage';
            await waitForUpdate(el);
            expect(el.getAttribute('panel')).toBe('usage');
        });
    });

    describe('disabled', () => {
        it('reflète disabled en attribut', async () => {
            el = await fixture('<ar-tab panel="a">Tab</ar-tab>');
            el.disabled = true;
            await waitForUpdate(el);
            expect(el.hasAttribute('disabled')).toBe(true);
        });

        it('ne déclenche pas activate si disabled', async () => {
            el = await fixture('<ar-tab panel="a" disabled>Tab</ar-tab>');
            const spy = vi.fn();
            (el as any)._registry = { activate: spy, registerTab: vi.fn(), unregisterTab: vi.fn() };
            el.click();
            expect(spy).not.toHaveBeenCalled();
        });
    });

    describe('click', () => {
        it('appelle registry.activate(panel) au clic', async () => {
            el = await fixture('<ar-tab panel="test">Tab</ar-tab>');
            const activate = vi.fn();
            (el as any)._registry = { activate, registerTab: vi.fn(), unregisterTab: vi.fn() };
            el.click();
            expect(activate).toHaveBeenCalledWith('test');
        });
    });
});
