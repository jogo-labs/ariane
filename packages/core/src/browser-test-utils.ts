/**
 * browser-test-utils.ts
 *
 * Helpers partagés pour les tests navigateur (web-test-runner).
 */

/**
 * Arrondit à 4 décimales les nombres d'une valeur CSS calculée.
 *
 * WebKit sérialise les composantes `oklch()` avec le bruit d'un flottant 32 bits
 * (`73.269997` pour `73.27`) ; Chromium et Firefox renvoient la valeur déclarée.
 */
export function roundColor(value: string): string {
    return value.replace(/\d+\.\d+/g, (n) => String(Number(Number(n).toFixed(4))));
}
