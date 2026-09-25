import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readComponentTitle } from './read-component-title.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, '__fixtures__', 'sample-component.mdx');

describe('readComponentTitle', () => {
    it('extrait le title du frontmatter', () => {
        expect(readComponentTitle(FIXTURE)).toBe('Sample');
    });

    it("retourne undefined si le fichier n'existe pas", () => {
        expect(readComponentTitle(path.join(__dirname, '__fixtures__', 'absent.mdx'))).toBe(
            undefined,
        );
    });
});
