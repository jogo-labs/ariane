// scripts/starter-kit/sync-starter-theme.js
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { deriveNeutralPalette } from './derive-neutral-palette.js';
import { deriveNeutralGlobalTokens } from './derive-neutral-global-tokens.js';

function copyTree(srcDir, destDir, transform) {
    mkdirSync(destDir, { recursive: true });
    for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);
        if (entry.isDirectory()) {
            copyTree(srcPath, destPath, transform);
        } else {
            writeFileSync(destPath, transform(entry.name, readFileSync(srcPath, 'utf8')));
        }
    }
}

/**
 * Synchronise le thème starter-kit depuis le thème réel d'Ariane (#256) :
 * copie `ariane.css` + l'arbre de fragments `ariane/` dans le repo externe,
 * en neutralisant uniquement `_palette.css` (identité couleur) et
 * `_global-tokens.css` (échelle de radius) — tout le reste (tokens
 * sémantiques, tokens partagés, tokens+règles par composant) est copié
 * verbatim : ces fragments référencent déjà les primitives via `var()`,
 * donc héritent automatiquement du rendu neutre.
 */
const NEW_HEADER = `/**
 * ariane-starter.css — thème de démarrage neutre pour Ariane.
 * Généré depuis ariane.css (packages/core, monorepo jogo-labs/ariane) —
 * ne pas éditer directement, régénéré à chaque publication de la lib.
 * Fragments sous ./ariane-starter/ : copiez/adaptez-les à votre identité
 * visuelle, ou supprimez ceux dont vous n'avez pas besoin.
 *
 * Usage :
 *   <link rel="stylesheet" href="./ariane-starter.css">
 */`;

export function syncStarterTheme({ srcThemesDir, repoPath }) {
    const entrySrc = path.join(srcThemesDir, 'ariane.css');
    const fragmentsSrc = path.join(srcThemesDir, 'ariane');
    const entryDest = path.join(repoPath, 'ariane-starter.css');
    const fragmentsDest = path.join(repoPath, 'ariane-starter');

    const entryContent = readFileSync(entrySrc, 'utf8')
        .replace(/\/\*\*[\s\S]*?\*\//, NEW_HEADER)
        .replaceAll('./ariane/', './ariane-starter/');
    mkdirSync(repoPath, { recursive: true });
    writeFileSync(entryDest, entryContent);

    copyTree(fragmentsSrc, fragmentsDest, (filename, content) => {
        if (filename === '_palette.css') return deriveNeutralPalette(content);
        if (filename === '_global-tokens.css') return deriveNeutralGlobalTokens(content);
        return content;
    });
}
