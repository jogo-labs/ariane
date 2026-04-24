/// <reference types="mocha" />
/**
 * dialog.a11y.test.ts
 *
 * Tests d'accessibilité structurels pour ar-dialog, via @web/test-runner.
 * Les comportements dynamiques dépendants de showModal() ou des annonces
 * document-level sont couverts ailleurs pour éviter les blocages du runner.
 */
import { fixture, html, expect } from '@open-wc/testing';
import type { ArDialog } from './dialog.js';
import './dialog.js';

function requireShadow(el: Element): ShadowRoot {
    if (!el.shadowRoot) throw new Error(`shadowRoot absent sur <${el.tagName.toLowerCase()}>`);
    return el.shadowRoot;
}

function requireDialog(el: ArDialog): HTMLDialogElement {
    const dialogEl = requireShadow(el).querySelector('dialog');
    if (!(dialogEl instanceof HTMLDialogElement)) throw new Error('<dialog> introuvable');
    return dialogEl;
}

describe('ar-dialog — accessibilité', () => {
    let el: ArDialog;

    afterEach(() => {
        el?.remove();
    });

    beforeEach(async () => {
        el = await fixture(html`<ar-dialog label="Mon titre"></ar-dialog>`);
    });

    it('l\'élément <dialog> a role="dialog"', () => {
        const dialogEl = requireDialog(el);
        expect(dialogEl.getAttribute('role')).to.equal('dialog');
    });

    it('l\'élément <dialog> a aria-modal="true"', () => {
        const dialogEl = requireDialog(el);
        expect(dialogEl.getAttribute('aria-modal')).to.equal('true');
    });

    it('aria-labelledby pointe vers le titre', () => {
        const dialogEl = requireDialog(el);
        const labelId = dialogEl.getAttribute('aria-labelledby');
        expect(labelId).not.to.equal(null);
        if (!labelId) throw new Error('aria-labelledby absent');
        const title = requireShadow(el).getElementById(labelId);
        expect(title).not.to.equal(null);
        if (!title) throw new Error('titre référencé introuvable');
        expect(title.textContent).to.include('Mon titre');
    });

    it('le bouton fermer a un nom accessible via sr-only', () => {
        const closeBtn = requireShadow(el).querySelector('[data-ar-dismiss]');
        if (!(closeBtn instanceof HTMLElement)) throw new Error('[data-ar-dismiss] introuvable');
        const label = closeBtn.querySelector('.sr-only');
        expect(label).not.to.equal(null);
        if (!label) throw new Error('.sr-only introuvable');
        expect(label.textContent?.trim()).to.equal('Fermer');
    });

    it('le fallback de titre fournit un nom accessible par défaut', async () => {
        el.remove();
        el = await fixture(html`<ar-dialog></ar-dialog>`);
        const dialogEl = requireDialog(el);
        const labelId = dialogEl.getAttribute('aria-labelledby');
        if (!labelId) throw new Error('aria-labelledby absent');
        const title = requireShadow(el).getElementById(labelId);
        if (!title) throw new Error('titre référencé introuvable');
        expect(title.textContent?.trim()).to.equal('Dialogue');
    });

    it('aria-describedby pointe vers le corps du dialog', () => {
        const dialogEl = requireDialog(el);
        const descId = dialogEl.getAttribute('aria-describedby');
        expect(descId).not.to.equal(null);
        if (!descId) throw new Error('aria-describedby absent');
        const body = requireShadow(el).getElementById(descId);
        expect(body).not.to.equal(null);
        expect(body?.getAttribute('part')).to.equal('body');
    });

    it('le drawer conserve les attributs ARIA du dialog', async () => {
        el.remove();
        el = await fixture(html`<ar-dialog label="Filtres" mode="drawer"></ar-dialog>`);
        const dialogEl = requireDialog(el);
        expect(dialogEl.getAttribute('role')).to.equal('dialog');
        expect(dialogEl.getAttribute('aria-modal')).to.equal('true');
    });
});
