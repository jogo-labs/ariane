import { describe, expect, it } from 'vitest';
import { buildTokenMap, isColor, parsePalette, parseTokens, resolveColor } from './parse-tokens.js';

// --- isColor -----------------------------------------------------------------

describe('isColor', () => {
    it('reconnait un hex 6 chiffres', () => {
        expect(isColor('#2563eb')).toBe(true);
    });

    it('reconnait un hex 3 chiffres', () => {
        expect(isColor('#fff')).toBe(true);
    });

    it('reconnait oklch()', () => {
        expect(isColor('oklch(0.6 0.2 250)')).toBe(true);
    });

    it('reconnait rgba()', () => {
        expect(isColor('rgba(0,0,0,0.5)')).toBe(true);
    });

    it('retourne false pour une valeur non-couleur', () => {
        expect(isColor('1rem')).toBe(false);
        expect(isColor('var(--ar-color-primary)')).toBe(false);
    });
});

// --- buildTokenMap -----------------------------------------------------------

describe('buildTokenMap', () => {
    it('construit une map name -> valeur depuis un CSS string', () => {
        const css = `
            --ar-color-primary: #2563eb;
            --ar-font-size: 1rem;
        `;
        const map = buildTokenMap(css);
        expect(map.get('--ar-color-primary')).toBe('#2563eb');
        expect(map.get('--ar-font-size')).toBe('1rem');
    });

    it('nettoie les commentaires dans la valeur', () => {
        const css = '--ar-color-primary: oklch(0.6 0.2 250) /* oklch fallback */;';
        const map = buildTokenMap(css);
        expect(map.get('--ar-color-primary')).toBe('oklch(0.6 0.2 250)');
    });
});

// --- resolveColor ------------------------------------------------------------

describe('resolveColor', () => {
    it('retourne la valeur directement si la valeur est une couleur', () => {
        const map = new Map<string, string>();
        expect(resolveColor('#fff', map)).toBe('#fff');
    });

    it("suit une reference var() jusqu'a une couleur concrete", () => {
        const map = new Map([['--ar-color-primary', '#2563eb']]);
        expect(resolveColor('var(--ar-color-primary)', map)).toBe('#2563eb');
    });

    it('suit plusieurs niveaux de var()', () => {
        const map = new Map([
            ['--ar-color-alias', 'var(--ar-color-base)'],
            ['--ar-color-base', '#000'],
        ]);
        expect(resolveColor('var(--ar-color-alias)', map)).toBe('#000');
    });

    it('retourne undefined si la valeur ne mene pas a une couleur', () => {
        const map = new Map<string, string>();
        expect(resolveColor('1rem', map)).toBeUndefined();
    });

    it('retourne undefined si la var() est inconnue', () => {
        const map = new Map<string, string>();
        expect(resolveColor('var(--ar-unknown)', map)).toBeUndefined();
    });
});

// --- parseTokens -------------------------------------------------------------

describe('parseTokens', () => {
    it('retourne des categories non vides depuis un CSS valide', () => {
        const css = `
            --ar-color-text: #111;
            --ar-font-size-base: 1rem;
        `;
        const categories = parseTokens(css);
        expect(categories.length).toBeGreaterThan(0);
        expect(categories.every((c) => c.tokens.length > 0)).toBe(true);
    });

    it('exclut les alias semantiques internes (success/warning/danger/info + stops)', () => {
        const css = `
            --ar-color-success-05: #f0fdf4;
            --ar-color-warning-50: #fef3c7;
            --ar-color-success-bg: #d1fae5;
        `;
        const categories = parseTokens(css);
        const allNames = categories.flatMap((c) => c.tokens.map((t) => t.name));
        expect(allNames.some((n) => /--ar-color-(success|warning)-\d+/.test(n))).toBe(false);
        // success-bg est un token etat (non exclu)
        expect(allNames.some((n) => n === '--ar-color-success-bg')).toBe(true);
    });

    it('resout les couleurs referencees par var()', () => {
        const css = `
            --ar-color-primary-500: #2563eb;
            --ar-color-interactive: var(--ar-color-primary-500);
        `;
        const categories = parseTokens(css);
        const interactiveToken = categories
            .flatMap((c) => c.tokens)
            .find((t) => t.name === '--ar-color-interactive');
        expect(interactiveToken?.resolvedColor).toBe('#2563eb');
    });
});

// --- parsePalette -------------------------------------------------------------

describe('parsePalette', () => {
    it('regroupe les stops par hue et les trie numeriquement', () => {
        const css = `
            --ar-color-primary-100: #dbeafe;
            --ar-color-primary-500: #2563eb;
            --ar-color-primary-50: #eff6ff;
        `;
        const palette = parsePalette(css);
        expect(palette).toHaveLength(1);
        expect(palette[0].name).toBe('primary');
        const stops = palette[0].stops.map((s) => s.stop);
        expect(stops).toEqual(['50', '100', '500']);
    });

    it('ignore les tokens qui ne sont pas des stops de palette', () => {
        const css = `
            --ar-color-primary-500: #2563eb;
            --ar-color-text: #111;
        `;
        const palette = parsePalette(css);
        expect(palette).toHaveLength(1);
        expect(palette[0].stops).toHaveLength(1);
    });

    it('retourne un tableau vide si aucun token de palette', () => {
        expect(parsePalette('--ar-font-size: 1rem;')).toEqual([]);
    });
});
