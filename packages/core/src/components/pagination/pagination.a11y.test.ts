/// <reference types="mocha" />
/**
 * pagination.a11y.test.ts
 *
 * Tests d'accessibilité axe-core pour ar-pagination, via @web/test-runner (Chromium).
 */
import { fixture, html, expect } from '@open-wc/testing';
import './pagination.js';

describe('ar-pagination — accessibilité', () => {
    it('premiere page est accessible', async () => {
        const el = await fixture(html`<ar-pagination current="1" total="5"></ar-pagination>`);
        await expect(el).to.be.accessible();
    });

    it('milieu de liste est accessible', async () => {
        const el = await fixture(html`<ar-pagination current="3" total="10"></ar-pagination>`);
        await expect(el).to.be.accessible();
    });

    it('derniere page est accessible', async () => {
        const el = await fixture(html`<ar-pagination current="5" total="5"></ar-pagination>`);
        await expect(el).to.be.accessible();
    });

    it('variante "dark" est accessible', async () => {
        const el = await fixture(
            html`<ar-pagination current="2" total="5" variant="dark"></ar-pagination>`,
        );
        await expect(el).to.be.accessible();
    });
});
