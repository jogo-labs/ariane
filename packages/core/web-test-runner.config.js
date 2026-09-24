import { playwrightLauncher } from '@web/test-runner-playwright';
import { esbuildPlugin } from '@web/dev-server-esbuild';

export default {
    // Fichiers de test browser — séparés des tests Vitest (.test.ts)
    // *.browser.test.ts : tests d'intégration (shadow DOM, MutationObserver…)
    // *.a11y.test.ts    : tests d'accessibilité axe-core par composant
    files: 'src/**/*.{browser,a11y}.test.{js,ts}',

    // Défaut WTR (30000ms) trop juste sur les runners CI partagés : esbuild transpile
    // les ~27 fichiers et Chromium démarre plusieurs pages en même temps que le runner
    // subit un cold-start CPU throttlé — les tout premiers fichiers programmés
    // (typiquement les 1-2 premiers de la file) peuvent dépasser 30s pour la seule
    // création de page, sans rapport avec le contenu des tests eux-mêmes (aucune
    // reproduction locale, même répétée).
    browserStartTimeout: 60000,

    // Chromium uniquement en CI ; WebKit peut être ajouté plus tard
    // En CI : utilise google-chrome-stable préinstallé sur le runner (évite le téléchargement).
    // --no-sandbox requis sur les runners Linux (pas de user namespace dans les conteneurs).
    browsers: [
        playwrightLauncher({
            product: 'chromium',
            launchOptions: {
                executablePath: process.env.CI ? '/usr/bin/google-chrome-stable' : undefined,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            },
        }),
    ],

    // Plugin esbuild pour transpiler TypeScript à la volée.
    // tsconfig.wtr.json est un fichier plat (sans "extends") qui transmet
    // experimentalDecorators + useDefineForClassFields, requis par les décorateurs Lit.
    // Le plugin ne résout pas "extends" quand il lit tsconfigRaw, donc tsconfig.json
    // (qui étend tsconfig.base.json) ne suffit pas.
    plugins: [
        esbuildPlugin({ ts: true, tsconfig: './tsconfig.wtr.json', define: { __DEV__: 'true' } }),
    ],

    nodeResolve: true,
};
