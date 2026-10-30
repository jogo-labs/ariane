/// <reference types="mocha" />
/**
 * Un composant déplacé dans le DOM (retrait puis réinsertion : tri de lignes, glisser-déposer,
 * `Teleport`, liste réordonnée par clé) doit rester utilisable. Chaque cas déplace le composant
 * puis déclenche l'interaction réelle (clic, survol) : appeler `show()` ne suffit pas, il contourne
 * le déclencheur dont le câblage est précisément ce qui se perd à la déconnexion.
 */
import { aTimeout, elementUpdated, expect, fixture, html } from '@open-wc/testing';
import type { ArBreadcrumb } from './components/breadcrumb/breadcrumb.js';
import type { ArCollapse } from './components/collapse/collapse.js';
import type { ArDatepicker } from './components/datepicker/datepicker.js';
import type { ArDialog } from './components/dialog/dialog.js';
import type { ArDropdown } from './components/dropdown/dropdown.js';
import type { ArStepper } from './components/stepper/stepper.js';
import type { ArTabGroup } from './components/tab-group/tab-group.js';
import type { ArTooltip } from './components/tooltip/tooltip.js';
import './components/breadcrumb/index.js';
import './components/breadcrumb-item/index.js';
import './components/collapse/index.js';
import './components/datepicker/index.js';
import './components/dialog/index.js';
import './components/dropdown/index.js';
import './components/dropdown-item/index.js';
import './components/stepper/index.js';
import './components/stepper-item/index.js';
import './components/tab/index.js';
import './components/tab-group/index.js';
import './components/tab-panel/index.js';
import './components/tooltip/index.js';

const destinations: HTMLElement[] = [];

/** Retire le nœud de son parent et le réinsère dans un autre conteneur du document. */
function relocate(node: Element): void {
    const destination = document.createElement('div');
    document.body.append(destination);
    destinations.push(destination);
    destination.append(node);
}

