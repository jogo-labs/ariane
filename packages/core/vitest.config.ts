import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // happy-dom : supporte Shadow DOM, Custom Elements Registry, adoptedStyleSheets.
        // Plus léger et ~3x plus rapide que jsdom, contrairement à @web/test-runner
        // n'ajoute pas 300MB de browsers Playwright en CI.
        environment: 'happy-dom',

        // *.browser.test.ts sont gérés par @web/test-runner, pas Vitest
        include: ['src/**/*.test.ts'],
        exclude: ['src/**/*.browser.test.ts'],

        // Rapport de couverture granulaire par fichier
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/*.test.ts',
                'src/**/*.browser.test.ts',
                'src/**/*.styles.ts',
                // ScrollFollowController désormais couvert par les browser tests (issue #30)
                'src/controllers/scroll-follow.controller.ts',
            ],
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 70,
                statements: 80,
            },
        },

        // Réinitialise le DOM entre chaque test file pour éviter les fuites de registre
        // (les custom elements ne peuvent pas être re-définis dans le même contexte)
        isolate: true,
    },
});
