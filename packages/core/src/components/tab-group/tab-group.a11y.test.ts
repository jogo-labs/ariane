/// <reference types="mocha" />
/**
 * Tests d'accessibilité structurels — WAI-ARIA Tabs pattern.
 */
import { fixture, html, expect } from '@open-wc/testing';
import type { ArTabGroup } from './tab-group.js';
import './index.js';
import '../tab/index.js';
import '../tab-panel/index.js';

describe('ar-tab-group — accessibilité', () => {
    // ── Rôles ARIA ─────────────────────────────────────────────────────────

    describe('rôles ARIA', () => {
        it('le tablist a role="tablist"', async () => {
            const el = await fixture<ArTabGroup>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                </ar-tab-group>
            `);
            const tablist = el.shadowRoot?.querySelector('[part="tabs"]');
            expect(tablist?.getAttribute('role')).to.equal('tablist');
        });

        it('chaque ar-tab a role="tab"', async () => {
            const el = await fixture<ArTabGroup>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            el.querySelectorAll('ar-tab').forEach((tab) => {
                expect(tab.getAttribute('role')).to.equal('tab');
            });
        });

        it('chaque ar-tab-panel a role="tabpanel"', async () => {
            const el = await fixture<ArTabGroup>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                </ar-tab-group>
            `);
            expect(el.querySelector('ar-tab-panel')!.getAttribute('role')).to.equal('tabpanel');
        });
    });

    // ── Associations ARIA ──────────────────────────────────────────────────

    describe('associations ARIA (light DOM → light DOM)', () => {
        it("aria-controls du tab pointe vers l'ID du panel (même arbre)", async () => {
            const el = await fixture<ArTabGroup>(html`
                <ar-tab-group>
                    <ar-tab panel="intro">Intro</ar-tab>
                    <ar-tab-panel name="intro">Contenu</ar-tab-panel>
                </ar-tab-group>
            `);
            const tab = el.querySelector<HTMLElement>('ar-tab[panel="intro"]')!;
            const panel = el.querySelector<HTMLElement>('ar-tab-panel[name="intro"]')!;
            expect(tab.getAttribute('aria-controls')).to.equal(panel.id);
            expect(document.getElementById(panel.id)).to.equal(panel);
        });

        it("aria-labelledby du panel pointe vers l'ID du tab (même arbre)", async () => {
            const el = await fixture<ArTabGroup>(html`
                <ar-tab-group>
                    <ar-tab panel="intro">Intro</ar-tab>
                    <ar-tab-panel name="intro">Contenu</ar-tab-panel>
                </ar-tab-group>
            `);
            const tab = el.querySelector<HTMLElement>('ar-tab[panel="intro"]')!;
            const panel = el.querySelector<HTMLElement>('ar-tab-panel[name="intro"]')!;
            expect(panel.getAttribute('aria-labelledby')).to.equal(tab.id);
            expect(document.getElementById(tab.id)).to.equal(tab);
        });
    });

    // ── État sélectionné ───────────────────────────────────────────────────

    describe('état sélectionné', () => {
        it('le tab actif a aria-selected="true"', async () => {
            const el = await fixture<ArTabGroup>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                </ar-tab-group>
            `);
            expect(el.querySelector('ar-tab')!.getAttribute('aria-selected')).to.equal('true');
        });

        it('les tabs inactifs ont aria-selected="false"', async () => {
            const el = await fixture<ArTabGroup>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            expect(el.querySelector('ar-tab[panel="b"]')!.getAttribute('aria-selected')).to.equal(
                'false',
            );
        });
    });

    // ── Panneau masqué ─────────────────────────────────────────────────────

    describe('panneau masqué', () => {
        it("le panel inactif a l'attribut hidden", async () => {
            const el = await fixture<ArTabGroup>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            expect(el.querySelector('ar-tab-panel[name="b"]')!.hasAttribute('hidden')).to.equal(
                true,
            );
        });

        it("le panel actif n'a pas l'attribut hidden", async () => {
            const el = await fixture<ArTabGroup>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                </ar-tab-group>
            `);
            expect(el.querySelector('ar-tab-panel[name="a"]')!.hasAttribute('hidden')).to.equal(
                false,
            );
        });
    });

    // ── Roving tabindex ────────────────────────────────────────────────────

    describe('roving tabindex', () => {
        it('le tab actif a tabindex="0", les inactifs tabindex="-1"', async () => {
            const el = await fixture<ArTabGroup>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            expect(el.querySelector('ar-tab[panel="a"]')!.getAttribute('tabindex')).to.equal('0');
            expect(el.querySelector('ar-tab[panel="b"]')!.getAttribute('tabindex')).to.equal('-1');
        });
    });
});
