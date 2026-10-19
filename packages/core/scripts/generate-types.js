#!/usr/bin/env node
/**
 * generate-types.js
 *
 * Génère `src/types/elements.generated.ts` depuis le Custom Elements Manifest (#336) : pour chaque
 * balise, ses événements publics (`detail` compris) et ses propriétés/attributs publics.
 *
 * Ce fichier alimente :
 *   - l'augmentation `HTMLElementEventMap` (incluse par l'import du paquet) : `addEventListener`
 *     et le `$event` d'Angular reçoivent le bon `CustomEvent<…>` ;
 *   - `src/react.ts` (`@ariane-ui/core/react`) : `JSX.IntrinsicElements` ;
 *   - `src/vue.ts` (`@ariane-ui/core/vue`) : `GlobalComponents`.
 *
 * Le fichier est un artefact de build (ignoré par git), régénéré par `npm run build` :
 *   npm run build:manifest && npm run generate:types
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CEM_PATH = join(ROOT, 'dist', 'custom-elements.json');
const OUT_PATH = join(ROOT, 'src', 'types', 'elements.generated.ts');

/** Types globaux (DOM, ES) qui peuvent apparaître dans un type du CEM sans import. */
const GLOBAL_TYPES = new Set([
    'Array',
    'Boolean',
    'CustomEvent',
    'Date',
    'Element',
    'Event',
    'File',
    'FormData',
    'HTMLElement',
    'HTMLFormElement',
    'HTMLInputElement',
    'KeyboardEvent',
    'MouseEvent',
    'Node',
    'NodeList',
    'Number',
    'Promise',
    'Record',
    'String',
    'ValidityState',
]);

/**
 * Index des types nommés exportés par les sources des composants : nom → chemin du module,
 * relatif à `src/` (par exemple `ArDropdownItem` → `components/dropdown-item/dropdown-item`).
 */
export function collectNamedTypes(srcRoot) {
    const index = new Map();
    const walk = (dir) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (
                /\.ts$/.test(entry.name) &&
                !/\.(test|styles|generated)\.ts$/.test(entry.name)
            ) {
                const source = readFileSync(full, 'utf8');
                for (const m of source.matchAll(
                    /^export\s+(?:declare\s+)?(?:type|interface|class|enum)\s+([A-Za-z0-9_]+)/gm,
                )) {
                    index.set(m[1], relative(srcRoot, full).replace(/\.ts$/, ''));
                }
            }
        }
    };
    walk(join(srcRoot, 'components'));
    return index;
}

/** Éléments personnalisés du manifeste, triés par balise. */
export function listElements(cem) {
    const elements = [];
    for (const mod of cem.modules ?? []) {
        for (const decl of mod.declarations ?? []) {
            if (decl.tagName && decl.customElement) {
                elements.push({ tag: decl.tagName, className: decl.name, path: mod.path, decl });
            }
        }
    }
    return elements.sort((a, b) => (a.tag < b.tag ? -1 : 1));
}

/** Membres publics modifiables : propriétés réactives et champs, hors méthodes, statiques et lecture seule. */
export function publicProperties(decl) {
    return (decl.members ?? []).filter(
        (m) =>
            m.kind === 'field' &&
            !m.static &&
            !m.readonly &&
            (m.privacy === undefined || m.privacy === 'public') &&
            /^[A-Za-z_$][\w$]*$/.test(m.name) &&
            !m.name.startsWith('_'),
    );
}

/** Événements propres au composant : `<balise>-…` (les événements natifs `input`/`change` en sont exclus). */
export function ownEvents(tag, decl) {
    return (decl.events ?? []).filter((e) => e.name.startsWith(`${tag}-`));
}

const q = (key) => (/^[A-Za-z_$][\w$]*$/.test(key) ? key : `'${key}'`);

function typeText(type) {
    const text = (type?.text ?? 'unknown').trim();
    // `(date: Date) => boolean | undefined` : une fonction doit être parenthésée dans une union.
    return text.includes('=>') ? `(${text})` : text;
}

