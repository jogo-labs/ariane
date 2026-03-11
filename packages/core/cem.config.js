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
export default {
    // Inclure tous les fichiers TS sauf les tests et les styles
    globs:   ['src/**/*.ts'],
    exclude: ['src/**/*.test.ts', 'src/**/*.styles.ts'],

    // Activer la détection automatique des patterns LitElement
    // (décorateurs @customElement, @property, @state, etc.)
    litelement: true,

    outdir: 'dist',

    plugins: [],
};
