/**
 * mdx.js
 *
 * Lecture et conversion des MDX de `apps/docs/src/content/components/` pour la skill.
 * Les corps ne contiennent aujourd'hui qu'un seul composant JSX, `<WcagRef criterion summary />`,
 * plus des `import` en tête. Tout autre composant JSX fait échouer la conversion : un composant
 * ajouté aux MDX ne doit jamais atterrir en balisage brut dans la skill.
 */
import matter from 'gray-matter';

const FENCE_RE = /^\s*```/;
const IMPORT_RE = /^import\s.+$/gm;
const WCAG_REF_RE = /<WcagRef\s+criterion="([^"]+)"\s+summary="([^"]*)"\s*\/>/g;
const INLINE_CODE_RE = /`[^`\n]*`/g;
// Lien Markdown dont la cible commence par `/` (hors image : `!` devant), titre optionnel.
const ABSOLUTE_LINK_RE = /(?<!!)\[([^\]]*)\]\(\/[^)\s]*(?:\s+"[^"]*")?\)/g;
const JSX_RE = /<([A-Z][A-Za-z0-9]*)[\s/>]/;

/**
 * Découpe un Markdown en segments « hors bloc de code » / « bloc de code ».
 * `segments.map((s) => s.text).join('\n')` redonne le texte d'origine.
 *
 * @param {string} markdown
 * @returns {{ code: boolean, text: string }[]}
 */
function splitFences(markdown) {
    const out = [];
    let current = { code: false, lines: [] };
    for (const line of markdown.split('\n')) {
        if (FENCE_RE.test(line)) {
            if (!current.code) {
                out.push(current);
                current = { code: true, lines: [line] };
            } else {
                current.lines.push(line);
                out.push(current);
                current = { code: false, lines: [] };
            }
        } else {
            current.lines.push(line);
        }
    }
    out.push(current);
    return out
        .filter((segment) => segment.lines.length > 0)
        .map((segment) => ({ code: segment.code, text: segment.lines.join('\n') }));
}

/** Applique `transform` aux seuls segments hors bloc de code. */
function mapOutsideFences(markdown, transform) {
    return splitFences(markdown)
        .map((segment) => (segment.code ? segment.text : transform(segment.text)))
        .join('\n');
}

/**
 * Remplace les liens absolus du site (`[texte](/chemin)`) par leur texte, hors code inline :
 * la skill ne doit pas pointer vers le site de doc (pas de domaine public).
 */
function stripAbsoluteLinks(text) {
    return text
        .split(/(`[^`\n]*`)/)
        .map((part, index) => (index % 2 === 1 ? part : part.replace(ABSOLUTE_LINK_RE, '$1')))
        .join('');
}

/**
 * @param {string} source contenu brut d'un `.mdx`
 * @returns {{ data: Record<string, any>, body: string }}
 */
export function parseMdx(source) {
    const { data, content } = matter(source);
    return { data, body: content.trim() };
}

/**
 * Convertit le corps d'un MDX en Markdown : retire les `import`, remplace `<WcagRef>` par du
 * texte, remplace les liens absolus du site par leur texte, échoue sur tout autre composant JSX.
 * Les blocs de code ne sont jamais modifiés.
 *
 * @param {string} body
 * @param {string} file chemin du MDX, utilisé dans le message d'erreur
 * @returns {string}
 */
export function convertMdxBody(body, file) {
    return mapOutsideFences(body, (text) => {
        let converted = text
            .replace(IMPORT_RE, '')
            .replace(WCAG_REF_RE, (_match, criterion, summary) => `WCAG ${criterion} : ${summary}`)
            .replace(/\n{3,}/g, '\n\n');
        converted = stripAbsoluteLinks(converted);
        const jsx = converted.replace(INLINE_CODE_RE, '').match(JSX_RE);
        if (jsx) {
            throw new Error(
                `${file} : composant JSX inconnu <${jsx[1]}>. ` +
                    'Seul <WcagRef criterion="…" summary="…" /> est converti ; ' +
                    'ajoutez une règle dans scripts/skill/mdx.js pour en gérer un autre.',
            );
        }
        return converted;
    }).trim();
}

/**
 * Descend les titres Markdown de `by` niveaux (plafonné à 6), hors blocs de code.
 *
 * @param {string} markdown
 * @param {number} by
 * @returns {string}
 */
export function shiftHeadings(markdown, by) {
    if (by === 0) return markdown;
    return mapOutsideFences(markdown, (text) =>
        text.replace(/^(#{1,6})(\s)/gm, (_match, hashes, space) => {
            return `${'#'.repeat(Math.min(6, hashes.length + by))}${space}`;
        }),
    );
}
