import { describe, expect, it } from 'vitest';
import {
    buildControls,
    getCustomElements,
    getOptions,
    hasUndefined,
    isStringUnion,
} from './cem-types.js';
import type { CemMember } from './cem-types.js';

// ─── isStringUnion ────────────────────────────────────────────────────────────

describe('isStringUnion', () => {
    it('reconnaît une union de string literals', () => {
        expect(isStringUnion("'create' | 'edit'")).toBe(true);
    });

    it('reconnaît une union avec undefined', () => {
        expect(isStringUnion("'light' | 'dark' | undefined")).toBe(true);
    });

    it('retourne false pour boolean', () => {
        expect(isStringUnion('boolean')).toBe(false);
    });

    it('retourne false pour number', () => {
        expect(isStringUnion('number')).toBe(false);
    });

    it('retourne false pour string seul', () => {
        expect(isStringUnion('string')).toBe(false);
    });

    it('retourne false pour un seul string literal', () => {
        expect(isStringUnion("'only'")).toBe(false);
    });
});

// ─── getOptions ───────────────────────────────────────────────────────────────

describe('getOptions', () => {
    it('extrait les valeurs sans guillemets', () => {
        expect(getOptions("'create' | 'edit'")).toEqual(['create', 'edit']);
    });

    it('ignore undefined dans les options', () => {
        expect(getOptions("'light' | 'dark' | undefined")).toEqual(['light', 'dark']);
    });
});

// ─── hasUndefined ────────────────────────────────────────────────────────────

describe('hasUndefined', () => {
    it('retourne true si le type contient undefined', () => {
        expect(hasUndefined("'light' | 'dark' | undefined")).toBe(true);
    });

    it('retourne false si le type ne contient pas undefined', () => {
        expect(hasUndefined("'create' | 'edit'")).toBe(false);
    });
});

// ─── getCustomElements ────────────────────────────────────────────────────────

describe('getCustomElements', () => {
    it('extrait les déclarations de custom elements depuis un manifest', () => {
        const manifest = {
            modules: [
                {
                    declarations: [
                        {
                            kind: 'class',
                            customElement: true,
                            name: 'ArAlert',
                            tagName: 'ar-alert',
                        },
                        { kind: 'class', customElement: false, name: 'Helper' },
                        { kind: 'mixin', customElement: true, name: 'Mixin' },
                    ],
                },
            ],
        };
        const result = getCustomElements(manifest);
        expect(result).toHaveLength(1);
        expect(result[0].tagName).toBe('ar-alert');
    });

    it('retourne un tableau vide si modules est absent', () => {
        expect(getCustomElements({})).toEqual([]);
    });
});

// ─── buildControls ────────────────────────────────────────────────────────────

describe('buildControls', () => {
    const makeField = (overrides: Partial<CemMember>): CemMember => ({
        kind: 'field',
        name: 'myProp',
        attribute: 'my-prop',
        ...overrides,
    });

    it('génère un contrôle select pour une union de string literals', () => {
        const members = [makeField({ type: { text: "'create' | 'edit'" } })];
        const controls = buildControls(members);
        expect(controls[0].controlType).toBe('select');
        expect(controls[0].options).toEqual(['create', 'edit']);
    });

    it('ajoute addDefault=true si le type contient undefined', () => {
        const members = [makeField({ type: { text: "'light' | 'dark' | undefined" } })];
        const controls = buildControls(members);
        expect(controls[0].addDefault).toBe(true);
    });

    it('génère un contrôle checkbox pour boolean', () => {
        const members = [makeField({ type: { text: 'boolean' } })];
        expect(buildControls(members)[0].controlType).toBe('checkbox');
    });

    it('génère un contrôle number pour number', () => {
        const members = [makeField({ type: { text: 'number' } })];
        expect(buildControls(members)[0].controlType).toBe('number');
    });

    it('génère un contrôle number pour "number | undefined"', () => {
        const members = [makeField({ type: { text: 'number | undefined' } })];
        expect(buildControls(members)[0].controlType).toBe('number');
    });

    it('génère un contrôle text par défaut', () => {
        const members = [makeField({ type: { text: 'string' } })];
        expect(buildControls(members)[0].controlType).toBe('text');
    });

    it('filtre les membres privés', () => {
        const members = [makeField({ privacy: 'private' })];
        expect(buildControls(members)).toHaveLength(0);
    });

    it('filtre les membres protected', () => {
        const members = [makeField({ privacy: 'protected' })];
        expect(buildControls(members)).toHaveLength(0);
    });

    it('filtre les membres sans attribut', () => {
        const members = [makeField({ attribute: undefined })];
        expect(buildControls(members)).toHaveLength(0);
    });

    it('filtre les membres readonly', () => {
        const members = [makeField({ readonly: true })];
        expect(buildControls(members)).toHaveLength(0);
    });

    it('filtre les membres qui ne sont pas des fields', () => {
        const members = [makeField({ kind: 'method' })];
        expect(buildControls(members)).toHaveLength(0);
    });
});
