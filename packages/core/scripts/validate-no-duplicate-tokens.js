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
 * Extrait uniquement le contenu du bloc :root { ... } de tête d'un fragment
 * (comptage d'accolades — même technique que topLevelRules() dans
 * extract-component-rules.js). Retourne '' si le fragment n'a pas de bloc
 * :root en tête (fragment uniquement composé de règles). Les déclarations
 * imbriquées dans un sélecteur composant (ex. &::part(panel) { --ar-x: y; })
 * ne sont jamais des tokens globaux concurrents — hors du bloc :root, elles
 * sont ignorées par construction, pas seulement par exception au cas par cas.
 */
export function extractRootTokens(fragmentContent) {
    const match = fragmentContent.match(/:root\s*\{/);
    if (!match) return '';
    const openBraceIndex = match.index + match[0].length - 1;
    let depth = 0;
    for (let i = openBraceIndex; i < fragmentContent.length; i++) {
        if (fragmentContent[i] === '{') depth++;
        else if (fragmentContent[i] === '}') {
            depth--;
            if (depth === 0) return fragmentContent.slice(openBraceIndex + 1, i);
        }
    }
    return fragmentContent.slice(openBraceIndex + 1); // unclosed — best effort, shouldn't happen on valid CSS
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
 *
 * Ne considère que le bloc :root de tête de chaque fragment (via
 * extractRootTokens) : une redéclaration imbriquée dans un sélecteur
 * composant (ex. &::part(panel) { --ar-panel-max-width: auto; }) est
 * toujours un override scopé légitime, jamais un token global concurrent —
 * qu'elle vive dans le même fichier ou dans un fichier différent du bloc
 * :root qui pose la valeur par défaut.
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
            const rootTokens = extractRootTokens(withoutComments);
            const names = new Set();
            for (const match of rootTokens.matchAll(/(--ar-[a-zA-Z0-9-]+)(?=\s*:)/g)) {
                names.add(match[1]);
            }
            return [...names].map((name) => `${name}: 1;`).join('\n');
        })
        .join('\n');
}
