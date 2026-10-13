/// <reference types="mocha" />
/**
 * Rôle d'ar-alert dans l'arbre d'accessibilité réel (Chromium, par CDP) : le défaut vient de
 * `ElementInternals.role`, l'attribut `role` de l'auteur le remplace, et le composant n'écrit
 * jamais l'attribut `role` lui-même. WebKit : seuls les tests sans arbre d'accessibilité tournent.
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
    return (await executeServerCommand('ax-role', { selector: `#${el.id}` })) as AxNode | null;
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
        it(`variant="${variant}" expose le rôle ${expected} sans attribut role`, async function () {
            el = await fixture(html`<ar-alert variant=${variant}>Message</ar-alert>`);
            expect(el.hasAttribute('role')).to.equal(false);
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

    it("retirer l'attribut role restaure le défaut de la variante", async function () {
        el = await fixture(html`<ar-alert variant="error" role="status">Message</ar-alert>`);
        el.removeAttribute('role');
        await el.updateComplete;
        const node = await axRole(el);
        if (node === null) return this.skip();
        expect(node.role).to.equal('alert');
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
        expect(silent.role).to.not.equal('alert');

        el.removeAttribute('without-notification');
        await el.updateComplete;
        expect((await axRole(el))?.role).to.equal('alert');
    });

    it("n'écrit jamais l'attribut role, même quand le rôle change", async () => {
        const seen: string[] = [];
        const host = document.createElement('div');
        document.body.append(host);
        const observer = new MutationObserver((records) => {
            for (const r of records) if (r.attributeName === 'role') seen.push('role');
        });
        el = document.createElement('ar-alert') as ArAlert;
        observer.observe(el, { attributes: true, attributeFilter: ['role'] });
        el.setAttribute('variant', 'error');
        host.append(el);
        await el.updateComplete;
        el.setAttribute('variant', 'info');
        await el.updateComplete;
        // Les enregistrements en attente sont livrés au prochain micro-tâche.
        await Promise.resolve();
        observer.disconnect();
        host.remove();
        expect(seen).to.deep.equal([]);
    });
});
