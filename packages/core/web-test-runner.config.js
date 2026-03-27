import { playwrightLauncher } from '@web/test-runner-playwright';
import { esbuildPlugin } from '@web/dev-server-esbuild';

export default {
    // Fichiers de test browser — séparés des tests Vitest (.test.ts)
    files: 'src/**/*.browser.test.{js,ts}',

    // Chromium uniquement en CI ; WebKit peut être ajouté plus tard
    browsers: [playwrightLauncher({ product: 'chromium' })],

    // Plugin esbuild pour transpiler TypeScript à la volée
    plugins: [esbuildPlugin({ ts: true })],

    nodeResolve: true,
};
