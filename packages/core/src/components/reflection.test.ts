import { afterEach, describe, expect, it } from 'vitest';
import { fixture, waitForUpdate } from '../test-utils.js';
import './breadcrumb-item/index.js';
import './charcounter/index.js';
import './datepicker/index.js';
import './stepper/index.js';
import './stepper-item/index.js';

/** Réglages primitifs reflétés en attribut (#374) : [balise, propriété, attribut, valeur posée]. */
const REFLECTED: [string, string, string, string | number | boolean][] = [
    ['ar-breadcrumb-item', 'label', 'label', 'Accueil'],
    ['ar-breadcrumb-item', 'href', 'href', '/accueil'],
    ['ar-charcounter', 'max', 'max', 20],
    ['ar-datepicker', 'format', 'format', 'yyyy-MM-dd'],
    ['ar-datepicker', 'min', 'min', '2026-01-01'],
    ['ar-datepicker', 'max', 'max', '2026-12-31'],
    ['ar-datepicker', 'placeholder', 'placeholder', 'jj/mm/aaaa'],
    ['ar-datepicker', 'autocomplete', 'autocomplete', 'bday'],
    ['ar-datepicker', 'label', 'label', 'Date de naissance'],
    ['ar-stepper-item', 'path', 'path', 'e1'],
    ['ar-stepper-item', 'label', 'label', 'Étape 1'],
    ['ar-stepper-item', 'href', 'href', '/etape-1'],
    ['ar-stepper', 'mode', 'mode', 'edit'],
    ['ar-stepper', 'followScroll', 'follow-scroll', true],
];

describe('reflet des réglages primitifs en attribut', () => {
    let el: HTMLElement;

    afterEach(() => el?.remove());

    describe.each(REFLECTED)('%s.%s', (tag, prop, attribute, value) => {
        it(`pose l'attribut ${attribute} quand la propriété est affectée`, async () => {
            el = await fixture(`<${tag}></${tag}>`);
            (el as unknown as Record<string, unknown>)[prop] = value;
            await waitForUpdate(el);
            expect(el.getAttribute(attribute)).toBe(value === true ? '' : String(value));
        });

        it(`n'écrit pas l'attribut ${attribute} au montage`, async () => {
            el = await fixture(`<${tag}></${tag}>`);
            expect(el.hasAttribute(attribute)).toBe(false);
        });

        it(`revient à la valeur par défaut quand l'attribut ${attribute} est retiré`, async () => {
            el = await fixture(`<${tag}></${tag}>`);
            const record = el as unknown as Record<string, unknown>;
            const initial = record[prop];
            record[prop] = value;
            await waitForUpdate(el);
            el.removeAttribute(attribute);
            await waitForUpdate(el);
            // Sans valeur par défaut (`undefined`), Lit convertit l'attribut absent en `null`.
            expect(record[prop] ?? undefined).toBe(initial ?? undefined);
        });
    });
});
