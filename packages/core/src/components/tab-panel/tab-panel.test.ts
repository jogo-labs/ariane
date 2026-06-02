import { afterEach, describe, expect, it } from 'vitest';
import { fixture, waitForUpdate } from '../../test-utils.js';
import type { ArTabPanel } from './tab-panel.js';
import './tab-panel.js';

describe('ArTabPanel', () => {
    let el: ArTabPanel;
    afterEach(() => el?.remove());

    describe('rendu', () => {
        it('monte un shadow DOM avec un slot', async () => {
            el = await fixture('<ar-tab-panel name="a">Contenu</ar-tab-panel>');
            expect(el.shadowRoot).not.toBeNull();
            expect(el.shadowRoot?.querySelector('slot')).not.toBeNull();
        });
    });

    describe('valeurs par défaut', () => {
        it('name vaut chaîne vide', async () => {
            el = await fixture('<ar-tab-panel>Contenu</ar-tab-panel>');
            expect(el.name).toBe('');
        });
    });

    describe('attribut name', () => {
        it("lit name depuis l'attribut HTML", async () => {
            el = await fixture('<ar-tab-panel name="intro">Contenu</ar-tab-panel>');
            expect(el.name).toBe('intro');
        });

        it('reflète name en attribut', async () => {
            el = await fixture('<ar-tab-panel name="intro">Contenu</ar-tab-panel>');
            el.name = 'usage';
            await waitForUpdate(el);
            expect(el.getAttribute('name')).toBe('usage');
        });
    });
});
