import { describe, expect, it } from 'vitest';
import { buildSource, listElements, ownEvents, publicProperties } from './generate-types.js';

const named = new Map([
    ['ArBox', 'components/box/box'],
    ['BoxSize', 'components/box/box'],
    ['ArBoxItem', 'components/box-item/box-item'],
]);

const cem = (decl) => ({
    modules: [{ path: 'src/components/box/box.ts', declarations: [decl] }],
});

const box = {
    kind: 'class',
    name: 'ArBox',
    tagName: 'ar-box',
    customElement: true,
    members: [
        { kind: 'field', name: 'size', type: { text: 'BoxSize' }, attribute: 'size' },
        { kind: 'field', name: 'noWrap', type: { text: 'boolean' }, attribute: 'no-wrap' },
        { kind: 'field', name: 'label', type: { text: 'string | undefined' } },
        { kind: 'field', name: 'filter', type: { text: '(item: ArBoxItem) => boolean' } },
        { kind: 'field', name: 'form', type: { text: 'HTMLFormElement | null' }, readonly: true },
        { kind: 'field', name: '_secret', type: { text: 'string' } },
        { kind: 'field', name: 'hidden', type: { text: 'string' }, privacy: 'private' },
        { kind: 'field', name: 'registry', type: { text: 'string' }, static: true },
        { kind: 'method', name: 'show' },
    ],
    events: [
        { name: 'ar-box-open', type: { text: 'CustomEvent<{ id: string | undefined }>' } },
        { name: 'input', type: { text: 'Event' } },
    ],
};

describe('generate-types', () => {
    it('liste les éléments personnalisés triés par balise', () => {
        const two = {
            modules: [
                {
                    path: 'a.ts',
                    declarations: [
                        { name: 'Z', tagName: 'ar-z', customElement: true },
                        { name: 'Helper', kind: 'class' },
                        { name: 'A', tagName: 'ar-a', customElement: true },
                    ],
                },
            ],
        };
        expect(listElements(two).map((e) => e.tag)).toStrictEqual(['ar-a', 'ar-z']);
    });

    it('ne retient que les propriétés publiques modifiables', () => {
        expect(publicProperties(box).map((m) => m.name)).toStrictEqual([
            'size',
            'noWrap',
            'label',
            'filter',
        ]);
    });

    it('ne retient que les événements propres à la balise (pas input / change natifs)', () => {
        expect(ownEvents('ar-box', box).map((e) => e.name)).toStrictEqual(['ar-box-open']);
    });

    it("génère les cartes d'événements, de noms et de propriétés", () => {
        const source = buildSource(cem(box), named);
        expect(source).toContain("'ar-box': ArBox;");
        expect(source).toContain("'ar-box-open': CustomEvent<{ id: string | undefined }>;");
        expect(source).toContain("'ar-box': 'ar-box-open';");
        expect(source).toContain('interface HTMLElementEventMap extends ArianeEventMap');
        expect(source).not.toContain("'input'");
    });

    it("double chaque propriété d'un alias kebab-case quand l'attribut diffère", () => {
        const source = buildSource(cem(box), named);
        expect(source).toContain('noWrap?: boolean | undefined;');
        expect(source).toContain("'no-wrap'?: boolean | undefined;");
        expect(source).not.toContain("size?: BoxSize | undefined;\n        'size'");
    });

    it("n'ajoute pas undefined deux fois et parenthèse les fonctions", () => {
        const source = buildSource(cem(box), named);
        expect(source).toContain('label?: string | undefined;');
        expect(source).not.toContain('undefined | undefined');
        expect(source).toContain('filter?: ((item: ArBoxItem) => boolean) | undefined;');
    });

    it('regroupe les imports par module', () => {
        const source = buildSource(cem(box), named);
        expect(source).toContain("import type { ArBox, BoxSize } from '../components/box/box.js';");
        expect(source).toContain(
            "import type { ArBoxItem } from '../components/box-item/box-item.js';",
        );
    });

    it('exclut les membres privés, statiques, en lecture seule et les méthodes', () => {
        const source = buildSource(cem(box), named);
        for (const name of ['_secret', 'hidden', 'registry', 'form?', 'show']) {
            expect(source).not.toContain(name);
        }
    });

    it("lève si un type du manifeste n'est ni global ni exporté", () => {
        const unknown = {
            ...box,
            members: [{ kind: 'field', name: 'x', type: { text: 'Mystery' } }],
        };
        expect(() => buildSource(cem(unknown), named)).toThrow(/Mystery/);
    });
});
