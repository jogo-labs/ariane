/**
 * Découpe un texte CSS en règles de premier niveau (comptage d'accolades —
 * pas un vrai parseur, suffisant pour un CSS déjà bundlé/formaté par esbuild).
 * Retourne [{ selector, body, raw }] où `raw` inclut le sélecteur + le bloc.
 */
function topLevelRules(css) {
    const rules = [];
    let depth = 0;
    let start = -1;
    let selectorStart = 0;
    for (let i = 0; i < css.length; i++) {
        const ch = css[i];
        if (ch === '{') {
            if (depth === 0) {
                start = i;
            }
            depth++;
        } else if (ch === '}') {
            depth--;
            if (depth === 0 && start !== -1) {
                const selector = css.slice(selectorStart, start).trim();
                const raw = css.slice(selectorStart, i + 1);
                rules.push({ selector, raw });
                selectorStart = i + 1;
                start = -1;
            }
        }
    }
    return rules;
}

const IGNORED_SELECTOR = /^(:root|\[data-theme=|:root\[data-theme=)/;

/**
 * Extrait, depuis un CSS déjà bundlé (plusieurs blocs `@layer ariane.theme { ... }`
 * consécutifs, sortie d'esbuild --bundle), uniquement les règles composants — exclut
 * :root et [data-theme=...] (tokens/pilotage de mode, inutiles dans un shadow root
 * adopté : ils traversent déjà la frontière shadow DOM par héritage CSS).
 */
export function extractComponentRules(bundledCss) {
    const layerBlocks = topLevelRules(bundledCss).filter(
        (r) => r.selector === '@layer ariane.theme',
    );

    const kept = [];
    for (const block of layerBlocks) {
        // Contenu entre la première { et la dernière }
        const inner = block.raw.slice(block.raw.indexOf('{') + 1, block.raw.lastIndexOf('}'));
        for (const rule of topLevelRules(inner)) {
            if (!IGNORED_SELECTOR.test(rule.selector)) {
                kept.push(rule.raw);
            }
        }
    }

    return `@layer ariane.theme {\n${kept.join('\n')}\n}`;
}
