import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readVariantsFromMdx } from './read-mdx-variants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, '__fixtures__', 'sample-component.mdx');

describe('readVariantsFromMdx', () => {
    it('extrait les variants du frontmatter', () => {
        const variants = readVariantsFromMdx(FIXTURE);
        expect(variants.length).toBe(1);
        expect(variants[0].name).toBe('default');
        expect(variants[0].label).toBe('Défaut');
        expect(variants[0].html).toMatch(/<ar-sample>Contenu<\/ar-sample>/);
    });

    it("retourne un tableau vide si le fichier n'existe pas", () => {
        const variants = readVariantsFromMdx(path.join(__dirname, '__fixtures__', 'absent.mdx'));
        expect(variants).toEqual([]);
    });
});
