/** @type {import('lint-staged').Config} */
export default {
    // Formatage Prettier sur tous les types supportés
    // .astro exclus volontairement : prettier-plugin-astro est instable sur les
    // patterns frontmatter + JSX complexes et casse le code au commit.
    // Le formatage .astro est délégué à l'extension VSCode Astro en dev.
    '*.{ts,js,mjs,json,css,scss,md,mdx,yml,yaml}': ['prettier --write'],

    // Lint ESLint sur les fichiers TS uniquement
    '*.ts': ['eslint --fix --max-warnings=0'],
};
