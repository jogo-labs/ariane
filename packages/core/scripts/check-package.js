#!/usr/bin/env node
/**
 * check-package.js
 *
 * Vérifie que le paquet qui serait publié contient ce que `package.json` promet (#391) : chaque
 * chemin de `main`, `types` et de `exports` (cibles `types`, `import`, `default`…) doit exister
 * ET faire partie des fichiers que `npm pack` empaquetterait. Les cibles à motif (`./dist/*`)
 * sont vérifiées par leur dossier.
 *
 * Le contrôle porte sur l'état de `dist/` au moment où il tourne : à lancer en fin de build, et
 * juste avant `npm publish` (release.yml). La version alpha.15 est partie sans aucune déclaration
 * `.d.ts` parce qu'une tâche lancée après le build avait vidé `dist/`, sans que rien ne s'en
 * aperçoive.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Chemins de fichiers promis par `package.json` (sans le `./` initial, motifs réduits à leur dossier). */
export function promisedPaths(pkg) {
    const out = new Set();
    const add = (value) => {
        if (typeof value !== 'string' || !value.startsWith('./')) return;
        const path = value.slice(2);
        out.add(path.includes('*') ? path.slice(0, path.indexOf('*')).replace(/\/$/, '') : path);
    };
    const walk = (node) => {
        if (typeof node === 'string') add(node);
        else if (node && typeof node === 'object') Object.values(node).forEach(walk);
    };
    add(pkg.main);
    add(pkg.types);
    walk(pkg.exports);
    return [...out].sort();
}

/**
 * Chemins promis absents des fichiers empaquetés. Un chemin désignant un dossier est présent
 * si au moins un fichier empaqueté s'y trouve.
 */
export function missingFromPack(promised, packedFiles) {
    const files = new Set(packedFiles);
    return promised.filter((path) => {
        if (files.has(path)) return false;
        const prefix = `${path}/`;
        return ![...files].some((file) => file.startsWith(prefix));
    });
}

function packedFiles() {
    const json = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
    });
    return JSON.parse(json)[0].files.map((file) => file.path);
}

function main() {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    const promised = promisedPaths(pkg);
    const missing = missingFromPack(promised, packedFiles());
    if (missing.length > 0) {
        console.error(
            `✗ Paquet incomplet : ${missing.length} chemin(s) promis par package.json absent(s) de ce que npm empaquetterait :`,
        );
        for (const path of missing) console.error(`  - ${path}`);
        console.error(
            "  (dist/ a-t-il été vidé après le build ? Voir #391. Relancer 'npm run build'.)",
        );
        process.exit(1);
    }
    console.log(
        `✓ Paquet complet : ${promised.length} chemin(s) de main, types et exports présents`,
    );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
