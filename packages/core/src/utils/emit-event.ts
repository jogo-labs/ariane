/**
 * Champs communs au `detail` de tous les événements publics `ar-*` : `id` est la valeur de
 * l'attribut `id` de l'hôte au moment de l'émission, telle quelle (`undefined` si l'hôte n'en
 * a pas). Les composants qui génèrent un `id` pour leurs liens ARIA (collapse, tooltip,
 * charcounter) l'exposent aussi.
 */
export type ArEventDetail = { id: string | undefined };

/**
 * Construit et dispatch un `CustomEvent` public (`bubbles` et `composed` à `true`) dont le
 * `detail` porte toujours `id` (`host.id || undefined`) en premier, suivi du détail propre à
 * l'événement. Retourne l'événement dispatché (utiliser `defaultPrevented` pour un événement
 * annulable).
 */
export function emitEvent<D extends object = object>(
    host: HTMLElement,
    name: string,
    opts: { cancelable?: boolean; detail?: D & { id?: never } } = {},
): CustomEvent<ArEventDetail & D> {
    const e = new CustomEvent<ArEventDetail & D>(name, {
        bubbles: true,
        composed: true,
        cancelable: opts.cancelable === true,
        detail: { ...opts.detail, id: host.id || undefined } as ArEventDetail & D,
    });
    host.dispatchEvent(e);
    return e;
}
