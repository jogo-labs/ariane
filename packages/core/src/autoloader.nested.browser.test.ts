/// <reference types="mocha" />
/**
 * Éléments personnalisés imbriqués dans un nœud ajouté au DOM (#386).
 *
 * Un framework insère un bloc entier d'un coup (le `<main>` d'une application, un composant rendu) :
 * l'autoloader doit charger les `ar-*` qu'il contient, pas seulement ceux ajoutés directement.
 * Utilise l'autoloader seul (aucun composant enregistré à l'avance), dans son propre fichier pour
 * que la page de test parte d'un registre vide.
 */

import { expect } from '@open-wc/testing';

await import('../cdn/autoloader.dev.js');

const defined = (tag: string, timeoutMs = 3000): Promise<boolean> =>
    Promise.race([
        customElements.whenDefined(tag).then(() => true),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs)),
    ]);

afterEach(() => {
    document.body.innerHTML = '';
});

describe('autoloader — éléments imbriqués dans un nœud ajouté (#386)', () => {
    it('charge un composant imbriqué dans un nœud inséré en HTML', async () => {
        expect(customElements.get('ar-spinner')).to.equal(undefined);
        document.body.insertAdjacentHTML(
            'beforeend',
            '<div id="bloc"><ar-spinner id="imbrique"></ar-spinner></div>',
        );
        expect(await defined('ar-spinner')).to.equal(true);
        expect(document.getElementById('imbrique')!.shadowRoot).to.not.equal(null);
    });

    it('charge un composant imbriqué dans un sous-arbre construit hors du document', async () => {
        expect(customElements.get('ar-progressbar')).to.equal(undefined);
        const bloc = document.createElement('main');
        const section = document.createElement('section');
        const progress = document.createElement('ar-progressbar');
        section.appendChild(progress);
        bloc.appendChild(section);
        document.body.appendChild(bloc);
        expect(await defined('ar-progressbar')).to.equal(true);
        expect(progress.shadowRoot).to.not.equal(null);
    });

    it("charge toujours un composant dans le shadow root d'un hôte non personnalisé inséré", async () => {
        expect(customElements.get('ar-tooltip')).to.equal(undefined);
        const host = document.createElement('div');
        const shadow = host.attachShadow({ mode: 'open' });
        shadow.innerHTML = '<p><ar-tooltip trigger-id="x">Aide</ar-tooltip></p>';
        document.body.appendChild(host);
        expect(await defined('ar-tooltip')).to.equal(true);
        expect(shadow.querySelector('ar-tooltip')!.shadowRoot).to.not.equal(null);
    });
});
