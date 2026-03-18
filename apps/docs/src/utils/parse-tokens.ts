/**
 * parse-tokens.ts
 *
 * Parse un fichier CSS de thème et extrait les CSS custom properties
 * organisées par catégorie sémantique.
 *
 * Catégories détectées depuis le préfixe du nom de la variable :
 *   --ar-color-*, --ar--color-*       → Couleurs
 *   --ar-font-*, --ar--font-*         → Typographie
 *   --ar-spacing-*, --ar--spacing-*   → Espacement
 *   --ar-border-radius-*, --ar-focus-* → Forme & Focus
 *   le reste                           → Tokens composants
 */

export interface Token {
    name: string;
    value: string;
}

export interface TokenCategory {
    label: string;
    tokens: Token[];
}

const CATEGORY_RULES: { pattern: RegExp; label: string }[] = [
    { pattern: /^--ar-?-?color-/, label: 'Couleurs' },
    { pattern: /^--ar-?-?(bg|border|icon)-(error|success|warning|info)/, label: 'Couleurs' },
    { pattern: /^--ar-?-?font-/, label: 'Typographie' },
    { pattern: /^--ar-?-?spacing-/, label: 'Espacement' },
    { pattern: /^--ar-?-?border-radius/, label: 'Forme' },
    { pattern: /^--ar-?-?focus-/, label: 'Focus' },
];

function categorize(name: string): string {
    for (const { pattern, label } of CATEGORY_RULES) {
        if (pattern.test(name)) return label;
    }
    return 'Tokens composants';
}

function isColor(value: string | undefined): boolean {
    if (value === undefined) return false;

    return /^#[0-9a-fA-F]{3,8}$/.test(value) || /^rgba?\(/.test(value);
}

export function parseTokens(css: string): TokenCategory[] {
    const categories = new Map<string, Token[]>();

    // Match toutes les déclarations --ar* : value;
    const regex = /(--ar[\w-]+)\s*:\s*([^;]+)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(css)) !== null) {
        const name = match[1].trim();
        const value = match[2].trim();
        const cat = categorize(name);

        if (!categories.has(cat)) categories.set(cat, []);
        (categories.get(cat) as Token[]).push({ name, value });
    }

    // Ordre de présentation fixe
    const order = ['Couleurs', 'Typographie', 'Espacement', 'Forme', 'Focus', 'Tokens composants'];

    return order
        .filter((label) => categories.has(label))
        .map((label) => ({ label, tokens: categories.get(label) as Token[] }));
}

export { isColor };
