/// <reference types="mocha" />
/**
 * Ordre de définition inversé (#324) : `ar-tab` et `ar-tab-panel` sont définis AVANT `ar-tab-group`
 * (ordre de chargement d'un framework, de l'autoloader ou d'imports par composant). Les onglets
 * déjà « upgradés » ont demandé leur registre sans réponse : le groupe doit les rattacher quand il
 * se connecte. Un fichier = une page, et ar-tab-group n'est volontairement pas importé ici.
 */
import { expect } from '@open-wc/testing';
import type { ArTabGroup } from './tab-group.js';
import '../tab/index.js';
import '../tab-panel/index.js';

const HTML = `
    <ar-tab-group id="outer">
        <ar-tab panel="a">A</ar-tab>
        <ar-tab panel="b">B</ar-tab>
        <ar-tab-panel name="a">
            PA
            <ar-tab-group id="inner">
                <ar-tab panel="x">X</ar-tab>
                <ar-tab panel="y">Y</ar-tab>
                <ar-tab-panel name="x">PX</ar-tab-panel>
                <ar-tab-panel name="y">PY</ar-tab-panel>
            </ar-tab-group>
        </ar-tab-panel>
        <ar-tab-panel name="b">PB</ar-tab-panel>
    </ar-tab-group>
`;

describe('ar-tab-group défini après ses onglets', () => {
    let host: HTMLElement;
    before(async () => {
        host = document.createElement('div');
        host.innerHTML = HTML;
        document.body.append(host);
        await customElements.whenDefined('ar-tab');
        // Situation de départ : onglets upgradés, groupe encore inconnu, rien n'est câblé.
        expect(customElements.get('ar-tab-group')).to.equal(undefined);
        expect(host.querySelector('ar-tab[panel="a"]')!.hasAttribute('role')).to.equal(false);

        await import('./index.js');
        await customElements.whenDefined('ar-tab-group');
        await (host.querySelector('#outer') as ArTabGroup).updateComplete;
        await (host.querySelector('#inner') as ArTabGroup).updateComplete;
    });
    after(() => host.remove());

    it('rattache les onglets et panneaux déjà présents', () => {
        const tabA = host.querySelector<HTMLElement>('ar-tab[panel="a"]')!;
        const panelA = host.querySelector<HTMLElement>('ar-tab-panel[name="a"]')!;
        const panelB = host.querySelector<HTMLElement>('ar-tab-panel[name="b"]')!;
        expect(tabA.getAttribute('role')).to.equal('tab');
        expect(tabA.getAttribute('aria-selected')).to.equal('true');
        expect(tabA.getAttribute('slot')).to.equal('tab');
        expect(tabA.getAttribute('aria-controls')).to.equal(panelA.id);
        expect(panelA.hasAttribute('hidden')).to.equal(false);
        expect(panelB.hasAttribute('hidden')).to.equal(true);
    });

    it("l'activation par clic fonctionne sur un groupe rattaché tardivement", async () => {
        const outer = host.querySelector('#outer') as ArTabGroup;
        host.querySelector<HTMLElement>('ar-tab[panel="b"]')!.click();
        await outer.updateComplete;
        expect(outer.active).to.equal('b');
        expect(host.querySelector('ar-tab-panel[name="b"]')!.hasAttribute('hidden')).to.equal(
            false,
        );
        host.querySelector<HTMLElement>('ar-tab[panel="a"]')!.click();
        await outer.updateComplete;
    });

    it("les onglets d'un groupe imbriqué restent à leur groupe", async () => {
        const outer = host.querySelector('#outer') as ArTabGroup;
        const inner = host.querySelector('#inner') as ArTabGroup;
        const tabA = host.querySelector<HTMLElement>('ar-tab[panel="a"]')!;
        const tabX = host.querySelector<HTMLElement>('ar-tab[panel="x"]')!;
        // Préfixes d'id générés distincts : chaque groupe a câblé ses propres onglets.
        expect(tabX.id.split('-tab-')[0]).to.not.equal(tabA.id.split('-tab-')[0]);
        expect(tabX.getAttribute('aria-selected')).to.equal('true');

        const outerBefore = outer.active;
        host.querySelector<HTMLElement>('ar-tab[panel="y"]')!.click();
        await inner.updateComplete;
        expect(inner.active).to.equal('y');
        expect(outer.active).to.equal(outerBefore);
    });
});
