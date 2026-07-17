import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { findHardcodedTokenAssignments, findStylesFiles } from './validate-no-hardcoded-tokens.js';

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
