import tseslint from 'typescript-eslint';

export default tseslint.config(
    // Exclusions globales
    {
        ignores: [
            '**/dist/**',
            '**/cdn/**',
            '**/.astro/**',
            '**/node_modules/**',
            '**/*.config.js',
            '**/*.config.mjs',
        ],
    },

    // Règles TypeScript recommandées
    ...tseslint.configs.recommended,

    // Customisations projet
    {
        rules: {
            // Autorise les variables préfixées _ comme intentionnellement inutilisées
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

            // Préférer les imports de type explicites (réduction bundle)
            '@typescript-eslint/consistent-type-imports': [
                'error',
                { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
            ],

            // Interdit les any implicites
            '@typescript-eslint/no-explicit-any': 'warn',

            // Enforce la cohérence des assertions non-null
            '@typescript-eslint/no-non-null-assertion': 'warn',
        },
    },
);
