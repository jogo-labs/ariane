/// <reference types="mocha" />
import { LitElement, html } from 'lit';
import { expect } from '@open-wc/testing';
import { whenAllDefined } from './when-all-defined.js';

class NestedParent extends LitElement {
    override render() {
        return html`<wad-child></wad-child>`;
    }
}

class NestedChild extends LitElement {
    override render() {
        return html`<span id="content">ok</span>`;
    }
}

describe('whenAllDefined (navigateur)', () => {
    it('attend un enfant rendu dans le shadow DOM d’un composant Lit parent', async () => {
        const host = document.createElement('div');
        host.innerHTML = '<wad-parent></wad-parent>';
        document.body.appendChild(host);
        const parent = host.querySelector('wad-parent') as LitElement;

        const promise = whenAllDefined({ prefix: 'wad-', root: host });
        customElements.define('wad-parent', NestedParent);
        setTimeout(() => customElements.define('wad-child', NestedChild), 20);
        await promise;

        const child = parent.shadowRoot?.querySelector('wad-child') as LitElement;
        expect(child.shadowRoot?.querySelector('#content')).to.not.equal(null);
        host.remove();
    });
});
