import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { afterEach, describe, expect, it } from 'vitest';
import { HasSlotController } from './has-slot.controller.js';
import { fixture, waitForUpdate } from '../test-utils.js';

// ── Fixture component ──────────────────────────────────────────────────────────

@customElement('test-has-slot')
class TestHasSlot extends LitElement {
    readonly slots = new HasSlotController(this, '[default]', 'footer');

    override render() {
        return html`
            ${this.slots.test('[default]') ? html`<span id="has-default">yes</span>` : ''}
            ${this.slots.test('footer') ? html`<span id="has-footer">yes</span>` : ''}
            <slot></slot>
            <slot name="footer"></slot>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'test-has-slot': TestHasSlot;
    }
}

// ──────────────────────────────────────────────────────────────────────────────

describe('HasSlotController', () => {
    let el: TestHasSlot;

    afterEach(() => {
        el?.remove();
    });

    describe('slot par défaut', () => {
        it('test("[default]") est false sans contenu', async () => {
            el = await fixture('<test-has-slot></test-has-slot>');
            expect(el.slots.test('[default]')).toBe(false);
            expect(el.shadowRoot?.getElementById('has-default')).toBeNull();
        });

        it('test("[default]") est true avec un nœud texte non vide', async () => {
            el = await fixture('<test-has-slot>Contenu texte</test-has-slot>');
            expect(el.slots.test('[default]')).toBe(true);
            expect(el.shadowRoot?.getElementById('has-default')).not.toBeNull();
        });

        it('test("[default]") est true avec un élément enfant sans slot', async () => {
            el = await fixture('<test-has-slot><p>Paragraphe</p></test-has-slot>');
            expect(el.slots.test('[default]')).toBe(true);
        });

        it('test("[default]") est false pour un nœud texte vide (espaces)', async () => {
            el = await fixture('<test-has-slot>   </test-has-slot>');
            expect(el.slots.test('[default]')).toBe(false);
        });
    });

    describe('slot nommé', () => {
        it('test("footer") est false sans slot footer', async () => {
            el = await fixture('<test-has-slot></test-has-slot>');
            expect(el.slots.test('footer')).toBe(false);
            expect(el.shadowRoot?.getElementById('has-footer')).toBeNull();
        });

        it('test("footer") est true avec un enfant slot="footer"', async () => {
            el = await fixture('<test-has-slot><button slot="footer">OK</button></test-has-slot>');
            expect(el.slots.test('footer')).toBe(true);
            expect(el.shadowRoot?.getElementById('has-footer')).not.toBeNull();
        });

        it('un élément avec un autre slot nommé ne déclenche pas footer', async () => {
            el = await fixture('<test-has-slot><span slot="label">Titre</span></test-has-slot>');
            expect(el.slots.test('footer')).toBe(false);
        });
    });

    describe('réactivité slotchange', () => {
        it('retire le slot footer : test("footer") devient false', async () => {
            el = await fixture(
                '<test-has-slot><button slot="footer" id="f">OK</button></test-has-slot>',
            );
            expect(el.slots.test('footer')).toBe(true);

            (el.querySelector('#f') as Element).remove();
            await waitForUpdate(el);

            expect(el.slots.test('footer')).toBe(false);
            expect(el.shadowRoot?.getElementById('has-footer')).toBeNull();
        });
    });

    describe('cycle de vie', () => {
        it('déconnexion puis reconnexion conserve la détection de slot', async () => {
            el = await fixture('<test-has-slot><button slot="footer">OK</button></test-has-slot>');
            expect(el.slots.test('footer')).toBe(true);

            const parent = el.parentElement as HTMLElement;
            parent.removeChild(el);
            parent.appendChild(el);
            await waitForUpdate(el);

            expect(el.slots.test('footer')).toBe(true);
        });
    });
});
