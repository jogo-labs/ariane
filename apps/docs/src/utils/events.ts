/**
 * events.ts
 *
 * Dérive l'annulabilité d'un événement CEM depuis la convention JSDoc `@event` : toute
 * description qui se termine par le marqueur "@cancelable" (précédé d'un espace, en fin de
 * ligne — jamais un tag JSDoc séparé) décrit un événement
 * `dispatchEvent(..., { cancelable: true })`.
 *
 * Convention appliquée dans tous les composants Lit concernés — cf.
 * packages/core/src/components/dialog/dialog.ts, collapse.ts, breadcrumb.ts, dropdown.ts,
 * datepicker.ts.
 */

const CANCELABLE_MARKER_RE = /\s*@cancelable\s*$/;

/** Retourne true si la description JSDoc d'un event se termine par le marqueur "@cancelable". */
export function isCancelableEvent(description: string | undefined): boolean {
    if (description === undefined) return false;
    return CANCELABLE_MARKER_RE.test(description);
}

/** Retire le marqueur "@cancelable" (et l'espace précédent) d'une description, si présent. */
export function stripCancelableMarker(description: string | undefined): string {
    if (description === undefined) return '';
    return description.replace(CANCELABLE_MARKER_RE, '');
}

const EVENT_DETAIL_RE = /^CustomEvent\s*<([\s\S]+)>$/;

/**
 * Extrait le type du `detail` du texte de type CEM d'un événement : `CustomEvent<X>` donne `X`,
 * un `CustomEvent` nu ou un type absent donnent `null`.
 */
export function eventDetailType(type: string | undefined): string | null {
    if (type === undefined) return null;
    const match = EVENT_DETAIL_RE.exec(type.trim());
    const detail = match?.[1]?.trim();
    return detail ? detail : null;
}
