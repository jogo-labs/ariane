/**
 * Un token --ar-* ne doit être déclaré que dans un seul fragment — cf. #256.
 * Une déclaration en double serait silencieusement écrasée par la dernière
 * en ordre d'import (cascade CSS standard sur une même propriété).
 */
export function findDuplicateTokens(cssText) {
    const counts = new Map();
    for (const match of cssText.matchAll(/(--ar-[a-zA-Z0-9-]+)(?=\s*:)/g)) {
        const name = match[1];
        counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts.entries()]
        .filter(([, n]) => n > 1)
        .map(
            ([name, n]) =>
                `${name} est déclaré ${n} fois — un token ne doit vivre que dans un seul fragment.`,
        );
}
