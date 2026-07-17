/**
 * Construit et dispatch un `CustomEvent` selon la convention de cycle de vie disclosure
 * (`show`/`shown`/`hide`/`hidden`/`show-prevented`/`hide-prevented`) partagée par
 * ar-dropdown, ar-breadcrumb, ar-collapse (via ToggleController) et ar-dialog.
 */
export function emitToggleEvent(
    host: HTMLElement,
    name: string,
    opts: { cancelable: boolean },
): CustomEvent {
    const e = new CustomEvent(name, {
        bubbles: true,
        composed: true,
        cancelable: opts.cancelable,
        detail: { id: host.id || undefined },
    });
    host.dispatchEvent(e);
    return e;
}
