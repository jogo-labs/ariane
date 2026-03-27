/// <reference types="mocha" />
/**
 * stepper.a11y.test.ts
 *
 * Tests d'accessibilité axe-core pour ar-stepper, via @web/test-runner (Chromium).
 * aTimeout(0) laisse les queueMicrotask internes (construction de l'arbre) se vider
 * avant le contrôle axe.
 */
import { fixture, html, expect, aTimeout } from '@open-wc/testing';
import './stepper.js';
import '../stepper-item/stepper-item.js';

describe('ar-stepper — accessibilité', () => {
    it('stepper desktop (mode create, etape 1) est accessible', async () => {
        const el = await fixture(html`
            <ar-stepper current-path="/step1">
                <ar-stepper-item path="/step1" label="Informations" href="/step1"></ar-stepper-item>
                <ar-stepper-item path="/step2" label="Confirmation" href="/step2"></ar-stepper-item>
                <ar-stepper-item path="/step3" label="Paiement" href="/step3"></ar-stepper-item>
            </ar-stepper>
        `);
        await aTimeout(0);
        await expect(el).to.be.accessible();
    });

    it('stepper desktop (mode edit) est accessible', async () => {
        const el = await fixture(html`
            <ar-stepper current-path="/step2" mode="edit">
                <ar-stepper-item path="/step1" label="Informations" href="/step1"></ar-stepper-item>
                <ar-stepper-item path="/step2" label="Confirmation" href="/step2"></ar-stepper-item>
                <ar-stepper-item path="/step3" label="Paiement" href="/step3"></ar-stepper-item>
            </ar-stepper>
        `);
        await aTimeout(0);
        await expect(el).to.be.accessible();
    });
});
