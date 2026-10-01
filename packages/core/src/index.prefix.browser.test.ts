/// <reference types="mocha" />
/**
 * Le barrel (mêmes modules que le bundle CDN `cdn/index.js` et que l'entrée npm `.`) honore
 * `window.ARIANE_CONFIG.prefix` (#296). Un fichier = une page : la configuration est posée avant
 * l'import dynamique, qui est le premier à évaluer les `index.ts` des composants.
 */
import { expect } from '@open-wc/testing';

const NAMES = [
    'alert',
    'breadcrumb',
    'breadcrumb-item',
    'charcounter',
    'collapse',
    'datepicker',
    'dialog',
    'dropdown',
    'dropdown-item',
    'pagination',
    'progressbar',
    'spinner',
    'stepper',
    'stepper-item',
    'tab',
    'tab-group',
    'tab-panel',
    'table-sort',
    'tooltip',
];

const isDefined = (tag: string): boolean => customElements.get(tag) !== undefined;

describe('barrel — préfixe personnalisé (#296)', () => {
    before(async () => {
        window.ARIANE_CONFIG = { prefix: 'x' };
        await import('./index.js');
    });

    for (const name of NAMES) {
        it(`définit x-${name} et pas ar-${name}`, () => {
            expect(isDefined(`x-${name}`), `x-${name} défini`).to.equal(true);
            expect(isDefined(`ar-${name}`), `ar-${name} défini`).to.equal(false);
        });
    }
});
