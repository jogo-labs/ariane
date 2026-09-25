// Palette primaire figée (violet, hue 275 — proche du bleu Linear #5E6AD2).
// Rampe monotone (L croît de 05 à 95, propriété normalement attendue d'une
// telle table) redessinée spécifiquement pour que primary-70 — utilisé en
// dur comme fond du bouton primaire (buttons.css) et par plusieurs
// composants (datepicker, tab, table-sort) — tombe à ~50%, assez sombre
// pour du texte blanc lisible, sans casser l'ordre des paliers voisins
// (60/80, utilisés pour hover/active) comme le faisait un override ponctuel.
// Palier 70 = 8ᵉ des 11 : les paliers 05-60 sont resserrés sous 50%, 80-95
// couvrent la remontée rapide vers le clair — forme volontairement
// asymétrique, pas un choix esthétique en soi. Chroma ≈55-56% du plafond de
// gamut sRGB à chaque palier (vérifié empiriquement), resserré aux paliers
// 90/95 (teintes très claires, chroma élevée y lit "criard").
const PRIMARY_PALETTE = {
    '05': 'oklch(14% 0.05 275)',
    10: 'oklch(19% 0.07 275)',
    20: 'oklch(25% 0.09 275)',
    30: 'oklch(31% 0.11 275)',
    40: 'oklch(37% 0.13 275)',
    50: 'oklch(43% 0.15 275)',
    60: 'oklch(47% 0.16 275)',
    70: 'oklch(50% 0.16 275)',
    80: 'oklch(53% 0.14 275)',
    90: 'oklch(75% 0.05 275)',
    95: 'oklch(88% 0.02 275)',
};

/**
 * Remplace la palette primaire (identité ambre) d'un fragment `_palette.css`
 * par une palette violette figée (`PRIMARY_PALETTE`), pour le thème
 * starter-kit. `--ar-color-vault`/`-vault-deep` deviennent des alias vers la
 * rampe neutre déjà présente dans le fichier (identité "Voûte" non
 * pertinente pour un starter neutre). Tout le reste (Neutral/Green/Yellow/
 * Red/Blue/White — hues sémantiques universelles, pas une identité de
 * marque) passe inchangé.
 */
const EXPECTED_PRIMARY_COUNT = Object.keys(PRIMARY_PALETTE).length;

export function deriveNeutralPalette(paletteCssText) {
    let primaryReplacedCount = 0;
    let out = paletteCssText.replace(
        /--ar-color-primary-(\d{2}):\s*oklch\([^)]*\);/g,
        (match, step) => {
            const value = PRIMARY_PALETTE[step];
            if (!value) return match;
            primaryReplacedCount++;
            return `--ar-color-primary-${step}: ${value};`;
        },
    );
    if (primaryReplacedCount !== EXPECTED_PRIMARY_COUNT) {
        throw new Error(
            `deriveNeutralPalette : ${primaryReplacedCount}/${EXPECTED_PRIMARY_COUNT} paliers primary remplacés — _palette.css a-t-il changé de format ?`,
        );
    }

    let vaultReplaced = false;
    out = out.replace(/--ar-color-vault:\s*oklch\([^)]*\);/, () => {
        vaultReplaced = true;
        return '--ar-color-vault: var(--ar-color-neutral-10);';
    });
    if (!vaultReplaced) {
        throw new Error(
            'deriveNeutralPalette : --ar-color-vault non substitué — _palette.css a-t-il changé de format ?',
        );
    }

    let vaultDeepReplaced = false;
    out = out.replace(/--ar-color-vault-deep:\s*oklch\([^)]*\);/, () => {
        vaultDeepReplaced = true;
        return '--ar-color-vault-deep: var(--ar-color-neutral-05);';
    });
    if (!vaultDeepReplaced) {
        throw new Error(
            'deriveNeutralPalette : --ar-color-vault-deep non substitué — _palette.css a-t-il changé de format ?',
        );
    }

    return out;
}
