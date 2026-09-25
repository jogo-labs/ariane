// scripts/starter-kit/derive-neutral-datepicker-tokens.js

/**
 * Corrige `--ar-datepicker-day-selected-color` (`_datepicker.css`) pour le
 * starter-kit : la source fixe du texte noir (`neutral-10`) sur
 * `--ar-datepicker-day-selected-bg` (primary-70), correct pour l'ambre où
 * primary-70 est à L=80,16% (zone "texte noir" du thème source — cf.
 * PRIMARY_PALETTE dans derive-neutral-palette.js). Le violet du starter
 * assombrit primary-70 à L=50% (zone "texte blanc") pour rester lisible en
 * base de bouton — donc le jour sélectionné du datepicker, qui partage le
 * même fond, a besoin du même texte blanc.
 */
export function deriveNeutralDatepickerTokens(datepickerCssText) {
    let replaced = false;
    const out = datepickerCssText.replace(
        /--ar-datepicker-day-selected-color:\s*var\(--ar-color-neutral-10\);/,
        () => {
            replaced = true;
            return '--ar-datepicker-day-selected-color: var(--ar-color-white);';
        },
    );
    if (!replaced) {
        throw new Error(
            'deriveNeutralDatepickerTokens : --ar-datepicker-day-selected-color non substitué — _datepicker.css a-t-il changé de format ?',
        );
    }
    return out;
}
