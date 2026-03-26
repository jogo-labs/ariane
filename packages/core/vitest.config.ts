import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // happy-dom : supporte Shadow DOM, Custom Elements Registry, adoptedStyleSheets.
        // Plus léger et ~3x plus rapide que jsdom, contrairement à @web/test-runner
        // n'ajoute pas 300MB de browsers Playwright en CI.
        environment: 'happy-dom',

        include: ['src/**/*.test.ts'],

        // Rapport de couverture granulaire par fichier
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/*.test.ts',
                'src/**/*.styles.ts',
                // ScrollFollowController utilise IntersectionObserver — non supporté dans happy-dom.
                // À tester avec Playwright (issue #2).
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
