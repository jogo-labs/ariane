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

import { customElementVsCodePlugin } from 'custom-element-vs-code-integration';

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

                            // Union de string literals → extraire les options pour knob select
                            // Ex: "'success' | 'warning' | 'error' | 'info'" → x-knob-options: ['success','warning',...]
                            const typeText = member.type?.text ?? '';
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
            },
        },
        customElementVsCodePlugin({
            outdir: 'dist',
        }),
    ],
};
