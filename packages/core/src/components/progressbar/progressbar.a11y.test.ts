/// <reference types="mocha" />
/**
 * progressbar.a11y.test.ts
 *
 * Tests d'accessibilité axe-core pour ar-progressbar, via @web/test-runner (Chromium).
 */
import { fixture, html, expect } from '@open-wc/testing';
import './progressbar.js';

describe('ar-progressbar — accessibilité', () => {
    it('barre de progression a 0% est accessible', async () => {
        const el = await fixture(html`
            <ar-progressbar percent="0">Chargement du fichier</ar-progressbar>
        `);
        await expect(el).to.be.accessible();
    });

    it('barre de progression a 50% est accessible', async () => {
        const el = await fixture(html`
            <ar-progressbar percent="50">Chargement du fichier</ar-progressbar>
        `);
        await expect(el).to.be.accessible();
    });

    it('barre de progression a 100% est accessible', async () => {
        const el = await fixture(html`
            <ar-progressbar percent="100">Chargement termine</ar-progressbar>
        `);
        await expect(el).to.be.accessible();
    });
});
