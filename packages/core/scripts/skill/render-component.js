/**
 * render-component.js
 *
 * Rend, depuis une déclaration du CEM, ses exemples (variants des MDX) et le corps converti du
 * MDX, le fichier de référence d'un composant racine (sous-composants inclus) et l'index.
 *
 * Particularités du CEM d'Ariane (constatées) : `description` de classe vide, le texte est dans
 * `summary` ; l'événement nommé `name` est un artefact de l'analyseur (`new CustomEvent(name, …)`
 * dans `_emit`), il est ignoré ; l'annulabilité d'un événement est le marqueur final `@cancelable`.
 */
import { shiftHeadings } from './mdx.js';

const CANCELABLE_RE = /\s*@cancelable\s*$/;
const HEADER = '<!-- Généré par scripts/skill/build-skill.js : ne pas éditer. -->';
/** Callbacks du cycle de vie form-associated, appelés par le navigateur : pas une API publique. */
const FORM_CALLBACKS = new Set([
    'formAssociatedCallback',
    'formDisabledCallback',
    'formResetCallback',
    'formStateRestoreCallback',
]);

/** @param {string | undefined} description */
export function isCancelable(description) {
    return description !== undefined && CANCELABLE_RE.test(description);
}

/**
 * Nettoie une valeur pour une cellule de tableau Markdown : une ligne, `|` échappé, `—` si vide.
 *
 * @param {unknown} text
 * @returns {string}
 */
export function cell(text) {
    const value = String(text ?? '')
        .replace(/\s*\n\s*/g, ' ')
        .replace(/\|/g, '\\|')
        .trim();
    return value === '' ? '—' : value;
}

const code = (text) => (text === undefined || text === '' ? '' : `\`${text}\``);

function table(headers, rows) {
    if (rows.length === 0) return '';
    const head = `| ${headers.join(' | ')} |`;
    const separator = `| ${headers.map(() => '---').join(' | ')} |`;
    const body = rows.map((row) => `| ${row.map(cell).join(' | ')} |`);
    return [head, separator, ...body].join('\n');
}

/** Sections d'API d'une déclaration, chacune sous un titre de niveau `level`. */
function apiSections(decl, level) {
    const h = '#'.repeat(level);
    const sections = [];
    const add = (title, tableMd) => {
        if (tableMd) sections.push(`${h} ${title}\n\n${tableMd}`);
    };

    add(
        'Attributs',
        table(
            ['Attribut', 'Type', 'Défaut', 'Description'],
            (decl.attributes ?? []).map((a) => [
                code(a.name),
                code(a.type?.text),
                code(a.default),
                a.description,
            ]),
        ),
    );
    add(
        'Slots',
        table(
            ['Slot', 'Description'],
            (decl.slots ?? []).map((s) => [s.name ? code(s.name) : '(par défaut)', s.description]),
        ),
    );
    add(
        'Événements',
        table(
            ['Événement', 'Type', 'Annulable', 'Description'],
            (decl.events ?? [])
                .filter((e) => e.name !== 'name')
                .map((e) => [
                    code(e.name),
                    code(e.type?.text),
                    isCancelable(e.description) ? 'oui' : 'non',
                    (e.description ?? '').replace(CANCELABLE_RE, ''),
                ]),
        ),
    );
    add(
        'Propriétés CSS',
        table(
            ['Propriété', 'Description'],
            (decl.cssProperties ?? []).map((p) => [code(p.name), p.description]),
        ),
    );
    add(
        'Parts',
        table(
            ['Part', 'Description'],
            (decl.cssParts ?? []).map((p) => [code(p.name), p.description]),
        ),
    );
    add(
        'États CSS',
        table(
            ['État', 'Description'],
            (decl.cssStates ?? []).map((s) => [code(s.name), s.description]),
        ),
    );
    add(
        'Méthodes',
        table(
            ['Méthode', 'Description'],
            (decl.members ?? [])
                .filter(
                    (m) =>
                        m.kind === 'method' &&
                        !m.privacy &&
                        !m.static &&
                        !m.inheritedFrom &&
                        !FORM_CALLBACKS.has(m.name),
                )
                .map((m) => [
                    code(`${m.name}(${(m.parameters ?? []).map((p) => p.name).join(', ')})`),
                    m.description,
                ]),
        ),
    );
    return sections;
}

