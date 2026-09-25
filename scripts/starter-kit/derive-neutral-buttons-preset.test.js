import { describe, expect, it } from 'vitest';
import { deriveNeutralButtonsPreset } from './derive-neutral-buttons-preset.js';

describe('deriveNeutralButtonsPreset', () => {
    it('remplace le texte :active du bouton primaire par du blanc', () => {
        const css = `.ar-btn-primary {
    &:active {
        background: var(--ar-button-primary-bg-active);
        color: light-dark(var(--ar-color-text), var(--ar-color-text-inverse));
    }
}`;
        const out = deriveNeutralButtonsPreset(css);
        expect(out).toMatch(/color: var\(--ar-color-white\);/);
        expect(out).not.toMatch(/light-dark\(var\(--ar-color-text\)/);
    });

    it('lève si le token n’est pas trouvé — format source changé', () => {
        expect(() => deriveNeutralButtonsPreset('.ar-btn { color: red; }')).toThrow(
            /non substituée/,
        );
    });
});
