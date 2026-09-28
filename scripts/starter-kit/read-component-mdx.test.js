import { describe, expect, it } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readComponentMdx } from './read-component-mdx.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, '__fixtures__', 'sample-component.mdx');

describe('readComponentMdx', () => {
    it('extrait title et variants du frontmatter en une seule lecture', () => {
        const { title, variants, pageScript } = readComponentMdx(FIXTURE);
        expect(title).toBe('Sample');
        expect(pageScript).toBeUndefined();
        expect(variants.length).toBe(1);
        expect(variants[0].name).toBe('default');
        expect(variants[0].label).toBe('Défaut');
        expect(variants[0].html).toMatch(/<ar-sample>Contenu<\/ar-sample>/);
    });

    it('extrait pageScript du frontmatter', () => {
        const dir = mkdtempSync(path.join(tmpdir(), 'read-component-mdx-'));
        try {
            const mdxPath = path.join(dir, 'ar-pagination.mdx');
            writeFileSync(
                mdxPath,
                `---\ntagName: ar-pagination\ntitle: Pagination\nvariants: []\npageScript: |\n    <script>console.log('hi');</script>\n---\n`,
            );
            expect(readComponentMdx(mdxPath).pageScript).toBe(
                "<script>console.log('hi');</script>\n",
            );
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it("retourne des valeurs par défaut si le fichier n'existe pas", () => {
        const result = readComponentMdx(path.join(__dirname, '__fixtures__', 'absent.mdx'));
        expect(result).toEqual({ title: undefined, pageScript: undefined, variants: [] });
    });

    it("retourne pageScript undefined si le frontmatter n'en a pas", () => {
        const dir = mkdtempSync(path.join(tmpdir(), 'read-component-mdx-'));
        try {
            const mdxPath = path.join(dir, 'ar-alert.mdx');
            writeFileSync(mdxPath, `---\ntagName: ar-alert\ntitle: Alert\nvariants: []\n---\n`);
            expect(readComponentMdx(mdxPath).pageScript).toBeUndefined();
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
