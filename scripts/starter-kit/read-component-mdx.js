import { readFileSync, existsSync } from 'node:fs';
import matter from 'gray-matter';

/**
 * Lit et parse une seule fois le frontmatter d'un fichier `.mdx` de la doc
 * (`apps/docs/src/content/components/ar-*.mdx`) pour en extraire les trois
 * champs consommés par le starter-kit — `title`, `pageScript` et `variants`
 * — au lieu de relire/reparser le même fichier une fois par champ (ancien
 * découpage : readComponentTitle/readComponentPageScript/readVariantsFromMdx).
 * Retourne des valeurs par défaut (`title`/`pageScript` undefined,
 * `variants` []) si le fichier n'existe pas.
 */
export function readComponentMdx(mdxPath) {
    if (!existsSync(mdxPath)) {
        return { title: undefined, pageScript: undefined, variants: [] };
    }
    const raw = readFileSync(mdxPath, 'utf8');
    const { data } = matter(raw);
    return {
        title: data.title,
        pageScript: data.pageScript,
        variants: data.variants ?? [],
    };
}
