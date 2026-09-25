// scripts/starter-kit/sync-presets.test.js
import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { syncPresets } from './sync-presets.js';

describe('syncPresets', () => {
    it('copie les fichiers .css verbatim dans <repoPath>/presets/', () => {
        const root = mkdtempSync(path.join(tmpdir(), 'sync-presets-'));
        try {
            const srcPresetsDir = path.join(root, 'presets-src');
            const repoPath = path.join(root, 'repo');
            mkdirSync(srcPresetsDir, { recursive: true });
            mkdirSync(repoPath, { recursive: true });

            writeFileSync(path.join(srcPresetsDir, 'buttons.css'), '.ar-btn { color: red; }');
            writeFileSync(path.join(srcPresetsDir, 'fields.css'), '.ar-input { color: blue; }');

            syncPresets({ srcPresetsDir, repoPath });

            const buttons = readFileSync(path.join(repoPath, 'presets', 'buttons.css'), 'utf8');
            expect(buttons).toBe('.ar-btn { color: red; }');

            const fields = readFileSync(path.join(repoPath, 'presets', 'fields.css'), 'utf8');
            expect(fields).toBe('.ar-input { color: blue; }');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });
});
