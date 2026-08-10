/// <reference types="mocha" />
/**
 * pagination.a11y.test.ts
 *
 * Tests d'accessibilité axe-core pour ar-pagination, via @web/test-runner (Chromium).
 */
import { fixture, html, expect } from '@open-wc/testing';
import './index.js';

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

    it('avec ellipses (total élevé) est accessible', async () => {
        const el = await fixture(html`<ar-pagination current="8" total="20"></ar-pagination>`);
        await expect(el).to.be.accessible();
    });

    it('palier select (largeur insuffisante) est accessible', async () => {
        const el = await fixture(html`<ar-pagination current="8" total="20"></ar-pagination>`);
        // Force le palier select sans dépendre d'un ResizeObserver réel en test — même technique
        // que pagination.browser.test.ts pour simuler un budget mesuré très restreint.
        (el as unknown as { _budget: number })._budget = 2;
        (el as unknown as { requestUpdate: () => void }).requestUpdate();
        await (el as unknown as { updateComplete: Promise<boolean> }).updateComplete;
        await expect(el).to.be.accessible();
    });
});
