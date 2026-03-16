import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, createReadStream } from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CORE_ROOT = resolve(__dirname, '../../packages/core');

/**
 * Map préfixe URL → liste de répertoires candidats, dans l'ordre de priorité.
 * Le premier répertoire trouvé avec le fichier l'emporte.
 *
 * Pour les thèmes CSS, on cherche d'abord dans dist/ (build complet),
 * puis dans src/ en fallback (dev sans build préalable).
 */
const ASSET_MAPPINGS = [
    {
        prefix: '/cdn/',
        dirs: [resolve(CORE_ROOT, 'cdn')],
    },
    {
        prefix: '/themes/',
        dirs: [
            resolve(CORE_ROOT, 'dist/styles/themes'), // prioritaire : CSS minifié
            resolve(CORE_ROOT, 'src/styles/themes'), // fallback : CSS source brut
        ],
    },
];

/**
 * Fichiers individuels à servir à une URL fixe.
 * Utilisé pour exposer custom-elements.json à api-viewer.
 */
const SINGLE_FILE_MAPPINGS = [
    {
        url: '/custom-elements.json',
        file: resolve(CORE_ROOT, 'dist/custom-elements.json'),
    },
];

function getContentType(filePath) {
    if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
    if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
    if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
    if (filePath.endsWith('.map')) return 'application/json; charset=utf-8';
    return 'application/octet-stream';
}

export default defineConfig({
    integrations: [mdx()],

    vite: {
        resolve: {
            alias: {
                '@cem': resolve(CORE_ROOT, 'dist/custom-elements.json'),
            },
        },

        plugins: [
            {
                name: 'serve-core-assets',

                configureServer(server) {
                    server.middlewares.use((req, res, next) => {
                        const url = req.url?.split('?')[0] ?? '';

                        // Fichiers individuels (ex: custom-elements.json)
                        for (const { url: mappedUrl, file } of SINGLE_FILE_MAPPINGS) {
                            if (url !== mappedUrl) continue;
                            if (!existsSync(file)) continue;

                            res.setHeader('Content-Type', getContentType(file));
                            createReadStream(file).pipe(res);
                            return;
                        }

                        // Répertoires (cdn, themes)
                        for (const { prefix, dirs } of ASSET_MAPPINGS) {
                            if (!url.startsWith(prefix)) continue;

                            const relative = url.slice(prefix.length);

                            for (const dir of dirs) {
                                const filePath = resolve(dir, relative);
                                if (!existsSync(filePath)) continue;

                                res.setHeader('Content-Type', getContentType(filePath));
                                createReadStream(filePath).pipe(res);
                                return;
                            }
                        }
                        next();
                    });
                },

                // Au build Astro : copie les assets depuis le premier répertoire existant
                async generateBundle() {
                    const { cp, copyFile, mkdir } = await import('fs/promises');
                    const { join, dirname } = await import('path');
                    const outDir = resolve(__dirname, 'dist');

                    for (const { prefix, dirs } of ASSET_MAPPINGS) {
                        const srcDir = dirs.find(existsSync);
                        if (!srcDir) continue;

                        const dest = join(outDir, prefix);
                        await cp(srcDir, dest, { recursive: true });
                    }

                    for (const { url: mappedUrl, file } of SINGLE_FILE_MAPPINGS) {
                        if (!existsSync(file)) continue;
                        const dest = join(outDir, mappedUrl);
                        await mkdir(dirname(dest), { recursive: true });
                        await copyFile(file, dest);
                    }
                },
            },
        ],
    },
});
