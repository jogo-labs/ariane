// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSkill, loadComponents, splitRootsAndChildren } from './build-skill.js';

const CEM = {
    modules: [
        {
            declarations: [
                { kind: 'class', name: 'ArTabGroup', tagName: 'ar-tab-group', summary: 'Onglets.' },
                {
                    kind: 'class',
                    name: 'ArTab',
                    tagName: 'ar-tab',
                    summary: 'Un onglet.',
                    'x-parent': 'ar-tab-group',
                },
                { kind: 'class', name: 'ArAlert', tagName: 'ar-alert', summary: 'Message.' },
                { kind: 'variable', name: 'sansTag' },
            ],
        },
    ],
};

const MDX = (tag) =>
    `---\ntagName: ${tag}\nvariants:\n    - name: d\n      label: D\n      html: |\n          <${tag}></${tag}>\n---\n\n## Accessibilité\n\ntexte ${tag}\n`;

describe('build-skill', () => {
    let root;
    let paths;
    beforeEach(() => {
        root = mkdtempSync(join(tmpdir(), 'ariane-skill-'));
        paths = {
            cemPath: join(root, 'cem.json'),
            mdxDir: join(root, 'mdx'),
            contentDir: join(root, 'content'),
            skillDir: join(root, 'out/skills/ariane'),
            llmsDir: join(root, 'out/llms'),
        };
        mkdirSync(paths.mdxDir, { recursive: true });
        mkdirSync(join(paths.contentDir, 'references'), { recursive: true });
        writeFileSync(paths.cemPath, JSON.stringify(CEM));
        for (const tag of ['ar-tab-group', 'ar-tab', 'ar-alert']) {
            writeFileSync(join(paths.mdxDir, `${tag}.mdx`), MDX(tag));
        }
        writeFileSync(
            join(paths.contentDir, 'SKILL.md'),
            '---\nname: ariane\ndescription: d\n---\n\n# Ariane\n',
        );
        writeFileSync(join(paths.contentDir, 'references/usage.md'), '# Usage\n\ntexte\n');
    });
    afterEach(() => rmSync(root, { recursive: true, force: true }));

    it('sépare racines et sous-composants et trie par tag', () => {
        const cem = JSON.parse(readFileSync(paths.cemPath, 'utf-8'));
        const entries = loadComponents({ cem, mdxDir: paths.mdxDir });
        expect(entries.map((e) => e.decl.tagName)).toEqual(['ar-alert', 'ar-tab', 'ar-tab-group']);
        const { roots, childrenOf } = splitRootsAndChildren(entries);
        expect(roots.map((e) => e.decl.tagName)).toEqual(['ar-alert', 'ar-tab-group']);
        expect(childrenOf.get('ar-tab-group').map((e) => e.decl.tagName)).toEqual(['ar-tab']);
    });

    it("échoue si un composant du CEM n'a pas de MDX", () => {
        rmSync(join(paths.mdxDir, 'ar-alert.mdx'));
        expect(() => buildSkill({ ...paths, version: '1.0.0' })).toThrow(/MDX manquant.*ar-alert/);
    });

    it('échoue si x-parent désigne un tag absent du CEM', () => {
        const cem = { modules: [{ declarations: [{ tagName: 'ar-tab', 'x-parent': 'ar-nope' }] }] };
        writeFileSync(join(paths.mdxDir, 'ar-tab.mdx'), MDX('ar-tab'));
        expect(() => splitRootsAndChildren(loadComponents({ cem, mdxDir: paths.mdxDir }))).toThrow(
            /x-parent.*ar-nope/,
        );
    });

    it("copie la zone écrite à l'identique et génère les références", () => {
        const result = buildSkill({ ...paths, version: '0.1.0-alpha.13' });
        expect(readFileSync(join(paths.skillDir, 'SKILL.md'), 'utf-8')).toBe(
            readFileSync(join(paths.contentDir, 'SKILL.md'), 'utf-8'),
        );
        expect(existsSync(join(paths.skillDir, 'references/usage.md'))).toBe(true);
        const components = join(paths.skillDir, 'references/components');
        expect(existsSync(join(components, 'index.md'))).toBe(true);
        expect(existsSync(join(components, 'ar-alert.md'))).toBe(true);
        expect(existsSync(join(components, 'ar-tab-group.md'))).toBe(true);
        expect(existsSync(join(components, 'ar-tab.md'))).toBe(false);
        expect(readFileSync(join(components, 'ar-tab-group.md'), 'utf-8')).toContain(
            'sous-composant de `<ar-tab-group>`',
        );
        expect(result).toEqual({ roots: ['ar-alert', 'ar-tab-group'], children: ['ar-tab'] });
    });

    it('écrit llms.txt et llms-full.txt', () => {
        buildSkill({ ...paths, version: '0.1.0-alpha.13' });
        const txt = readFileSync(join(paths.llmsDir, 'llms.txt'), 'utf-8');
        expect(txt).toContain('@0.1.0-alpha.13/skills/ariane/references/usage.md');
        expect(txt).toContain('references/components/ar-alert.md');
        expect(txt).not.toContain('references/components/ar-tab.md');
        const full = readFileSync(join(paths.llmsDir, 'llms-full.txt'), 'utf-8');
        expect(full).toContain('Fichier : references/usage.md');
        expect(full).toContain('# `<ar-alert>`');
    });

    it('vide la sortie précédente (aucun fichier orphelin)', () => {
        buildSkill({ ...paths, version: '1.0.0' });
        writeFileSync(join(paths.skillDir, 'references/orphelin.md'), 'x');
        writeFileSync(join(paths.llmsDir, 'vieux.txt'), 'x');
        buildSkill({ ...paths, version: '1.0.0' });
        expect(existsSync(join(paths.skillDir, 'references/orphelin.md'))).toBe(false);
        expect(existsSync(join(paths.llmsDir, 'vieux.txt'))).toBe(false);
    });

    it('ne modifie jamais la zone écrite', () => {
        const before = readFileSync(join(paths.contentDir, 'references/usage.md'), 'utf-8');
        buildSkill({ ...paths, version: '1.0.0' });
        expect(readFileSync(join(paths.contentDir, 'references/usage.md'), 'utf-8')).toBe(before);
    });

    it('échoue si SKILL.md manque dans la zone écrite', () => {
        rmSync(join(paths.contentDir, 'SKILL.md'));
        expect(() => buildSkill({ ...paths, version: '1.0.0' })).toThrow(/SKILL\.md/);
    });
});

const realCem = fileURLToPath(new URL('../../dist/custom-elements.json', import.meta.url));

describe.skipIf(!existsSync(realCem))('sur le vrai CEM', () => {
    it('couvre les 14 composants racine et rattache les 5 sous-composants', () => {
        const root = mkdtempSync(join(tmpdir(), 'ariane-skill-real-'));
        try {
            const result = buildSkill({
                cemPath: realCem,
                mdxDir: fileURLToPath(
                    new URL('../../../../apps/docs/src/content/components', import.meta.url),
                ),
                contentDir: fileURLToPath(new URL('./content/ariane', import.meta.url)),
                skillDir: join(root, 'skills/ariane'),
                llmsDir: join(root, 'llms'),
                version: '0.0.0-test',
            });
            expect(result.roots).toHaveLength(14);
            expect(result.children.sort()).toEqual([
                'ar-breadcrumb-item',
                'ar-dropdown-item',
                'ar-stepper-item',
                'ar-tab',
                'ar-tab-panel',
            ]);
            const tabGroup = readFileSync(
                join(root, 'skills/ariane/references/components/ar-tab-group.md'),
                'utf-8',
            );
            expect(tabGroup).not.toMatch(/\| `name` \| (oui|non) \|/);
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });
});
