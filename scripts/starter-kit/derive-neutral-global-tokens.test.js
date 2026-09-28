import { describe, expect, it } from 'vitest';
import { deriveNeutralGlobalTokens } from './derive-neutral-global-tokens.js';

const SAMPLE = `:root {
    --ar-font-size-md: 1rem;
    --ar-border-radius-sm: 0.25rem; /* 4px, inchangé */
    --ar-border-radius-md: 0.5rem; /* 8px (était 6px) */
    --ar-border-radius-lg: 0.875rem; /* 14px (était 8px) */
    --ar-border-radius-xl: 1.5rem; /* 24px (était 12px) */
    --ar-border-radius-full: 9999px;
    --ar-button-height: 2.5rem;
    --ar-button-primary-color: var(--ar-color-neutral-10);
}`;

describe('deriveNeutralGlobalTokens', () => {
    it('remplace uniquement sm/md/lg/xl par une échelle plus discrète', () => {
        const result = deriveNeutralGlobalTokens(SAMPLE);
        expect(result).toMatch(/--ar-border-radius-sm: 0\.25rem;/);
        expect(result).toMatch(/--ar-border-radius-md: 0\.375rem;/);
        expect(result).toMatch(/--ar-border-radius-lg: 0\.5rem;/);
        expect(result).toMatch(/--ar-border-radius-xl: 0\.75rem;/);
    });

    it('laisse -full et les autres tokens inchangés', () => {
        const result = deriveNeutralGlobalTokens(SAMPLE);
        expect(result).toMatch(/--ar-border-radius-full: 9999px;/);
        expect(result).toMatch(/--ar-font-size-md: 1rem;/);
        expect(result).toMatch(/--ar-button-height: 2\.5rem;/);
    });

    it('remplace --ar-button-primary-color par du blanc', () => {
        const result = deriveNeutralGlobalTokens(SAMPLE);
        expect(result).toMatch(/--ar-button-primary-color: var\(--ar-color-white\);/);
        expect(result).not.toMatch(/--ar-button-primary-color: var\(--ar-color-neutral-10\);/);
    });

    it('throw si --ar-button-primary-color ne matche pas (format inattendu)', () => {
        const NO_BUTTON_COLOR = `:root {
    --ar-border-radius-sm: 0.25rem;
    --ar-border-radius-md: 0.5rem;
    --ar-border-radius-lg: 0.875rem;
    --ar-border-radius-xl: 1.5rem;
}`;
        expect(() => deriveNeutralGlobalTokens(NO_BUTTON_COLOR)).toThrow(
            /--ar-button-primary-color non substitué/,
        );
    });

    it('throw si moins de 4 tokens border-radius matchent (format inattendu)', () => {
        const PARTIAL = `:root {
    --ar-font-size-md: 1rem;
    --ar-border-radius-sm: 0.25rem;
    --ar-border-radius-md: 0.5rem;
    --ar-border-radius-full: 9999px;
}`;
        expect(() => deriveNeutralGlobalTokens(PARTIAL)).toThrow(/tokens border-radius remplacés/);
    });
});
