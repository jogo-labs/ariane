/// <reference types="mocha" />
/**
 * spinner.a11y.test.ts
 *
 * Tests d'accessibilité axe-core pour ar-spinner, via @web/test-runner (Chromium).
 */
import { fixture, html, expect } from '@open-wc/testing';
import './spinner.js';

describe('ar-spinner — accessibilité', () => {
    it('en cours de chargement est accessible', async () => {
        const el = await fixture(html`<ar-spinner></ar-spinner>`);
        await expect(el).to.be.accessible();
    });

    it('avec etat termine est accessible', async () => {
        const el = await fixture(html`<ar-spinner done></ar-spinner>`);
        await expect(el).to.be.accessible();
    });

    it('avec labels personnalises est accessible', async () => {
        const el = await fixture(html`
            <ar-spinner
                loading-label="Chargement de l'image en cours"
                done-label="Image chargee avec succes"
            ></ar-spinner>
        `);
        await expect(el).to.be.accessible();
    });
});
