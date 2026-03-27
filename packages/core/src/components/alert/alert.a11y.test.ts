/// <reference types="mocha" />
/**
 * alert.a11y.test.ts
 *
 * Tests d'accessibilité axe-core pour ar-alert, via @web/test-runner (Chromium).
 * fixture() de @open-wc/testing attend déjà updateComplete — aucun délai supplémentaire requis.
 */
import { fixture, html, expect } from '@open-wc/testing';
import './alert.js';

describe('ar-alert — accessibilité', () => {
    it('version "info" est accessible', async () => {
        const el = await fixture(html`
            <ar-alert version="info">
                <span slot="title">Information importante</span>
                <span slot="content">Voici un message informatif.</span>
            </ar-alert>
        `);
        await expect(el).to.be.accessible();
    });

    it('version "success" est accessible', async () => {
        const el = await fixture(html`
            <ar-alert version="success">
                <span slot="title">Succès</span>
                <span slot="content">L'opération a réussi.</span>
            </ar-alert>
        `);
        await expect(el).to.be.accessible();
    });

    it('version "warning" est accessible', async () => {
        const el = await fixture(html`
            <ar-alert version="warning">
                <span slot="title">Attention</span>
                <span slot="content">Vérifiez vos informations.</span>
            </ar-alert>
        `);
        await expect(el).to.be.accessible();
    });

    it('version "error" est accessible', async () => {
        const el = await fixture(html`
            <ar-alert version="error">
                <span slot="title">Erreur</span>
                <span slot="content">Une erreur s'est produite.</span>
            </ar-alert>
        `);
        await expect(el).to.be.accessible();
    });

    it('avec bouton de fermeture (next-focus) est accessible', async () => {
        const container = await fixture(html`
            <div>
                <button id="focus-target">Retour</button>
                <ar-alert version="warning" next-focus="focus-target">
                    <span slot="title">Attention</span>
                    <span slot="content">Vérifiez vos informations.</span>
                </ar-alert>
            </div>
        `);
        const el = container.querySelector('ar-alert');
        if (!el) throw new Error('ar-alert not found in fixture');
        await expect(el).to.be.accessible();
    });
});
