// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { checkSkill } from './check-skill.js';

const CEM = {
    modules: [
        {
            declarations: [
                {
                    tagName: 'ar-dialog',
                    attributes: [{ name: 'open' }, { name: 'without-header' }],
                    cssProperties: [{ name: '--ar-dialog-width' }],
                },
                { tagName: 'ar-tab-group' },
                { tagName: 'ar-tab', 'x-parent': 'ar-tab-group' },
            ],
        },
    ],
};

const PKG = { files: ['dist', 'cdn', 'skills', 'llms'] };

const SKILL_MD =
    '---\nname: ariane\ndescription: Utiliser Ariane.\n---\n\n# Ariane\n\nVoir [index](references/components/index.md).\n';
const CHOOSING =
    '# Choisir\n\n| Besoin | Composant |\n| --- | --- |\n| Modale | `<ar-dialog>` |\n| Onglets | `<ar-tab-group>` |\n';

describe('checkSkill', () => {
    let root;
    let skillDir;
    let themeDir;
    const write = (rel, content) => {
        const file = join(skillDir, rel);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, content);
    };
    const run = (overrides = {}) =>
        checkSkill({ cem: CEM, skillDir, pkg: PKG, themeDir, ...overrides });

    beforeEach(() => {
        root = mkdtempSync(join(tmpdir(), 'ariane-check-skill-'));
        skillDir = join(root, 'skills/ariane');
        themeDir = join(root, 'theme');
        mkdirSync(themeDir, { recursive: true });
        writeFileSync(join(themeDir, '_global-tokens.css'), ':root { --ar-radius: 4px; }\n');
        write('SKILL.md', SKILL_MD);
        write('references/choosing-components.md', CHOOSING);
        write('references/components/index.md', '# Composants\n');
        write('references/components/ar-dialog.md', '# `<ar-dialog>`\n');
        write('references/components/ar-tab-group.md', '# `<ar-tab-group>`\n');
    });
    afterEach(() => rmSync(root, { recursive: true, force: true }));

    it('ne signale rien quand tout est cohérent', () => {
        expect(run()).toEqual([]);
    });

    it('règle 1 : signale un tag cité absent du CEM', () => {
        write('references/usage.md', 'Utiliser `<ar-ghost>` ici.\n');
        expect(run().join('\n')).toMatch(/usage\.md:1.*<ar-ghost>/);
    });

    it('règle 2 : signale un attribut cité absent du CEM, accepte les attributs globaux', () => {
        write(
            'references/usage.md',
            '```html\n<ar-dialog open slot="x" aria-label="y" data-a="1" removable></ar-dialog>\n```\n',
        );
        const errors = run().join('\n');
        expect(errors).toMatch(/removable/);
        expect(errors).not.toMatch(/aria-label|data-a|slot|\bopen\b/);
    });

    it('règle 2 : lit les balises sur plusieurs lignes', () => {
        write(
            'references/usage.md',
            '<ar-dialog\n    without-header\n    inconnu="1"\n></ar-dialog>\n',
        );
        const errors = run().join('\n');
        expect(errors).toMatch(/inconnu/);
        expect(errors).not.toMatch(/without-header/);
    });

    it('règle 2 : lit les valeurs sans guillemets', () => {
        write('references/usage.md', '<ar-dialog open=true inconnu></ar-dialog>\n');
        const errors = run().join('\n');
        expect(errors).toMatch(/inconnu/);
        expect(errors).not.toMatch(/« open »/);
    });

    it('règle 2 : lit une balise auto-fermante', () => {
        write('references/usage.md', '<ar-dialog inconnu />\n');
        expect(run().join('\n')).toMatch(/inconnu/);
    });

    it('règle 2 : une valeur entre guillemets contenant > ne coupe pas la balise', () => {
        write('references/usage.md', '<ar-dialog title="a > b" inconnu></ar-dialog>\n');
        const errors = run().join('\n');
        expect(errors).toMatch(/inconnu/);
        expect(errors).not.toMatch(/« title »/);
    });

    it('règle 3 : signale un composant racine absent de choosing-components.md', () => {
        write('references/choosing-components.md', '# Choisir\n\n| Modale | `<ar-dialog>` |\n');
        expect(run().join('\n')).toMatch(/choosing-components\.md.*<ar-tab-group>/);
    });

    it('règle 3 : exige choosing-components.md', () => {
        rmSync(join(skillDir, 'references/choosing-components.md'));
        expect(run().join('\n')).toMatch(/choosing-components\.md.*absent/);
    });

    it('règle 4 : signale un composant racine sans fichier généré', () => {
        rmSync(join(skillDir, 'references/components/ar-dialog.md'));
        expect(run().join('\n')).toMatch(/components\/ar-dialog\.md.*manquant/);
    });

    it('règle 4 : signale un fichier généré pour un sous-composant', () => {
        write('references/components/ar-tab.md', '# x\n');
        expect(run().join('\n')).toMatch(/ar-tab\.md.*sous-composant/);
    });

    it('règle 5 : signale un lien relatif cassé', () => {
        write(
            'references/usage.md',
            'Voir [x](references/nulle-part.md) et [ok](installation.md#a).\n',
        );
        write('references/installation.md', '# Installation\n');
        const errors = run().join('\n');
        expect(errors).toMatch(/nulle-part\.md/);
        expect(errors).not.toMatch(/installation\.md/);
    });

    it('règle 5 : ignore les liens http et les ancres', () => {
        write('references/usage.md', '[a](https://exemple.org) [b](#ancre)\n');
        expect(run()).toEqual([]);
    });

    it('règle 5 : refuse les liens absolus, ignore http et ancres', () => {
        write(
            'references/usage.md',
            '[x](/getting-started/traductions) [y](/tmp) [a](https://exemple.org) [b](#ancre)\n',
        );
        const errors = run();
        expect(errors).toHaveLength(2);
        expect(errors.join('\n')).toMatch(/lien absolu.*\/getting-started\/traductions/);
        expect(errors.join('\n')).toMatch(/lien absolu.*\/tmp/);
    });

    it('règle 6 : exige name = ariane et une description', () => {
        write('SKILL.md', '---\nname: autre\n---\n\n# x\n');
        const errors = run().join('\n');
        expect(errors).toMatch(/name.*ariane/);
        expect(errors).toMatch(/description/);
    });

    it('règle 7 : exige skills et llms dans files', () => {
        const errors = run({ pkg: { files: ['dist', 'cdn'] } }).join('\n');
        expect(errors).toMatch(/skills/);
        expect(errors).toMatch(/llms/);
    });

    it('règle 8 : signale un token --ar-* inconnu dans theming.md, accepte CEM, thème et préfixes', () => {
        write(
            'references/theming.md',
            'Utiliser `--ar-dialog-width`, `--ar-radius`, la famille `--ar-dialog-*` et `--ar-fantome`.\n',
        );
        const errors = run().join('\n');
        expect(errors).toMatch(/--ar-fantome/);
        expect(errors).not.toMatch(/--ar-dialog-width|--ar-radius|--ar-dialog-\*/);
    });

    it('règle 8 : sans theming.md, rien à vérifier', () => {
        expect(run()).toEqual([]);
    });

    it('ne soumet pas les fichiers générés aux règles 1 à 3', () => {
        write(
            'references/components/ar-dialog.md',
            '# x\n\n`<ar-ghost>` et <ar-dialog removable></ar-dialog>\n',
        );
        expect(run()).toEqual([]);
    });
});
