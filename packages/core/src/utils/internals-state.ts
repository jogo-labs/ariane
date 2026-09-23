/**
 * Pose ou retire un `:state()` sur `internals` (`CustomStateSet`) — cumulatif à un
 * attribut/propriété déjà reflété, jamais un remplacement (cf. #246). Tolère `internals`
 * et `internals.states` absents sans lever d'erreur : jsdom (Vitest) implémente
 * `attachInternals()` sans `CustomStateSet`, contrairement à un vrai navigateur — cf. les
 * tests `*.browser.test.ts` pour la couverture réelle du mécanisme.
 */
export function toggleState(
    internals: ElementInternals | undefined,
    name: string,
    active: boolean,
): void {
    if (active) {
        internals?.states?.add(name);
    } else {
        internals?.states?.delete(name);
    }
}
