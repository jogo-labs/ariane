import { describe, expect, it } from 'vitest';
import { deriveNeutralDatepickerTokens } from './derive-neutral-datepicker-tokens.js';

describe('deriveNeutralDatepickerTokens', () => {
    it('remplace --ar-datepicker-day-selected-color par du blanc', () => {
        const css = `:root {
    --ar-datepicker-day-selected-bg: var(--ar-color-primary-70);
    --ar-datepicker-day-selected-color: var(--ar-color-neutral-10);
}`;
        const out = deriveNeutralDatepickerTokens(css);
        expect(out).toMatch(/--ar-datepicker-day-selected-color: var\(--ar-color-white\);/);
        // le fond n'est pas touché par cette fonction (déjà neutralisé par
        // deriveNeutralPalette côté _palette.css)
        expect(out).toMatch(/--ar-datepicker-day-selected-bg: var\(--ar-color-primary-70\);/);
    });

    it('lève si le token n’est pas trouvé — format source changé', () => {
        expect(() => deriveNeutralDatepickerTokens(':root { --something-else: red; }')).toThrow(
            /non substitué/,
        );
    });
});
