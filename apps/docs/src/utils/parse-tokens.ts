/**
 * parse-tokens.ts
 *
 * Parse un fichier CSS de thème et extrait les CSS custom properties
 * organisées par catégorie sémantique, plus une fonction dédiée pour
 * la palette brute groupée par hue.
 */

export interface Token {
    name: string;
    value: string; // toujours nettoyé (sans commentaire oklch)
    resolvedColor?: string; // valeur de couleur résolue (suit les var() jusqu'à une couleur concrète)
}

export interface TokenCategory {
    label: string;
    tokens: Token[];
}

export interface PaletteHue {
    name: string; // ex: "primary"
    stops: { stop: string; value: string }[]; // triés numériquement
}

// Hues reconnues dans l'ordre d'affichage
const PALETTE_HUES = [
    'primary',
    'neutral',
    'green',
    'yellow',
    'red',
    'blue',
    'orange',
    'cyan',
    'indigo',
    'purple',
    'pink',
] as const;

// Regex pour détecter un stop de palette brute : --ar-color-{hue}-{number}
const PALETTE_TOKEN_RE =
    /^--ar-color-(primary|neutral|green|yellow|red|blue|orange|cyan|indigo|purple|pink)-(\d+)$/;

// Filtre les alias sémantiques internes (--ar-color-success-05…-95, etc.)
// Ces tokens sont des alias vers la palette — ne pas les afficher
const ALIAS_FILTER = /^--ar-color-(success|warning|danger|info)-\d+$/;

const CATEGORY_RULES: { pattern: RegExp; label: string }[] = [
    // Palette brute — stops numériques
    { pattern: PALETTE_TOKEN_RE, label: 'Palette brute' },
    // Tokens sémantiques de couleur — ordre critique (premier match gagne)
    { pattern: /^--ar-color-interactive/, label: 'Interaction' },
    { pattern: /^--ar-color-(white|text|bg|border)/, label: 'Texte & Surface' },
    { pattern: /^--ar-color-(success|warning|danger|info)-(bg|text)$/, label: 'États' },
    { pattern: /^--ar-focus-/, label: 'Focus' },
    // Autres tokens globaux
    { pattern: /^--ar-font-/, label: 'Typographie' },
    { pattern: /^--ar-spacing-/, label: 'Espacement & Forme' },
    { pattern: /^--ar-border-radius/, label: 'Espacement & Forme' },
    // Fallback : tokens composants (button, breadcrumb, stepper…)
];

const DISPLAY_ORDER = [
    'Palette brute',
    'Interaction',
    'Texte & Surface',
    'États',
    'Focus',
    'Typographie',
    'Espacement & Forme',
    'Tokens composants',
];

/** Nettoie une valeur CSS brute : retire le commentaire oklch(...) s'il existe. */
function cleanValue(raw: string): string {
    return raw.split('/*')[0].trim();
}

function categorize(name: string): string {
    for (const { pattern, label } of CATEGORY_RULES) {
        if (pattern.test(name)) return label;
    }
    return 'Tokens composants';
}

export function isColor(value: string): boolean {
    return /^#[0-9a-fA-F]{3,8}$/.test(value) || /^rgba?\(/.test(value) || /^oklch\(/.test(value);
}

/**
 * Résout une valeur CSS en suivant les références var(--ar-*) jusqu'à une couleur concrète.
 * Retourne la valeur concrète si c'est une couleur, undefined sinon.
 * Limite à 10 niveaux de résolution pour éviter les boucles infinies.
 */
function resolveColor(value: string, tokenMap: Map<string, string>, depth = 0): string | undefined {
    if (depth > 10) return undefined;
    if (isColor(value)) return value;

    const varMatch = /^var\((--ar[\w-]+)/.exec(value);
    if (!varMatch) return undefined;

    const ref = tokenMap.get(varMatch[1]);
    if (!ref) return undefined;

    return resolveColor(ref, tokenMap, depth + 1);
}

/** Parse tous les tokens et les retourne groupés par catégorie sémantique. */
export function parseTokens(css: string): TokenCategory[] {
    // Passe 1 : construire la map complète name → valeur nettoyée (pour résolution var())
    const tokenMap = new Map<string, string>();
    const mapRegex = /(--ar[\w-]+)\s*:\s*([^;]+)/g;
    let m: RegExpExecArray | null;
    while ((m = mapRegex.exec(css)) !== null) {
        tokenMap.set(m[1].trim(), cleanValue(m[2]));
    }

    // Passe 2 : catégoriser et résoudre les couleurs
    const categories = new Map<string, Token[]>();
    const regex = /(--ar[\w-]+)\s*:\s*([^;]+)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(css)) !== null) {
        const name = match[1].trim();

        // Exclure les alias sémantiques internes (success/warning/danger/info + stops numériques)
        if (ALIAS_FILTER.test(name)) continue;

        const value = cleanValue(match[2]);
        const resolvedColor = resolveColor(value, tokenMap) ?? (isColor(value) ? value : undefined);
        const cat = categorize(name);

        if (!categories.has(cat)) categories.set(cat, []);
        (categories.get(cat) as Token[]).push({ name, value, resolvedColor });
    }

    return DISPLAY_ORDER.filter((label) => categories.has(label)).map((label) => {
        const tokens = categories.get(label);
        if (!tokens) throw new Error(`Category "${label}" not found`);
        return { label, tokens };
    });
}

/** Parse la palette brute et retourne les hues avec leurs stops triés numériquement. */
export function parsePalette(css: string): PaletteHue[] {
    const hueMap = new Map<string, { stop: string; value: string }[]>();

    const regex = /(--ar[\w-]+)\s*:\s*([^;]+)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(css)) !== null) {
        const name = match[1].trim();
        const paletteMatch = PALETTE_TOKEN_RE.exec(name);
        if (!paletteMatch) continue;

        const hue = paletteMatch[1];
        const stop = paletteMatch[2]; // ex: "0", "05", "100"
        const value = cleanValue(match[2]);

        if (!hueMap.has(hue)) hueMap.set(hue, []);
        (hueMap.get(hue) as { stop: string; value: string }[]).push({ stop, value });
    }

    // Trier les stops numériquement pour chaque hue
    for (const stops of hueMap.values()) {
        stops.sort((a, b) => (parseInt(a.stop, 10) || 0) - (parseInt(b.stop, 10) || 0));
    }

    // Retourner dans l'ordre déclaré des hues (hues absentes ignorées)
    return PALETTE_HUES.filter((hue) => hueMap.has(hue)).map((name) => {
        const stops = hueMap.get(name);
        if (!stops) throw new Error(`Hue "${name}" not found`);
        return { name, stops };
    });
}
