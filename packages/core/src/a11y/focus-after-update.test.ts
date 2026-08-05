import { describe, expect, it } from 'vitest';
import { LitElement, html } from 'lit';
import { focusAfterUpdate } from './focus-after-update.js';

class FocusAfterUpdateFixture extends LitElement {
    static override properties = { showTarget: { type: Boolean } };
    showTarget = false;

    override render() {
        return html`
            <button type="button" id="always">toujours là</button>
            ${this.showTarget
                ? html`<button type="button" id="target" tabindex="-1">cible</button>`
                : ''}
        `;
    }
}
customElements.define('focus-after-update-fixture', FocusAfterUpdateFixture);

describe('focusAfterUpdate', () => {
    it('ne fait rien si aucun élément ne matche le sélecteur', async () => {
        const el = document.createElement('focus-after-update-fixture') as FocusAfterUpdateFixture;
        document.body.appendChild(el);
        await el.updateComplete;

        await expect(focusAfterUpdate(el, '#inexistant')).resolves.toBeUndefined();
        expect(el.shadowRoot?.activeElement).toBeNull();

        el.remove();
    });

    it('focalise le premier élément matchant après la fin du rendu en cours', async () => {
        const el = document.createElement('focus-after-update-fixture') as FocusAfterUpdateFixture;
        document.body.appendChild(el);
        await el.updateComplete;

        el.showTarget = true;
        // Pas de await updateComplete ici — focusAfterUpdate doit gérer l'attente lui-même.
        await focusAfterUpdate(el, '#target');

        expect(el.shadowRoot?.activeElement?.id).toBe('target');

        el.remove();
    });
});
