// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { convertMdxBody, parseMdx, shiftHeadings } from './mdx.js';

describe('parseMdx', () => {
    it('sépare le frontmatter (variants) du corps', () => {
        const source = [
            '---',
            'tagName: ar-x',
            'variants:',
            '    - name: a',
            '      label: A',
            '      html: |',
            '          <ar-x></ar-x>',
            '---',
            '',
            '## Accessibilité',
            '',
            'texte',
            '',
        ].join('\n');
        const { data, body } = parseMdx(source);
        expect(data.variants[0].name).toBe('a');
        expect(data.variants[0].html.trim()).toBe('<ar-x></ar-x>');
        expect(body).toBe('## Accessibilité\n\ntexte');
    });
});

describe('convertMdxBody', () => {
    it('retire les imports hors blocs de code et compacte les lignes vides', () => {
        const body = "import WcagRef from '../../components/WcagRef.astro';\n\n## Titre\n\ntexte";
        expect(convertMdxBody(body, 'x.mdx')).toBe('## Titre\n\ntexte');
    });

    it('conserve un import situé dans un bloc de code', () => {
        const body = "```js\nimport IMask from 'imask';\n```";
        expect(convertMdxBody(body, 'x.mdx')).toBe(body);
    });

    it('remplace <WcagRef> (multi-lignes) par du texte', () => {
        const body = [
            '- conforme',
            '    <WcagRef',
            '        criterion="4.1.3"',
            '        summary="Status Messages : annoncés sans déplacer le focus."',
            '    />',
            '- suite',
        ].join('\n');
        const out = convertMdxBody(body, 'x.mdx');
        expect(out).toContain('WCAG 4.1.3 : Status Messages : annoncés sans déplacer le focus.');
        expect(out).not.toContain('<WcagRef');
        expect(out).toContain('- suite');
    });

    it('échoue sur un composant JSX inconnu en nommant le fichier', () => {
        expect(() => convertMdxBody('<Callout>x</Callout>', 'ar-x.mdx')).toThrow(
            /ar-x\.mdx.*<Callout>/,
        );
    });

    it('ne prend pas un générique en code inline pour du JSX', () => {
        const body = 'Retourne une `Promise<Foo>` résolue.';
        expect(convertMdxBody(body, 'x.mdx')).toBe(body);
    });

    it('ne touche pas au contenu des blocs de code (JSX apparent compris)', () => {
        const body = '```html\n<Foo bar="1"></Foo>\n```';
        expect(convertMdxBody(body, 'x.mdx')).toBe(body);
    });
});

describe('shiftHeadings', () => {
    it('descend les titres hors blocs de code', () => {
        const md = '## A\n\n```md\n## pas un titre\n```\n\n### B';
        expect(shiftHeadings(md, 1)).toBe('### A\n\n```md\n## pas un titre\n```\n\n#### B');
    });

    it('ne dépasse pas le niveau 6', () => {
        expect(shiftHeadings('###### Z', 2)).toBe('###### Z');
    });

    it('ne change rien pour un décalage nul', () => {
        expect(shiftHeadings('## A', 0)).toBe('## A');
    });
});
