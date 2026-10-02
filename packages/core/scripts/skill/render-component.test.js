// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { cell, isCancelable, renderComponentFile, renderIndex } from './render-component.js';

const alert = {
    decl: {
        tagName: 'ar-alert',
        summary: 'Affiche un message important.',
        description: '',
        attributes: [
            {
                name: 'variant',
                type: { text: "'info' | 'success'" },
                default: "'info'",
                description: 'Variante.\nSur deux lignes.',
            },
            { name: 'urgent', type: { text: 'boolean' }, description: 'Force role=alert.' },
        ],
        slots: [{ name: '', description: 'Contenu.' }],
        events: [
            { name: 'name', type: { text: 'CustomEvent' } },
            {
                name: 'ar-alert-close',
                type: { text: 'CustomEvent' },
                description: 'Émis avant fermeture. @cancelable',
            },
            { name: 'ar-alert-closed', type: { text: 'CustomEvent' }, description: 'Fermée.' },
            { name: 'ar-alert-change', type: { text: 'CustomEvent<{ active: string }>' } },
        ],
        cssProperties: [{ name: '--ar-alert-gap', description: 'Espace.' }],
        cssParts: [{ name: 'base', description: 'Conteneur.' }],
        cssStates: [{ name: 'hiding', description: 'Animation de sortie.' }],
        members: [
            { kind: 'field', name: '_secret', privacy: 'private' },
            { kind: 'method', name: 'close', description: 'Ferme.', parameters: [] },
            { kind: 'method', name: 'update', inheritedFrom: { name: 'LitElement' } },
            { kind: 'method', name: 'internal', privacy: 'protected' },
            { kind: 'method', name: 'formAssociatedCallback', parameters: [{ name: 'form' }] },
            { kind: 'method', name: 'formDisabledCallback', parameters: [{ name: 'disabled' }] },
            { kind: 'method', name: 'formResetCallback', parameters: [] },
            { kind: 'method', name: 'formStateRestoreCallback', parameters: [{ name: 'state' }] },
        ],
    },
    variants: [
        {
            name: 'default',
            label: 'Défaut',
            description: 'Alerte simple.',
            html: '<ar-alert>x</ar-alert>\n',
        },
    ],
    bodyMd: '## Accessibilité\n\n### Pris en charge automatiquement\n\n- role',
};

describe('cell', () => {
    it('échappe les barres verticales et aplatit les retours à la ligne', () => {
        expect(cell("'a' | 'b'")).toBe("'a' \\| 'b'");
        expect(cell('une\nautre')).toBe('une autre');
    });

    it('renvoie un tiret pour une valeur vide ou absente', () => {
        expect(cell('')).toBe('—');
        expect(cell(undefined)).toBe('—');
    });
});

describe('isCancelable', () => {
    it('détecte le marqueur final @cancelable', () => {
        expect(isCancelable('Émis avant. @cancelable')).toBe(true);
        expect(isCancelable('Émis après.')).toBe(false);
        expect(isCancelable(undefined)).toBe(false);
    });
});

