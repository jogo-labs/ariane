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

export function parse(input: string, formatPattern: string): ParseResult {
    const tokenOrder: string[] = [];

    const regexStr = formatPattern
        .replace(/[.*+?^${}()|[\]\\]/g, (ch) => `\\${ch}`)
        .replace(/yyyy|MM|dd/g, (token) => {
            tokenOrder.push(token);
            return TOKEN_REGEX[token];
        });

    const match = input.match(new RegExp(`^${regexStr}$`));
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
