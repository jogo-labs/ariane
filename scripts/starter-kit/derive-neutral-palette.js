// Palette primaire figée (violet, hue 275 — proche du bleu Linear #5E6AD2).
// Rampe monotone (L croît de 05 à 95) pour les paliers 05-50 et 90-95 — SAUF
// 60/70/80, qui dérogent délibérément :
// - primary-70 (fond du bouton primaire, buttons.css ; aussi datepicker,
//   tab, table-sort) est assombri à L=50% pour un bouton riche avec texte
//   blanc lisible (contraste ≈6,3:1) — bien plus sombre que sa position
//   "naturelle" dans la rampe.
// - primary-60/-80 n'ont plus besoin de suivre primary-70 : le survol/actif
//   du bouton se calcule désormais par color-mix() relatif à
//   --ar-button-primary-bg (cf. _global-tokens.css), pas via ces paliers.
//   Ils redeviennent donc libres pour leur AUTRE usage partagé —
//   --ar-color-interactive-subtle notamment (stepper, démo pill des tabs),
//   qui présume un texte sombre dessus — d'où des valeurs proches de la
//   position d'origine de l'ambre (primary-60 à L=70,5%, primary-80 à
//   L=86,5%), plutôt qu'un enchaînement monotone autour de 50%.
// Chroma ≈50-56% du plafond de gamut sRGB à chaque palier (vérifié
// empiriquement), resserré aux extrêmes (05/95, 90) où une chroma élevée
// lit "criard".
const PRIMARY_PALETTE = {
    '05': 'oklch(14% 0.05 275)',
    10: 'oklch(19% 0.07 275)',
    20: 'oklch(25% 0.09 275)',
    30: 'oklch(31% 0.11 275)',
    40: 'oklch(37% 0.13 275)',
    50: 'oklch(43% 0.15 275)',
    60: 'oklch(70% 0.09 275)',
    70: 'oklch(50% 0.16 275)',
    80: 'oklch(82% 0.045 275)',
    90: 'oklch(88% 0.03 275)',
    95: 'oklch(95% 0.014 275)',
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
