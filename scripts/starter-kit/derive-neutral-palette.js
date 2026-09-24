// Chroma par palier — même structure de progression que la palette primaire
// d'origine, mais fortement réduite pour un rendu sobre. Hue 250 = slate-blue
// neutre, indépendant de la teinte ambre d'identité.
const PRIMARY_CHROMA = {
    '05': '0.02',
    10: '0.025',
    20: '0.03',
    30: '0.035',
    40: '0.04',
    50: '0.045',
    60: '0.05',
    70: '0.045',
    80: '0.035',
    90: '0.025',
    95: '0.015',
};
const NEUTRAL_HUE = 250;

/**
 * Neutralise la palette primaire (identité ambre) d'un fragment `_palette.css`
 * en un slate-blue sobre, pour le thème starter-kit. La luminosité (L) de
 * chaque palier est préservée telle quelle depuis la source — donc les
 * ratios de contraste calculés pour `ariane.css` restent valides ici ; seuls
 * la teinte et le chroma changent. `--ar-color-vault`/`-vault-deep`
 * deviennent des alias vers la rampe neutre déjà présente dans le fichier
 * (identité "Voûte" non pertinente pour un starter neutre). Tout le reste
 * (Neutral/Green/Yellow/Red/Blue/White — hues sémantiques universelles, pas
 * une identité de marque) passe inchangé.
 */
export function deriveNeutralPalette(paletteCssText) {
    let out = paletteCssText.replace(
        /--ar-color-primary-(\d{2}):\s*oklch\(([\d.]+%)\s+[\d.]+\s+[\d.]+\);/g,
        (match, step, lightness) => {
            const chroma = PRIMARY_CHROMA[step];
            if (!chroma) return match;
            return `--ar-color-primary-${step}: oklch(${lightness} ${chroma} ${NEUTRAL_HUE});`;
        },
    );
    out = out.replace(
        /--ar-color-vault:\s*oklch\([^)]*\);/,
        '--ar-color-vault: var(--ar-color-neutral-10);',
    );
    out = out.replace(
        /--ar-color-vault-deep:\s*oklch\([^)]*\);/,
        '--ar-color-vault-deep: var(--ar-color-neutral-05);',
    );
    return out;
}
