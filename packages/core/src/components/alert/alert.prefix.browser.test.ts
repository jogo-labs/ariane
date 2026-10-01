/// <reference types="mocha" />
/**
 * L'import d'un seul composant (`dist/components/alert/index.js`, proposé en CDN page par page)
 * honore `window.ARIANE_CONFIG.prefix` (#296) et n'enregistre rien d'autre.
 */
import { expect } from '@open-wc/testing';

const isDefined = (tag: string): boolean => customElements.get(tag) !== undefined;

describe('import d’un composant seul — préfixe personnalisé (#296)', () => {
    before(async () => {
        window.ARIANE_CONFIG = { prefix: 'x' };
        await import('./index.js');
    });

    it('définit x-alert et pas ar-alert', () => {
        expect(isDefined('x-alert'), 'x-alert défini').to.equal(true);
        expect(isDefined('ar-alert'), 'ar-alert défini').to.equal(false);
    });

    it("n'enregistre aucun autre composant", () => {
        expect(isDefined('x-tooltip'), 'x-tooltip défini').to.equal(false);
        expect(isDefined('x-dialog'), 'x-dialog défini').to.equal(false);
    });
});
