/**
 * Renvoie la liste des pages à afficher suivant la position courante
 *
 * @param current Page courante
 * @param total Nombre total de pages
 */
export function _calculatePages(current: number, total: number) {
    // => 1, 2, 3, 4, (5), 6, 7, 8, 9
    if (total < 10) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    // => 1, 2, 3, 4, (5), 6, 7, ..., 10
    if (current <= 5) {
        return [1, 2, 3, 4, 5, 6, 7, -2, total];
    }

    // => 1, ..., 4, 5, (6), 7, 8, 9, 10
    if (current >= total - 4) {
        return [1, -1, total - 6, total - 5, total - 4, total - 3, total - 2, total - 1, total];
    }

    // => 1, ..., 4, 5, (6), 7, 8, ..., 12
    return [1, -1, current - 2, current - 1, current, current + 1, current + 2, -2, total];
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

export const mrPaginationUtils = {
    _calculatePages,
    _clamp,
};
