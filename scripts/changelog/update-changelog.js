#!/usr/bin/env node
/**
 * Génère la section de la prochaine release (commits Conventional Commits depuis le dernier
 * tag, version lue dans packages/core/package.json) et l'insère dans CHANGELOG.md, sous le
 * préambule.
 *
 * conventional-changelog prépend au-dessus du titre `# Changelog` : on récupère donc la
 * section seule (`--stdout` sur un fichier vide) et on l'insère nous-mêmes. Le résultat est un
 * brouillon relu dans la PR de release, pas un fichier à publier tel quel.
 *
 * À lancer sur la branche de release, une fois la version bumpée : `npm run changelog`.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { devNull } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CHANGELOG_PATH = join(ROOT, 'CHANGELOG.md');

const VERSION_HEADING_RE = /^## \[([^\]]+)\]/m;
const PREAMBLE_SEPARATOR = '\n---\n';

/**
 * Insère `section` sous le préambule de `changelog`, avant les versions existantes.
 *
 * @param {string} changelog contenu actuel de CHANGELOG.md
 * @param {string} section section générée, commençant par `## [x.y.z]`
 * @returns {string}
 */
export function insertRelease(changelog, section) {
    const heading = VERSION_HEADING_RE.exec(section);
    if (!heading) {
        throw new Error('La section générée ne contient pas de titre de version (## [x.y.z]).');
    }
    const version = heading[1];
    if (changelog.includes(`## [${version}]`)) {
        throw new Error(`La version ${version} est déjà présente dans CHANGELOG.md.`);
    }

    const separatorIndex = changelog.indexOf(PREAMBLE_SEPARATOR);
    if (separatorIndex === -1) {
        throw new Error("Le séparateur '---' du préambule est introuvable dans CHANGELOG.md.");
    }
    const splitAt = separatorIndex + PREAMBLE_SEPARATOR.length;
    const preamble = changelog.slice(0, splitAt);
    const history = changelog.slice(splitAt).replace(/^\n+/, '');

    return `${preamble}\n${section.trim()}\n\n${history}`;
}

/**
 * Aligne le lien de comparaison du titre (`## [x.y.z](…/compare/A...B)`) sur le tag de départ
 * réellement utilisé. conventional-changelog le déduit du graphe git, donc de `alpha.8` tant que
 * `dev` n'a pas reçu les merges de release, alors que les commits listés partent de `previousTag`.
 * Seul le lien du titre est modifié, jamais un lien du corps.
 *
 * @param {string} section section générée
 * @param {string} previousTag tag de départ effectif (ex. `v0.1.0-alpha.11`)
 * @returns {string}
 */
export function withPreviousTag(section, previousTag) {
    return section.replace(
        /^(## \[[^\]]+\]\([^)]*\/compare\/).+?(\.\.\.[^)]+\))/m,
        `$1${previousTag}$2`,
    );
}

const PACKAGE_JSON_PATH = join(ROOT, 'packages/core/package.json');

function git(...args) {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

/** Vrai si le tag existe déjà (la version courante a donc déjà été publiée). */
function tagExists(tag) {
    try {
        git('rev-parse', '-q', '--verify', `refs/tags/${tag}`);
        return true;
    } catch {
        return false;
    }
}

/**
 * Dernier tag par numéro de version, qu'il soit ou non ancêtre de HEAD : les tags de release
 * sont posés sur `main`, et `dev` n'a pas toujours reçu le merge en retour. Sans `--from`
 * explicite, conventional-changelog retombe sur le dernier tag atteignable, donc trop ancien.
 * `versionsort.suffix=-` place `v1.0.0-beta.1` avant `v1.0.0` (sinon git les inverse).
 */
function latestTag() {
    return git('-c', 'versionsort.suffix=-', 'tag', '--sort=-v:refname').split('\n')[0];
}

function generateSection(from) {
    return execFileSync(
        'npx',
        [
            '--no-install',
            'conventional-changelog',
            '-n',
            join(ROOT, 'changelog.config.js'),
            '-k',
            PACKAGE_JSON_PATH,
            '-i',
            devNull,
            '--from',
            from,
            '--stdout',
        ],
        { cwd: ROOT, encoding: 'utf8' },
    );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
    const { version } = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8'));
    if (tagExists(`v${version}`)) {
        throw new Error(
            `Le tag v${version} existe déjà : bumper la version de packages/core avant de générer le changelog.`,
        );
    }
    const previousTag = latestTag();
    const updated = insertRelease(
        readFileSync(CHANGELOG_PATH, 'utf8'),
        withPreviousTag(generateSection(previousTag), previousTag),
    );
    writeFileSync(CHANGELOG_PATH, updated);
    console.log('CHANGELOG.md mis à jour : relire la section ajoutée avant de commiter.');
}