function identifiers(text) {
    return [...text.matchAll(/\b[A-Z][A-Za-z0-9_]*\b/g)].map((m) => m[0]);
}

/**
 * Corps du fichier généré (non formaté). Lève si un type du manifeste n'est ni global ni exporté
 * par un composant : il faut alors l'exporter ou l'ajouter à `GLOBAL_TYPES`.
 */
export function buildSource(cem, namedTypes) {
    const elements = listElements(cem);
    const imports = new Map(); // nom → module
    const need = (text, where) => {
        for (const name of identifiers(text)) {
            if (GLOBAL_TYPES.has(name)) continue;
            const mod = namedTypes.get(name);
            if (!mod) {
                throw new Error(
                    `[generate-types] type « ${name} » (${where}) introuvable : l'exporter depuis un composant ou l'ajouter à GLOBAL_TYPES.`,
                );
            }
            imports.set(name, mod);
        }
    };

    const events = []; // lignes de ArianeEventMap
    const names = []; // lignes de ArianeElementEventNames
    const props = []; // lignes de ArianeElementProps
    const classes = []; // lignes de ArianeElements

    for (const { tag, className, path, decl } of elements) {
        const modulePath = path.replace(/^src\//, '').replace(/\.ts$/, '');
        imports.set(className, modulePath);
        classes.push(`    '${tag}': ${className};`);

        const evs = ownEvents(tag, decl);
        for (const e of evs) {
            const t = (e.type?.text ?? 'CustomEvent').trim();
            need(t, e.name);
            events.push(`    '${e.name}': ${t};`);
        }
        names.push(
            `    '${tag}': ${evs.length ? evs.map((e) => `'${e.name}'`).join(' | ') : 'never'};`,
        );

        const lines = [];
        for (const m of publicProperties(decl)) {
            const t = typeText(m.type);
            need(t, `${tag}.${m.name}`);
            const optional = /\bundefined\b/.test(t) ? t : `${t} | undefined`;
            lines.push(`        ${q(m.name)}?: ${optional};`);
            if (m.attribute && m.attribute !== m.name) {
                lines.push(`        '${m.attribute}'?: ${optional};`);
            }
        }
        props.push(`    '${tag}': {\n${lines.join('\n')}\n    };`);
    }

    const byModule = new Map();
    for (const [name, mod] of imports) {
        byModule.set(mod, [...(byModule.get(mod) ?? []), name]);
    }
    const importLines = [...byModule.entries()]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([mod, list]) => `import type { ${list.sort().join(', ')} } from '../${mod}.js';`);

    return `/* eslint-disable */
// AUTO-GÉNÉRÉ par scripts/generate-types.js depuis custom-elements.json — ne pas modifier.
// Régénérer : npm run build:manifest && npm run generate:types
${importLines.join('\n')}

/** Instance de chaque élément, par balise. */
export interface ArianeElements {
${classes.join('\n')}
}

/** Événements publics de tous les composants, \`detail\` compris. */
export interface ArianeEventMap {
${events.join('\n')}
}

/** Noms des événements de chaque composant, par balise. */
export interface ArianeElementEventNames {
${names.join('\n')}
}

/** Propriétés et attributs publics modifiables de chaque composant, par balise. */
export interface ArianeElementProps {
${props.join('\n')}
}

declare global {
    interface HTMLElementEventMap extends ArianeEventMap {}
}
`;
}

export async function generate({ cemPath = CEM_PATH, srcRoot = join(ROOT, 'src') } = {}) {
    const cem = JSON.parse(readFileSync(cemPath, 'utf8'));
    const source = buildSource(cem, collectNamedTypes(srcRoot));
    const config = (await prettier.resolveConfig(OUT_PATH)) ?? {};
    return prettier.format(source, { ...config, filepath: OUT_PATH });
}

async function main() {
    if (!existsSync(CEM_PATH)) {
        console.error(
            '[generate-types] dist/custom-elements.json introuvable : npm run build:manifest.',
        );
        process.exit(1);
    }
    writeFileSync(OUT_PATH, await generate());
    console.log(`✓ ${relative(ROOT, OUT_PATH)}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await main();
}
