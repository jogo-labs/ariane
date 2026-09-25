function escapeHtml(text) {
    return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function renderVariant(variant) {
    const label = variant.label ?? variant.name;
    return `
        <div class="ks-variant">
            <h3>${escapeHtml(label)}</h3>
            <p class="ks-variant-desc">${escapeHtml(variant.description)}</p>
            <div class="ks-preview">${variant.html}</div>
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
    const label = component.title ?? component.tagName;
    return `
        <section class="ks-component" id="${component.tagName}">
            <h2>${escapeHtml(label)} <code>&lt;${component.tagName}&gt;</code></h2>
            ${body}
        </section>
        ${component.pageScript ?? ''}`;
}

function renderTocEntry(component) {
    const label = component.title ?? component.tagName;
    return `<li><a href="#${component.tagName}">${escapeHtml(label)}</a></li>`;
}

/**
 * Construit la page statique "Kitchen Sink" : une nav latérale par ancres
 * (noms lisibles, `title` du frontmatter MDX), une section par composant,
 * chaque variant documenté rendu avec son HTML brut. Ossature inspirée
 * visuellement de la doc Astro (nav top avec logo + TOC latérale pleine
 * hauteur + contenu), recodée en HTML/CSS/JS indépendant, sans police
 * externe (pile système uniquement) — palette sobre distincte de
 * l'identité Ariane, switch clair/sombre/auto propre au starter.
 */
export function buildKitchenSinkHtml(components) {
    const warnings = [];
    const sections = components.map((c) => renderComponent(c, warnings)).join('\n');
    const tocEntries = components.map(renderTocEntry).join('\n                ');

    const html = `<!doctype html>
<html lang="fr">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kitchen Sink — Ariane Starter Kit</title>
    <script type="module" src="https://unpkg.com/@ariane-ui/core/cdn/autoloader.prod.js"></script>
    <link rel="stylesheet" href="./ariane-starter.css" />
    <link rel="stylesheet" href="./presets/buttons.css" />
    <link rel="stylesheet" href="./presets/fields.css" />
    <style>
        :root {
            color-scheme: light dark;
            --ks-nav-height: 55px;

            --ks-bg: light-dark(#f8fafc, #0f172a);
            --ks-preview-bg: light-dark(#f5f5f5, #10131f);
            --ks-bg-subtle: light-dark(#eef2f7, #1e293b);
            --ks-border: light-dark(#e2e8f0, #334155);
            --ks-text: light-dark(#1e293b, #e2e8f0);
            --ks-muted: light-dark(#4d596b, #94a3b8);
        }

        /* Thème sombre actif manuellement */
        :root[data-theme='dark'],
        [data-theme='dark'] {
            color-scheme: dark;
        }

        /* Thème clair forcé */
        :root[data-theme='light'],
        [data-theme='light'] {
            color-scheme: light;
        }

        * { box-sizing: border-box; }
        body {
            margin: 0;
            font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
            font-size: 16px;
            line-height: 1.6;
            background: var(--ks-bg);
            color: var(--ks-text);
        }
        :where(div, summary, nav, section)[id] {
            scroll-margin-top: var(--ks-nav-height);
        }

        .skip-link {
            z-index: 1000;
            background: var(--ks-bg);
            color: var(--ks-fg);
            font-family: inherit;
            font-size: .85rem;
            font-weight: 500;
            cursor: pointer;
            border: none;
            border-radius: 0 0 .4rem .4rem;
            padding: .5rem 1rem;
            text-decoration: none;
            transition: top .15s;
            position: absolute;
            top: -3rem;
            left: .5rem;

            &:focus {
                top: 0;
            }
        }
        header.ks-nav {
            height: var(--ks-nav-height);
            position: sticky;
            top: 0;
            z-index: 10;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            padding: 0.75rem 1.5rem;
            background: var(--ks-bg);
            border: 1px solid var(--ks-border);
        }
        header.ks-nav a { color: inherit; text-decoration: none; }
        .ks-nav-left { display: flex; align-items: center; gap: 0.6rem; }
        .ks-logo-link { display: flex; align-items: center; gap: 0.4rem; }
        .ks-logo-mark { flex: none; display: block; }
        .ks-logo { font-size: 1.2rem; font-weight: 700; letter-spacing: -0.01em; }
        .ks-nav-title { font-weight: 400; opacity: 0.7; font-size: .9rem; }
        .ks-nav-right { display: flex; align-items: center; gap: 1rem; font-size: 0.875rem; }
        .ks-nav-right a { opacity: 0.85; }
        .ks-nav-right a:hover { opacity: 1; }
        .ks-theme-toggle {
            display: flex;
            align-items: center;
            gap: .4rem;
            font: inherit;
            font-size: 0.875rem;
            background: transparent;
            color: inherit;
            border: none;
            padding: 0.25rem 0.6rem;
            cursor: pointer;
            border-radius: 50%;
            aspect-ratio: 1/1;

            &:hover { background: rgba(255, 255, 255, 0.1); }
        }
        .github-link {
            display: flex;
            gap: .3rem;
            align-items: center;

            &:hover {
                text-decoration: none;
            }

            &:hover .desktop-only {
                text-decoration: underline;
                text-underline-offset: 4px;
            }
        }
        nav.ks-toc {
            display: none;
            width: 240px;
            padding: 1.5rem 1rem;
            padding-inline-start: 2rem;
            scrollbar-width: thin;
            scrollbar-color: var(--ks-border) transparent;
            position: sticky;
            top: var(--ks-nav-height);
            max-height: calc(100vh - var(--ks-nav-height));
            overflow-y: auto;
        }
        .ks-toc-title {
            font-size: .7rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: .08em;
            color: var(--ks-muted);
            margin: 0 0 1rem;
        }
        .ks-toc-inner {
            display: flex;
            flex-direction: column;
            row-gap: .5rem;
            margin: 0;
            list-style: none;
        }
        .ks-toc .ks-toc-inner {
            padding-inline-start: 1.2rem;
            border-left: 1px solid var(--ks-border);
        }
        nav.ks-toc a,
        details.ks-toc-mobile a {
            display: block;
            padding: 0.3rem 0.6rem;
            border-radius: 4px;
            color: var(--ks-muted);
            text-decoration: none;
            font-size: 0.875rem;
        }
        details.ks-toc-mobile {
            border: 1px solid var(--ks-border);
            border-radius: .5rem;
            margin: 0 1.5rem 2rem;
            font-size: .875rem;
            display: block;

            summary {
                font-weight: 500;
                color: var(--ks-muted);
                cursor: pointer;
                justify-content: space-between;
                align-items: center;
                padding: .6rem .875rem;
                font-size: .8rem;
                list-style: none;
                display: flex;
            }

            summary .chevron {
                font-size: .9rem;
                transition: transform .15s;
                display: inline-block;
            }

            &[open] .chevron {
                transform: rotate(90deg);
            }

            .ks-toc-inner {
                border-top: 1px solid var(--ks-border);
                padding: 1rem;
                padding-inline-start: 2rem;
            }
        }

        nav.ks-toc a:hover, details.ks-toc-mobile a:hover { background: var(--ks-bg-subtle); color: var(--ks-text); }
        .ks-content { max-width: 860px; margin: 0 auto; padding: 2rem 0 4rem; }
        section.ks-component { padding-inline: 1.5rem; }
        section.ks-component + section.ks-component { border-top: 1px solid var(--ks-border); padding-block: 2.5rem 3rem; }
        section.ks-component h2 {
            display: flex;
            flex-direction: column;
            align-items: baseline;
            gap: 0.6rem;
            margin: 0 0 2rem;
            font-size: 2rem;
            font-weight: 700;
            line-height: 1.3;
        }
        section.ks-component h2 code {
            font-size: 0.75rem;
            font-weight: 400;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            color: var(--ks-muted);
            background: var(--ks-bg-subtle);
            padding: 0.1rem 0.45rem;
            border-radius: 4px;
        }
        div.ks-variant + div.ks-variant { margin-block-start: 1.75rem; }
        div.ks-variant h3 { font-size: 1rem; font-weight: 600; margin: 0 0 0.3rem; }
        p.ks-variant-desc { color: var(--ks-muted); font-size: 0.875rem; line-height: 1.5; margin: 0 0 0.85rem; }
        .ks-preview {
                background-color: var(--ks-preview-bg);
                border-radius: 0.5rem;
                padding: 1rem;
        }
        p.ks-todo { color: #b45309; font-style: italic; }
        .desktop-only {
            display: none;
        }
        @media (min-width: 821px) {
            nav.ks-toc { display: block; }
            details.ks-toc-mobile, .skip-link--mobile { display: none; }
            .desktop-only { display: inline; }
            .ks-theme-toggle { border-radius: 4px; aspect-ratio: auto; }

            .ks-layout {
                display: grid;
                grid-template-columns: 270px minmax(0px, 1fr);
                max-width: 1560px;
                margin: 0 auto;
            }
        }
        @media (min-width: 1180px) {
            .ks-layout {
                grid-template-columns: 300px minmax(0px, 1fr);
            }
        }
        /* A extraire dans un preset "utilities" ?*/
        .sr-only {
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border-width: 0;
            width: 1px;
            height: 1px;
            margin: -1px;
            padding: 0;
            position: absolute;
            overflow: hidden;
        }
    </style>
</head>
<body>
    <a href="#toc-desktop" class="skip-link desktop-only">Aller au sommaire</a>
    <a href="#toc-mobile" class="skip-link skip-link--mobile">Aller au sommaire</a>
    <a href="#main-content" class="skip-link">Aller au contenu principal</a>
    <header class="ks-nav">
        <div class="ks-nav-left">
            <a href="https://github.com/jogo-labs/ariane" target="_blank" rel="noopener" class="ks-logo-link" aria-label="Voir la page du projet Ariane">
                <svg width="24" height="24" viewBox="0 0 22 22" aria-hidden="true" class="ks-logo-mark">
                    <path d="M2 18 C7 18 8 7 13 7 C17 7 19 11 20 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
                    <circle cx="13" cy="7" r="3" fill="#fa0" />
                </svg>
                <span class="ks-logo">Ariane</span>
            </a>
            <span>|</span>
            <span class="ks-nav-title">Kitchen Sink</span>
        </div>
        <div class="ks-nav-right">
            <a class="github-link" href="https://github.com/jogo-labs/ariane-starter-kit" target="_blank" rel="noopener" aria-label="Visiter le projet Ariane Starter Kit">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 .3a12 12 0 0 0-3.79 23.4c.6.1.82-.26.82-.57v-2.2c-3.34.72-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.75-1.33-1.75-1.08-.74.08-.73.08-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.8 1.3 3.48 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.69.82.57A12 12 0 0 0 12 .3"></path>
                </svg>
                <span class="desktop-only">&nbsp;Starter-kit&nbsp;</span><span aria-hidden="true">↗</span>
            </a>
            <button type="button" class="ks-theme-toggle" id="ks-theme-toggle" aria-label="Changer le mode"></button>
        </div>
    </header>
    <div class="ks-layout">
        <nav class="ks-toc" id="toc-desktop" aria-label="Sommaire des composants">
            <h2 class="ks-toc-title">Accès rapide</h2>
            <ul class="ks-toc-inner">
                ${tocEntries}
            </ul>
        </nav>
        <main>
            <div class="ks-content">
                <details class="ks-toc-mobile">
                    <summary id="toc-mobile">
                        <span>Parcourir les composants</span>
                        <span class="chevron" aria-hidden="true">›</span>
                    </summary>
                    <ul class="ks-toc-inner">
                        ${tocEntries}
                    </ul>
                </details>
                <div id="main-content">
                    ${sections}
                </div>
            </div>
        </main>
    </div>
    <script>
        (function () {
            var KEY = 'ks-theme';
            var STATES = ['auto', 'light', 'dark'];
            var LABELS = {
                auto: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="3" rx="2"></rect><path d="M8 21h8M12 17v4"></path></svg><span class="desktop-only">&nbsp;Automatique</span>',
                light: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path></svg><span class="desktop-only">&nbsp;Clair</span>',
                dark: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"></path></svg><span class="desktop-only">&nbsp;Sombre</span>' };
            var root = document.documentElement;
            var btn = document.getElementById('ks-theme-toggle');

            function apply(state) {
                if (state === 'auto') root.removeAttribute('data-theme');
                else root.setAttribute('data-theme', state);
                btn.innerHTML = LABELS[state];
                btn.setAttribute('aria-label', 'Mode actuel : ' + LABELS[state] + ' — cliquer pour changer');
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
