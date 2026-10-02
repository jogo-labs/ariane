#!/usr/bin/env node
/**
 * check-skill.js
 *
 * Contrôle de cohérence de la skill `ariane` (#264) après `build:skill`. Échoue sur la dérive
 * STRUCTURELLE entre la zone écrite et la bibliothèque :
 *
 *   1. chaque `<ar-*>` cité dans les fichiers écrits existe dans le CEM ;
 *   2. chaque attribut cité sur un tag existe pour ce tag (attributs globaux, aria-* et data-*
 *      acceptés) ;
 *   3. chaque composant racine du CEM est cité dans `references/choosing-components.md` ;
 *   4. un fichier généré existe pour chaque racine, aucun pour un sous-composant ;
 *   5. les liens Markdown relatifs se résolvent ;
 *   6. le frontmatter de `SKILL.md` a `name: ariane` et une `description` ;
 *   7. `package.json` publie `skills` et `llms` (`files`) ;
 *   8. chaque token `--ar-*` cité dans `references/theming.md` existe (CEM ou thème) ;
 *   9. chaque composant racine du CEM est cité dans les README fournis (`ar-x`) et dans le
 *      `description` de SKILL.md (`ar-x` ou le nom sans préfixe) : listes de composants écrites
 *      à la main, qui sans ce contrôle se périment sans signal.
 *
 * Ce qu'il ne vérifie PAS : la vérité d'une phrase de conseil, les valeurs d'attribut, la qualité
 * de déclenchement de la `description`. Ceux-là relèvent de la relecture à la release.
 */