/**
 * Rend un composant (titre, exemples, API, corps MDX) à partir du niveau de titre `level`.
 *
 * @param {{ decl: any, variants?: any[], bodyMd?: string }} entry
 * @param {number} level niveau du titre du composant (1 pour un racine, 2 pour un sous-composant)
 * @param {string | undefined} parentTag
 */
function renderEntry(entry, level, parentTag) {
    const { decl, variants = [], bodyMd = '' } = entry;
    const h = (n) => '#'.repeat(level + n);
    const title = parentTag
        ? `${h(0)} \`<${decl.tagName}>\` (sous-composant de \`<${parentTag}>\`)`
        : `${h(0)} \`<${decl.tagName}>\``;
    const parts = [title];

    const summary = decl.summary || decl.description || '';
    if (summary) parts.push(summary);

    if (variants.length > 0) {
        const examples = variants.map((v) => {
            const lines = [`${h(2)} ${v.label ?? v.name}`];
            if (v.description) lines.push(v.description);
            lines.push(`\`\`\`html\n${String(v.html).trim()}\n\`\`\``);
            return lines.join('\n\n');
        });
        parts.push(`${h(1)} Exemples\n\n${examples.join('\n\n')}`);
    }

    const api = apiSections(decl, level + 2);
    if (api.length > 0) parts.push(`${h(1)} API\n\n${api.join('\n\n')}`);

    if (bodyMd.trim() !== '') {
        parts.push(`${h(1)} Accessibilité et usage\n\n${shiftHeadings(bodyMd, level)}`);
    }
    return parts.join('\n\n');
}

/**
 * Fichier de référence d'un composant racine, ses sous-composants en sections.
 *
 * @param {{ decl: any, variants?: any[], bodyMd?: string }} root
 * @param {{ decl: any, variants?: any[], bodyMd?: string }[]} children
 * @returns {string}
 */
export function renderComponentFile(root, children) {
    const sections = [renderEntry(root, 1, undefined)];
    for (const child of children) {
        sections.push(renderEntry(child, 2, root.decl.tagName));
    }
    return `${HEADER}\n\n${sections.join('\n\n')}\n`;
}

/**
 * Index des composants : un lien par racine, ses sous-composants rattachés en dessous.
 *
 * @param {{ roots: { decl: any }[], childrenOf: Map<string, { decl: any }[]>, version: string }} input
 * @returns {string}
 */
export function renderIndex({ roots, childrenOf, version }) {
    // Un résumé multi-paragraphes casserait la liste : on l'aplatit sur une seule ligne.
    const oneLine = (text) =>
        String(text ?? '')
            .replace(/\s+/g, ' ')
            .trim();
    const lines = [
        HEADER,
        '',
        '# Composants Ariane',
        '',
        `Généré depuis @ariane-ui/core ${version}. Chaque composant a un fichier de référence ; ` +
            'les sous-composants sont décrits dans le fichier de leur parent.',
        '',
    ];
    for (const { decl } of roots) {
        const summary = oneLine(decl.summary || decl.description);
        lines.push(
            `- [\`<${decl.tagName}>\`](${decl.tagName}.md)${summary ? ` : ${summary}` : ''}`,
        );
        for (const child of childrenOf.get(decl.tagName) ?? []) {
            const childSummary = oneLine(child.decl.summary || child.decl.description);
            lines.push(
                `    - \`<${child.decl.tagName}>\`${childSummary ? ` : ${childSummary}` : ''} (voir ${decl.tagName}.md)`,
            );
        }
    }
    lines.push('');
    return lines.join('\n');
}
