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

/**
 * Prépare l'entrée de findDuplicateTokens() pour être insensible aux
 * redéclarations légitimes d'un même token sous plusieurs sélecteurs à
 * l'intérieur d'un seul fragment (ex. --ar-alert-bg une fois par variant) —
 * seul un token apparaissant dans PLUSIEURS fichiers différents doit être
 * signalé. Déduplique les tokens par fichier avant concaténation : un même
 * nom de token qui ne survit qu'une fois par fichier ne peut alors être
 * détecté en double par findDuplicateTokens() que s'il vient de fichiers
 * distincts.
 */
export function buildDedupedTokenInventory(fragmentContents) {
    return fragmentContents
        .map((content) => {
            // Neutralise les commentaires /* ... */ pour éviter qu'une mention en
            // prose d'un nom de token (ex. « ... volontairement non cascadée depuis
            // --ar-panel-min-width : un menu ... ») ne soit comptée comme une
            // déclaration — même garde qu'ailleurs dans le projet, cf.
            // validate-no-hardcoded-tokens.js.
            const withoutComments = content.replace(/\/\*[\s\S]*?\*\//g, '');
            const names = new Set();
            for (const match of withoutComments.matchAll(/(--ar-[a-zA-Z0-9-]+)(?=\s*:)/g)) {
                names.add(match[1]);
            }
            return [...names].map((name) => `${name}: 1;`).join('\n');
        })
        .join('\n');
}
