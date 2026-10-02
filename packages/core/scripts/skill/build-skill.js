#!/usr/bin/env node
/**
 * build-skill.js
 *
 * Produit la skill `ariane` et le repli `llms.txt` (#264) :
 *
 *   scripts/skill/content/ariane/  → ZONE ÉCRITE (versionnée), copiée telle quelle
 *   skills/ariane/                 → publié (ignoré par git, vidé à chaque build)
 *     references/components/       → GÉNÉRÉ depuis le CEM et les MDX de apps/docs
 *   llms/llms.txt, llms-full.txt   → GÉNÉRÉS
 *
 * Un seul auteur par fichier : ce script n'écrit jamais dans la zone écrite, et n'écrit que dans
 * `skills/` et `llms/`, qu'il vide avant. Voir scripts/skill/README.md.
 */
import {
    cpSync,
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertMdxBody, parseMdx } from './mdx.js';
import { renderComponentFile, renderIndex } from './render-component.js';
import { renderLlmsFull, renderLlmsTxt, titleOf } from './llms.js';

/**
 * Déclarations du CEM qui sont des composants, triées par tag, avec leur MDX converti.
 *
 * @param {{ cem: any, mdxDir: string }} options
 */
export function loadComponents({ cem, mdxDir }) {
    const declarations = cem.modules
        .flatMap((module) => module.declarations ?? [])
        .filter((declaration) => declaration.tagName)
        .sort((a, b) => a.tagName.localeCompare(b.tagName));

    return declarations.map((decl) => {
        const mdxPath = join(mdxDir, `${decl.tagName}.mdx`);
        if (!existsSync(mdxPath)) {
            throw new Error(`MDX manquant pour <${decl.tagName}> : ${mdxPath}`);
        }
        const { data, body } = parseMdx(readFileSync(mdxPath, 'utf-8'));
        return { decl, variants: data.variants ?? [], bodyMd: convertMdxBody(body, mdxPath) };
    });
}

/** Sépare les composants racine des sous-composants (`x-parent`). */
export function splitRootsAndChildren(entries) {
    const tags = new Set(entries.map((entry) => entry.decl.tagName));
    const roots = [];
    const childrenOf = new Map();
    for (const entry of entries) {
        const parent = entry.decl['x-parent'];
        if (!parent) {
            roots.push(entry);
            continue;
        }
        if (!tags.has(parent)) {
            throw new Error(`<${entry.decl.tagName}> : x-parent <${parent}> absent du CEM.`);
        }
        if (!childrenOf.has(parent)) childrenOf.set(parent, []);
        childrenOf.get(parent).push(entry);
    }
    return { roots, childrenOf };
}

function listMarkdown(dir) {
    return readdirSync(dir, { recursive: true })
        .filter((path) => path.endsWith('.md'))
        .map((path) => path.split('\\').join('/'))
        .sort();
}

/**
 * @param {{
 *   cemPath: string, mdxDir: string, contentDir: string,
 *   skillDir: string, llmsDir: string, version: string,
 * }} options
 * @returns {{ roots: string[], children: string[] }}
 */
export function buildSkill({ cemPath, mdxDir, contentDir, skillDir, llmsDir, version }) {
    if (!existsSync(join(contentDir, 'SKILL.md'))) {
        throw new Error(`SKILL.md absent de la zone écrite : ${contentDir}`);
    }
    const cem = JSON.parse(readFileSync(cemPath, 'utf-8'));
    const entries = loadComponents({ cem, mdxDir });
    const { roots, childrenOf } = splitRootsAndChildren(entries);

    rmSync(skillDir, { recursive: true, force: true });
    rmSync(llmsDir, { recursive: true, force: true });
    cpSync(contentDir, skillDir, { recursive: true });

    const componentsDir = join(skillDir, 'references', 'components');
    mkdirSync(componentsDir, { recursive: true });

    const indexMd = renderIndex({ roots, childrenOf, version });
    writeFileSync(join(componentsDir, 'index.md'), indexMd, 'utf-8');

    const componentFiles = roots.map((root) => {
        const tag = root.decl.tagName;
        const content = renderComponentFile(root, childrenOf.get(tag) ?? []);
        writeFileSync(join(componentsDir, `${tag}.md`), content, 'utf-8');
        return { tagName: tag, summary: root.decl.summary || root.decl.description || '', content };
    });

    // Fichiers écrits (hors SKILL.md), dans l'ordre alphabétique des chemins.
    const written = listMarkdown(contentDir)
        .filter((path) => path !== 'SKILL.md')
        .map((path) => {
            const content = readFileSync(join(contentDir, path), 'utf-8');
            return { path, content, title: titleOf(content, path) };
        });

    mkdirSync(llmsDir, { recursive: true });
    writeFileSync(
        join(llmsDir, 'llms.txt'),
        renderLlmsTxt({ version, written, components: componentFiles }),
        'utf-8',
    );
    writeFileSync(
        join(llmsDir, 'llms-full.txt'),
        renderLlmsFull({
            skillMd: readFileSync(join(contentDir, 'SKILL.md'), 'utf-8'),
            written,
            indexMd,
            components: componentFiles.map((c) => ({
                path: `references/components/${c.tagName}.md`,
                content: c.content,
            })),
        }),
        'utf-8',
    );

    return {
        roots: roots.map((entry) => entry.decl.tagName),
        children: [...childrenOf.values()]
            .flat()
            .map((entry) => entry.decl.tagName)
            .sort(),
    };
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
    const root = fileURLToPath(new URL('../..', import.meta.url));
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
    const cemPath = join(root, 'dist', 'custom-elements.json');
    if (!existsSync(cemPath)) {
        console.error('dist/custom-elements.json absent : lancez `npm run build:manifest` avant.');
        process.exit(1);
    }
    try {
        const result = buildSkill({
            cemPath,
            mdxDir: join(root, '../../apps/docs/src/content/components'),
            contentDir: join(root, 'scripts/skill/content/ariane'),
            skillDir: join(root, 'skills/ariane'),
            llmsDir: join(root, 'llms'),
            version: pkg.version,
        });
        console.log(
            `✓ Skill générée : ${result.roots.length} composants (+ ${result.children.length} sous-composants) dans ${relative(process.cwd(), join(root, 'skills/ariane')) || 'skills/ariane'}`,
        );
    } catch (error) {
        console.error(`\n❌ ${error.message}\n`);
        process.exit(1);
    }
}
