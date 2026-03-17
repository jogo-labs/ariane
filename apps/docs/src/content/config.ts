import { defineCollection, z } from 'astro:content';

/**
 * Schéma d'une variante de composant.
 * Chaque variante correspond à un état / une configuration pré-définie du composant.
 */
const variantSchema = z.object({
    /** Identifiant unique de la variante, utilisé comme référence dans defaultVariant */
    name: z.string(),
    /** Libellé affiché dans l'onglet. Si absent, name est utilisé. */
    label: z.string().optional(),
    /** Description courte affichée sous le nom */
    description: z.string().optional(),
    /** HTML brut injecté dans le playground pour cette variante */
    html: z.string(),
    /** Thème initial de la preview. 'dark' pour un fond sombre. Défaut: 'light'. */
    previewTheme: z.enum(['light', 'dark']).optional(),
});

/**
 * Collection "components" — un fichier MDX par composant.
 * Le frontmatter définit les métadonnées et les variantes pré-configurées.
 */
const components = defineCollection({
    type: 'content',
    schema: z.object({
        /** Tag name du composant (ex: ar-button) */
        tagName: z.string(),
        /** Titre affiché en haut de la page */
        title: z.string(),
        /** Description courte affichée sous le titre */
        description: z.string().optional(),
        /** Nom de la variante dont le HTML initialise le playground interactif. Si absent, la première variante est utilisée. */
        playgroundTemplate: z.string().optional(),
        /** Variantes pré-configurées affichées dans le playground */
        // variants: z.array(variantSchema).default([]),
        // coerce : si le champ est absent ou null dans le MDX, on force un array vide
        variants: z.preprocess((val) => (Array.isArray(val) ? val : []), z.array(variantSchema)),
    }),
});

export const collections = { components };
