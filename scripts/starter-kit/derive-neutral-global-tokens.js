// Échelle plus discrète que celle d'Ariane (identité "#110") — valeurs
// courantes (proches des défauts Tailwind/shadcn), pas dérivées de la
// source : c'est un choix de design du starter, pas une préservation de
// contrainte de contraste (contrairement à la palette de couleurs).
const NEUTRAL_RADIUS = {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
};

/**
 * Neutralise l'échelle de radius (identité "#110") d'un fragment
 * `_global-tokens.css` — remplace uniquement --ar-border-radius-{sm,md,lg,xl}
 * (`-full` reste inchangé, déjà générique). Tout le reste du fichier
 * (typographie, espacement, tokens génériques mutualisés bouton/input/panel)
 * passe inchangé — ce ne sont pas des choix d'identité visuelle.
 */
export function deriveNeutralGlobalTokens(globalTokensCssText) {
    return globalTokensCssText.replace(
        /--ar-border-radius-(sm|md|lg|xl):\s*[^;]+;(?:\s*\/\*[^*]*\*\/)?/g,
        (match, size) => `--ar-border-radius-${size}: ${NEUTRAL_RADIUS[size]};`,
    );
}
