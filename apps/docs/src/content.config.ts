import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

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
});

/**
 * Note pointant vers les CSS Custom Properties d'un autre composant, applicables à
 * celui-ci — cas d'un composant qui en imbrique un autre themable dans son propre
 * shadow root (ex. ar-table-sort → ar-tooltip). Affichée dans la section CSS Custom
 * Properties de la page, sous la table des tokens propres au composant.
 */
const relatedTokensSchema = z.object({
    /** Tag du composant dont les tokens s'appliquent (ex: ar-tooltip) */
    component: z.string(),
    /** Explique pourquoi/comment ces tokens s'appliquent ici. Le lien vers la doc du composant est ajouté automatiquement. */
    description: z.string(),
});

/**
 * Collection "components" — un fichier MDX par composant.
 * Le frontmatter définit les métadonnées et les variantes pré-configurées.
 */
const components = defineCollection({
    loader: glob({ pattern: '**/*.mdx', base: './src/content/components' }),
    schema: z.object({
        /** Tag name du composant (ex: ar-alert) */
        tagName: z.string(),
        /** Titre affiché en haut de la page */
        title: z.string(),
        /** Nom de la variante dont le HTML initialise le playground interactif. Si absent, la première variante est utilisée. */
        playgroundTemplate: z.string().optional(),
        /** Variantes pré-configurées affichées dans le playground */
        // variants: z.array(variantSchema).default([]),
        // coerce : si le champ est absent ou null dans le MDX, on force un array vide
        variants: z.preprocess((val) => (Array.isArray(val) ? val : []), z.array(variantSchema)),
        /** Tokens d'autres composants applicables ici (composant imbriqué en interne) */
        relatedTokens: z.array(relatedTokensSchema).optional(),
        /** Script injecté une fois en fin de page, hors des variantes — pour du JS de démo
         *  page-level (ex. écouter un event et simuler la réaction attendue du consommateur)
         *  sans le rattacher artificiellement à une variante précise. */
        pageScript: z.string().optional(),
    }),
});

export const collections = { components };
