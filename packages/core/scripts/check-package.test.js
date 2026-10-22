import { describe, expect, it } from 'vitest';
import { missingFromPack, promisedPaths } from './check-package.js';

const PKG = {
    main: './dist/index.js',
    types: './dist/index.d.ts',
    exports: {
        '.': { types: './dist/index.d.ts', default: './dist/index.js' },
        './react': { types: './dist/react.d.ts', default: './dist/react.js' },
        './cdn': './cdn/index.js',
        './dist/*': './dist/*',
    },
};

describe('promisedPaths', () => {
    it('réunit main, types et toutes les cibles des exports, sans doublon, motifs réduits à leur dossier', () => {
        expect(promisedPaths(PKG)).toEqual([
            'cdn/index.js',
            'dist',
            'dist/index.d.ts',
            'dist/index.js',
            'dist/react.d.ts',
            'dist/react.js',
        ]);
    });

    it('ignore ce qui ne désigne pas un fichier du paquet', () => {
        expect(promisedPaths({ exports: { './x': 'pas-un-chemin', './y': null } })).toEqual([]);
    });
});

describe('missingFromPack', () => {
    const COMPLET = [
        'dist/index.js',
        'dist/index.d.ts',
        'dist/react.js',
        'dist/react.d.ts',
        'cdn/index.js',
    ];

    it('ne signale rien quand tout est empaqueté', () => {
        expect(missingFromPack(promisedPaths(PKG), COMPLET)).toEqual([]);
    });

    it('signale les déclarations absentes (cas de l’alpha.15)', () => {
        const sansTypes = COMPLET.filter((file) => !file.endsWith('.d.ts'));
        expect(missingFromPack(promisedPaths(PKG), sansTypes)).toEqual([
            'dist/index.d.ts',
            'dist/react.d.ts',
        ]);
    });

    it('un motif de dossier est satisfait par un fichier du dossier et pas par un dossier vide', () => {
        expect(missingFromPack(['dist'], ['dist/a.js'])).toEqual([]);
        expect(missingFromPack(['dist'], ['cdn/a.js'])).toEqual(['dist']);
    });
});
