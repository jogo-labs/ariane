import { describe, expect, it } from 'vitest';
import { deriveNeutralPalette } from './derive-neutral-palette.js';

const SAMPLE = `:root {
    --ar-color-primary-05: oklch(16.5% 0.035 70);
    --ar-color-primary-10: oklch(20% 0.035 70);
    --ar-color-primary-20: oklch(28% 0.035 70);
    --ar-color-primary-30: oklch(36% 0.035 70);
    --ar-color-primary-40: oklch(52.43% 0.1108 74.71);
    --ar-color-primary-50: oklch(60% 0.035 70);
    --ar-color-primary-60: oklch(68% 0.035 70);
    --ar-color-primary-70: oklch(76% 0.035 70);
    --ar-color-primary-80: oklch(84% 0.035 70);
    --ar-color-primary-90: oklch(92% 0.035 70);
    --ar-color-primary-95: oklch(96.5% 0.038 87);

    --ar-color-vault: oklch(23.54% 0.0334 273.44);
    --ar-color-vault-deep: oklch(18.99% 0.0249 273.04);

    --ar-color-neutral-05: oklch(15.79% 0.002 90);
    --ar-color-green-05: oklch(17.74% 0.037 165.47);
}`;

describe('deriveNeutralPalette', () => {
    it('préserve la luminosité (L) de chaque palier primary, change teinte/chroma', () => {
        const result = deriveNeutralPalette(SAMPLE);
        expect(result).toMatch(/--ar-color-primary-05: oklch\(16\.5% 0\.02 250\);/);
        expect(result).toMatch(/--ar-color-primary-40: oklch\(52\.43% 0\.04 250\);/);
        expect(result).toMatch(/--ar-color-primary-95: oklch\(96\.5% 0\.015 250\);/);
    });

    it('alias vault/vault-deep vers la rampe neutre existante', () => {
        const result = deriveNeutralPalette(SAMPLE);
        expect(result).toMatch(/--ar-color-vault: var\(--ar-color-neutral-10\);/);
        expect(result).toMatch(/--ar-color-vault-deep: var\(--ar-color-neutral-05\);/);
    });

    it('laisse les autres hues (neutral, green, ...) inchangées', () => {
        const result = deriveNeutralPalette(SAMPLE);
        expect(result).toMatch(/--ar-color-neutral-05: oklch\(15\.79% 0\.002 90\);/);
        expect(result).toMatch(/--ar-color-green-05: oklch\(17\.74% 0\.037 165\.47\);/);
    });

    it('throw si moins de 11 paliers primary matchent (format inattendu)', () => {
        const PARTIAL = `:root {
    --ar-color-primary-05: oklch(16.5% 0.035 70);
    --ar-color-primary-40: oklch(52.43% 0.1108 74.71);

    --ar-color-vault: oklch(23.54% 0.0334 273.44);
    --ar-color-vault-deep: oklch(18.99% 0.0249 273.04);
}`;
        expect(() => deriveNeutralPalette(PARTIAL)).toThrow(/paliers primary remplacés/);
    });

    it('throw si vault/vault-deep ne matchent pas (syntaxe de valeur différente)', () => {
        const PARTIAL = `:root {
    --ar-color-primary-05: oklch(16.5% 0.035 70);
    --ar-color-primary-10: oklch(20% 0.035 70);
    --ar-color-primary-20: oklch(28% 0.035 70);
    --ar-color-primary-30: oklch(36% 0.035 70);
    --ar-color-primary-40: oklch(52.43% 0.1108 74.71);
    --ar-color-primary-50: oklch(60% 0.035 70);
    --ar-color-primary-60: oklch(68% 0.035 70);
    --ar-color-primary-70: oklch(76% 0.035 70);
    --ar-color-primary-80: oklch(84% 0.035 70);
    --ar-color-primary-90: oklch(92% 0.035 70);
    --ar-color-primary-95: oklch(96.5% 0.038 87);

    --ar-color-vault: #1a1a2e;
    --ar-color-vault-deep: #0f0f1a;
}`;
        expect(() => deriveNeutralPalette(PARTIAL)).toThrow(/vault/);
    });
});
