// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { renderLlmsFull, renderLlmsTxt, titleOf, unpkgBase } from './llms.js';

describe('unpkgBase', () => {
    it("construit l'URL versionnée de la skill", () => {
        expect(unpkgBase('0.1.0-alpha.13')).toBe(
            'https://unpkg.com/@ariane-ui/core@0.1.0-alpha.13/skills/ariane/',
        );
    });
});

describe('titleOf', () => {
    it('renvoie le premier titre de niveau 1, sinon le repli', () => {
        expect(titleOf('texte\n# Installation\n## Sous', 'x.md')).toBe('Installation');
        expect(titleOf('pas de titre', 'x.md')).toBe('x.md');
    });
});

describe('renderLlmsTxt', () => {
    const txt = renderLlmsTxt({
        version: '0.1.0-alpha.13',
        written: [{ path: 'references/installation.md', title: 'Installation' }],
        components: [{ tagName: 'ar-alert', summary: 'Affiche un message.\nSur deux lignes.' }],
    });

    it('suit le format llmstxt.org : H1, citation, sections H2 de liens', () => {
        expect(txt.startsWith('# Ariane\n\n> ')).toBe(true);
        expect(txt).toContain('\n## Guides\n');
        expect(txt).toContain('\n## Composants\n');
    });

    it('lie les fichiers de la skill sur unpkg, versionnés', () => {
        const base = 'https://unpkg.com/@ariane-ui/core@0.1.0-alpha.13/skills/ariane/';
        expect(txt).toContain(`- [Skill ariane](${base}SKILL.md)`);
        expect(txt).toContain(`- [Installation](${base}references/installation.md)`);
        expect(txt).toContain(
            `- [\`<ar-alert>\`](${base}references/components/ar-alert.md): Affiche un message. Sur deux lignes.`,
        );
    });
});

describe('renderLlmsFull', () => {
    const full = renderLlmsFull({
        skillMd: '---\nname: ariane\ndescription: d\n---\n\n# Ariane\n\ncorps',
        written: [{ path: 'references/usage.md', content: '# Usage\n\ntexte' }],
        indexMd: '# Composants Ariane',
        components: [{ path: 'references/components/ar-alert.md', content: '# `<ar-alert>`' }],
    });

    it("retire le frontmatter du SKILL.md et concatène dans l'ordre", () => {
        expect(full).not.toContain('name: ariane');
        const order = [
            'corps',
            'Fichier : references/usage.md',
            '# Composants Ariane',
            '# `<ar-alert>`',
        ];
        const positions = order.map((s) => full.indexOf(s));
        expect(positions.every((p) => p >= 0)).toBe(true);
        expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    });
});
