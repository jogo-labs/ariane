import { playwrightLauncher } from '@web/test-runner-playwright';
import { esbuildPlugin } from '@web/dev-server-esbuild';

const ALL_BROWSERS = process.env.CI ? ['chromium', 'firefox'] : ['chromium', 'firefox', 'webkit'];
const BROWSERS = process.env.ARIANE_BROWSERS?.split(',') ?? ALL_BROWSERS;

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

    // Firefox : un fichier de test à la fois. En parallèle, les tests à attente fixe sur une
    // transition (ar-collapse : transitionend) échouent de façon aléatoire (1 run sur 5 seul,
    // 2 sur 3 avec les autres moteurs) ; en série, 8 runs sur 8 sont verts. Hypothèse :
    // Firefox bride les transitions des pages en arrière-plan.
    ...(BROWSERS.includes('firefox') && { concurrency: 1 }),

    // Chromium et Firefox partout ; WebKit seulement hors CI (ses dépendances système ne
    // sont pas dans l'image du runner : `playwright install --with-deps` coûte plusieurs
    // minutes d'apt-get). Le hook pre-push le lance seul via ARIANE_BROWSERS=webkit.
    // Prérequis local : `npx playwright install firefox webkit`.
    // En CI, Chromium utilise google-chrome-stable préinstallé sur le runner (évite le
    // téléchargement). --no-sandbox requis sur les runners Linux (pas de user namespace
    // dans les conteneurs).
    browsers: BROWSERS.map((product) =>
        playwrightLauncher({
            product,
            launchOptions:
                product === 'chromium'
                    ? {
                          executablePath: process.env.CI
                              ? '/usr/bin/google-chrome-stable'
                              : undefined,
                          args: ['--no-sandbox', '--disable-setuid-sandbox'],
                      }
                    : {},
        }),
    ),

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
