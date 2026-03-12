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
            name: 'subcomponent-tag',
            analyzePhase({ ts, node, moduleDoc }) {
                // Cherche les classes avec @subcomponent dans leur JSDoc
                if (!ts.isClassDeclaration(node)) return;

                const jsDocTags = ts.getJSDocTags(node);
                const tag = jsDocTags.find((t) => t.tagName.text === 'subcomponent');
                if (!tag) return;

                const parent = tag.comment?.toString().trim();
                if (!parent) return;

                // Injecte la relation dans la déclaration CEM correspondante
                const className = node.name?.text;
                const declaration = moduleDoc.declarations?.find((d) => d.name === className);

                if (declaration) {
                    declaration.parentComponent = parent;
                }
            },
        },
        customElementVsCodePlugin({
            outdir: 'dist',
        }),
    ],
};
