function escapeHtml(text) {
    return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function renderVariant(variant) {
    const label = variant.label ?? variant.name;
    return `
        <div class="ks-variant">
            <h3>${escapeHtml(label)}</h3>
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

function renderTocEntry(component) {
    return `<a href="#${component.tagName}">${component.tagName}</a>`;
}

/**
 * Construit la page statique "Kitchen Sink" : une nav latérale par ancres,
 * une section par composant, chaque variant documenté (frontmatter MDX)
 * rendu avec son HTML brut. Ossature inspirée visuellement de la doc Astro
 * (nav top + TOC latérale + contenu), recodée en HTML/CSS/JS indépendant —
 * palette sobre distincte de l'identité Ariane, switch clair/sombre/auto
 * propre au starter (pas de composant Ariane, pour ne jamais dépendre du
 * thème qu'il pilote lui-même).
 */
export function buildKitchenSinkHtml(components) {
    const warnings = [];
    const sections = components.map((c) => renderComponent(c, warnings)).join('\n');
    const tocEntries = components.map(renderTocEntry).join('\n            ');

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
            --ks-bg-subtle: #eef2f7;
            --ks-nav-bg: #0f172a;
            --ks-nav-fg: #f1f5f9;
            --ks-border: #e2e8f0;
            --ks-text: #1e293b;
            --ks-muted: #64748b;
        }
        :root[data-theme='dark'] {
            --ks-bg: #0f172a;
            --ks-bg-subtle: #1e293b;
            --ks-nav-bg: #020617;
            --ks-nav-fg: #f1f5f9;
            --ks-border: #334155;
            --ks-text: #e2e8f0;
            --ks-muted: #94a3b8;
        }
        @media (prefers-color-scheme: dark) {
            :root:not([data-theme='light']) {
                --ks-bg: #0f172a;
                --ks-bg-subtle: #1e293b;
                --ks-nav-bg: #020617;
                --ks-nav-fg: #f1f5f9;
                --ks-border: #334155;
                --ks-text: #e2e8f0;
                --ks-muted: #94a3b8;
            }
        }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: system-ui, sans-serif; background: var(--ks-bg); color: var(--ks-text); }
        header.ks-nav {
            position: sticky;
            top: 0;
            z-index: 10;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            padding: 0.75rem 1.5rem;
            background: var(--ks-nav-bg);
            color: var(--ks-nav-fg);
        }
        header.ks-nav a { color: inherit; text-decoration: none; }
        .ks-nav-left { display: flex; align-items: baseline; gap: 0.5rem; font-weight: 600; }
        .ks-nav-left .ks-logo { font-size: 1.05rem; }
        .ks-nav-left .ks-nav-title { font-weight: 400; opacity: 0.75; font-size: 0.9rem; }
        .ks-nav-right { display: flex; align-items: center; gap: 1rem; font-size: 0.875rem; }
        .ks-nav-right a { opacity: 0.85; }
        .ks-nav-right a:hover { opacity: 1; text-decoration: underline; }
        .ks-theme-toggle {
            font: inherit;
            font-size: 0.875rem;
            background: transparent;
            color: inherit;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            padding: 0.25rem 0.6rem;
            cursor: pointer;
        }
        .ks-theme-toggle:hover { background: rgba(255, 255, 255, 0.1); }
        .ks-layout { display: flex; align-items: flex-start; }
        nav.ks-toc {
            position: sticky;
            top: 49px;
            flex: none;
            width: 220px;
            max-height: calc(100vh - 49px);
            overflow-y: auto;
            padding: 1.5rem 1rem;
            border-right: 1px solid var(--ks-border);
        }
        nav.ks-toc a {
            display: block;
            padding: 0.25rem 0.5rem;
            margin-block-end: 0.125rem;
            border-radius: 4px;
            color: var(--ks-muted);
            text-decoration: none;
            font-size: 0.85rem;
        }
        nav.ks-toc a:hover { background: var(--ks-bg-subtle); color: var(--ks-text); }
        main.ks-content { flex: 1; min-width: 0; max-width: 760px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }
        section.ks-component { border-top: 1px solid var(--ks-border); padding-block: 2rem; }
        section.ks-component:first-child { border-top: none; padding-block-start: 0; }
        section.ks-component h2 { margin: 0 0 0.25rem; font-size: 1.25rem; }
        p.ks-summary { color: var(--ks-muted); margin: 0 0 1.5rem; }
        div.ks-variant { margin-block-end: 1.5rem; }
        div.ks-variant h3 { font-size: 0.95rem; margin: 0 0 0.25rem; }
        p.ks-variant-desc { color: var(--ks-muted); font-size: 0.875rem; margin: 0 0 0.75rem; }
        p.ks-todo { color: #b45309; font-style: italic; }
        @media (max-width: 700px) {
            nav.ks-toc { display: none; }
        }
    </style>
</head>
<body>
    <header class="ks-nav">
        <div class="ks-nav-left">
            <span class="ks-logo">Ariane</span>
            <span class="ks-nav-title">Kitchen Sink</span>
        </div>
        <div class="ks-nav-right">
            <button type="button" class="ks-theme-toggle" id="ks-theme-toggle" aria-label="Changer de thème"></button>
            <a href="https://github.com/jogo-labs/ariane" target="_blank" rel="noopener">ariane ↗</a>
            <a href="https://github.com/jogo-labs/ariane-starter-kit" target="_blank" rel="noopener">starter-kit ↗</a>
        </div>
    </header>
    <div class="ks-layout">
        <nav class="ks-toc" aria-label="Sommaire des composants">
            ${tocEntries}
        </nav>
        <main class="ks-content">${sections}
        </main>
    </div>
    <script>
        (function () {
            var KEY = 'ks-theme';
            var STATES = ['auto', 'light', 'dark'];
            var LABELS = { auto: '🌓 Auto', light: '☀️ Clair', dark: '🌙 Sombre' };
            var root = document.documentElement;
            var btn = document.getElementById('ks-theme-toggle');

            function apply(state) {
                if (state === 'auto') root.removeAttribute('data-theme');
                else root.setAttribute('data-theme', state);
                btn.textContent = LABELS[state];
                btn.setAttribute('aria-label', 'Thème actuel : ' + LABELS[state] + ' — cliquer pour changer');
            }

            var stored = null;
            try {
                stored = localStorage.getItem(KEY);
            } catch (e) {
                /* stockage indisponible (navigation privée, etc.) — reste sur "auto" */
            }
            var current = STATES.includes(stored) ? stored : 'auto';
            apply(current);

            btn.addEventListener('click', function () {
                current = STATES[(STATES.indexOf(current) + 1) % STATES.length];
                try {
                    localStorage.setItem(KEY, current);
                } catch (e) {
                    /* stockage indisponible — le choix ne survit pas au rechargement */
                }
                apply(current);
            });
        })();
    </script>
</body>
</html>
`;

    return { html, warnings };
}
