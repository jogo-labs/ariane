/**
 * Pose ou retire un `:state()` sur `internals` (`CustomStateSet`) — cumulatif à un
 * attribut/propriété déjà reflété, jamais un remplacement (cf. #246). Tolère `internals`
 * et `internals.states` absents sans lever d'erreur : happy-dom (Vitest) n'implémente pas
 * `attachInternals()` du tout (vérifié : `typeof el.attachInternals === 'undefined'`),
 * contrairement à un vrai navigateur — cf. les tests `*.browser.test.ts` pour la couverture
 * réelle du mécanisme.
 */
export function toggleState(
    internals: ElementInternals | undefined,
    name: string,
    active: boolean,
): void {
    try {
        if (active) {
            internals?.states?.add(name);
        } else {
            internals?.states?.delete(name);
        }
    } catch {
        // Chrome/Edge 90 à 124 : CustomStateSet lève une erreur pour un nom sans `--` (le
        // `:state()` sans tirets n'arrive qu'en 125). Le state n'est qu'un point d'accroche de
        // style, cumulatif à l'attribut reflété : ne pas planter le composant pour autant.
    }
}
