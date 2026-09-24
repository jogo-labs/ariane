/**
 * Configuration du Custom Elements Manifest analyzer.
 *
 * Ce fichier est la source de vérité pour la génération automatique de :
 * - La documentation des composants
 * - Les intégrations IDE (VS Code, JetBrains)
 * - Les wrappers framework (React, Vue)
 *
 * @type {import('@custom-elements-manifest/analyzer').UserConfig}
 */

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { customElementVsCodePlugin } from 'custom-element-vs-code-integration';
import {
    extractThemeTokens,
    validateCssPropertyCoverage,
} from './scripts/validate-cssprop-defaults.js';
import {
    findHardcodedTokenAssignments,
    findStylesFiles,
    findUnjustifiedFallbacks,
} from './scripts/validate-no-hardcoded-tokens.js';
import { findPartStateOrderErrors } from './scripts/validate-part-state-order.js';
import { pruneDanglingCustomElementExports } from './scripts/prune-dangling-custom-element-exports.js';
import {
    buildDedupedTokenInventory,
    findDuplicateTokens,
} from './scripts/validate-no-duplicate-tokens.js';

export default {
    // Inclure tous les fichiers TS sauf les tests et les styles
    globs: ['src/**/*.ts'],
    exclude: ['src/**/*.test.ts', 'src/**/*.styles.ts'],

    // Activer la détection automatique des patterns LitElement
    // (décorateurs @customElement, @property, @state, etc.)
    litelement: true,

    outdir: 'dist',

    plugins: [
        {
            name: 'parent-display-tags',
            analyzePhase({ ts, node, moduleDoc }) {
                if (!ts.isClassDeclaration(node)) return;

                const jsDocTags = ts.getJSDocTags(node);
                const className = node.name?.text;
                const declaration = moduleDoc.declarations?.find((d) => d.name === className);
                if (!declaration) return;

                // @parent <tag-name> → x-parent
                const parentTag = jsDocTags.find((t) => t.tagName.text === 'parent');
                if (parentTag) {
                    const parent = parentTag.comment?.toString().trim();
                    if (parent) {
                        declaration['x-parent'] = parent;
                    }
                }

                // @display demo|docs → x-display
                const displayTag = jsDocTags.find((t) => t.tagName.text === 'display');
                const validValues = ['demo', 'docs'];
                if (displayTag) {
                    // Le parser CEM peut inclure le texte qui suit dans le commentaire,
                    // on ne prend que le premier mot.
                    const value = displayTag.comment?.toString().trim().split(/\s/)[0];
                    if (value && validValues.includes(value)) {
                        declaration['x-display'] = value;
                    } else {
                        console.warn(
                            `[CEM] @display sur ${className} a une valeur invalide "${value}". Valeurs autorisées : ${validValues.join(', ')}. Fallback sur "demo".`,
                        );
                        declaration['x-display'] = 'demo';
                    }
                } else if (declaration.customElement) {
                    console.warn(
                        `[CEM] @display absent sur ${className}. Ajoutez @display demo ou @display docs.`,
                    );
                }

                // @localized (tag booléen, sans valeur) → x-localized
                if (jsDocTags.some((t) => t.tagName.text === 'localized')) {
                    declaration['x-localized'] = true;
                }

                // Marquer les membres statiques et @ignore comme privés
                // pour qu'api-demo ne les expose pas dans les knobs.
                if (!declaration.members) return;
                declaration.members.forEach((member) => {
                    if (
                        member.static ||
                        member.privacy === 'private' ||
                        member.privacy === 'protected'
                    )
                        return;
                    if (member.privacy) return; // déjà définie explicitement

                    // Chercher le nœud TypeScript correspondant dans la classe
                    if (!ts.isClassDeclaration(node)) return;
                    for (const classMember of node.members) {
                        const memberName = classMember.name?.getText?.();
                        if (memberName !== member.name) continue;

                        // @ignore → private
                        const memberJsDocTags = ts.getJSDocTags(classMember);
                        if (memberJsDocTags.some((t) => t.tagName.text === 'ignore')) {
                            member.privacy = 'private';
                        }
                    }
                });
            },
            packageLinkPhase({ customElementsManifest }) {
                // Un mini custom element interne marqué @internal (convention TSDoc déjà
                // reconnue nativement par l'analyzer, cf. hasIgnoreJSDoc dans son propre code —
                // rien à coder côté projet pour ça) voit sa déclaration et son export `js`
                // retirés du manifest automatiquement, AVANT que ce plugin ne s'exécute (les
                // FEATURES natives de l'analyzer, dont ce retrait, sont fusionnées avant les
                // plugins utilisateur — cf. node_modules/@custom-elements-manifest/analyzer/
                // src/create.js). Le seul résidu (vérifié empiriquement, #247) : si
                // `customElements.define()` vit dans un fichier séparé (pattern index.ts de ce
                // projet, ex. ar-datepicker), l'export `custom-element-definition` de ce fichier
                // séparé subsiste, pointant vers une déclaration qui n'existe plus nulle part —
                // nettoyé ici en premier, avant toute autre transformation.
                pruneDanglingCustomElementExports(customElementsManifest);

                // Résolution des type aliases de string union depuis les sources.
                // Le CEM sort le nom de l'alias (ex: "ArDropdownPlacement") au lieu de la
                // valeur réelle — on lit les fichiers pour construire une map de résolution.
                const typeAliasMap = new Map();
                for (const mod of customElementsManifest.modules) {
                    try {
                        const src = readFileSync(resolve(process.cwd(), mod.path), 'utf-8');
                        // Capture multiline type aliases (with or without leading |)
                        for (const match of src.matchAll(/export\s+type\s+(\w+)\s*=([^;]+);/gms)) {
                            const name = match[1];
                            const raw = match[2]
                                .replace(/\s+/g, ' ')
                                .replace(/^\s*\|\s*/, '')
                                .trim();
                            const parts = raw.split(/\s*\|\s*/);
                            const isStringUnion =
                                parts.length > 1 && parts.every((p) => /^['"][^'"]+['"]$/.test(p));
                            if (isStringUnion) typeAliasMap.set(name, raw);
                        }
                    } catch {
                        // fichier inaccessible — on ignore
                    }
                }

                // Résoudre les aliases aussi dans la section attributes (tableau API).
                for (const mod of customElementsManifest.modules) {
                    for (const decl of mod.declarations ?? []) {
                        if (!decl.attributes) continue;
                        decl.attributes = decl.attributes.map((attr) => {
                            const t = (attr.type?.text ?? '').replace(
                                /\s*\|\s*\(string\s*&\s*\{\}\)\s*$/,
                                '',
                            );
                            if (typeAliasMap.has(t)) {
                                return { ...attr, type: { text: typeAliasMap.get(t) } };
                            }
                            return attr;
                        });
                    }
                }

                // Masquer les champs statiques des knobs api-demo (pas d'attribut HTML)
                // et extraire les options d'enum pour les knobs de type <select>.
                for (const mod of customElementsManifest.modules) {
                    for (const decl of mod.declarations ?? []) {
                        if (!decl.members) continue;
                        decl.members = decl.members.map((member) => {
                            // Champs statiques sans attribut → privés
                            if (member.static && !member.attribute) {
                                return { ...member, privacy: 'private' };
                            }

                            // Résoudre les aliases de type avant le check isStringUnion
                            let typeText = (member.type?.text ?? '').replace(
                                /\s*\|\s*\(string\s*&\s*\{\}\)\s*$/,
                                '',
                            );
                            if (typeAliasMap.has(typeText)) {
                                member = { ...member, type: { text: typeAliasMap.get(typeText) } };
                                typeText = member.type.text;
                            }

                            // Union de string literals → extraire les options pour knob select
                            // Ex: "'success' | 'warning' | 'error' | 'info'" → x-knob-options: ['success','warning',...]
                            const cleanType = typeText
                                .replace(/\s*\|\s*(undefined|null)/g, '')
                                .trim();
                            const parts = cleanType.split(/\s*\|\s*/);
                            const isStringUnion =
                                parts.length > 1 &&
                                parts.every((p) => /^'[^']+'$/.test(p) || /^"[^"]+"$/.test(p));

                            if (isStringUnion) {
                                const options = parts.map((p) => p.replace(/^['"]|['"]$/g, ''));
                                return { ...member, 'x-knob-options': options };
                            }

                            return member;
                        });
                    }
                }

                // Valide que chaque token --ar-* de ariane.css appartenant à un composant
                // a bien une entrée @cssprop dans son JSDoc (trou de documentation) —
                // cf. docs/superpowers/specs/2026-07-16-cem-theme-default-sync-design.md
                //
                // Ce `themeCss` (et lui seul — le garde-fou anti-doublon plus bas garde sa
                // propre lecture) doit provenir des fragments SOURCE (non minifiés), pas de
                // dist/styles/themes/ariane.css : ce dernier est le bundle esbuild sur une
                // seule ligne, et les regex de `validate-cssprop-defaults.js`/
                // `validate-part-state-order.js` supposent du CSS formaté multi-lignes avec
                // guillemets préservés (`:root[data-theme='dark']`, `;` de fin de
                // déclaration). Sur le bundle minifié ces regex ratent silencieusement
                // presque tout (0 bloc de composant détecté, tokens de fin de bloc avalés
                // par le `;` manquant, exclusion dark mode jamais déclenchée) — cf. revue
                // finale #256. On reconstruit donc ici l'équivalent fonctionnel de l'ancien
                // default.css unique en concaténant les fragments dans l'ordre des
                // `@import` de l'entrée ariane.css (le seul ordre qui compte pour ces deux
                // validateurs, qui ne dépendent ni de `@layer` ni du wrapper de l'entrée).
                const themeEntryPath = resolve(process.cwd(), 'src/styles/themes/ariane.css');
                const themeEntrySrc = readFileSync(themeEntryPath, 'utf-8');
                const themeEntryDir = resolve(process.cwd(), 'src/styles/themes');
                const importedFragmentPaths = [
                    ...themeEntrySrc.matchAll(/@import url\('([^']+)'\)/g),
                ].map((match) => resolve(themeEntryDir, match[1]));
                // `_global-tokens.css` est le seul fragment contenant le marqueur dark mode
                // (`:root[data-theme='dark']`, en toute fin de fichier — il ne fait que
                // basculer `color-scheme`, aucune valeur de token n'y est redéclarée, tout le
                // thème utilisant `light-dark()` en ligne). `extractThemeTokens` tronque le
                // blob concaténé au premier marqueur rencontré : en position 3 (ordre des
                // `@import`), il couperait tous les fragments shared/components qui suivent,
                // alors qu'ils n'ont eux-mêmes aucun rapport avec le dark mode. On place donc
                // ce fragment en dernier dans la concaténation, pour reconstruire fidèlement
                // la structure de l'ancien fichier unique (tous les tokens d'abord, la
                // bascule dark tout à la fin) — vérifié empiriquement (--ar-panel-bg, entre
                // autres, disparaissait sinon).
                const orderedFragmentPaths = [...importedFragmentPaths].sort((a, b) => {
                    const aIsGlobalTokens = a.endsWith('_global-tokens.css');
                    const bIsGlobalTokens = b.endsWith('_global-tokens.css');
                    if (aIsGlobalTokens === bIsGlobalTokens) return 0;
                    return aIsGlobalTokens ? 1 : -1;
                });
                const themeCss = orderedFragmentPaths
                    .map((fragmentPath) => readFileSync(fragmentPath, 'utf-8'))
                    .join('\n\n');
                const themeTokens = extractThemeTokens(themeCss);
                const cssPropCoverageErrors = validateCssPropertyCoverage(
                    customElementsManifest,
                    themeTokens,
                );
                // Le garde-fou anti-doublon lit les fragments SOURCE individuellement
                // (pas le CSS bundlé) : une redéclaration légitime d'un même token sous
                // plusieurs sélecteurs à l'intérieur d'un seul fragment (ex.
                // --ar-alert-bg une fois par variant) ne doit pas être signalée — seul un
                // token apparaissant dans PLUSIEURS fragments distincts est une erreur.
                const fragmentsDir = resolve(process.cwd(), 'src/styles/themes/ariane');
                const fragmentContents = readdirSync(fragmentsDir, { recursive: true })
                    .filter((relativePath) => relativePath.endsWith('.css'))
                    .map((relativePath) =>
                        readFileSync(resolve(fragmentsDir, relativePath), 'utf-8'),
                    );
                const duplicateTokenErrors = findDuplicateTokens(
                    buildDedupedTokenInventory(fragmentContents),
                );

                // Valide qu'aucun composant n'assigne une valeur littérale à une
                // custom property --ar-* dans ses *.styles.ts au lieu de référencer
                // un token ariane.css via var() — cf.
                // docs/superpowers/specs/2026-07-16-dialog-width-headless-tokens-design.md
                const stylesFiles = findStylesFiles(resolve(process.cwd(), 'src'));
                const hardcodedErrors = stylesFiles.flatMap((filePath) =>
                    findHardcodedTokenAssignments(filePath, readFileSync(filePath, 'utf-8')),
                );

                // Valide que tout var(--ar-*, fallback) en consommation utilise un
                // fallback justifié (couleur système whitelistée ou commentaire
                // a11y-fallback) — cf. section « Garde-fou CI » de
                // docs/superpowers/specs/2026-07-22-css-fallback-accessibilite-design.md
                const unjustifiedFallbackErrors = stylesFiles.flatMap((filePath) =>
                    findUnjustifiedFallbacks(filePath, readFileSync(filePath, 'utf-8')),
                );

                // Valide que toute règle ::part(x) de base précède ses parts d'état
                // (::part(x-état)) dans ariane.css — cf.
                // docs/superpowers/specs/2026-07-27-part-state-multiplication-design.md
                const partStateOrderErrors = findPartStateOrderErrors(
                    'src/styles/themes/ariane.css (fragments concaténés)',
                    themeCss,
                );

                const allErrors = [
                    ...cssPropCoverageErrors,
                    ...hardcodedErrors,
                    ...unjustifiedFallbackErrors,
                    ...partStateOrderErrors,
                    ...duplicateTokenErrors,
                ];
                if (allErrors.length > 0) {
                    const coverageErrorsMsg =
                        cssPropCoverageErrors.length > 0
                            ? `\n  non documenté(s) :\n${cssPropCoverageErrors.map((e) => `    - ${e}`).join('\n')}`
                            : '';
                    const hardcodedErrorsMsg =
                        hardcodedErrors.length > 0
                            ? `\n  codé(s) en dur :\n${hardcodedErrors.map((e) => `    - ${e}`).join('\n')}`
                            : '';
                    const unjustifiedFallbackErrorsMsg =
                        unjustifiedFallbackErrors.length > 0
                            ? `\n  fallback(s) non justifié(s) :\n${unjustifiedFallbackErrors.map((e) => `    - ${e}`).join('\n')}`
                            : '';
                    const partStateOrderErrorsMsg =
                        partStateOrderErrors.length > 0
                            ? `\n  ordre part d'état invalide :\n${partStateOrderErrors.map((e) => `    - ${e}`).join('\n')}`
                            : '';
                    const duplicateTokenErrorsMsg =
                        duplicateTokenErrors.length > 0
                            ? `\n  token(s) dupliqué(s) :\n${duplicateTokenErrors.map((e) => `    - ${e}`).join('\n')}`
                            : '';
                    throw new Error(
                        `[CEM] ${allErrors.length} @cssprop erreur(s) avec ariane.css :${coverageErrorsMsg}${hardcodedErrorsMsg}${unjustifiedFallbackErrorsMsg}${partStateOrderErrorsMsg}${duplicateTokenErrorsMsg}`,
                    );
                }
            },
        },
        customElementVsCodePlugin({
            outdir: 'dist',
        }),
    ],
};
