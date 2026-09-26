import { readFileSync, existsSync } from 'node:fs';
import matter from 'gray-matter';

/**
 * Extrait le tableau `variants` du frontmatter d'un fichier `.mdx` de la doc
 * (`apps/docs/src/content/components/ar-*.mdx`). Réutilisé tel quel — zéro
 * duplication de contenu de démo. Retourne [] si le fichier n'existe pas ou
 * n'a pas de `variants` déclarés.
 */
export function readVariantsFromMdx(mdxPath) {
    if (!existsSync(mdxPath)) return [];
    const raw = readFileSync(mdxPath, 'utf8');
    const { data } = matter(raw);
    return data.variants ?? [];
}
