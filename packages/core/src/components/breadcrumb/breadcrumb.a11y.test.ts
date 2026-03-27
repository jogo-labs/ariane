/// <reference types="mocha" />
/**
 * breadcrumb.a11y.test.ts
 *
 * Tests d'accessibilité axe-core pour ar-breadcrumb, via @web/test-runner (Chromium).
 * aTimeout(0) laisse les queueMicrotask internes (collecte des items) se vider
 * avant le contrôle axe.
 */
import { fixture, html, expect, aTimeout } from '@open-wc/testing';
import './breadcrumb.js';
import '../breadcrumb-item/breadcrumb-item.js';

describe('ar-breadcrumb — accessibilité', () => {
    it("fil d'ariane avec plusieurs items est accessible", async () => {
        const el = await fixture(html`
            <ar-breadcrumb>
                <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                <ar-breadcrumb-item label="Catégorie" href="/cat"></ar-breadcrumb-item>
                <ar-breadcrumb-item label="Page actuelle"></ar-breadcrumb-item>
            </ar-breadcrumb>
        `);
        await aTimeout(0);
        await expect(el).to.be.accessible();
    });

    it("fil d'ariane avec deux items est accessible", async () => {
        const el = await fixture(html`
            <ar-breadcrumb>
                <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                <ar-breadcrumb-item label="Page actuelle"></ar-breadcrumb-item>
            </ar-breadcrumb>
        `);
        await aTimeout(0);
        await expect(el).to.be.accessible();
    });
});
