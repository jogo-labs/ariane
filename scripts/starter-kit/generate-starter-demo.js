// scripts/starter-kit/generate-starter-demo.js
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readManifestComponents } from './read-manifest-components.js';
import { readVariantsFromMdx } from './read-mdx-variants.js';
import { readComponentTitle } from './read-component-title.js';
import { readComponentPageScript } from './read-component-page-script.js';
import { buildKitchenSinkHtml } from './build-kitchen-sink-html.js';
import { syncStarterTheme } from './sync-starter-theme.js';
import { syncPresets } from './sync-presets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

/**
 * Assemble et écrit la démo Kitchen Sink + le thème starter dérivé.
 *
 * - dryRun: true  → écrit dans `outDir` (répertoire scratch local), aucune
 *   opération git. Utilisé par le smoke test CI et pour prévisualiser en
 *   local avant de pousser vers le vrai repo externe.
 * - dryRun: false → écrit dans `repoPath` (checkout du repo externe
 *   `ariane-starter-kit`) et y fait `git add` + `git commit`. Ne pousse
 *   jamais — le `git push` reste un geste volontaire du dev.
 */
export function generate({
    manifestPath,
    mdxDir,
    srcThemesDir,
    srcPresetsDir,
    dryRun,
    outDir,
    repoPath,
    coreVersion,
}) {
    const components = readManifestComponents(manifestPath).map((c) => ({
        ...c,
        variants: readVariantsFromMdx(path.join(mdxDir, `${c.tagName}.mdx`)),
        title: readComponentTitle(path.join(mdxDir, `${c.tagName}.mdx`)),
        pageScript: readComponentPageScript(path.join(mdxDir, `${c.tagName}.mdx`)),
    }));

    const { html, warnings } = buildKitchenSinkHtml(components);
    for (const warning of warnings) {
        console.warn(`[generate-starter-demo] ${warning}`);
    }

    const target = dryRun ? outDir : repoPath;

    if (!dryRun && !existsSync(path.join(repoPath, '.git'))) {
        throw new Error(
            `${repoPath} n'est pas un dépôt git — clone jogo-labs/ariane-starter-kit en checkout frère avant de relancer.`,
        );
    }

    mkdirSync(target, { recursive: true });
    writeFileSync(path.join(target, 'index.html'), html);
    // GitHub Pages sert le repo via Jekyll par défaut, qui exclut tout
    // fichier/dossier préfixé `_` — soit les 19 fragments de thème sous
    // ariane-starter/. `.nojekyll` désactive ce traitement (cf. finding
    // critique #230 point 3 : le site live était rendu sans styles).
    writeFileSync(path.join(target, '.nojekyll'), '');
    syncStarterTheme({ srcThemesDir, repoPath: target });
    syncPresets({ srcPresetsDir, repoPath: target });

    if (dryRun) {
        console.log(`Démo + thème générés (dry-run) dans ${target}/`);
        return { html, warnings, committed: false };
    }

    execFileSync(
        'git',
        ['add', 'index.html', '.nojekyll', 'ariane-starter.css', 'ariane-starter', 'presets'],
        { cwd: repoPath },
    );
    try {
        execFileSync(
            'git',
            ['commit', '-m', `chore: régénère la démo et le thème (ariane v${coreVersion})`],
            { cwd: repoPath, stdio: 'pipe' },
        );
        console.log(`Commit créé dans ${repoPath} — pense à \`git push\` après relecture.`);
        return { html, warnings, committed: true };
    } catch {
        console.log('Rien à mettre à jour — la démo et le thème étaient déjà à jour.');
        return { html, warnings, committed: false };
    }
}

function parseArgs(argv) {
    const args = { repo: '../ariane-starter-kit', dryRun: false };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--dry-run') args.dryRun = true;
        else if (argv[i] === '--repo') args.repo = argv[++i];
    }
    return args;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const { repo, dryRun } = parseArgs(process.argv.slice(2));
    const coreVersion = JSON.parse(
        readFileSync(path.join(ROOT, 'packages/core/package.json'), 'utf8'),
    ).version;
    generate({
        manifestPath: path.join(ROOT, 'packages/core/dist/custom-elements.json'),
        mdxDir: path.join(ROOT, 'apps/docs/src/content/components'),
        srcThemesDir: path.join(ROOT, 'packages/core/src/styles/themes'),
        srcPresetsDir: path.join(ROOT, 'packages/core/src/styles/presets'),
        dryRun,
        outDir: path.join(ROOT, 'dist-starter-demo'),
        repoPath: path.resolve(process.cwd(), repo),
        coreVersion,
    });
}
