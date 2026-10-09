import { emitEvent, type ArEventDetail } from './emit-event.js';

/** Détail des événements de cycle de vie disclosure (`show`/`shown`/`hide`/`hidden`…). */
export type ArToggleEventDetail = ArEventDetail;

/**
 * Construit et dispatch un `CustomEvent` selon la convention de cycle de vie disclosure
 * (`show`/`shown`/`hide`/`hidden`/`show-prevented`/`hide-prevented`) partagée par
 * ar-dropdown, ar-breadcrumb, ar-collapse (via ToggleController) et ar-dialog.
 */
export function emitToggleEvent(
    host: HTMLElement,
    name: string,
    opts: { cancelable: boolean },
): CustomEvent<ArToggleEventDetail> {
    return emitEvent(host, name, opts);
}
