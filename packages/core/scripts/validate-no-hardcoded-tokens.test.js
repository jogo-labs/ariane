import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
    findHardcodedTokenAssignments,
    findStylesFiles,
    findUnjustifiedFallbacks,
} from './validate-no-hardcoded-tokens.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('findHardcodedTokenAssignments', () => {
    it('détecte une assignation littérale', () => {
        const source = `
            :host {
                --ar-dialog-width: 500px;
            }
        `;
        const errors = findHardcodedTokenAssignments('dialog.styles.ts', source);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('dialog.styles.ts');
        expect(errors[0]).toContain('--ar-dialog-width');
    });

    it('détecte une assignation littérale sans espace après le deux-points', () => {
        const source = `
            :host {
                --ar-dialog-width:500px;
            }
        `;
        const errors = findHardcodedTokenAssignments('dialog.styles.ts', source);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('dialog.styles.ts');
        expect(errors[0]).toContain('--ar-dialog-width');
    });

    it("n'agit pas sur une référence var()", () => {
        const source = `
            :host {
                --ar-dialog-width: var(--ar-dialog-width-md);
            }
        `;
        expect(findHardcodedTokenAssignments('dialog.styles.ts', source)).toEqual([]);
    });

    it('ignore les mentions dans un commentaire CSS', () => {
        const source = `
            /* Surchargeable par --ar-dialog-width: 500px si besoin. */
            :host {
                --ar-dialog-width: var(--ar-dialog-width-md);
            }
        `;
        expect(findHardcodedTokenAssignments('dialog.styles.ts', source)).toEqual([]);
    });

    it('rapporte le bon numéro de ligne', () => {
        const source = ['/* ligne 1 */', ':host {', '    --ar-dialog-width: 500px;', '}'].join(
            '\n',
        );
        const errors = findHardcodedTokenAssignments('dialog.styles.ts', source);
        expect(errors[0]).toContain(':3');
    });

    it('agrège plusieurs assignations littérales', () => {
        const source = `
            :host {
                --ar-dialog-width: 500px;
                --ar-dialog-spacing: 1.25rem;
            }
        `;
        expect(findHardcodedTokenAssignments('dialog.styles.ts', source)).toHaveLength(2);
    });
});

describe('findStylesFiles', () => {
    it("trouve les fichiers *.styles.ts existants du package (test d'intégration léger)", () => {
        const srcDir = join(__dirname, '../src');
        const files = findStylesFiles(srcDir);
        expect(files.some((f) => f.endsWith('dialog.styles.ts'))).toBe(true);
        expect(files.every((f) => f.endsWith('.styles.ts'))).toBe(true);
    });
});

describe('findUnjustifiedFallbacks', () => {
    it('accepte un mot-clé couleur système whitelisté', () => {
        const source = `
            [part='panel'] {
                background-color: var(--ar-panel-bg, Canvas);
            }
        `;
        expect(findUnjustifiedFallbacks('panel.styles.ts', source)).toEqual([]);
    });

    it('rejette un mot-clé système avec une casse différente (whitelist stricte)', () => {
        const source = `
            [part='panel'] {
                background-color: var(--ar-panel-bg, canvas);
            }
        `;
        const errors = findUnjustifiedFallbacks('panel.styles.ts', source);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('--ar-panel-bg');
    });

    it('rejette une valeur littérale sans commentaire de justification', () => {
        const source = `
            [part='panel'] {
                max-width: var(--ar-panel-max-width, 25rem);
            }
        `;
        const errors = findUnjustifiedFallbacks('panel.styles.ts', source);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('--ar-panel-max-width');
    });

    it('accepte une valeur littérale précédée du commentaire a11y-fallback correctement formé', () => {
        const source = [
            "[part='panel'] {",
            '    max-width: var(',
            '        --ar-panel-max-width,',
            '        /* a11y-fallback: évite un panel démesuré sans thème */',
            '        25rem',
            '    );',
            '}',
        ].join('\n');
        expect(findUnjustifiedFallbacks('panel.styles.ts', source)).toEqual([]);
    });

    it('rejette une valeur littérale dont le commentaire a un texte hors format', () => {
        const source = [
            "[part='panel'] {",
            '    max-width: var(',
            '        --ar-panel-max-width,',
            '        /* TODO: revoir cette valeur */',
            '        25rem',
            '    );',
            '}',
        ].join('\n');
        const errors = findUnjustifiedFallbacks('panel.styles.ts', source);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('--ar-panel-max-width');
    });

    it("rejette une valeur littérale dont le commentaire n'est pas sur la ligne immédiatement précédente", () => {
        const source = [
            "[part='panel'] {",
            '    /* a11y-fallback: évite un panel démesuré sans thème */',
            '',
            '    max-width: var(--ar-panel-max-width, 25rem);',
            '}',
        ].join('\n');
        const errors = findUnjustifiedFallbacks('panel.styles.ts', source);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('--ar-panel-max-width');
    });

    it('ignore var(--ar-token) sans fallback (usage normal)', () => {
        const source = `
            [part='panel'] {
                background-color: var(--ar-panel-bg);
            }
        `;
        expect(findUnjustifiedFallbacks('panel.styles.ts', source)).toEqual([]);
    });

    it('ignore une mention dans un commentaire CSS', () => {
        const source = `
            /* Ne pas faire : var(--ar-panel-bg, red) */
            [part='panel'] {
                background-color: var(--ar-panel-bg);
            }
        `;
        expect(findUnjustifiedFallbacks('panel.styles.ts', source)).toEqual([]);
    });

    it('rapporte le bon numéro de ligne', () => {
        const source = [
            '/* ligne 1 */',
            "[part='panel'] {",
            '    max-width: var(--ar-panel-max-width, 25rem);',
            '}',
        ].join('\n');
        const errors = findUnjustifiedFallbacks('panel.styles.ts', source);
        expect(errors[0]).toContain(':3');
    });

    it('accepte un fallback structurel 0px (compensation de layout, cf. CLAUDE.md)', () => {
        const source = `
            [part='base'] {
                margin-block-start: calc(-1 * var(--ar-tab-group-border-top-width, 0px));
            }
        `;
        expect(findUnjustifiedFallbacks('tab.styles.ts', source)).toEqual([]);
    });

    it('accepte un fallback qui référence un autre token --ar-* (cascade token-à-token)', () => {
        const source = `
            [part='body'] {
                padding-block: var(--ar-dialog-spacing-block, var(--ar-dialog-spacing));
            }
        `;
        expect(findUnjustifiedFallbacks('dialog.styles.ts', source)).toEqual([]);
    });
});
