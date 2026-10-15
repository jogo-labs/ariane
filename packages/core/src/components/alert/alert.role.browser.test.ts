/// <reference types="mocha" />
/**
 * Rôle d'ar-alert : le composant écrit l'attribut `role` de l'hôte (les lecteurs d'écran s'appuient
 * sur l'attribut du DOM, pas sur `ElementInternals.role`, #334), sauf si l'auteur l'a posé. Les
 * assertions sur l'arbre d'accessibilité réel (Chromium, par CDP) vérifient le rôle calculé ;
 * WebKit : seuls les tests d'attribut tournent.
 */
import { executeServerCommand } from '@web/test-runner-commands';
import { expect, fixture, html } from '@open-wc/testing';
import type { ArAlert } from './alert.js';
import './index.js';

document.documentElement.lang = 'fr';

interface AxNode {
    role: string | null;
    ignored: boolean;
}

let counter = 0;

/** Rôle calculé de l'élément dans l'arbre d'accessibilité, `null` si le moteur ne le permet pas. */
async function axRole(el: Element): Promise<AxNode | null> {
    el.id ||= `ax-target-${counter++}`;
    const result = (await executeServerCommand('ax-role', { selector: `#${el.id}` })) as
        AxNode | { unsupported: true };
    return 'unsupported' in result ? null : result;
}

describe('ar-alert — rôle dans l’arbre d’accessibilité', () => {
    let el: ArAlert;
    afterEach(() => el?.remove());

    const cases: Array<[string, string]> = [
        ['error', 'alert'],
        ['warning', 'alert'],
        ['success', 'status'],
        ['info', 'status'],
        ['custom', 'status'],
    ];

    for (const [variant, expected] of cases) {
        it(`variant="${variant}" écrit role="${expected}" et l'expose`, async function () {
            el = await fixture(html`<ar-alert variant=${variant}>Message</ar-alert>`);
            expect(el.getAttribute('role')).to.equal(expected);
            const node = await axRole(el);
            if (node === null) return this.skip();
            expect(node.role).to.equal(expected);
        });
    }

    it('role="status" écrit sur une error remplace le défaut', async function () {
        el = await fixture(html`<ar-alert variant="error" role="status">Message</ar-alert>`);
        const node = await axRole(el);
        if (node === null) return this.skip();
        expect(node.role).to.equal('status');
    });

    it('role="alert" écrit sur une info remplace le défaut', async function () {
        el = await fixture(html`<ar-alert variant="info" role="alert">Message</ar-alert>`);
        const node = await axRole(el);
        if (node === null) return this.skip();
        expect(node.role).to.equal('alert');
    });

    it("un role d'auteur retiré rend l'attribut au composant à la mise à jour suivante", async function () {
        el = await fixture(html`<ar-alert variant="error" role="status">Message</ar-alert>`);
        el.removeAttribute('role');
        el.setAttribute('variant', 'warning');
        await el.updateComplete;
        expect(el.getAttribute('role')).to.equal('alert');
        const node = await axRole(el);
        if (node === null) return this.skip();
        expect(node.role).to.equal('alert');
    });

    it("un role posé après la connexion (liaison de framework) l'emporte, aussi dans l'arbre", async function () {
        el = await fixture(html`<ar-alert variant="error">Message</ar-alert>`);
        expect(el.getAttribute('role')).to.equal('alert');
        el.setAttribute('role', 'status');
        el.setAttribute('variant', 'warning');
        await el.updateComplete;
        expect(el.getAttribute('role')).to.equal('status');
        const node = await axRole(el);
        if (node === null) return this.skip();
        expect(node.role).to.equal('status');
    });

    it('changer variant à chaud met à jour le rôle', async function () {
        el = await fixture(html`<ar-alert variant="info">Message</ar-alert>`);
        el.setAttribute('variant', 'error');
        await el.updateComplete;
        const node = await axRole(el);
        if (node === null) return this.skip();
        expect(node.role).to.equal('alert');
    });

    it('without-notification retire le rôle, et le rétablit une fois retiré', async function () {
        el = await fixture(html`<ar-alert variant="error" without-notification>Message</ar-alert>`);
        const silent = await axRole(el);
        if (silent === null) return this.skip();
        expect(silent.role).to.equal('generic');

        el.removeAttribute('without-notification');
        await el.updateComplete;
        expect((await axRole(el))?.role).to.equal('alert');
    });

    it('without-notification posé à chaud sur une alerte active retire son rôle', async function () {
        el = await fixture(html`<ar-alert variant="error">Message</ar-alert>`);
        const active = await axRole(el);
        if (active === null) return this.skip();
        expect(active.role).to.equal('alert');

        el.setAttribute('without-notification', '');
        await el.updateComplete;
        expect((await axRole(el))?.role).to.equal('generic');
    });

    it("écrit le role dès l'insertion, avant le premier rendu", () => {
        const host = document.createElement('div');
        document.body.append(host);
        el = document.createElement('ar-alert') as ArAlert;
        el.setAttribute('variant', 'error');
        host.append(el);
        expect(el.hasUpdated).to.equal(false);
        expect(el.getAttribute('role')).to.equal('alert');
        host.remove();
    });

    it('les sélecteurs sur l’attribut role trouvent les alertes (ar-alert[role])', async () => {
        el = await fixture(html`<ar-alert variant="error">Message</ar-alert>`);
        expect(document.querySelectorAll('ar-alert[role="alert"]').length).to.be.greaterThan(0);
    });
});
