/** @type {import('lint-staged').Config} */
export default {
    // Formatage Prettier sur tous les types supportés
    '*.{ts,js,mjs,json,css,astro,md,yml,yaml}': ['prettier --write'],

    // Lint ESLint sur les fichiers TS uniquement
    '*.ts': ['eslint --fix --max-warnings=0'],
};
