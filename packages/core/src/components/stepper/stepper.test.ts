import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ArStepper } from './stepper.js';
import { fixture } from '../../test-utils.js';
import './stepper.js';

describe('ArStepper', () => {
    let el: ArStepper;

    afterEach(() => el?.remove());

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<ar-stepper></ar-stepper>');
        });

        it('monte un shadow DOM', () => {
            expect(el.shadowRoot).not.toBeNull();
        });

        // it('contient un élément racine avec part="base"', () => {
        //     expect(el.shadowRoot!.querySelector('[part="base"]')).not.toBeNull();
        // });
    });
});
