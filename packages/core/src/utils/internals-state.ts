/**
 * Pose ou retire un `:state()` sur `internals` (`CustomStateSet`) — cumulatif à un
 * attribut/propriété déjà reflété, jamais un remplacement (cf. #246). Tolère `internals`
 * et `internals.states` absents sans lever d'erreur : happy-dom (Vitest) n'implémente pas
 * `attachInternals()` du tout (vérifié : `typeof el.attachInternals === 'undefined'`),
 * contrairement à un vrai navigateur — cf. les tests `*.browser.test.ts` pour la couverture
 * réelle du mécanisme.
 *
 * Chrome/Edge 90 à 124 n'acceptent que les noms préfixés par `--` (sélecteur `:--nom`, retiré
 * en 125 au profit de `:state(nom)`) et lèvent une erreur sinon. Dans ce cas le state est exposé
 * sous `--nom` : les thèmes (celui du starter-kit compris) ne ciblent que `:state(nom)`, c'est
 * au thème du consommateur de cibler aussi `:--nom` s'il veut supporter ces versions. La
 * suppression retire les deux formes.
 */
export function toggleState(
    internals: ElementInternals | undefined,
    name: string,
    active: boolean,
): void {
    const states = internals?.states;
    if (!states) return;

    if (active) {
        try {
            states.add(name);
            return;
        } catch {
            // Nom sans `--` refusé (Chrome/Edge 90 à 124) : repli sur la forme préfixée.
        }
        try {
            states.add(`--${name}`);
        } catch {
            // Refusé aussi : le state n'est qu'un point d'accroche de style, on ne plante pas.
        }
        return;
    }

    // Les deux formes peuvent exister selon le navigateur, et `delete` n'a pas forcément la même
    // validation que `add` : on tente chacune indépendamment.
    for (const candidate of [name, `--${name}`]) {
        try {
            states.delete(candidate);
        } catch {
            // Ignoré, même raison que ci-dessus.
        }
    }
}
