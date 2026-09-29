import { describe, expect, it } from 'vitest';
import { insertRelease, withPreviousTag } from './update-changelog.js';

const CHANGELOG = [
    '# Changelog',
    '',
    'Préambule.',
    '',
    '---',
    '',
    '## [0.1.0-alpha.3] — 2026-03-26',
    '',
    '### Modifié',
    '',
    '- Ancienne entrée',
    '',
].join('\n');

const SECTION = [
    '## [0.1.0-alpha.12](https://example.com/compare/v0.1.0-alpha.11...v0.1.0-alpha.12) (2026-10-06)',
    '',
    '### Corrigé',
    '',
    '* **core:** un correctif',
    '',
].join('\n');

describe('insertRelease', () => {
    it('insère la nouvelle section sous le préambule, avant les versions existantes', () => {
        const result = insertRelease(CHANGELOG, SECTION);

        expect(result.indexOf('# Changelog')).toBeLessThan(result.indexOf('alpha.12'));
        expect(result.indexOf('---')).toBeLessThan(result.indexOf('alpha.12'));
        expect(result.indexOf('alpha.12')).toBeLessThan(result.indexOf('alpha.3'));
    });

    it("conserve intégralement le préambule et l'historique existant", () => {
        const result = insertRelease(CHANGELOG, SECTION);

        expect(result).toContain('Préambule.');
        expect(result).toContain('- Ancienne entrée');
    });

    it('sépare les sections par une seule ligne vide', () => {
        const result = insertRelease(CHANGELOG, SECTION);

        expect(result).toMatch(/\* \*\*core:\*\* un correctif\n\n## \[0\.1\.0-alpha\.3\]/);
        expect(result).not.toMatch(/\n\n\n/);
    });

    it('refuse une version déjà présente dans le fichier', () => {
        const once = insertRelease(CHANGELOG, SECTION);

        expect(() => insertRelease(once, SECTION)).toThrow(/0\.1\.0-alpha\.12.*déjà/);
    });

    it("échoue si le séparateur '---' du préambule est introuvable", () => {
        expect(() => insertRelease('# Changelog\n\n## [0.1.0] — 2026-01-01\n', SECTION)).toThrow(
            /séparateur/,
        );
    });

    it("échoue si la section générée n'a pas de titre de version", () => {
        expect(() => insertRelease(CHANGELOG, 'du texte sans titre')).toThrow(/titre de version/);
    });
});

describe('withPreviousTag', () => {
    it('remplace le tag de départ du lien de comparaison du titre', () => {
        const result = withPreviousTag(
            '## [0.1.0-alpha.12](https://github.com/o/r/compare/v0.1.0-alpha.8...v0.1.0-alpha.12) (2026-10-06)\n\n### Corrigé\n',
            'v0.1.0-alpha.11',
        );

        expect(result).toContain('/compare/v0.1.0-alpha.11...v0.1.0-alpha.12)');
        expect(result).not.toContain('alpha.8');
    });

    it('ne touche pas aux liens de comparaison situés hors du titre', () => {
        const section =
            '## [1.0.0](https://x/compare/v0.9.0...v1.0.0) (2026-10-06)\n\nVoir https://x/compare/v0.1.0...v0.2.0\n';

        expect(withPreviousTag(section, 'v0.9.5')).toContain(
            'Voir https://x/compare/v0.1.0...v0.2.0',
        );
    });

    it('laisse la section intacte sans lien de comparaison', () => {
        const section = '## [1.0.0] (2026-10-06)\n\n### Corrigé\n';

        expect(withPreviousTag(section, 'v0.9.0')).toBe(section);
    });
});
