/// <reference types="mocha" />
/**
 * Entrée CDN `cdn/utils.js` (#305), variante production : utilitaires purs pour les utilisateurs CDN.
 * Un fichier = une page : les étapes sont ordonnées (l'import de l'index enregistre tous les
 * composants, il vient donc en dernier). Teste le bundle construit (`npm run build:bundles`).
 */
import { expect } from '@open-wc/testing';
import type * as Utils from '../cdn/utils.js';

const TAGS = ['ar-spinner', 'ar-alert', 'ar-dialog', 'ar-tooltip'];
const defined = (tag: string): boolean => customElements.get(tag) !== undefined;

describe('cdn/utils.js (production)', () => {
    let utils: typeof Utils;

    before(async () => {
        utils = await import('../cdn/utils.js');
    });

    it("n'enregistre aucun composant ar-*", () => {
        for (const tag of TAGS) expect(defined(tag), `${tag} défini`).to.equal(false);
    });

    it('exporte registerTranslation et whenAllDefined', () => {
        expect(utils.registerTranslation).to.be.a('function');
        expect(utils.whenAllDefined).to.be.a('function');
    });

    it("une traduction enregistrée par utils atteint un composant chargé par l'autoloader", async () => {
        utils.registerTranslation({
            $code: 'zz',
            $name: 'Test',
            $dir: 'ltr',
            loading: 'Texte via utils',
        } as Parameters<typeof utils.registerTranslation>[0]);
        await import('../cdn/autoloader.js');

        const el = document.createElement('ar-spinner');
        el.setAttribute('lang', 'zz');
        document.body.appendChild(el);
        await customElements.whenDefined('ar-spinner');
        await (el as unknown as { updateComplete: Promise<boolean> }).updateComplete;

        expect(el.shadowRoot?.querySelector('[part="status"] p')?.textContent).to.equal(
            'Texte via utils',
        );
        // Seul le composant utilisé est chargé : l'autoloader reste paresseux.
        expect(defined('ar-alert'), 'ar-alert défini').to.equal(false);
        el.remove();
    });

    it('partage les fonctions (et le registre) avec cdn/index.js', async () => {
        const index = await import('../cdn/index.js');
        expect(utils.registerTranslation).to.equal(index.registerTranslation);
        expect(utils.whenAllDefined).to.equal(index.whenAllDefined);
    });
});
