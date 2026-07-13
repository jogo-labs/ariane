/// <reference types="mocha" />
/**
 * Tests nécessitant un vrai navigateur (Chromium via @web/test-runner) :
 *   - Navigation clavier (flèches, Home, End, Enter/Space)
 *   - Activation automatique vs manuelle
 *   - scroll-hints (has-overflow-start / has-overflow-end)
 */
import { fixture, html, expect, aTimeout } from '@open-wc/testing';
import type { ArTabGroup } from './tab-group.js';
import './index.js';
import '../tab/index.js';
import '../tab-panel/index.js';

function getTab(el: ArTabGroup, panel: string): HTMLElement {
    const tab = el.querySelector<HTMLElement>(`ar-tab[panel="${panel}"]`);
    if (!tab) throw new Error(`ar-tab[panel="${panel}"] introuvable`);
    return tab;
}

describe('ar-tab-group — browser', () => {
    // ── Activation par clic ────────────────────────────────────────────────

    describe('activation par clic', () => {
        it('affiche le panel correspondant et masque les autres', async () => {
            const el = await fixture<ArTabGroup>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">Panel A</ar-tab-panel>
                    <ar-tab-panel name="b">Panel B</ar-tab-panel>
                </ar-tab-group>
            `);
            getTab(el, 'b').click();
            await el.updateComplete;
            expect(el.querySelector('ar-tab-panel[name="b"]')!.hasAttribute('hidden')).to.equal(
                false,
            );
            expect(el.querySelector('ar-tab-panel[name="a"]')!.hasAttribute('hidden')).to.equal(
                true,
            );
        });

        it('émet ar-tab-group-change avec { active }', async () => {
            const el = await fixture<ArTabGroup>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            const events: CustomEvent[] = [];
            el.addEventListener('ar-tab-group-change', (e) => events.push(e as CustomEvent));
            getTab(el, 'b').click();
            await el.updateComplete;
            expect(events[0].detail.active).to.equal('b');
        });
    });

    // ── Navigation clavier — activation automatique ────────────────────────

    describe('navigation clavier — mode automatique', () => {
        it('ArrowRight active le tab suivant', async () => {
            const el = await fixture<ArTabGroup>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            getTab(el, 'a').focus();
            getTab(el, 'a').dispatchEvent(
                new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }),
            );
            await el.updateComplete;
            expect(el.active).to.equal('b');
            expect(getTab(el, 'b').getAttribute('aria-selected')).to.equal('true');
        });

        it('ArrowLeft active le tab précédent (wrap)', async () => {
            const el = await fixture<ArTabGroup>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            getTab(el, 'a').focus();
            getTab(el, 'a').dispatchEvent(
                new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, composed: true }),
            );
            await el.updateComplete;
            expect(el.active).to.equal('b');
        });

        it('Home active le premier tab', async () => {
            const el = await fixture<ArTabGroup>(html`
                <ar-tab-group active="b">
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            getTab(el, 'b').focus();
            getTab(el, 'b').dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Home', bubbles: true, composed: true }),
            );
            await el.updateComplete;
            expect(el.active).to.equal('a');
        });

        it('End active le dernier tab', async () => {
            const el = await fixture<ArTabGroup>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            getTab(el, 'a').focus();
            getTab(el, 'a').dispatchEvent(
                new KeyboardEvent('keydown', { key: 'End', bubbles: true, composed: true }),
            );
            await el.updateComplete;
            expect(el.active).to.equal('b');
        });
    });

    // ── Navigation clavier — activation manuelle ───────────────────────────

    describe('navigation clavier — manual-activation', () => {
        it('ArrowRight déplace le focus sans changer active', async () => {
            const el = await fixture<ArTabGroup>(html`
                <ar-tab-group active="a" manual-activation>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            getTab(el, 'a').focus();
            getTab(el, 'a').dispatchEvent(
                new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }),
            );
            await el.updateComplete;
            expect(el.active).to.equal('a');
            expect(document.activeElement).to.equal(getTab(el, 'b'));
        });

        it('Enter sur le tab focusé active le panel', async () => {
            const el = await fixture<ArTabGroup>(html`
                <ar-tab-group manual-activation>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            getTab(el, 'a').focus();
            getTab(el, 'a').dispatchEvent(
                new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }),
            );
            await el.updateComplete;
            getTab(el, 'b').dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }),
            );
            await el.updateComplete;
            expect(el.active).to.equal('b');
        });
    });

    // ── scrollNav ─────────────────────────────────────────────────────────

    describe('scrollNav', () => {
        it('scrolle vers la droite quand appelé avec "end"', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div style="width: 100px; overflow: hidden;">
                    <ar-tab-group>
                        <ar-tab panel="a" style="min-width:60px">A</ar-tab>
                        <ar-tab panel="b" style="min-width:60px">B</ar-tab>
                        <ar-tab panel="c" style="min-width:60px">C</ar-tab>
                        <ar-tab-panel name="a">A</ar-tab-panel>
                        <ar-tab-panel name="b">B</ar-tab-panel>
                        <ar-tab-panel name="c">C</ar-tab-panel>
                    </ar-tab-group>
                </div>
            `);
            const el = wrapper.querySelector<ArTabGroup>('ar-tab-group')!;
            el.scrollNav('end');
            await aTimeout(150);
            const nav = el.shadowRoot!.querySelector<HTMLElement>('[part="nav"]')!;
            expect(nav.scrollLeft).to.be.greaterThan(0);
        });

        it('scrolle vers la gauche quand appelé avec "start"', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div style="width: 100px; overflow: hidden;">
                    <ar-tab-group>
                        <ar-tab panel="a" style="min-width:60px">A</ar-tab>
                        <ar-tab panel="b" style="min-width:60px">B</ar-tab>
                        <ar-tab panel="c" style="min-width:60px">C</ar-tab>
                        <ar-tab-panel name="a">A</ar-tab-panel>
                        <ar-tab-panel name="b">B</ar-tab-panel>
                        <ar-tab-panel name="c">C</ar-tab-panel>
                    </ar-tab-group>
                </div>
            `);
            const el = wrapper.querySelector<ArTabGroup>('ar-tab-group')!;
            el.scrollNav('end', 999);
            await aTimeout(150);
            const nav = el.shadowRoot!.querySelector<HTMLElement>('[part="nav"]')!;
            const scrollAfterEnd = nav.scrollLeft;
            el.scrollNav('start');
            await aTimeout(150);
            expect(nav.scrollLeft).to.be.lessThan(scrollAfterEnd);
        });
    });

    // ── suppression dynamique ─────────────────────────────────────────────

    describe('suppression dynamique', () => {
        it('émet ar-tab-group-change quand le tab actif est supprimé', async () => {
            const el = await fixture<ArTabGroup>(html`
                <ar-tab-group active="a">
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            const events: CustomEvent[] = [];
            el.addEventListener('ar-tab-group-change', (e) => events.push(e as CustomEvent));
            getTab(el, 'a').remove();
            await el.updateComplete;
            expect(events).to.have.length(1);
            expect(events[0].detail.active).to.equal('b');
        });

        it('met à jour active quand le tab actif est supprimé', async () => {
            const el = await fixture<ArTabGroup>(html`
                <ar-tab-group active="a">
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            getTab(el, 'a').remove();
            await el.updateComplete;
            expect(el.active).to.equal('b');
        });

        it("n'émet pas ar-tab-group-change quand un tab inactif est supprimé", async () => {
            const el = await fixture<ArTabGroup>(html`
                <ar-tab-group active="a">
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            const events: CustomEvent[] = [];
            el.addEventListener('ar-tab-group-change', (e) => events.push(e as CustomEvent));
            getTab(el, 'b').remove();
            await el.updateComplete;
            expect(events).to.have.length(0);
            expect(el.active).to.equal('a');
        });
    });

    // ── overflow tracking (toujours actif) ────────────────────────────────

    describe('overflow tracking', () => {
        it('ajoute has-overflow-end quand le contenu déborde', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div style="width: 100px; overflow: hidden;">
                    <ar-tab-group>
                        <ar-tab panel="a" style="min-width:60px">A</ar-tab>
                        <ar-tab panel="b" style="min-width:60px">B</ar-tab>
                        <ar-tab panel="c" style="min-width:60px">C</ar-tab>
                        <ar-tab-panel name="a">A</ar-tab-panel>
                        <ar-tab-panel name="b">B</ar-tab-panel>
                        <ar-tab-panel name="c">C</ar-tab-panel>
                    </ar-tab-group>
                </div>
            `);
            const el = wrapper.querySelector<ArTabGroup>('ar-tab-group')!;
            await aTimeout(50);
            expect(el.classList.contains('has-overflow-end')).to.equal(true);
        });

        it("n'ajoute pas has-overflow-start si scroll à 0", async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div style="width: 100px; overflow: hidden;">
                    <ar-tab-group>
                        <ar-tab panel="a" style="min-width:60px">A</ar-tab>
                        <ar-tab panel="b" style="min-width:60px">B</ar-tab>
                        <ar-tab panel="c" style="min-width:60px">C</ar-tab>
                        <ar-tab-panel name="a">A</ar-tab-panel>
                        <ar-tab-panel name="b">B</ar-tab-panel>
                        <ar-tab-panel name="c">C</ar-tab-panel>
                    </ar-tab-group>
                </div>
            `);
            const el = wrapper.querySelector<ArTabGroup>('ar-tab-group')!;
            await aTimeout(50);
            expect(el.classList.contains('has-overflow-start')).to.equal(false);
        });

        it('les classes overflow restent à jour après disconnect+reconnect', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div style="width: 100px; overflow: hidden;">
                    <ar-tab-group>
                        <ar-tab panel="a" style="min-width:60px">A</ar-tab>
                        <ar-tab panel="b" style="min-width:60px">B</ar-tab>
                        <ar-tab panel="c" style="min-width:60px">C</ar-tab>
                        <ar-tab-panel name="a">A</ar-tab-panel>
                        <ar-tab-panel name="b">B</ar-tab-panel>
                        <ar-tab-panel name="c">C</ar-tab-panel>
                    </ar-tab-group>
                </div>
            `);
            const el = wrapper.querySelector<ArTabGroup>('ar-tab-group')!;
            await aTimeout(50);
            const parent = el.parentElement!;
            parent.removeChild(el);
            parent.appendChild(el);
            await aTimeout(50);
            el.scrollNav('end', 999);
            await aTimeout(200);
            expect(el.classList.contains('has-overflow-start')).to.equal(true);
        });
    });

    // ── Clavier — cas limites ──────────────────────────────────────────────

    describe('clavier — cas limites', () => {
        it('Space appelle preventDefault en mode automatique pour éviter le scroll de la page', async () => {
            const el = await fixture<ArTabGroup>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            await el.updateComplete;
            const tabA = getTab(el, 'a');
            tabA.focus();
            const event = new KeyboardEvent('keydown', {
                key: ' ',
                bubbles: true,
                composed: true,
                cancelable: true,
            });
            tabA.dispatchEvent(event);
            expect(event.defaultPrevented).to.equal(true);
        });

        it('ne plante pas si tous les onglets sont désactivés et ArrowRight est pressé', async () => {
            const el = await fixture<ArTabGroup>(html`
                <ar-tab-group>
                    <ar-tab panel="a" disabled>A</ar-tab>
                    <ar-tab panel="b" disabled>B</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                </ar-tab-group>
            `);
            await el.updateComplete;
            const tabA = getTab(el, 'a');
            tabA.focus();
            tabA.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }),
            );
            tabA.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Home', bubbles: true, composed: true }),
            );
            tabA.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'End', bubbles: true, composed: true }),
            );
            await el.updateComplete;
        });

        it('ArrowLeft depuis un onglet désactivé focusé atteint le dernier onglet actif (pas N-2)', async () => {
            const el = await fixture<ArTabGroup>(html`
                <ar-tab-group>
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab panel="dis" disabled>Dis</ar-tab>
                    <ar-tab panel="c">C</ar-tab>
                    <ar-tab-panel name="a">A</ar-tab-panel>
                    <ar-tab-panel name="b">B</ar-tab-panel>
                    <ar-tab-panel name="dis">Dis</ar-tab-panel>
                    <ar-tab-panel name="c">C</ar-tab-panel>
                </ar-tab-group>
            `);
            await el.updateComplete;
            const disTab = getTab(el, 'dis');
            disTab.focus();
            disTab.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, composed: true }),
            );
            await el.updateComplete;
            expect(el.active).to.equal('c');
        });
    });
});
