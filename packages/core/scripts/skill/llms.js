/**
 * llms.js
 *
 * `llms.txt` (index au format llmstxt.org) et `llms-full.txt` (tout inliné), repli pour les
 * outils sans Agent Skills. Les liens pointent vers les fichiers de la skill sur unpkg,
 * versionnés : ils ne dépendent pas d'un domaine public (#276).
 */
import matter from 'gray-matter';

const oneLine = (text) =>
    String(text ?? '')
        .replace(/\s*\n\s*/g, ' ')
        .trim();

/** @param {string} version */
export function unpkgBase(version) {
    return `https://unpkg.com/@ariane-ui/core@${version}/skills/ariane/`;
}

/**
 * Premier titre de niveau 1 d'un Markdown, sinon `fallback`.
 *
 * @param {string} markdown
 * @param {string} fallback
 */
export function titleOf(markdown, fallback) {
    const match = markdown.match(/^# (.+)$/m);
    return match ? match[1].trim() : fallback;
}

/**
 * @param {{
 *   version: string,
 *   written: { path: string, title: string }[],
 *   components: { tagName: string, summary?: string }[],
 * }} input
 */
export function renderLlmsTxt({ version, written, components }) {
    const base = unpkgBase(version);
    const lines = [
        '# Ariane',
        '',
        "> Bibliothèque de web components accessibles (Lit 3, préfixe `ar-`), sans style par défaut : le rendu vient d'un thème.",
        '',
        `Version ${version}. Pour les outils qui gèrent les Agent Skills, la skill \`ariane\` (dossier \`skills/ariane\` du paquet) est préférable : elle charge les références à la demande.`,
        '',
        '## Guides',
        '',
        `- [Skill ariane](${base}SKILL.md)`,
        ...written.map((w) => `- [${w.title}](${base}${w.path})`),
        '',
        '## Composants',
        '',
        `- [Index des composants](${base}references/components/index.md)`,
        ...components.map((c) => {
            const summary = oneLine(c.summary);
            return `- [\`<${c.tagName}>\`](${base}references/components/${c.tagName}.md)${summary ? `: ${summary}` : ''}`;
        }),
        '',
    ];
    return lines.join('\n');
}

/**
 * @param {{
 *   skillMd: string,
 *   written: { path: string, content: string }[],
 *   indexMd: string,
 *   components: { path: string, content: string }[],
 * }} input
 */
export function renderLlmsFull({ skillMd, written, indexMd, components }) {
    const separator = (path) => `\n\n---\n\nFichier : ${path}\n\n`;
    const parts = [matter(skillMd).content.trim()];
    for (const file of written) parts.push(separator(file.path) + file.content.trim());
    parts.push(separator('references/components/index.md') + indexMd.trim());
    for (const file of components) parts.push(separator(file.path) + file.content.trim());
    return `${parts.join('')}\n`;
}
