import { describe, expect, it } from 'vitest';
import { pruneDanglingCustomElementExports } from './prune-dangling-custom-element-exports.js';

function manifest(modules) {
    return { modules };
}

describe('pruneDanglingCustomElementExports', () => {
    it('retire un export custom-element-definition dont la déclaration est absente partout (ex. classe @internal)', () => {
        const cem = manifest([
            {
                path: 'src/internal/day.ts',
                declarations: [], // le natif @internal a déjà retiré la déclaration en amont
                exports: [],
            },
            {
                path: 'src/internal/index.ts',
                declarations: [],
                exports: [
                    {
                        kind: 'custom-element-definition',
                        name: 'ar-datepicker-day',
                        declaration: { name: 'ArDatepickerDay' },
                    },
                ],
            },
        ]);

        pruneDanglingCustomElementExports(cem);

        expect(cem.modules[1].exports).toEqual([]);
    });

    it('garde un export custom-element-definition dont la déclaration existe encore (composant public)', () => {
        const cem = manifest([
            {
                path: 'src/components/datepicker/datepicker.ts',
                declarations: [{ name: 'ArDatepicker', tagName: 'ar-datepicker' }],
                exports: [
                    { kind: 'js', name: 'ArDatepicker', declaration: { name: 'ArDatepicker' } },
                ],
            },
            {
                path: 'src/components/datepicker/index.ts',
                declarations: [],
                exports: [
                    {
                        kind: 'custom-element-definition',
                        name: 'ar-datepicker',
                        declaration: { name: 'ArDatepicker' },
                    },
                ],
            },
        ]);

        pruneDanglingCustomElementExports(cem);

        expect(cem.modules[1].exports).toHaveLength(1);
    });

    it("ne touche pas aux exports d'un autre kind (js), même orphelins", () => {
        const cem = manifest([
            {
                path: 'src/internal/day.ts',
                declarations: [],
                exports: [
                    {
                        kind: 'js',
                        name: 'ArDatepickerDay',
                        declaration: { name: 'ArDatepickerDay' },
                    },
                ],
            },
        ]);

        pruneDanglingCustomElementExports(cem);

        expect(cem.modules[0].exports).toHaveLength(1);
    });

    it('retourne le nom des tags retirés', () => {
        const cem = manifest([
            {
                path: 'src/internal/index.ts',
                declarations: [],
                exports: [
                    {
                        kind: 'custom-element-definition',
                        name: 'ar-datepicker-day',
                        declaration: { name: 'ArDatepickerDay' },
                    },
                ],
            },
        ]);

        expect(pruneDanglingCustomElementExports(cem)).toEqual(['ar-datepicker-day']);
    });

    it("gère un manifest sans modules sans lever d'exception", () => {
        expect(() => pruneDanglingCustomElementExports({})).not.toThrow();
    });
});
