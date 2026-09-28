// scripts/starter-kit/serve-demo.js
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const CONTENT_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
};

/**
 * Petit serveur statique sans dépendance — sert `dir` (le `dist-starter-demo/`
 * généré en dry-run) sur `port`, pour prévisualiser en local avant de pousser
 * vers le vrai repo `ariane-starter-kit`. `file://` ne convient pas : le CDN
 * autoloader et les imports de thème ont besoin d'une vraie origine http(s).
 */
export function serveDemo({ dir, port }) {
    const server = createServer(async (req, res) => {
        const urlPath = decodeURIComponent(req.url.split('?')[0]);
        const requested = urlPath === '/' ? '/index.html' : urlPath;
        const filePath = path.join(dir, requested);

        if (!filePath.startsWith(dir)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }

        try {
            const info = await stat(filePath);
            const resolved = info.isDirectory() ? path.join(filePath, 'index.html') : filePath;
            const body = await readFile(resolved);
            const contentType = CONTENT_TYPES[path.extname(resolved)] ?? 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(body);
        } catch {
            res.writeHead(404);
            res.end('Not found');
        }
    });

    server.listen(port, () => {
        console.log(`Kitchen Sink en local : http://localhost:${port}/`);
    });

    return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const port = Number(process.env.PORT) || 8420;
    serveDemo({ dir: path.join(ROOT, 'dist-starter-demo'), port });
}
