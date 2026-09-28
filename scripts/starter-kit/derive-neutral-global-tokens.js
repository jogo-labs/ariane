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
const EXPECTED_RADIUS_COUNT = Object.keys(NEUTRAL_RADIUS).length;

// `--ar-button-primary-color` vaut `--ar-color-neutral-10` (texte sombre fixe)
// dans le thème source — cohérent avec l'ambre (primary-70 y reste assez
// clair pour du texte sombre). Le starter assombrit primary-70 (cf.
// derive-neutral-palette.js) pour un violet plus riche ; texte sombre dessus
// devient trop dur (contraste élevé mais sensation "criarde" signalée à
// l'usage). Texte blanc, cohérent avec la luminosité starter (contraste
// vérifié ≈6,2:1 à L=50%, hue 275, chroma 0.12-0.18 — cf. session de calibrage).
const STARTER_BUTTON_PRIMARY_COLOR = 'var(--ar-color-white)';

export function deriveNeutralGlobalTokens(globalTokensCssText) {
    let replacedCount = 0;
    const out = globalTokensCssText.replace(
        /--ar-border-radius-(sm|md|lg|xl):\s*[^;]+;(?:\s*\/\*[^*]*\*\/)?/g,
        (match, size) => {
            replacedCount++;
            return `--ar-border-radius-${size}: ${NEUTRAL_RADIUS[size]};`;
        },
    );
    if (replacedCount !== EXPECTED_RADIUS_COUNT) {
        throw new Error(
            `deriveNeutralGlobalTokens : ${replacedCount}/${EXPECTED_RADIUS_COUNT} tokens border-radius remplacés — _global-tokens.css a-t-il changé de format ?`,
        );
    }

    let buttonColorReplaced = false;
    const out2 = out.replace(/--ar-button-primary-color:\s*[^;]+;/, () => {
        buttonColorReplaced = true;
        return `--ar-button-primary-color: ${STARTER_BUTTON_PRIMARY_COLOR};`;
    });
    if (!buttonColorReplaced) {
        throw new Error(
            'deriveNeutralGlobalTokens : --ar-button-primary-color non substitué — _global-tokens.css a-t-il changé de format ?',
        );
    }

    return out2;
}