import matter from 'gray-matter';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const GLOBAL_ATTRIBUTES = new Set([
    'slot',
    'class',
    'id',
    'style',
    'hidden',
    'title',
    'lang',
    'dir',
    'tabindex',
    'role',
]);
const TAG_MENTION_RE = /<(ar-[a-z0-9-]+)(?=[\s>/])/g;
const TAG_WITH_ATTRIBUTES_RE =
    /<(ar-[a-z0-9-]+)((?:\s+[^\s>=/]+(?:=(?:"[^"]*"|'[^']*'|[^\s>"']+))?)*)\s*\/?>/g;
const ATTRIBUTE_RE = /([^\s=]+)(?:=(?:"[^"]*"|'[^']*'|[^\s>"']+))?/g;
const LINK_RE = /\]\(([^)\s]+)\)/g;
const TOKEN_RE = /(--ar-[a-z0-9]+(?:-[a-z0-9]+)*)(-\*)?/g;
const THEME_TOKEN_RE = /(--ar[\w-]+)\s*:/g;

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

function listMarkdown(dir) {
    return readdirSync(dir, { recursive: true })
        .filter((path) => path.endsWith('.md'))
        .map((path) => path.split('\\').join('/'))
        .sort();
}

function listCss(dir) {
    if (!existsSync(dir)) return [];
    return readdirSync(dir, { recursive: true })
        .filter((path) => path.endsWith('.css'))
        .map((path) => join(dir, path));
}

/**
 * @param {{
 *   cem: any, skillDir: string, pkg: { files?: string[] }, themeDir: string,
 *   readmes?: { path: string, text: string }[],
 * }} input
 * @returns {string[]} les erreurs, vide si tout concorde
 */
export function checkSkill({ cem, skillDir, pkg, themeDir, readmes = [] }) {
    const errors = [];
    const declarations = cem.modules
        .flatMap((module) => module.declarations ?? [])
        .filter((declaration) => declaration.tagName);
    const byTag = new Map(declarations.map((declaration) => [declaration.tagName, declaration]));
    const roots = declarations.filter((declaration) => !declaration['x-parent']);
    const children = declarations.filter((declaration) => declaration['x-parent']);

    const allFiles = listMarkdown(skillDir);
    const writtenFiles = allFiles.filter((path) => !path.startsWith('references/components/'));

    // 1 et 2 : tags et attributs cités dans les fichiers écrits.
    for (const path of writtenFiles) {
        const text = readFileSync(join(skillDir, path), 'utf-8');
        for (const match of text.matchAll(TAG_MENTION_RE)) {
            if (!byTag.has(match[1])) {
                errors.push(`${path}:${lineOf(text, match.index)} — <${match[1]}> absent du CEM.`);
            }
        }
        for (const match of text.matchAll(TAG_WITH_ATTRIBUTES_RE)) {
            const declaration = byTag.get(match[1]);
            if (!declaration) continue;
            const known = new Set((declaration.attributes ?? []).map((a) => a.name));
            for (const attribute of match[2].matchAll(ATTRIBUTE_RE)) {
                const name = attribute[1];
                if (
                    known.has(name) ||
                    GLOBAL_ATTRIBUTES.has(name) ||
                    name.startsWith('aria-') ||
                    name.startsWith('data-')
                ) {
                    continue;
                }
                errors.push(
                    `${path}:${lineOf(text, match.index)} — attribut « ${name} » absent du CEM pour <${match[1]}>.`,
                );
            }
        }
    }

    // 3 : couverture dans choosing-components.md.
    const choosingPath = join(skillDir, 'references/choosing-components.md');
    if (!existsSync(choosingPath)) {
        errors.push('references/choosing-components.md — fichier absent.');
    } else {
        const choosing = readFileSync(choosingPath, 'utf-8');
        const cited = new Set([...choosing.matchAll(TAG_MENTION_RE)].map((m) => m[1]));
        for (const root of roots) {
            if (!cited.has(root.tagName)) {
                errors.push(
                    `references/choosing-components.md — <${root.tagName}> n'est pas cité (ajoutez-le à l'arbre de décision).`,
                );
            }
        }
    }

    // 4 : fichiers générés.
    for (const root of roots) {
        const path = `references/components/${root.tagName}.md`;
        if (!existsSync(join(skillDir, path))) errors.push(`${path} — fichier généré manquant.`);
    }
    for (const child of children) {
        const path = `references/components/${child.tagName}.md`;
        if (existsSync(join(skillDir, path))) {
            errors.push(`${path} — <${child.tagName}> est un sous-composant, sans fichier propre.`);
        }
    }

    // 5 : liens relatifs.
    for (const path of allFiles) {
        const text = readFileSync(join(skillDir, path), 'utf-8');
        for (const match of text.matchAll(LINK_RE)) {
            const target = match[1];
            if (/^(https?:|mailto:|#)/.test(target)) continue;
            if (target.startsWith('/')) {
                errors.push(
                    `${path}:${lineOf(text, match.index)} — lien absolu vers le site de doc (non portable dans la skill) : ${target}`,
                );
                continue;
            }
            const file = target.split('#')[0];
            if (file === '') continue;
            if (!existsSync(resolve(dirname(join(skillDir, path)), file))) {
                errors.push(
                    `${path}:${lineOf(text, match.index)} — lien relatif cassé : ${target}`,
                );
            }
        }
    }

    // 6 : frontmatter de SKILL.md.
    let skillDescription = '';
    const skillPath = join(skillDir, 'SKILL.md');
    if (!existsSync(skillPath)) {
        errors.push('SKILL.md — fichier absent.');
    } else {
        const { data } = matter(readFileSync(skillPath, 'utf-8'));
        if (data.name !== 'ariane') {
            errors.push(
                `SKILL.md — name doit valoir « ariane » (trouvé : ${data.name ?? 'absent'}).`,
            );
        }
        if (!data.description || String(data.description).trim() === '') {
            errors.push('SKILL.md — description absente ou vide.');
        } else {
            skillDescription = String(data.description);
        }
    }

    // 7 : publication.
    for (const folder of ['skills', 'llms']) {
        if (!(pkg.files ?? []).includes(folder)) {
            errors.push(
                `package.json — « ${folder} » absent de files : la skill ne serait pas publiée.`,
            );
        }
    }

    // 8 : tokens cités dans theming.md.
    const themingPath = join(skillDir, 'references/theming.md');
    if (existsSync(themingPath)) {
        const known = new Set(
            declarations.flatMap((d) => (d.cssProperties ?? []).map((p) => p.name)),
        );
        for (const file of listCss(themeDir)) {
            for (const match of readFileSync(file, 'utf-8').matchAll(THEME_TOKEN_RE)) {
                known.add(match[1]);
            }
        }
        const text = readFileSync(themingPath, 'utf-8');
        for (const match of text.matchAll(TOKEN_RE)) {
            const token = match[1];
            const isFamily = match[2] === '-*';
            const exists = isFamily
                ? [...known].some((name) => name.startsWith(`${token}-`))
                : known.has(token);
            if (!exists) {
                errors.push(
                    `references/theming.md:${lineOf(text, match.index)} — ${token}${isFamily ? '-*' : ''} absent du CEM et du thème.`,
                );
            }
        }
    }

    // 9 : liste des composants des README et du `description` de SKILL.md (mots-clés de
    // déclenchement). Un tag plus long (`ar-tab-group`) ne vaut pas pour son préfixe (`ar-tab`) ;
    // les sous-composants sont décrits avec leur parent, non exigés.
    const componentLists = [...readmes];
    if (skillDescription !== '') {
        // Le description est lu par un agent qui reçoit des demandes sans préfixe (« ajoute un
        // datepicker ») : le nom sans `ar-` vaut aussi.
        componentLists.push({
            path: 'SKILL.md (description)',
            text: skillDescription,
            bare: true,
        });
    }
    for (const { path, text, bare } of componentLists) {
        for (const root of roots) {
            const name = bare ? `(?:ar-)?${root.tagName.replace(/^ar-/, '')}` : root.tagName;
            const cited = new RegExp(`(?<![a-z0-9-])${name}(?![a-z0-9-])`).test(text);
            if (!cited) {
                errors.push(
                    `${path} — <${root.tagName}> n'est pas cité (liste des composants à mettre à jour).`,
                );
            }
        }
    }

    return errors;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
    const root = fileURLToPath(new URL('../..', import.meta.url));
    const cemPath = join(root, 'dist', 'custom-elements.json');
    if (!existsSync(cemPath) || !existsSync(join(root, 'skills/ariane'))) {
        console.error(
            'CEM ou skills/ariane absent : lancez `npm run build:manifest && npm run build:skill`.',
        );
        process.exit(1);
    }
    const errors = checkSkill({
        cem: JSON.parse(readFileSync(cemPath, 'utf-8')),
        skillDir: join(root, 'skills/ariane'),
        pkg: JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8')),
        themeDir: join(root, 'src/styles/themes/ariane'),
        readmes: [
            { path: 'packages/core/README.md', file: 'README.md' },
            { path: 'README.md', file: '../../README.md' },
        ].map(({ path, file }) => ({ path, text: readFileSync(join(root, file), 'utf-8') })),
    });
    if (errors.length > 0) {
        console.error('\n❌ Skill incohérente avec la bibliothèque :');
        for (const error of errors) console.error(`   - ${error}`);
        console.error('');
        process.exit(1);
    }
    console.log('✓ Skill cohérente avec le CEM, le thème et package.json');
}
