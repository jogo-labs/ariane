import { describe, expect, it } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readComponentPageScript } from './read-component-page-script.js';

describe('readComponentPageScript', () => {
    it('extrait pageScript du frontmatter', () => {
        const dir = mkdtempSync(path.join(tmpdir(), 'read-page-script-'));
        try {
            const mdxPath = path.join(dir, 'ar-pagination.mdx');
            writeFileSync(
                mdxPath,
                `---\ntagName: ar-pagination\ntitle: Pagination\nvariants: []\npageScript: |\n    <script>console.log('hi');</script>\n---\n`,
            );
            expect(readComponentPageScript(mdxPath)).toBe("<script>console.log('hi');</script>\n");
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it('retourne undefined si le fichier est absent', () => {
        expect(readComponentPageScript('/inexistant.mdx')).toBeUndefined();
    });

    it("retourne undefined si le frontmatter n'a pas de pageScript", () => {
        const dir = mkdtempSync(path.join(tmpdir(), 'read-page-script-'));
        try {
            const mdxPath = path.join(dir, 'ar-alert.mdx');
            writeFileSync(mdxPath, `---\ntagName: ar-alert\ntitle: Alert\nvariants: []\n---\n`);
            expect(readComponentPageScript(mdxPath)).toBeUndefined();
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
