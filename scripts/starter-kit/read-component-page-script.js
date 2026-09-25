import { readFileSync, existsSync } from 'node:fs';
import matter from 'gray-matter';

/**
 * Extrait `pageScript` du frontmatter d'un fichier `.mdx` de la doc — un
 * script partagé par toutes les variantes d'un composant (pas un par
 * variante, contrairement à `variants[].html`), qui rend les démos
 * interactives (ex. `ar-pagination`/`ar-stepper` : écoute l'événement de
 * changement et met à jour l'attribut `current`). Réutilisé tel quel, même
 * mécanisme que la doc Astro réelle (`apps/docs/.../[slug].astro`). Retourne
 * undefined si le fichier n'existe pas ou n'a pas de `pageScript`.
 */
export function readComponentPageScript(mdxPath) {
    if (!existsSync(mdxPath)) return undefined;
    const raw = readFileSync(mdxPath, 'utf8');
    const { data } = matter(raw);
    return data.pageScript;
}
