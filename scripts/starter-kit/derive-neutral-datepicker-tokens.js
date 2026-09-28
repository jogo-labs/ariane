// scripts/starter-kit/derive-neutral-datepicker-tokens.js

/**
 * Corrige deux textes fixés en dur sur `_datepicker.css` pour le starter-kit
 * — même cause dans les deux cas : la source suppose que `primary-70` reste
 * dans la zone "texte sombre" du thème ambre (L=80,16%), or le violet du
 * starter l'assombrit à L=50% (zone "texte blanc") pour rester lisible en
 * base de bouton (cf. PRIMARY_PALETTE dans derive-neutral-palette.js).
 *
 * - `--ar-datepicker-day-selected-color` : jour sélectionné, fond
 *   `--ar-datepicker-day-selected-bg` = primary-70 directement.
 * - `color: light-dark(--ar-color-text, --ar-color-text-inverse)` sur
 *   `::part(trigger):active` : fond `--ar-button-primary-bg-active`, dérivé
 *   de primary-70 (assombri davantage, cf. color-mix dans
 *   _global-tokens.css) — texte sombre dans les DEUX modes ici, puisque
 *   `--ar-color-text-inverse` (sombre en mode sombre) tombe aussi sur un
 *   fond sombre.
 */
export function deriveNeutralDatepickerTokens(datepickerCssText) {
    let replaced = false;
    let out = datepickerCssText.replace(
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

    let triggerActiveReplaced = false;
    out = out.replace(
        /color:\s*light-dark\(var\(--ar-color-text\),\s*var\(--ar-color-text-inverse\)\);/,
        () => {
            triggerActiveReplaced = true;
            return 'color: var(--ar-color-white);';
        },
    );
    if (!triggerActiveReplaced) {
        throw new Error(
            'deriveNeutralDatepickerTokens : couleur de texte du trigger :active non substituée — _datepicker.css a-t-il changé de format ?',
        );
    }

    return out;
}
