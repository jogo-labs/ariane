#!/usr/bin/env node
/**
 * Outil de développement TEMPORAIRE (#201) — conversions sRGB <-> OKLCH
 * (matrices de référence Björn Ottosson) + calcul de contraste WCAG.
 * Supprimé en fin de chantier (cf. Task 8 du plan #201).
 *
 * Usage : import { hexToOklch, oklchToHex, contrast } from './tmp-color-contrast-check.mjs';
 */

function hexToSrgb(hex) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    return [r, g, b];
}

function srgbToLinear(c) {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c) {
    c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.min(1, Math.max(0, c));
}

function srgbToOklab([r, g, b]) {
    const [lr, lg, lb] = [r, g, b].map(srgbToLinear);
    const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
    const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
    const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
    const l_ = Math.cbrt(l),
        m_ = Math.cbrt(m),
        s_ = Math.cbrt(s);
    return [
        0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
    ];
}

function oklabToOklch([L, a, b]) {
    const C = Math.sqrt(a * a + b * b);
    let H = (Math.atan2(b, a) * 180) / Math.PI;
    if (H < 0) H += 360;
    return [L, C, H];
}

function oklchToOklab([L, C, H]) {
    const h = (H * Math.PI) / 180;
    return [L, C * Math.cos(h), C * Math.sin(h)];
}

function oklabToSrgb([L, a, b]) {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;
    const l = l_ ** 3,
        m = m_ ** 3,
        s = s_ ** 3;
    const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
    return [r, g, bl].map(linearToSrgb);
}

function relLuminance([r, g, b]) {
    const [R, G, B] = [r, g, b].map(srgbToLinear);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function hexToOklch(hex) {
    return oklabToOklch(srgbToOklab(hexToSrgb(hex)));
}

export function oklchToHex([L, C, H]) {
    const [r, g, b] = oklabToSrgb(oklchToOklab([L, C, H]));
    const to2 = (c) =>
        Math.round(c * 255)
            .toString(16)
            .padStart(2, '0');
    return `#${to2(r)}${to2(g)}${to2(b)}`;
}

function toSrgbTriplet(color) {
    return typeof color === 'string' ? hexToSrgb(color) : oklabToSrgb(oklchToOklab(color));
}

export function contrast(colorA, colorB) {
    const L1 = relLuminance(toSrgbTriplet(colorA));
    const L2 = relLuminance(toSrgbTriplet(colorB));
    const [hi, lo] = [L1, L2].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}
