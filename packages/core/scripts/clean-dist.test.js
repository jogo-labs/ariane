import {
    mkdirSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    rmSync,
    symlinkSync,
    writeFileSync,
} from 'fs';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanDist } from './clean-dist.js';

let root;
beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'clean-dist-'));
});
afterEach(() => {
    rmSync(root, { recursive: true, force: true });
});

describe('cleanDist', () => {
    it('retire les entrées périmées et conserve intactes celles listées dans keep', () => {
        const dist = join(root, 'dist');
        mkdirSync(join(dist, 'styles', 'nested'), { recursive: true });
        mkdirSync(join(dist, 'chunks'));
        writeFileSync(join(dist, 'chunks', 'old.js'), 'old');
        writeFileSync(join(dist, 'stale.js'), 'stale');
        writeFileSync(join(dist, 'custom-elements.json'), '{"modules":[]}');
        writeFileSync(join(dist, 'styles', 'nested', 'a.css'), 'a{}');

        const removed = cleanDist(dist, { keep: ['custom-elements.json', 'styles'] });

        expect(removed.sort()).toEqual(['chunks', 'stale.js']);
        expect(readdirSync(dist).sort()).toEqual(['custom-elements.json', 'styles']);
        expect(readFileSync(join(dist, 'custom-elements.json'), 'utf-8')).toBe('{"modules":[]}');
        expect(readFileSync(join(dist, 'styles', 'nested', 'a.css'), 'utf-8')).toBe('a{}');
    });

    it('crée le répertoire absent', () => {
        const dist = join(root, 'missing', 'dist');
        expect(cleanDist(dist, { keep: ['custom-elements.json'] })).toEqual([]);
        expect(existsSync(dist)).toBe(true);
    });

    it('retire un lien symbolique sans suivre sa cible', () => {
        const dist = join(root, 'dist');
        const target = join(root, 'target');
        mkdirSync(dist);
        mkdirSync(target);
        writeFileSync(join(target, 'keep.txt'), 'x');
        symlinkSync(target, join(dist, 'link'));

        expect(cleanDist(dist)).toEqual(['link']);
        expect(existsSync(join(target, 'keep.txt'))).toBe(true);
    });

    it('ne parcourt pas une entrée conservée même si c’est un lien symbolique', () => {
        const dist = join(root, 'dist');
        const target = join(root, 'target');
        mkdirSync(dist);
        mkdirSync(target);
        writeFileSync(join(target, 'f.txt'), 'x');
        symlinkSync(target, join(dist, 'styles'));

        expect(cleanDist(dist, { keep: ['styles'] })).toEqual([]);
        expect(existsSync(join(dist, 'styles', 'f.txt'))).toBe(true);
    });
});