describe('renderComponentFile', () => {
    const md = renderComponentFile(alert, []);

    it("commence par l'en-tête « généré » et le titre", () => {
        expect(md.startsWith('<!-- Généré par scripts/skill/build-skill.js')).toBe(true);
        expect(md).toContain('# `<ar-alert>`');
    });

    it('utilise summary quand description est vide', () => {
        expect(md).toContain('Affiche un message important.');
    });

    it('rend les exemples issus des variants', () => {
        expect(md).toContain('### Défaut');
        expect(md).toContain('```html\n<ar-alert>x</ar-alert>\n```');
    });

    it('rend le tableau des attributs avec défaut manquant remplacé par un tiret', () => {
        expect(md).toContain(
            "| `variant` | `'info' \\| 'success'` | `'info'` | Variante. Sur deux lignes. |",
        );
        expect(md).toContain('| `urgent` | `boolean` | — | Force role=alert. |');
    });

    it('nomme le slot par défaut', () => {
        expect(md).toContain('| (par défaut) | Contenu. |');
    });

    it("ignore l'artefact `name` de l'analyseur, rend le type et marque les annulables", () => {
        expect(md).toContain('| Événement | Type | Annulable | Description |');
        expect(md).not.toContain('`name`');
        expect(md).toContain('| `ar-alert-close` | `CustomEvent` | oui | Émis avant fermeture. |');
        expect(md).toContain('| `ar-alert-closed` | `CustomEvent` | non | Fermée. |');
    });

    it('garde un événement réel sans description, avec le type de son detail', () => {
        expect(md).toContain('| `ar-alert-change` | `CustomEvent<{ active: string }>` | non | — |');
    });

    it('rend propriétés CSS, parts et états CSS', () => {
        expect(md).toContain('| `--ar-alert-gap` | Espace. |');
        expect(md).toContain('| `base` | Conteneur. |');
        expect(md).toContain('| `hiding` | Animation de sortie. |');
    });

    it('ne rend que les méthodes publiques non héritées', () => {
        expect(md).toContain('| `close()` | Ferme. |');
        expect(md).not.toContain('update');
        expect(md).not.toContain('internal');
        expect(md).not.toContain('_secret');
    });

    it('exclut les callbacks du cycle de vie form-associated', () => {
        expect(md).not.toContain('formAssociatedCallback');
        expect(md).not.toContain('formDisabledCallback');
        expect(md).not.toContain('formResetCallback');
        expect(md).not.toContain('formStateRestoreCallback');
    });

    it('ajoute le corps MDX sous « Accessibilité et usage » sans doubler le titre', () => {
        expect(md).toContain('## Accessibilité et usage');
        expect(md).toContain('### Pris en charge automatiquement');
    });

    it('tolère un composant sans summary ni description', () => {
        const bare = { decl: { tagName: 'ar-bare' }, variants: [], bodyMd: '' };
        const out = renderComponentFile(bare, []);
        expect(out).toContain('# `<ar-bare>`');
        expect(out).not.toContain('undefined');
    });

    it('rend un sous-composant comme section du parent, titres décalés', () => {
        const parent = {
            decl: { tagName: 'ar-tab-group', summary: 'Onglets.' },
            variants: [],
            bodyMd: '',
        };
        const child = {
            decl: {
                tagName: 'ar-tab',
                summary: 'Un onglet.',
                attributes: [{ name: 'name', type: { text: 'string' }, description: 'Nom.' }],
            },
            variants: [],
            bodyMd: '## Accessibilité\n\ntexte',
        };
        const out = renderComponentFile(parent, [child]);
        expect(out).toContain('## `<ar-tab>` (sous-composant de `<ar-tab-group>`)');
        expect(out).toContain('#### Attributs');
        expect(out).toContain('### Accessibilité');
    });
});

describe('renderIndex', () => {
    it('liste les racines avec lien relatif, les enfants rattachés, et la version', () => {
        const parent = { decl: { tagName: 'ar-tab-group', summary: 'Onglets.' } };
        const child = { decl: { tagName: 'ar-tab', summary: 'Un onglet.' } };
        const md = renderIndex({
            roots: [alert, parent],
            childrenOf: new Map([['ar-tab-group', [child]]]),
            version: '0.1.0-alpha.13',
        });
        expect(md).toContain('0.1.0-alpha.13');
        expect(md).toContain('- [`<ar-alert>`](ar-alert.md) : Affiche un message important.');
        expect(md).toContain('- [`<ar-tab-group>`](ar-tab-group.md) : Onglets.');
        expect(md).toContain('    - `<ar-tab>` : Un onglet. (voir ar-tab-group.md)');
    });

    it('aplatit un résumé multi-paragraphes sur une seule ligne', () => {
        const multi = { decl: { tagName: 'ar-tooltip', description: 'Info.\n\nSuite\ndu texte.' } };
        const md = renderIndex({ roots: [multi], childrenOf: new Map(), version: '1.0.0' });
        expect(md).toContain('- [`<ar-tooltip>`](ar-tooltip.md) : Info. Suite du texte.\n');
    });
});