describe('composants déplacés dans le DOM', () => {
    afterEach(() => {
        for (const d of destinations.splice(0)) d.remove();
    });

    describe('ar-collapse', () => {
        it('déclencheur en slot : un clic ouvre après le déplacement', async () => {
            const el = await fixture<ArCollapse>(html`
                <ar-collapse
                    ><button slot="trigger">T</button>
                    <p>Contenu</p></ar-collapse
                >
            `);
            relocate(el);
            await el.updateComplete;
            el.querySelector<HTMLElement>('button')!.click();
            await aTimeout(400);
            expect(el.open).to.equal(true);
            expect(el.querySelector('button')!.getAttribute('aria-expanded')).to.equal('true');
        });

        it('déclencheur externe (trigger-id) : un clic ouvre après le déplacement', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div>
                    <button id="ext-collapse">T</button>
                    <ar-collapse trigger-id="ext-collapse"><p>Contenu</p></ar-collapse>
                </div>
            `);
            const el = wrapper.querySelector<ArCollapse>('ar-collapse')!;
            relocate(wrapper);
            await el.updateComplete;
            wrapper.querySelector<HTMLElement>('#ext-collapse')!.click();
            await aTimeout(400);
            expect(el.open).to.equal(true);
        });
    });

    describe('ar-dropdown', () => {
        it('déclencheur en slot : un clic ouvre le panneau après le déplacement', async () => {
            const el = await fixture<ArDropdown>(html`
                <ar-dropdown>
                    <button slot="trigger">T</button>
                    <ar-dropdown-item>Un</ar-dropdown-item>
                </ar-dropdown>
            `);
            relocate(el);
            await el.updateComplete;
            el.querySelector<HTMLElement>('button')!.click();
            await aTimeout(200);
            expect(el.open).to.equal(true);
            expect(
                el.shadowRoot!.querySelector('[part="panel"]')!.matches(':popover-open'),
            ).to.equal(true);
        });

        it('déclencheur externe (trigger-id) : un clic ouvre après le déplacement', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div>
                    <button id="ext-dropdown">T</button>
                    <ar-dropdown trigger-id="ext-dropdown">
                        <ar-dropdown-item>Un</ar-dropdown-item>
                    </ar-dropdown>
                </div>
            `);
            const el = wrapper.querySelector<ArDropdown>('ar-dropdown')!;
            relocate(wrapper);
            await el.updateComplete;
            wrapper.querySelector<HTMLElement>('#ext-dropdown')!.click();
            await aTimeout(200);
            expect(el.open).to.equal(true);
        });

        it('déplacé ouvert : le conteneur scrollable ancêtre est libéré', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div style="overflow:auto;height:120px">
                    <ar-dropdown>
                        <button slot="trigger">T</button>
                        <ar-dropdown-item>Un</ar-dropdown-item>
                    </ar-dropdown>
                </div>
            `);
            const el = wrapper.querySelector<ArDropdown>('ar-dropdown')!;
            el.querySelector<HTMLElement>('button')!.click();
            await aTimeout(200);
            expect(el.open).to.equal(true);
            relocate(el);
            await aTimeout(50);
            expect(getComputedStyle(wrapper).overflow, 'ancien conteneur').to.not.equal('hidden');
        });
    });

    describe('ouvert au moment du déplacement', () => {
        it("ar-dropdown : le panneau est rouvert à la reconnexion, l'état reste cohérent", async () => {
            const el = await fixture<ArDropdown>(html`
                <ar-dropdown>
                    <button slot="trigger">T</button>
                    <ar-dropdown-item>Un</ar-dropdown-item>
                </ar-dropdown>
            `);
            el.querySelector<HTMLElement>('button')!.click();
            await aTimeout(200);
            expect(el.open).to.equal(true);
            relocate(el);
            await aTimeout(200);
            expect(el.open).to.equal(true);
            expect(
                el.shadowRoot!.querySelector('[part="panel"]')!.matches(':popover-open'),
            ).to.equal(true);
            el.querySelector<HTMLElement>('button')!.click();
            await aTimeout(200);
            expect(el.open).to.equal(false);
        });
    });

    describe('ar-tooltip', () => {
        it('le survol du déclencheur affiche la bulle après le déplacement du tout', async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div>
                    <button id="tt-trigger">x</button>
                    <ar-tooltip trigger-id="tt-trigger" show-delay="0">Aide</ar-tooltip>
                </div>
            `);
            const el = wrapper.querySelector<ArTooltip>('ar-tooltip')!;
            const trigger = wrapper.querySelector<HTMLElement>('#tt-trigger')!;
            relocate(wrapper);
            await el.updateComplete;
            trigger.dispatchEvent(new MouseEvent('mouseenter'));
            await aTimeout(80);
            expect(
                el.shadowRoot!.querySelector('[part="tooltip"]')!.matches(':popover-open'),
            ).to.equal(true);
        });

        it("le déclencheur garde son aria-describedby après le déplacement de l'info-bulle", async () => {
            const wrapper = await fixture<HTMLElement>(html`
                <div>
                    <button id="tt-trigger2">x</button>
                    <ar-tooltip trigger-id="tt-trigger2">Aide</ar-tooltip>
                </div>
            `);
            const el = wrapper.querySelector<ArTooltip>('ar-tooltip')!;
            const trigger = wrapper.querySelector<HTMLElement>('#tt-trigger2')!;
            const before = trigger.getAttribute('aria-describedby');
            expect(before).to.be.a('string');
            relocate(el);
            await el.updateComplete;
            expect(trigger.getAttribute('aria-describedby')).to.equal(before);
        });
    });

    describe('ar-datepicker', () => {
        it('un clic sur le bouton du calendrier ouvre le panneau après le déplacement', async () => {
            const el = await fixture<ArDatepicker>(html`<ar-datepicker></ar-datepicker>`);
            relocate(el);
            await el.updateComplete;
            el.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!.click();
            await aTimeout(100);
            expect(el.open).to.equal(true);
            expect(
                el.shadowRoot!.querySelector('[part="panel"]')!.matches(':popover-open'),
            ).to.equal(true);
        });
    });

    describe('ar-breadcrumb (mobile)', () => {
        it('un clic sur le bouton ouvre le panneau après le déplacement', async () => {
            const el = await fixture<ArBreadcrumb>(html`
                <ar-breadcrumb style="width:400px">
                    <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Catégorie" href="/cat"></ar-breadcrumb-item>
                    <ar-breadcrumb-item label="Page courante"></ar-breadcrumb-item>
                </ar-breadcrumb>
            `);
            (el as ArBreadcrumb & { isMobile: boolean }).isMobile = true;
            await el.updateComplete;
            relocate(el);
            await el.updateComplete;
            el.shadowRoot!.querySelector<HTMLElement>('button')!.click();
            await aTimeout(100);
            expect(
                el.shadowRoot!.querySelector('[part="panel"]')!.matches(':popover-open'),
            ).to.equal(true);
        });
    });

    describe('ar-dialog', () => {
        it('un dialog ouvert puis déplacé reste modal et bloque le scroll', async () => {
            const el = await fixture<ArDialog>(html`
                <ar-dialog open><button data-ar-dismiss>Fermer</button></ar-dialog>
            `);
            await aTimeout(300);
            const shown: Event[] = [];
            el.addEventListener('ar-dialog-show', (e) => shown.push(e));
            relocate(el);
            await el.updateComplete;
            await aTimeout(100);
            const native = el.shadowRoot!.querySelector('dialog')!;
            expect(native.matches(':modal'), '<dialog> natif modal').to.equal(true);
            expect(getComputedStyle(document.body).overflow, 'scroll du body').to.equal('hidden');
            expect(shown, "pas de nouvel événement d'ouverture").to.have.length(0);
            el.open = false;
            await aTimeout(400);
            expect(getComputedStyle(document.body).overflow, 'scroll rendu').to.not.equal('hidden');
        });
    });

    describe('ar-tab-group', () => {
        it("garde l'onglet actif et n'émet aucun événement quand il est déplacé", async () => {
            const el = await fixture<ArTabGroup>(html`
                <ar-tab-group active="c">
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab panel="c">C</ar-tab>
                    <ar-tab-panel name="a">Panneau A</ar-tab-panel>
                    <ar-tab-panel name="b">Panneau B</ar-tab-panel>
                    <ar-tab-panel name="c">Panneau C</ar-tab-panel>
                </ar-tab-group>
            `);
            const events: Event[] = [];
            el.addEventListener('ar-tab-group-change', (e) => events.push(e));
            relocate(el);
            await el.updateComplete;
            await aTimeout(50);
            expect(el.active).to.equal('c');
            expect(events).to.have.length(0);
        });

        it('un onglet cliqué après le déplacement active toujours son panneau', async () => {
            const el = await fixture<ArTabGroup>(html`
                <ar-tab-group active="a">
                    <ar-tab panel="a">A</ar-tab>
                    <ar-tab panel="b">B</ar-tab>
                    <ar-tab-panel name="a">Panneau A</ar-tab-panel>
                    <ar-tab-panel name="b">Panneau B</ar-tab-panel>
                </ar-tab-group>
            `);
            relocate(el);
            await aTimeout(50);
            el.querySelector<HTMLElement>('ar-tab[panel="b"]')!.click();
            await el.updateComplete;
            expect(el.active).to.equal('b');
        });
    });

    describe('ar-stepper (mobile)', () => {
        it('un clic sur le déclencheur ouvre le menu après le déplacement', async () => {
            const el = await fixture<ArStepper>(html`
                <ar-stepper current-path="/step2" desktop-from="9999">
                    <ar-stepper-item label="Étape 1" href="/step1"></ar-stepper-item>
                    <ar-stepper-item label="Étape 2" href="/step2"></ar-stepper-item>
                </ar-stepper>
            `);
            await aTimeout(50);
            relocate(el);
            await elementUpdated(el);
            await aTimeout(50);
            el.shadowRoot!.querySelector<HTMLElement>('[part~="trigger"]')!.click();
            await aTimeout(150);
            expect(el.open).to.equal(true);
        });
    });
});
