import { readFileSync, existsSync } from 'node:fs';
import matter from 'gray-matter';

/**
 * Extrait le titre lisible (`title:` du frontmatter) d'un fichier `.mdx` de
 * la doc — utilisé pour l'affichage (TOC, titres de section) à la place du
 * tagName brut. Retourne undefined si le fichier n'existe pas ou n'a pas de
 * `title`.
 */
export function readComponentTitle(mdxPath) {
    if (!existsSync(mdxPath)) return undefined;
    const raw = readFileSync(mdxPath, 'utf8');
    const { data } = matter(raw);
    return data.title;
}
