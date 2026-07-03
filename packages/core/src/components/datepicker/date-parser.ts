export interface ParseResult {
    complete: boolean;
    valid: boolean;
    date: Date | null;
}

const TOKEN_REGEX: Record<string, string> = {
    dd: '(\\d{1,2})',
    MM: '(\\d{1,2})',
    yyyy: '(\\d{4})',
};

interface CompiledPattern {
    regex: RegExp;
    tokenOrder: string[];
}

// formatPattern est une chaîne de configuration (prop `format`), un nombre fini de valeurs
// distinctes par application — pas d'entrée utilisateur, pas de croissance non bornée.
const patternCache = new Map<string, CompiledPattern>();

function compilePattern(formatPattern: string): CompiledPattern {
    const cached = patternCache.get(formatPattern);
    if (cached) return cached;

    const tokenOrder: string[] = [];
    const regexStr = formatPattern
        .replace(/[.*+?^${}()|[\]\\]/g, (ch) => `\\${ch}`)
        .replace(/yyyy|MM|dd/g, (token) => {
            tokenOrder.push(token);
            return TOKEN_REGEX[token];
        });

    const compiled: CompiledPattern = { regex: new RegExp(`^${regexStr}$`), tokenOrder };
    patternCache.set(formatPattern, compiled);
    return compiled;
}

export function parse(input: string, formatPattern: string): ParseResult {
    const { regex, tokenOrder } = compilePattern(formatPattern);

    const match = input.match(regex);
    if (!match) return { complete: false, valid: false, date: null };

    const values: Record<string, number> = {};
    tokenOrder.forEach((token, i) => {
        values[token] = parseInt(match[i + 1], 10);
    });

    const day = values['dd'] ?? 1;
    const month = (values['MM'] ?? 1) - 1;
    const year = values['yyyy'] ?? 0;

    const constructed = new Date(year, month, day);
    const valid =
        constructed.getFullYear() === year &&
        constructed.getMonth() === month &&
        constructed.getDate() === day;

    return {
        complete: true,
        valid,
        date: valid ? constructed : null,
    };
}

export function format(date: Date, formatPattern: string): string {
    const pad = (n: number, len: number): string => String(n).padStart(len, '0');
    return formatPattern
        .replace('dd', pad(date.getDate(), 2))
        .replace('MM', pad(date.getMonth() + 1, 2))
        .replace('yyyy', String(date.getFullYear()));
}
