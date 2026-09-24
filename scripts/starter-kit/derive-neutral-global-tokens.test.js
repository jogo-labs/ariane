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
});
