// scripts/starter-kit/theme-to-js.js
/**
 * Génère la version JavaScript d'un thème CSS : un module qui exporte un `CSSStyleSheet` à
 * adopter dans un shadow DOM applicatif (`shadowRoot.adoptedStyleSheets = [theme]`).
 *
 * Les règles `:root` et `[data-theme]` sont retirées : `:root` ne correspond à rien dans un
 * shadow root, et les tokens (propriétés personnalisées) traversent déjà la frontière par
 * héritage depuis le document, qui doit donc charger le thème CSS. Les règles de composants
 * (`ar-x`, `::part()`) sont conservées avec leurs couches éventuelles.
 *
 * Usage : node scripts/theme-to-js.js <entrée.css> <sortie.js> [--name <identifiant>]
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { transform } from 'lightningcss';

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

const isDocumentLevel = (selector) =>
    selector.some(
        (c) =>
            (c.type === 'pseudo-class' && c.kind === 'root') ||
            (c.type === 'attribute' && c.name === 'data-theme'),
    );

export function themeToJs(css, { name = 'theme' } = {}) {
    if (!IDENTIFIER.test(name)) {
        throw new Error(`« ${name} » n'est pas un identifiant JavaScript valide.`);
    }
    const { code } = transform({
        filename: 'theme.css',
        code: Buffer.from(css),
        minify: true,
        visitor: {
            Rule: {
                style(rule) {
                    const kept = rule.value.selectors.filter((s) => !isDocumentLevel(s));
                    if (kept.length === 0) return [];
                    if (kept.length === rule.value.selectors.length) return undefined;
                    return { type: 'style', value: { ...rule.value, selectors: kept } };
                },
            },
        },
    });
    return (
        `export const ${name} = new CSSStyleSheet();\n` +
        `${name}.replaceSync(${JSON.stringify(code.toString())});\n`
    );
}

async function main(argv) {
    const args = argv.slice();
    const nameIndex = args.indexOf('--name');
    const name = nameIndex === -1 ? undefined : args.splice(nameIndex, 2)[1];
    const [entry, output] = args;
    if (!entry || !output) {
        console.error(
            'Usage : node scripts/theme-to-js.js <entrée.css> <sortie.js> [--name <identifiant>]',
        );
        process.exit(1);
    }
    const bundled = await build({
        entryPoints: [entry],
        bundle: true,
        write: false,
        loader: { '.css': 'css' },
        logLevel: 'silent',
    });
    writeFileSync(output, themeToJs(bundled.outputFiles[0].text, { name }));
    console.log(`✓ ${output} généré depuis ${entry}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await main(process.argv.slice(2));
}
