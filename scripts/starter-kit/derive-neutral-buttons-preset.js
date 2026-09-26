// scripts/starter-kit/derive-neutral-buttons-preset.js

/**
 * Corrige la couleur de texte du bouton primaire au clic (`buttons.css`,
 * `.ar-btn-primary:active`) pour le starter-kit. La source fixe
 * `light-dark(--ar-color-text, --ar-color-text-inverse)` (texte sombre dans
 * les deux modes), cohérent avec le fond source `--ar-button-primary-bg-active`
 * (primary-60/-80 côté ambre, tous deux en zone "texte noir" du thème
 * source). Le violet du starter assombrit ces mêmes paliers (zone "texte
 * blanc", cf. PRIMARY_PALETTE dans derive-neutral-palette.js) — texte blanc
 * fixe, cohérent avec `--ar-button-primary-color` déjà corrigé côté
 * `_global-tokens.css`.
 */
export function deriveNeutralButtonsPreset(buttonsCssText) {
    let replaced = false;
    const out = buttonsCssText.replace(
        /color:\s*light-dark\(var\(--ar-color-text\),\s*var\(--ar-color-text-inverse\)\);/,
        () => {
            replaced = true;
            return 'color: var(--ar-color-white);';
        },
    );
    if (!replaced) {
        throw new Error(
            'deriveNeutralButtonsPreset : couleur de texte :active non substituée — buttons.css a-t-il changé de format ?',
        );
    }
    return out;
}
