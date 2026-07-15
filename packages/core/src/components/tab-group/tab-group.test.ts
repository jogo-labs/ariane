import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, waitForUpdate, getPart } from '../../test-utils.js';
import type { ArTabGroup } from './tab-group.js';
import type { ArTab } from '../tab/tab.js';
import './index.js';
import '../tab/index.js';
import '../tab-panel/index.js';

const DEFAULT_HTML = `
    <ar-tab-group>
        <ar-tab panel="a">Tab A</ar-tab>
        <ar-tab panel="b">Tab B</ar-tab>
        <ar-tab-panel name="a">Panel A</ar-tab-panel>
        <ar-tab-panel name="b">Panel B</ar-tab-panel>
    </ar-tab-group>
`;

describe('ArTabGroup', () => {
    let el: ArTabGroup;
    afterEach(() => el?.remove());

    // ── Rendu ───────────────────────────────────────────────────────────────

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<ar-tab-group></ar-tab-group>');
        });

        it('monte un shadow DOM', () => {
            expect(el.shadowRoot).not.toBeNull();
        });

        it('contient part="base"', () => {
            expect(getPart(el, 'base')).not.toBeNull();
        });

        it('contient part="nav"', () => {
            expect(getPart(el, 'nav')).not.toBeNull();
        });

        it('contient part="tabs" avec role="tablist"', () => {
            expect(getPart(el, 'tabs')?.getAttribute('role')).toBe('tablist');
        });
    });

    // ── Valeurs par défaut ─────────────────────────────────────────────────

    describe('valeurs par défaut', () => {
        beforeEach(async () => {
            el = await fixture('<ar-tab-group></ar-tab-group>');
        });

        it('active vaut chaîne vide', () => expect(el.active).toBe(''));
        it('label vaut chaîne vide', () => expect(el.label).toBe(''));
        it('manualActivation vaut false', () => expect(el.manualActivation).toBe(false));
    });

    // ── Onglet actif par défaut ────────────────────────────────────────────

    describe('onglet actif par défaut', () => {
        it('active le premier onglet non-disabled si active est absent', async () => {
            el = await fixture(DEFAULT_HTML);
            await waitForUpdate(el);
            const tabA = el.querySelector<HTMLElement>('ar-tab[panel="a"]')!;
            expect(tabA.getAttribute('aria-selected')).toBe('true');
            expect(tabA.getAttribute('tabindex')).toBe('0');
        });

        it('masque le panel inactif avec hidden', async () => {
            el = await fixture(DEFAULT_HTML);
            await waitForUpdate(el);
            const panelB = el.querySelector<HTMLElement>('ar-tab-panel[name="b"]')!;
            expect(panelB.hasAttribute('hidden')).toBe(true);
        });

        it('affiche le panel actif sans hidden', async () => {
            el = await fixture(DEFAULT_HTML);
            await waitForUpdate(el);
            const panelA = el.querySelector<HTMLElement>('ar-tab-panel[name="a"]')!;
            expect(panelA.hasAttribute('hidden')).toBe(false);
        });
    });

    // ── Attribut active ────────────────────────────────────────────────────

    describe('attribut active', () => {
        it('active le bon onglet selon active="b"', async () => {
            el = await fixture(`
                <ar-tab-group active="b">
                    <ar-tab panel="a">Tab A</ar-tab>
                    <ar-tab panel="b">Tab B</ar-tab>
                    <ar-tab-panel name="a">Panel A</ar-tab-panel>
                    <ar-tab-panel name="b">Panel B</ar-tab-panel>
                </ar-tab-group>
            `);
            await waitForUpdate(el);
            const tabB = el.querySelector<HTMLElement>('ar-tab[panel="b"]')!;
            expect(tabB.getAttribute('aria-selected')).toBe('true');
        });

        it("changer active programmatiquement met à jour l'ARIA", async () => {
            el = await fixture(DEFAULT_HTML);
            await waitForUpdate(el);
            el.active = 'b';
            await waitForUpdate(el);
            const tabB = el.querySelector<HTMLElement>('ar-tab[panel="b"]')!;
            expect(tabB.getAttribute('aria-selected')).toBe('true');
            const panelB = el.querySelector<HTMLElement>('ar-tab-panel[name="b"]')!;
            expect(panelB.hasAttribute('hidden')).toBe(false);
        });
    });

    // ── ARIA IDs et associations ───────────────────────────────────────────

    describe('ARIA — IDs et associations', () => {
        beforeEach(async () => {
            el = await fixture(DEFAULT_HTML);
            await waitForUpdate(el);
        });

        it('chaque ar-tab a role="tab"', () => {
            el.querySelectorAll('ar-tab').forEach((tab) => {
                expect(tab.getAttribute('role')).toBe('tab');
            });
        });

        it('chaque ar-tab-panel a role="tabpanel"', () => {
            el.querySelectorAll('ar-tab-panel').forEach((panel) => {
                expect(panel.getAttribute('role')).toBe('tabpanel');
            });
        });

        it("aria-controls sur ar-tab pointe vers l'ID du panel correspondant", () => {
            const tabA = el.querySelector<HTMLElement>('ar-tab[panel="a"]')!;
            const panelA = el.querySelector<HTMLElement>('ar-tab-panel[name="a"]')!;
            expect(tabA.getAttribute('aria-controls')).toBe(panelA.id);
        });

        it("aria-labelledby sur ar-tab-panel pointe vers l'ID du tab correspondant", () => {
            const tabA = el.querySelector<HTMLElement>('ar-tab[panel="a"]')!;
            const panelA = el.querySelector<HTMLElement>('ar-tab-panel[name="a"]')!;
            expect(panelA.getAttribute('aria-labelledby')).toBe(tabA.id);
        });

        it('chaque ar-tab-panel a tabindex="0"', () => {
            el.querySelectorAll('ar-tab-panel').forEach((panel) => {
                expect(panel.getAttribute('tabindex')).toBe('0');
            });
        });
    });

    // ── label ──────────────────────────────────────────────────────────────

    describe('attribut label', () => {
        it('pose aria-label sur le tablist', async () => {
            el = await fixture(`
                <ar-tab-group label="Navigation principale">
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                </ar-tab-group>
            `);
            expect(getPart(el, 'tabs')?.getAttribute('aria-label')).toBe('Navigation principale');
        });
    });

    // ── disabled ───────────────────────────────────────────────────────────

    describe('ar-tab disabled', () => {
        it('pose aria-disabled="true" sur l\'onglet désactivé', async () => {
            el = await fixture(`
                <ar-tab-group>
                    <ar-tab panel="a" disabled>Tab A</ar-tab>
                    <ar-tab panel="b">Tab B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            await waitForUpdate(el);
            const tabA = el.querySelector<HTMLElement>('ar-tab[panel="a"]')!;
            expect(tabA.getAttribute('aria-disabled')).toBe('true');
        });

        it('saute le premier onglet si disabled et active le suivant', async () => {
            el = await fixture(`
                <ar-tab-group>
                    <ar-tab panel="a" disabled>Tab A</ar-tab>
                    <ar-tab panel="b">Tab B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            await waitForUpdate(el);
            const tabB = el.querySelector<HTMLElement>('ar-tab[panel="b"]')!;
            expect(tabB.getAttribute('aria-selected')).toBe('true');
        });
    });

    describe('disabled à chaud', () => {
        it('met à jour aria-disabled quand tab.disabled change après le montage', async () => {
            el = await fixture(`
                <ar-tab-group>
                    <ar-tab panel="a">Tab A</ar-tab>
                    <ar-tab panel="b">Tab B</ar-tab>
                    <ar-tab-panel name="a">Panel A</ar-tab-panel>
                    <ar-tab-panel name="b">Panel B</ar-tab-panel>
                </ar-tab-group>
            `);
            await waitForUpdate(el);

            const tabB = el.querySelector<ArTab>('ar-tab[panel="b"]')!;
            expect(tabB.hasAttribute('aria-disabled')).toBe(false);

            tabB.disabled = true;
            await waitForUpdate(el);

            expect(tabB.getAttribute('aria-disabled')).toBe('true');
        });
    });

    // ── Événement ─────────────────────────────────────────────────────────

    describe('événement ar-tab-group-change', () => {
        it('émet ar-tab-group-change avec { active } au clic', async () => {
            el = await fixture(DEFAULT_HTML);
            await waitForUpdate(el);
            const events: CustomEvent[] = [];
            el.addEventListener('ar-tab-group-change', (e) => events.push(e as CustomEvent));
            const tabB = el.querySelector<HTMLElement>('ar-tab[panel="b"]')!;
            tabB.click();
            await waitForUpdate(el);
            expect(events.length).toBe(1);
            expect(events[0].detail).toEqual({ active: 'b' });
        });
    });

    // ── warn() ─────────────────────────────────────────────────────────────

    describe('warn() — panel orphelin', () => {
        it("affiche un warn si panel d'un ar-tab n'a pas de ar-tab-panel correspondant", async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            el = await fixture(`
                <ar-tab-group>
                    <ar-tab panel="orphan">Tab</ar-tab>
                </ar-tab-group>
            `);
            await waitForUpdate(el);
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('orphan'));
            warnSpy.mockRestore();
        });
    });

    // ── slot="tab" automatique ─────────────────────────────────────────────

    describe('slot="tab" automatique', () => {
        it('pose slot="tab" sur chaque ar-tab enregistré', async () => {
            el = await fixture(DEFAULT_HTML);
            await waitForUpdate(el);
            el.querySelectorAll('ar-tab').forEach((tab) => {
                expect(tab.getAttribute('slot')).toBe('tab');
            });
        });
    });
});
