import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, createReadStream } from 'fs';
import { createDocDemoThemeProvider } from '../../scripts/starter-kit/build-doc-demo-theme.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CORE_ROOT = resolve(__dirname, '../../packages/core');

// Thème neutre des démos : feuille générée depuis les sources du thème, scopée sous .doc-demo
const docDemoTheme = createDocDemoThemeProvider(resolve(CORE_ROOT, 'src/styles/themes'));

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
    {
        prefix: '/presets/',
        dirs: [
            resolve(CORE_ROOT, 'dist/styles/presets'), // prioritaire : CSS minifié
            resolve(CORE_ROOT, 'src/styles/presets'), // fallback : CSS source brut
        ],
    },
];

/**
 * En développement, le serveur sert la version de DÉVELOPPEMENT du bundle CDN sous l'URL de
 * production : `npm run dev` ne construit que `*.dev.js`, donc `/cdn/index.js` (la production)
 * n'existe pas, et quand il existe (après un build complet) c'est la version sans avertissements
 * qu'on ne veut pas ici. L'URL reste `/cdn/index.js`, ce qui conserve l'identité du module
 * partagée entre Layout.astro et public/js/playground.js (qui importe announceA11y depuis cette
 * URL). Au build, `generateBundle` copie tout `cdn/` : `/cdn/index.js` est alors la production.
 */
const DEV_SERVER_OVERRIDES = {
    '/cdn/index.js': resolve(CORE_ROOT, 'cdn/index.dev.js'),
};

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
    // Domaine principal (#276) : sert à l'URL absolue du sitemap et à `Astro.site`. L'aperçu
    // `next.ariane-ui.com` et les déploiements de branche génèrent le même sitemap (URLs de la
    // production) ; ils sont en `noindex`, voir vercel.json.
    site: 'https://ariane-ui.com',

    integrations: [mdx(), sitemap()],

    // Le contenu narratif MDX (src/content/components/*.mdx) est la seule source
    // Markdown du site — les autres pages passent par CodeBlock.astro (pipeline
    // highlight.js). Sans ce réglage, Astro colore les blocs de code MDX avec
    // Shiki (thème "github-dark" par défaut, classes .astro-code + styles
    // inline color/background-color sur chaque span) — des styles inline qui
    // gagnent toujours la cascade face à nos règles CSS et à la palette
    // --doc-code-* (cf. doc-code-block.css). On désactive Shiki pour que ces
    // blocs restent du <pre><code class="language-xxx"> brut, repris comme les
    // autres par le highlight.js global (Layout.astro) et coloré par la même
    // palette maison.
    markdown: {
        syntaxHighlight: false,
    },

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

                        // Thème neutre des démos, généré à la volée depuis les sources du thème
                        if (url === '/themes/doc-demo.css') {
                            docDemoTheme
                                .get()
                                .then((css) => {
                                    res.setHeader('Content-Type', 'text/css; charset=utf-8');
                                    res.end(css);
                                })
                                .catch(next);
                            return;
                        }

                        // Fichiers individuels (ex: custom-elements.json)
                        for (const { url: mappedUrl, file } of SINGLE_FILE_MAPPINGS) {
                            if (url !== mappedUrl) continue;
                            if (!existsSync(file)) continue;

                            res.setHeader('Content-Type', getContentType(file));
                            createReadStream(file).pipe(res);
                            return;
                        }

                        // Version de développement du bundle CDN sous l'URL de production
                        const override = DEV_SERVER_OVERRIDES[url];
                        if (override && existsSync(override)) {
                            res.setHeader('Content-Type', getContentType(override));
                            createReadStream(override).pipe(res);
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
                    const { cp, copyFile, mkdir, writeFile } = await import('fs/promises');
                    const { join, dirname } = await import('path');
                    const outDir = resolve(__dirname, 'dist');

                    for (const { prefix, dirs } of ASSET_MAPPINGS) {
                        const srcDir = dirs.find(existsSync);
                        if (!srcDir) continue;

                        const dest = join(outDir, prefix);
                        await cp(srcDir, dest, { recursive: true });
                    }

                    await mkdir(join(outDir, 'themes'), { recursive: true });
                    await writeFile(
                        join(outDir, 'themes', 'doc-demo.css'),
                        await docDemoTheme.get(),
                    );

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
