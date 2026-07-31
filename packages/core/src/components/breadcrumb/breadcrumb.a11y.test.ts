/// <reference types="mocha" />
/**
 * breadcrumb.a11y.test.ts
 *
 * Tests d'accessibilité axe-core pour ar-breadcrumb, via @web/test-runner (Chromium).
 * aTimeout(0) laisse les queueMicrotask internes (collecte des items) se vider
 * avant le contrôle axe.
 */
import { fixture, html, expect, aTimeout } from '@open-wc/testing';
import './index.js';
import '../breadcrumb-item/index.js';
import type { ArBreadcrumb } from './breadcrumb.js';

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

    it("fil d'ariane mobile avec le panel ouvert est accessible (puces et séparateur décoratifs)", async () => {
        const el = await fixture<ArBreadcrumb>(html`
            <ar-breadcrumb style="width:400px">
                <ar-breadcrumb-item label="Accueil" href="/"></ar-breadcrumb-item>
                <ar-breadcrumb-item label="Catégorie" href="/cat"></ar-breadcrumb-item>
                <ar-breadcrumb-item label="Page actuelle"></ar-breadcrumb-item>
            </ar-breadcrumb>
        `);
        (el as ArBreadcrumb & { isMobile: boolean }).isMobile = true;
        await el.updateComplete;
        await aTimeout(0);

        const trigger = el.shadowRoot?.querySelector<HTMLButtonElement>('[part="trigger"]');
        if (!trigger) throw new Error('[part="trigger"] introuvable');
        trigger.click();
        await aTimeout(50);

        await expect(el).to.be.accessible();
    });
});
