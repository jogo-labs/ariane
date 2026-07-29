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

import { readFileSync } from 'node:fs';
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

                // Valide que chaque token --ar-* de default.css appartenant à un composant
                // a bien une entrée @cssprop dans son JSDoc (trou de documentation) —
                // cf. docs/superpowers/specs/2026-07-16-cem-theme-default-sync-design.md
                const themeCss = readFileSync(
                    resolve(process.cwd(), 'src/styles/themes/default.css'),
                    'utf-8',
                );
                const themeTokens = extractThemeTokens(themeCss);
                const cssPropCoverageErrors = validateCssPropertyCoverage(
                    customElementsManifest,
                    themeTokens,
                );

                // Valide qu'aucun composant n'assigne une valeur littérale à une
                // custom property --ar-* dans ses *.styles.ts au lieu de référencer
                // un token default.css via var() — cf.
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
                // (::part(x-état)) dans default.css — cf.
                // docs/superpowers/specs/2026-07-27-part-state-multiplication-design.md
                const partStateOrderErrors = findPartStateOrderErrors(
                    'src/styles/themes/default.css',
                    themeCss,
                );

                const allErrors = [
                    ...cssPropCoverageErrors,
                    ...hardcodedErrors,
                    ...unjustifiedFallbackErrors,
                    ...partStateOrderErrors,
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
                    throw new Error(
                        `[CEM] ${allErrors.length} @cssprop erreur(s) avec default.css :${coverageErrorsMsg}${hardcodedErrorsMsg}${unjustifiedFallbackErrorsMsg}${partStateOrderErrorsMsg}`,
                    );
                }
            },
        },
        customElementVsCodePlugin({
            outdir: 'dist',
        }),
    ],
};
