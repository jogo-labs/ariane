function escapeHtml(text) {
    return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function renderVariant(variant) {
    return `
        <div class="ks-variant">
            <h3>${escapeHtml(variant.label)}</h3>
            <p class="ks-variant-desc">${escapeHtml(variant.description)}</p>
            ${variant.html}
        </div>`;
}

function renderComponent(component, warnings) {
    let body;
    if (component.variants.length === 0) {
        warnings.push(`${component.tagName} : aucun variant trouvé — démo à compléter.`);
        body =
            '<p class="ks-todo">Démo à compléter — aucun variant documenté pour ce composant.</p>';
    } else {
        body = component.variants.map(renderVariant).join('\n');
    }
    return `
    <section class="ks-component" id="${component.tagName}">
        <h2>${component.tagName}</h2>
        <p class="ks-summary">${escapeHtml(component.summary)}</p>
        ${body}
    </section>`;
}

/**
 * Construit la page statique "Kitchen Sink" : une section par composant,
 * chaque variant documenté (frontmatter MDX) rendu avec son HTML brut.
 * Ossature nav + contenu inspirée visuellement de la doc Astro, recodée en
 * HTML/CSS indépendant — pas de TOC, palette sobre distincte de l'identité
 * Ariane.
 */
export function buildKitchenSinkHtml(components) {
    const warnings = [];
    const sections = components.map((c) => renderComponent(c, warnings)).join('\n');

    const html = `<!doctype html>
<html lang="fr">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kitchen Sink — Ariane Starter Kit</title>
    <script type="module" src="https://unpkg.com/@ariane-ui/core/cdn/autoloader.prod.js"></script>
    <link rel="stylesheet" href="./ariane-starter.css" />
    <style>
        :root {
            --ks-bg: #f8fafc;
            --ks-nav-bg: #0f172a;
            --ks-nav-fg: #f1f5f9;
            --ks-border: #e2e8f0;
            --ks-text: #1e293b;
            --ks-muted: #64748b;
        }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: system-ui, sans-serif; background: var(--ks-bg); color: var(--ks-text); }
        header.ks-nav {
            position: sticky;
            top: 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.75rem 1.5rem;
            background: var(--ks-nav-bg);
            color: var(--ks-nav-fg);
        }
        header.ks-nav a { color: inherit; text-decoration: none; font-weight: 600; }
        main.ks-content { max-width: 960px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }
        section.ks-component { border-top: 1px solid var(--ks-border); padding-block: 2rem; }
        section.ks-component:first-child { border-top: none; }
        section.ks-component h2 { margin: 0 0 0.25rem; font-size: 1.25rem; }
        p.ks-summary { color: var(--ks-muted); margin: 0 0 1.5rem; }
        div.ks-variant { margin-block-end: 1.5rem; }
        div.ks-variant h3 { font-size: 0.95rem; margin: 0 0 0.25rem; }
        p.ks-variant-desc { color: var(--ks-muted); font-size: 0.875rem; margin: 0 0 0.75rem; }
        p.ks-todo { color: #b45309; font-style: italic; }
    </style>
</head>
<body>
    <header class="ks-nav">
        <span>Ariane — Kitchen Sink</span>
        <a href="https://github.com/jogo-labs/ariane" target="_blank" rel="noopener">Voir le repo ariane ↗</a>
    </header>
    <main class="ks-content">${sections}
    </main>
</body>
</html>
`;

    return { html, warnings };
}
