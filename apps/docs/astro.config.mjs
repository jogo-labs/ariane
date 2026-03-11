import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
    integrations: [mdx()],

    vite: {
        resolve: {
            alias: {
                // Alias pratique pour importer le manifest CEM dans les pages Astro
                // sans chemin relatif fragile
                '@cem': resolve(__dirname, '../../packages/core/dist/custom-elements.json'),
            },
        },
    },
});
