import { playwrightLauncher } from '@web/test-runner-playwright';
import { esbuildPlugin } from '@web/dev-server-esbuild';

export default {
    // Fichiers de test browser — séparés des tests Vitest (.test.ts)
    // *.browser.test.ts : tests d'intégration (shadow DOM, MutationObserver…)
    // *.a11y.test.ts    : tests d'accessibilité axe-core par composant
    files: 'src/**/*.{browser,a11y}.test.{js,ts}',

    // Chromium uniquement en CI ; WebKit peut être ajouté plus tard
    browsers: [playwrightLauncher({ product: 'chromium' })],

    // Plugin esbuild pour transpiler TypeScript à la volée.
    // tsconfig.wtr.json est un fichier plat (sans "extends") qui transmet
    // experimentalDecorators + useDefineForClassFields, requis par les décorateurs Lit.
    // Le plugin ne résout pas "extends" quand il lit tsconfigRaw, donc tsconfig.json
    // (qui étend tsconfig.base.json) ne suffit pas.
    plugins: [esbuildPlugin({ ts: true, tsconfig: './tsconfig.wtr.json' })],

    nodeResolve: true,
};
