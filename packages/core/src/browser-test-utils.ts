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

let srgbContext: CanvasRenderingContext2D | null = null;

/**
 * Résout une couleur CSS (oklch, color-mix…) en composantes sRGB 0-255 via un canvas 2D.
 * Suppose une couleur opaque : lève une erreur si l'alpha résolu n'est pas 255.
 */
export function toSrgb(color: string): [number, number, number] {
    srgbContext ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    if (!srgbContext) throw new Error('Canvas 2D indisponible');
    srgbContext.clearRect(0, 0, 1, 1);
    srgbContext.fillStyle = color;
    srgbContext.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0, a = 0] = srgbContext.getImageData(0, 0, 1, 1).data;
    if (a !== 255) throw new Error(`Couleur non opaque ou invalide : ${color}`);
    return [r, g, b];
}

/** Rapport de contraste WCAG 2.x entre deux couleurs CSS opaques. */
export function contrastRatio(a: string, b: string): number {
    const luminance = (color: string): number => {
        const [r, g, b] = toSrgb(color).map((c) => {
            const v = c / 255;
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        }) as [number, number, number];
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
    return (hi + 0.05) / (lo + 0.05);
}
