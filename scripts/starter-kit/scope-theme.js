import { transform } from 'lightningcss';

// Planchers du projet : l'imbrication CSS native est conservée (le thème s'en sert déjà).
const FLOOR_TARGETS = { chrome: 125 << 16, firefox: 126 << 16, safari: (17 << 16) | (5 << 8) };
// Cible volontairement ancienne : force l'aplatissement de l'imbrication, pour que chaque règle
// porte son sélecteur complet (utilisé uniquement pour analyser, jamais pour servir).
const FLAT_TARGETS = { chrome: 100 << 16 };

/**
 * Imbrique un thème sous `.className` : le texte est enveloppé dans `.className { … }` et chaque
 * `:root` devient `&` (un `:root` imbriqué est invalide ; le conteneur le remplace). Les tokens
 * posés sur le conteneur remplacent les tokens hérités du thème global, les règles `ar-x`
 * deviennent `.className ar-x` et l'emportent par la spécificité.
 */
export function scopeThemeUnder(css, className) {
    const wrapped = `.${className} {\n${css.replaceAll(':root', '&')}\n}`;
    const { code } = transform({
        filename: 'scoped-theme.css',
        code: Buffer.from(wrapped),
        targets: FLOOR_TARGETS,
    });
    return code.toString();
}

function lowerNesting(css) {
    return transform({ filename: 'flat.css', code: Buffer.from(css), targets: FLAT_TARGETS }).code;
}

/** Tous les sélecteurs de règles de style, imbrication aplatie (structure Lightning CSS). */
export function collectSelectors(css) {
    const selectors = [];
    transform({
        filename: 'selectors.css',
        code: lowerNesting(css),
        visitor: {
            Rule: {
                style(rule) {
                    for (const selector of rule.value.selectors) selectors.push(selector);
                },
            },
        },
    });
    return selectors;
}

function propertyName(declaration) {
    return declaration.property === 'custom' ? declaration.value.name : declaration.property;
}

/**
 * Noms de propriétés déclarées par sélecteur (clé = sélecteur sérialisé en JSON), imbrication
 * aplatie, règles de même sélecteur fusionnées.
 */
export function collectDeclaredProperties(css) {
    const byKey = new Map();
    transform({
        filename: 'properties.css',
        code: lowerNesting(css),
        visitor: {
            Rule: {
                style(rule) {
                    const { declarations, importantDeclarations } = rule.value.declarations ?? {};
                    const names = [...(declarations ?? []), ...(importantDeclarations ?? [])].map(
                        propertyName,
                    );
                    for (const selector of rule.value.selectors) {
                        const key = JSON.stringify(selector);
                        if (!byKey.has(key)) byKey.set(key, new Set());
                        for (const name of names) byKey.get(key).add(name);
                    }
                },
            },
        },
    });
    return byKey;
}

function startsWithClass(selector, className) {
    const first = selector[0];
    if (first?.type === 'class' && first.name === className) return true;
    if (first?.type === 'pseudo-class' && first.kind === 'is') {
        return first.selectors.every((inner) => startsWithClass(inner, className));
    }
    return false;
}

/** Sélecteurs (texte lisible) qui ne commencent pas par `.className` : doit être vide. */
export function unscopedSelectors(css, className) {
    return collectSelectors(css)
        .filter((selector) => !startsWithClass(selector, className))
        .map((selector) =>
            selector
                .map((c) => c.type + (c.kind ? `:${c.kind}` : '') + (c.name ? `:${c.name}` : ''))
                .join(' '),
        );
}
