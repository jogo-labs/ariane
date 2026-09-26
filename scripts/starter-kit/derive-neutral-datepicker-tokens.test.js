import { describe, expect, it } from 'vitest';
import { deriveNeutralDatepickerTokens } from './derive-neutral-datepicker-tokens.js';

const SAMPLE = `:root {
    --ar-datepicker-day-selected-bg: var(--ar-color-primary-70);
    --ar-datepicker-day-selected-color: var(--ar-color-neutral-10);
}
ar-datepicker {
    &::part(trigger):not(:disabled):active {
        background: var(--ar-button-primary-bg-active);
        color: light-dark(var(--ar-color-text), var(--ar-color-text-inverse));
    }
}`;

describe('deriveNeutralDatepickerTokens', () => {
    it('remplace --ar-datepicker-day-selected-color par du blanc', () => {
        const out = deriveNeutralDatepickerTokens(SAMPLE);
        expect(out).toMatch(/--ar-datepicker-day-selected-color: var\(--ar-color-white\);/);
        // le fond n'est pas touché par cette fonction (déjà neutralisé par
        // deriveNeutralPalette côté _palette.css)
        expect(out).toMatch(/--ar-datepicker-day-selected-bg: var\(--ar-color-primary-70\);/);
    });

    it('remplace la couleur de texte du trigger :active par du blanc', () => {
        const out = deriveNeutralDatepickerTokens(SAMPLE);
        expect(out).toMatch(/color: var\(--ar-color-white\);/);
        expect(out).not.toMatch(/light-dark\(var\(--ar-color-text\)/);
    });

    it('lève si --ar-datepicker-day-selected-color n’est pas trouvé — format source changé', () => {
        expect(() =>
            deriveNeutralDatepickerTokens(
                `ar-datepicker { &::part(trigger):active { color: light-dark(var(--ar-color-text), var(--ar-color-text-inverse)); } }`,
            ),
        ).toThrow(/day-selected-color non substitué/);
    });

    it('lève si la couleur du trigger :active n’est pas trouvée — format source changé', () => {
        const noTrigger = `:root {
    --ar-datepicker-day-selected-bg: var(--ar-color-primary-70);
    --ar-datepicker-day-selected-color: var(--ar-color-neutral-10);
}`;
        expect(() => deriveNeutralDatepickerTokens(noTrigger)).toThrow(
            /trigger :active non substituée/,
        );
    });
});
