import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ArDatepicker } from './datepicker.js';
import { fixture, getPart, waitForUpdate } from '../../test-utils.js';
import './datepicker.js';

describe('ArDatepicker', () => {
    let el: ArDatepicker;
    afterEach(() => el?.remove());

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<ar-datepicker></ar-datepicker>');
        });

        it('monte un shadow DOM', () => expect(el.shadowRoot).not.toBeNull());
        it('contient un input part="input"', () => expect(getPart(el, 'input')).not.toBeNull());
        it('contient un bouton part="trigger"', () =>
            expect(getPart(el, 'trigger')).not.toBeNull());
        it('contient un div part="panel"', () => expect(getPart(el, 'panel')).not.toBeNull());
        it('expose inputElement getter', () =>
            expect(el.inputElement).toBeInstanceOf(HTMLInputElement));
    });

    describe('valeurs par défaut', () => {
        beforeEach(async () => {
            el = await fixture('<ar-datepicker></ar-datepicker>');
        });

        it('format vaut "dd/MM/yyyy"', () => expect(el.format).toBe('dd/MM/yyyy'));
        it('disabled vaut false', () => expect(el.disabled).toBe(false));
        it('readonly vaut false', () => expect(el.readonly).toBe(false));
        it('open vaut false', () => expect(el.open).toBe(false));
    });

    describe('propriétés reflect', () => {
        beforeEach(async () => {
            el = await fixture('<ar-datepicker></ar-datepicker>');
        });

        it('disabled se reflète en attribut', async () => {
            el.disabled = true;
            await waitForUpdate(el);
            expect(el.hasAttribute('disabled')).toBe(true);
        });

        it('readonly se reflète en attribut', async () => {
            el.readonly = true;
            await waitForUpdate(el);
            expect(el.hasAttribute('readonly')).toBe(true);
        });

        it('has-error se reflète quand le slot error a du contenu', async () => {
            el = await fixture(`
                <ar-datepicker>
                    <span slot="error">Date invalide</span>
                </ar-datepicker>
            `);
            await waitForUpdate(el);
            expect(el.hasAttribute('has-error')).toBe(true);
        });
    });
});
