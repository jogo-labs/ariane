/**
 * Renvoie la liste des pages à afficher suivant la position courante.
 *
 * Sans `budget` (ou `budget` suffisant pour afficher `total` pages), comportement inchangé.
 * Avec un `budget` réduit (nombre de slots numériques disponibles, ellipses incluses), réduit
 * progressivement le nombre de pages voisines autour de `current` (`siblingCount` : 2 → 1 → 0),
 * puis renvoie une représentation minimale (3 ou 5 slots) si aucune ne tient dans le budget —
 * c'est le plancher algorithmique de cette fonction ; en dessous, l'appelant doit utiliser un
 * autre mode de rendu plutôt que d'appeler cette fonction.
 *
 * @param current Page courante
 * @param total Nombre total de pages
 * @param budget Nombre maximal de slots numériques (pages + ellipses, hors prev/next).
 *   `undefined` = comportement historique (liste complète si `total < 10`, sinon 9 slots max).
 */
export function _calculatePages(current: number, total: number, budget?: number): number[] {
    // 9 = plafond historique (siblingCount 2, boundary 1 + 2 ellipses + 5 pages autour de current)
    // utilisé quand `budget` n'est pas fourni — préserve le comportement existant à l'identique.
    const DEFAULT_BUDGET = 9;
    const effectiveBudget = budget ?? DEFAULT_BUDGET;

    if (total <= effectiveBudget) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    for (const siblingCount of [2, 1, 0]) {
        const pages = _pagesWithSiblings(current, total, siblingCount);
        if (pages.length <= effectiveBudget) return pages;
    }

    return _minimalPages(current, total);
}

/**
 * Construit la liste [1, ...ellipsis/siblings..., total] pour un `siblingCount` donné : jusqu'à
 * `siblingCount` pages de chaque côté de `current`, avec ellipses (`-1`/`-2`) si la page 1 ou
 * `total` ne sont pas directement adjacentes à la plage affichée.
 */
function _pagesWithSiblings(current: number, total: number, siblingCount: number): number[] {
    // Nombre de pages affichées quand une ellipse est absorbée d'un côté (boundary incluse).
    const windowSize = 2 * siblingCount + 3;

    let left = Math.max(current - siblingCount, 2);
    let right = Math.min(current + siblingCount, total - 1);

    const showLeftEllipsis = left > 3;
    const showRightEllipsis = right < total - 2;

    if (!showLeftEllipsis && !showRightEllipsis) {
        // Les deux fenêtres se rejoignent : la plage couvre tout [2, total-1] sans troncature,
        // sinon les deux `if` s'écrasent silencieusement l'un l'autre et une page disparaît
        // sans marqueur d'ellipse pour signaler la troncature.
        left = 2;
        right = total - 1;
    } else if (!showLeftEllipsis) {
        left = 2;
        right = Math.min(windowSize, total - 1);
    } else if (!showRightEllipsis) {
        right = total - 1;
        left = Math.max(total - windowSize + 1, 2);
    }

    const pages = [1];
    if (showLeftEllipsis) pages.push(-1);
    for (let p = left; p <= right; p++) pages.push(p);
    if (showRightEllipsis) pages.push(-2);
    pages.push(total);
    return pages;
}

/**
 * Plancher algorithmique : boundary(s) + current, avec ellipses si nécessaire. 3 ou 5 slots.
 *
 * Précondition implicite non vérifiée : `total >= 3`. En dessous, le résultat n'est pas
 * garanti — actuellement inatteignable en pratique car `_calculatePages` retourne toujours
 * plus tôt (`total <= effectiveBudget`) pour `total <= 2`.
 */
function _minimalPages(current: number, total: number): number[] {
    if (current <= 1) return [1, -2, total];
    if (current >= total) return [1, -1, total];
    return [1, -1, current, -2, total];
}

/**
 * Renvoie une valeur comprise dans un intervalle
 *
 * @param value Valeur retournée si comprise dans l'intervalle
 * @param min Valeur minimale retournée
 * @param max Valeur maximale retournée
 */
export function _clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}
