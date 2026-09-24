import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readManifestComponents } from './read-manifest-components.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, '__fixtures__', 'sample-manifest.json');

describe('readManifestComponents', () => {
    it('ne garde que les déclarations customElement avec un tagName', () => {
        const components = readManifestComponents(FIXTURE);
        expect(components.length).toBe(1);
        expect(components[0]).toEqual({
            tagName: 'ar-alert',
            summary: 'Affiche un message important intégré au contenu environnant.',
        });
    });

    it('summary est toujours une string', () => {
        const components = readManifestComponents(FIXTURE);
        expect(typeof components[0].summary).toBe('string');
    });
});
