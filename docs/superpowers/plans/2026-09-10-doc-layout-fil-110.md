# Relook visuel du layout de la doc — « Le Fil » (#110, sous-chantier 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire porter au chrome du site de doc (header, nav, TOC, composants narratifs) la signature visuelle « fil + perle » déjà présente sur la home, avec les listes d'API remplacées par des lignes de vie et une nav/TOC dont les points de rupture (drawer mobile vs sommaire replié) sont découplés.

**Architecture :** Travail presque exclusivement CSS + markup Astro sur des fichiers existants (`Layout.astro`, `SiteNav.astro`, `TableOfContents.astro`, `ComponentApi.astro`, `Playground.astro`, `[slug].astro`, `doc-prose.css`, `doc-tokens.css`). Aucune nouvelle dépendance. Une seule addition fonctionnelle : les catégories d'API (Attributs/Événements/Méthodes/CSS Parts/CSS Props/Slots) sont regroupées dans `<ar-tab-group>` (composant déjà publié de `packages/core`) au lieu de sections empilées — élimine tout JS/ARIA de tabs à écrire soi-même.

**Tech Stack :** Astro, TypeScript, CSS natif (`light-dark()`, tokens `--doc-*`), `@ariane-ui/core` (web components déjà publiés : `ar-tab-group`, `ar-dropdown`, `ar-alert`, `ar-collapse`).

**Spec :** `docs/superpowers/specs/2026-09-10-doc-layout-redesign-110-design.md`

## Global Constraints

- Prettier : 100 caractères, 4 espaces, guillemets simples (déjà appliqué par le hook pre-commit du repo).
- `import type` obligatoire pour tout import de type.
- Aucun fallback cosmétique (`var(--token, valeur)`) dans les fichiers `apps/docs` touchant `--doc-*` — les valeurs vivent dans `doc-tokens.css`, jamais inline.
- Aucun token existant renommé ou re-timbré : uniquement des ajouts (`--doc-rail`, `--doc-rail-live`, `--doc-bead`, `--doc-bead-ring`, `--doc-alpha`, `--doc-stable`, `--doc-surface`).
- Un niveau d'imbrication nav maximum (composant → sous-composant) — pas de regroupement par famille.
- Aucune implémentation de recherche — emplacement réservé (`aria-disabled`) uniquement.
- Badge de statut : toujours `Alpha` dans ce chantier (le composant accepte une prop `status` avec `'stable'` en option pour usage futur, mais aucune donnée par-composant n'existe encore côté CEM — décision de scope, pas d'ajout d'annotation CEM ici).
- Conventional Commits pour chaque commit.
- Ne jamais committer `/dist`.
- Toujours utiliser le chemin absolu du repo pour les commandes racine (`/Users/jon/Code/Active_projects/ariane`).

---

## Task 1: Créer la branche de travail

**Files:** aucun fichier modifié.

- [ ] **Step 1: Créer et basculer sur la branche depuis `dev`**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout dev
git pull
git checkout -b feat/doc-layout-fil-110
```

- [ ] **Step 2: Vérifier l'état propre**

Run: `git status`
Expected: `On branch feat/doc-layout-fil-110`, rien à committer.

---

## Task 2: Tokens du fil

**Files:**

- Modify: `apps/docs/src/styles/doc-tokens.css:106-109`
- Modify: `docs/design/charte-graphique.md`

**Interfaces:**

- Produces: `--doc-rail`, `--doc-rail-live`, `--doc-bead`, `--doc-bead-ring`, `--doc-alpha`, `--doc-stable`, `--doc-surface` — consommés par toutes les tâches suivantes.

- [ ] **Step 1: Ajouter les tokens dans `doc-tokens.css`**

Insérer juste avant la fermeture du bloc `:root` (après `--doc-space-section: 2.5rem;`, ligne 108) :

```css
/* ─── Le fil : rail décoratif + perle (position courante) ──────────
       Ajouts du sous-chantier 3 (#110) — aucun token existant modifié.
       cf. docs/superpowers/specs/2026-09-10-doc-layout-redesign-110-design.md */
--doc-rail: light-dark(rgba(20, 20, 20, 0.13), var(--doc-thread-soft));
--doc-rail-live: var(--doc-ember);
--doc-bead: var(--doc-ember);
--doc-bead-ring: light-dark(var(--doc-paper), var(--doc-vault));

/* ─── Statut de maturité — jamais l'ambre d'accent : un badge de
       statut n'est pas un élément actif/interactif. ────────────────── */
--doc-alpha: light-dark(#8f5f00, var(--doc-ember));
--doc-stable: light-dark(#2f6b45, #7fd3a2);

/* ─── Surface secondaire (barres de contrôle, encarts) ──────────── */
--doc-surface: light-dark(var(--doc-slate), var(--doc-vault-deep));
```

- [ ] **Step 2: Vérifier que le build Astro passe**

Run: `cd apps/docs && npm run build`
Expected: build réussit sans erreur CSS.

- [ ] **Step 3: Documenter les nouveaux tokens dans la charte graphique**

Dans `docs/design/charte-graphique.md`, ajouter une nouvelle section après « ## Rythme vertical » :

```markdown
## Le fil (sous-chantier 3)

Rail décoratif + perle appliqués au chrome (nav, TOC, listes d'API) — même
vocabulaire que le motif de la home. Voir
`docs/superpowers/specs/2026-09-10-doc-layout-redesign-110-design.md`.

| Nom               | Rôle                                         |
| ----------------- | -------------------------------------------- |
| `--doc-rail`      | trait décoratif continu                      |
| `--doc-rail-live` | segment « parcouru » (amorces, puces, actif) |
| `--doc-bead`      | la perle (position courante)                 |
| `--doc-bead-ring` | détourage de la perle sur son fond           |
| `--doc-alpha`     | statut de maturité « alpha »                 |
| `--doc-stable`    | statut de maturité « stable »                |
| `--doc-surface`   | fond de zone secondaire                      |

- 2026-09 : ajout des tokens du fil (sous-chantier 3, #110).
```

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/styles/doc-tokens.css docs/design/charte-graphique.md
git commit -m "$(cat <<'EOF'
feat(docs): ajoute les tokens du fil (rail, perle, statut)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018PizSKiQEjKpMuoa2ewcJN
EOF
)"
```

---

## Task 3: Header — logo, version, recherche réservée, séparation rail

**Files:**

- Modify: `apps/docs/src/layouts/Layout.astro:1-4` (imports), `:414-475` (markup header), `:171-245` (CSS header)

**Interfaces:**

- Consumes: `--doc-rail`, `--doc-bead` (Task 2).
- Produces: classes `.header-brand` (mise à jour), `.brand-mark`, `.header-version`, `.header-search` — pas consommées par d'autres tâches.

- [ ] **Step 1: Importer la version de `packages/core`**

Dans `Layout.astro`, à côté des imports existants (ligne 2-3) :

```astro
import SiteNav from '../components/SiteNav.astro';
import rootPkg from '../../../../package.json';
import { version as coreVersion } from '../../../../packages/core/package.json';
```

- [ ] **Step 2: Remplacer le header-left par logo + version**

Remplacer (lignes ~426-431) :

```astro
                <h1>
                    <a href="/" class="header-brand">
                        {rootPkg.config.displayName}
                    </a>
                </h1>
```

par :

```astro
                <h1>
                    <a href="/" class="header-brand">
                        <svg width="20" height="20" viewBox="0 0 22 22" aria-hidden="true" class="brand-mark">
                            <path d="M2 16 C7 16 8 5 13 5 C17 5 19 9 20 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
                            <circle cx="13" cy="5" r="3" fill="var(--doc-bead)" />
                        </svg>
                        {rootPkg.config.displayName}
                    </a>
                </h1>
                <span class="header-version">v{coreVersion}</span>
```

- [ ] **Step 3: Ajouter le bouton de recherche réservé (non actif)**

Dans `.header-actions`, avant le lien GitHub (ligne ~433) :

```astro
                <button
                    type="button"
                    class="icon-btn header-search"
                    aria-disabled="true"
                    title="Recherche — prévue, non active"
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="11" cy="11" r="7" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <span class="sr-only">Recherche (à venir)</span>
                </button>
```

- [ ] **Step 4: Styles — brand/version/search, séparation en rail**

Remplacer le bloc `.header-brand { ... }` (lignes ~198-204) par :

```css
.header-brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 800;
    font-size: 1.5rem;
    letter-spacing: -0.02em;
    color: var(--doc-text);
    text-decoration: none;
}

.brand-mark {
    display: block;
    flex: none;
    color: var(--doc-text);
}

.header-version {
    font-family: 'Fira Code', 'Cascadia Code', monospace;
    font-size: 0.68rem;
    color: var(--doc-text-muted);
    border: 1px solid var(--doc-border);
    border-radius: 999px;
    padding: 0.05rem 0.45rem;
    margin-left: 0.5rem;
}

.header-search[aria-disabled='true'] {
    cursor: not-allowed;
    opacity: 0.55;
}
```

Remplacer `border-bottom: 1px solid var(--doc-nav-border);` dans `.site-header` (ligne ~181) par :

```css
box-shadow: inset 0 -1px 0 var(--doc-rail);
```

(retirer la ligne `border-bottom` existante — la séparation devient un fil, pas une bordure.)

- [ ] **Step 5: Vérifier visuellement**

```bash
cd apps/docs && npm run build && npm run preview &
```

Ouvrir la home et une page composant : logo + perle ambre visibles, pastille de version affichée, bouton recherche présent mais visuellement désactivé (curseur `not-allowed`), séparation header/contenu toujours visible en clair et en sombre.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/src/layouts/Layout.astro
git commit -m "$(cat <<'EOF'
feat(docs): header — logo fil, pastille de version, recherche réservée

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018PizSKiQEjKpMuoa2ewcJN
EOF
)"
```

---

## Task 4: Nav latérale — rail segmenté + imbrication continue

**Files:**

- Modify: `apps/docs/src/components/SiteNav.astro` (template lignes 108-182, styles lignes 184-301)

**Interfaces:**

- Consumes: `--doc-rail`, `--doc-rail-live`, `--doc-bead`, `--doc-bead-ring` (Task 2). `NavItem.children` déjà produit par la logique CEM existante (`x-parent`) — aucune donnée nouvelle à calculer.

- [ ] **Step 1: Ajouter `nav-mono` sur la liste des composants**

Dans le template, la section Composants (ligne ~160) :

```astro
            <ul class="nav-list nav-mono">
```

- [ ] **Step 2: Réécrire le CSS des sections (rail segmenté)**

Remplacer le bloc `.nav-section { margin-bottom: 1.25rem; }` (lignes 228-240) par :

```css
/* Le fil ne traverse pas les grandes sections : chacune ouvre son
       propre segment (rupture de parcours). Le titre sort du rail : décalé
       jusqu'à son axe, le segment ne commence qu'en dessous. */
.nav-section + .nav-section {
    margin-top: 2.1rem;
}

.nav-section {
    margin-bottom: 0;
    position: relative;
    padding-left: 1.15rem;
}

.nav-section > .nav-list {
    position: relative;
}

.nav-section > .nav-list::before {
    content: '';
    position: absolute;
    inset-inline-start: -1.15rem;
    top: 0.35rem;
    bottom: 0.35rem;
    width: 1px;
    background: var(--doc-rail);
}

.nav-section h2 {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--doc-text-muted);
    padding: 0;
    margin: 0 0 0.6rem;
    margin-inline-start: -1.15rem;
}
```

(Supprime le `padding: 0 0.75rem;` précédent sur `.nav-section h2` — le décalage se fait désormais via `margin-inline-start`, pas via le padding partagé avec les liens.)

- [ ] **Step 3: Perle sur l'item actif + rail hors nav-list**

Remplacer le bloc `.nav-list a { ... }` à `.nav-list a[aria-current="page"] { ... }` (lignes 251-274) par :

```css
.nav-list a {
    position: relative;
    display: block;
    padding: 0.4rem 0.75rem 0.4rem 0;
    color: var(--doc-text-subtle);
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 450;
    transition: color 0.15s;
}

.nav-list a:hover {
    color: var(--doc-text);
}

/* La perle : marque la position courante sur le fil. */
.nav-list a[aria-current='page'] {
    color: var(--doc-text);
    font-weight: 600;
}

.nav-list a[aria-current='page']::before {
    content: '';
    position: absolute;
    inset-inline-start: calc(-1.15rem - 3.5px);
    top: 50%;
    margin-top: -4px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--doc-bead);
    box-shadow: 0 0 0 3px var(--doc-bead-ring);
}

.nav-mono {
    font-family: 'Fira Code', 'Cascadia Code', monospace;
    font-size: 0.84rem;
}
```

- [ ] **Step 4: Imbrication continue (sous-composants)**

Remplacer le bloc `.nav-children { ... }` et `.nav-children a { ... }` (lignes 278-288) par :

```css
/* ── Sous-composants : UN niveau, rail continu ───────────────────
       Le rail du parent (`.nav-section > .nav-list::before`) s'étend déjà
       sur toute la hauteur du <ul> — y compris les enfants dépliés, sans
       aucun code supplémentaire. Un sous-composant ne démarre donc pas son
       propre segment : il prolonge celui de son parent (contrairement aux
       grandes sections, qui n'ont rien en commun). Seule une coche
       horizontale marque le décrochage vers chaque feuille. */
.nav-children {
    position: relative;
    list-style: none;
    margin: 0.15rem 0 0.25rem;
    padding: 0;
}

.nav-children li {
    position: relative;
}

.nav-children a {
    display: block;
    padding-inline-start: 0.95rem;
    font-size: 0.8rem;
    color: var(--doc-text-subtle);
}

.nav-children li::before {
    content: '';
    position: absolute;
    inset-inline-start: 0;
    top: 50%;
    width: 0.7rem;
    height: 1px;
    background: var(--doc-rail);
}

/* La perle d'un sous-composant actif reste sur l'axe du rail de
       section (pas sur son propre retrait) — même axe que les items de
       premier niveau. */
.nav-children a[aria-current='page']::before {
    inset-inline-start: calc(-1.15rem - 3.5px - 0.95rem);
}
```

- [ ] **Step 5: Vérifier visuellement**

Ouvrir une page ayant des sous-composants (`ar-dropdown`, `ar-tab-group`) : le rail parent doit visuellement s'étendre à travers les enfants dépliés (pas de rupture), chaque enfant relié par une coche courte, perle alignée sur le même axe vertical que les items de premier niveau. Comparer au mockup de référence (URL dans l'historique de session) et ajuster les valeurs `0.95rem`/`3.5px` si le rendu diverge visuellement.

- [ ] **Step 6: `npm run test` (docs)**

Run: `cd apps/docs && npm run test`
Expected: PASS (aucun test ne couvre le rendu visuel de SiteNav — vérifie juste l'absence de régression sur les utils consommés par le CEM).

- [ ] **Step 7: Commit**

```bash
git add apps/docs/src/components/SiteNav.astro
git commit -m "$(cat <<'EOF'
feat(docs): nav latérale — rail segmenté par section, imbrication continue

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018PizSKiQEjKpMuoa2ewcJN
EOF
)"
```

---

## Task 5: Breakpoints TOC/nav découplés + largeur TOC + résumé mobile

**Files:**

- Modify: `apps/docs/src/layouts/Layout.astro:292-402` (grid + media queries)
- Modify: `apps/docs/src/components/TableOfContents.astro` (style + script)
- Modify: `apps/docs/src/pages/components/[slug].astro:218-221` (breakpoint `.toc-mobile-inline`)

**Interfaces:**

- Produces: comportement TOC indépendant du drawer nav — aucune interface consommée par d'autres tâches.

- [ ] **Step 1: Largeur de la colonne TOC (220px → 296px ≥1440px)**

Dans `Layout.astro`, remplacer (ligne ~299-301) :

```css
.layout-body.with-nav.with-toc {
    grid-template-columns: 270px minmax(0, 1fr) 270px;
}
```

par :

```css
.layout-body.with-nav.with-toc {
    grid-template-columns: 270px minmax(0, 1fr) 220px;
}

@media (min-width: 1440px) {
    .layout-body.with-nav.with-toc {
        grid-template-columns: 270px minmax(0, 1fr) 296px;
    }
}
```

- [ ] **Step 2: Séparer le point de rupture TOC (1180px) du drawer nav (820px)**

Remplacer tout le bloc `@media (max-width: 768px) { ... }` (lignes ~351-402) par deux blocs distincts :

```css
/* ── TOC : repli dans le flux, indépendant du drawer nav ──── */
@media (max-width: 1180px) {
    .layout-body.with-nav.with-toc {
        grid-template-columns: 270px minmax(0, 1fr);
    }

    .toc-column {
        display: none;
    }
}

/* ── Nav : drawer plein écran ─────────────────────────────── */
@media (max-width: 820px) {
    #burger-btn {
        display: flex;
    }
    .nav-overlay {
        display: block;
    }

    #nav-close-btn {
        display: flex;
        position: absolute;
        top: 0.75rem;
        right: 0.75rem;
        z-index: 1;
    }

    .layout-body.with-nav {
        display: block;
    }

    .nav-column {
        position: fixed;
        top: 0;
        left: 0;
        height: 100vh;
        height: 100dvh;
        max-height: none;
        width: 280px;
        z-index: 300;
        transform: translateX(-100%);
        transition: transform 0.25s ease;
    }

    .nav-column.open {
        transform: translateX(0);
    }
    .nav-overlay.open {
        opacity: 1;
    }

    .layout-body {
        height: auto;
        min-height: calc(100vh - var(--doc-header-h));
        overflow-y: visible;
    }

    main {
        width: 100%;
        height: auto;
        overflow-y: visible;
    }

    .main-inner,
    .layout-body.with-toc .main-inner {
        padding: 1.5rem 1rem;
        max-width: 100%;
    }
}
```

(Le `.toc-column { display: none; }` déménage dans le bloc 1180px ; tout le reste — burger, drawer, overlay — passe à 820px. `#burger-btn`/`.nav-overlay`/`#nav-close-btn` gardent leurs règles « masqué par défaut » existantes en dehors des media queries, inchangées.)

- [ ] **Step 3: Aligner `TableOfContents.astro` sur 1180px**

Remplacer `@media (max-width: 768px) {` par `@media (max-width: 1180px) {` (ligne 148).

- [ ] **Step 4: Aligner `.toc-mobile-inline` dans `[slug].astro`**

Remplacer (lignes 219-221) :

```css
@media (max-width: 768px) {
    .toc-mobile-inline {
        display: block;
    }
}
```

par :

```css
@media (max-width: 1180px) {
    .toc-mobile-inline {
        display: block;
    }
}
```

- [ ] **Step 5: Le résumé mobile affiche la section courante**

Dans `TableOfContents.astro`, le `<summary>` mobile (ligne 39) :

```astro
    <summary>Sur cette page <span class="toc-mobile-current"></span></summary>
```

Dans le script, après la mise à jour de `.active` (dans le callback de l'`IntersectionObserver`, après la boucle `forEach` qui ajoute `.active`), ajouter la mise à jour du résumé :

```js
const activeLabel = document.querySelector < HTMLAnchorElement > '.toc-link.active'?.textContent;
const summarySpan = document.querySelector < HTMLElement > '.toc-mobile-current';
if (summarySpan) {
    summarySpan.textContent = activeLabel ? `· ${activeLabel}` : '';
}
```

(Insérée juste après le bloc `document.querySelectorAll<HTMLAnchorElement>('.toc-link').forEach((l) => l.classList.add('active'));` à l'intérieur du `if (entry.isIntersecting)`.)

Ajouter le style :

```css
.toc-mobile-current {
    font-weight: 400;
    color: var(--doc-text-muted);
    font-size: 0.75rem;
}
```

- [ ] **Step 6: Vérifier aux trois largeurs**

Redimensionner la fenêtre du navigateur (ou DevTools) à >1440px, entre 820px et 1180px, et <820px sur une page composant :

- > 1440px : TOC visible à 296px.
- 1180px–1440px : TOC visible à 220px, nav latérale toujours en colonne (pas de burger).
- 820px–1180px : TOC repliée dans le flux (`<details>`, résumé affiche la section courante), nav toujours en colonne.
- <820px : nav en drawer (burger visible), TOC toujours repliée dans le flux.

- [ ] **Step 7: `npm run test`**

Run: `cd apps/docs && npm run test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/docs/src/layouts/Layout.astro apps/docs/src/components/TableOfContents.astro apps/docs/src/pages/components/\[slug\].astro
git commit -m "$(cat <<'EOF'
feat(docs): découple les points de rupture TOC (1180px) et nav (820px)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018PizSKiQEjKpMuoa2ewcJN
EOF
)"
```

---

## Task 6: Fil d'Ariane + badge de statut sur la page composant

**Files:**

- Modify: `apps/docs/src/pages/components/[slug].astro:22-32` (getStaticPaths), `:36-53` (props), `:152-169` (markup page-header), `:208-268` (style)

**Interfaces:**

- Consumes: `component['x-parent']`, `mdxByTag` (déjà présents dans `getStaticPaths`).
- Produces: `parentLabel: string | null` — prop locale à cette page, non réutilisée ailleurs.

- [ ] **Step 1: Calculer `parentLabel` dans `getStaticPaths`**

Remplacer (lignes 28-31) :

```astro
    return components.map((component) => ({
        params: { slug: getSlug(component.tagName!) },
        props:  { component, mdx: mdxByTag[component.tagName!] ?? null },
    }));
```

par :

```astro
    return components.map((component) => {
        const parentTag = component['x-parent'];
        const parentLabel = parentTag ? (mdxByTag[parentTag]?.data.title ?? parentTag) : null;
        return {
            params: { slug: getSlug(component.tagName!) },
            props:  { component, mdx: mdxByTag[component.tagName!] ?? null, parentLabel },
        };
    });
```

- [ ] **Step 2: Récupérer la prop**

Remplacer (lignes 36-39) :

```astro
const { component, mdx } = Astro.props as {
    component: CemDeclaration;
    mdx: MdxEntry | null;
};
```

par :

```astro
const { component, mdx, parentLabel } = Astro.props as {
    component:   CemDeclaration;
    mdx:         MdxEntry | null;
    parentLabel: string | null;
};
```

- [ ] **Step 3: Markup — breadcrumb + badge**

Remplacer le bloc `.page-header` (lignes 153-169) par :

```astro
        <div class="page-header">
            <nav class="crumb" aria-label="Fil d'Ariane">
                <a href="/">Composants</a>
                {parentTag && parentLabel && (
                    <>
                        <span class="crumb-dot" aria-hidden="true"></span>
                        <a href={`/components/${getSlug(parentTag)}`}>{parentLabel}</a>
                    </>
                )}
                <span class="crumb-dot" aria-hidden="true"></span>
                <span aria-current="page">{pageTitle}</span>
            </nav>

            <div class="title-row">
                <h2 class="page-title">{pageTitle}</h2>
                {/* Toujours "Alpha" dans ce chantier — cf. Global Constraints,
                    aucune donnée de maturité par composant n'existe encore. */}
                <span class="status status-alpha">Alpha</span>
            </div>

            <div class="meta">
                <code>&lt;{component.tagName}&gt;</code>
            </div>

            {pageDesc && <p class="summary">{pageDesc}</p>}

            {/* ── Encart parent pour les sous-composants ── */}
            {parentTag && (
                <p class="parent-notice">
                    Ce composant doit être utilisé en tant qu'enfant de <code>&lt;{parentTag}&gt;</code>.<br />
                    Merci de voir la <a href={`/components/${parentTag.replace(/^ar-/, '')}`}>documentation du composant {parentTag}</a> pour voir les exemples d'utilisation.
                </p>
            )}
        </div>
```

- [ ] **Step 4: Styles — crumb, title-row, status**

Ajouter dans le bloc `<style>` (après l'import `doc-prose.css`, avant `.parent-notice`) :

```css
.crumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.78rem;
    color: var(--doc-text-muted);
    margin-bottom: 1.1rem;
}

.crumb a {
    color: inherit;
    text-decoration: none;
}

.crumb a:hover {
    color: var(--doc-text);
}

.crumb .crumb-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--doc-rail-live);
    display: inline-block;
}

.title-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.title-row .page-title {
    margin: 0;
}

.status {
    display: inline-flex;
    align-items: center;
    gap: 0.32rem;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    padding: 0.12rem 0.55rem;
    border-radius: 999px;
    border: 1px solid currentColor;
}

.status::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
}

.status-alpha {
    color: var(--doc-alpha);
}
.status-stable {
    color: var(--doc-stable);
}
```

- [ ] **Step 5: Exposer `parentTag` dans le scope du template**

`parentTag` est déjà déclaré en frontmatter (`const parentTag = component['x-parent'];`, ligne 51) — vérifier qu'il reste utilisé tel quel dans le nouveau markup (pas de nouvelle déclaration nécessaire).

- [ ] **Step 6: Vérifier visuellement**

Ouvrir `/components/ar-dialog` (pas de parent) et `/components/ar-dropdown-item` (a un parent) : le fil d'Ariane doit afficher `Composants · ar-dialog` dans le premier cas, `Composants · ar-dropdown · ar-dropdown-item` dans le second, badge `Alpha` visible à côté du titre dans les deux cas.

- [ ] **Step 7: `npm run test` + build**

```bash
cd apps/docs && npm run test && npm run build
```

Expected: PASS, build réussit pour toutes les routes composant (y compris sous-composants).

- [ ] **Step 8: Commit**

```bash
git add apps/docs/src/pages/components/\[slug\].astro
git commit -m "$(cat <<'EOF'
feat(docs): fil d'Ariane et badge de statut sur les pages composant

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018PizSKiQEjKpMuoa2ewcJN
EOF
)"
```

---

## Task 7: Titres de section, puces, encarts

**Files:**

- Modify: `apps/docs/src/styles/doc-prose.css:45-65` (section/subsection-title), `:74-80` (narrative-list), `:229-254` (doc-callout-alert)

**Interfaces:**

- Consumes: `--doc-rail-live` (Task 2).

- [ ] **Step 1: Amorce ambre sur `.section-title` (h2 uniquement)**

Remplacer (lignes 45-55) :

```css
:global(.section-title) {
    font-size: var(--doc-font-size-lg);
    font-weight: var(--doc-font-weight-semibold);
    border-bottom: 2px solid var(--doc-border);
    padding-bottom: 1rem;
    margin: 0;
    color: var(--doc-text);
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
```

par :

```css
:global(.section-title) {
    position: relative;
    font-size: var(--doc-font-size-lg);
    font-weight: var(--doc-font-weight-semibold);
    padding-top: 1.1rem;
    margin: 0;
    color: var(--doc-text);
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

/* Le fil se prolonge en amorce horizontale — réservée au h2. Le h3
   (.subsection-title, inchangé ci-dessous) n'en porte pas : si le repère
   apparaît à tous les niveaux, il perd sa valeur de marqueur de section. */
:global(.section-title)::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 28px;
    height: 2px;
    background: var(--doc-rail-live);
}
```

`.subsection-title` (lignes 57-65) reste inchangé — pas d'amorce, déjà conforme.

- [ ] **Step 2: Puces en perle discrète sur les listes narratives**

Remplacer (lignes 74-80) :

```css
.narrative :global(.narrative-list) {
    font-size: var(--doc-font-size-sm);
    line-height: 1.75;
    color: var(--doc-text);
    margin: 0;
    padding-left: 1.25rem;
}
```

par :

```css
.narrative :global(.narrative-list) {
    font-size: var(--doc-font-size-sm);
    line-height: 1.75;
    color: var(--doc-text);
    margin: 0;
    padding-left: 1.25rem;
    list-style: none;
}

.narrative :global(.narrative-list li) {
    position: relative;
}

.narrative :global(.narrative-list li)::before {
    content: '';
    position: absolute;
    inset-inline-start: -1rem;
    top: 0.65em;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--doc-rail-live);
}
```

- [ ] **Step 3: Encart (`.doc-callout-alert`) — filet vertical plutôt que carte**

Remplacer (lignes 229-235) :

```css
.doc-callout-alert {
    --ar-alert-bg: var(--doc-accent-bg);
    --ar-alert-border: var(--doc-accent-border);
    --ar-alert-icon: var(--doc-accent);
    --ar-alert-color: var(--doc-text);

    margin-top: 1.875rem;
```

par :

```css
.doc-callout-alert {
    /* Filet vertical plutôt qu'une carte — cohérent avec la légèreté
       demandée pour les blocs de contenu (cf. spec section 4). */
    --ar-alert-bg: transparent;
    --ar-alert-border: transparent;
    --ar-alert-icon: var(--doc-accent);
    --ar-alert-color: var(--doc-text);

    display: block;
    border-inline-start: 2px solid var(--doc-rail-live);
    padding-inline-start: 1rem;
    margin-top: 1.875rem;
```

- [ ] **Step 4: Vérifier visuellement**

Ouvrir une page de contenu narratif avec une liste et un `ar-alert` (ex. la section « Les cas où il dessert » d'une page composant, si présente, ou une page `getting-started`) : titres h2 avec petite amorce ambre en haut à gauche, h3 sans amorce, puces en points ambre, encart sans fond ni bordure pleine — juste un filet vertical.

- [ ] **Step 5: `npm run test` + build**

```bash
cd apps/docs && npm run test && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add apps/docs/src/styles/doc-prose.css
git commit -m "$(cat <<'EOF'
feat(docs): amorce ambre sur les titres h2, puces et encarts en fil

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018PizSKiQEjKpMuoa2ewcJN
EOF
)"
```

---

## Task 8: Bouton copier repositionné

**Files:**

- Modify: `apps/docs/src/components/Playground.astro:317-333`

**Interfaces:**

- Consumes: `--doc-ease` (existant).

- [ ] **Step 1: Repositionner et masquer au repos**

Remplacer (lignes 317-333) :

```css
.copy-btn {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.25rem 0.6rem;
    background: rgba(255, 255, 255, 0.08);
    color: #adb5bd;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 0.25rem;
    font-size: 0.75rem;
    cursor: pointer;
    transition:
        background 0.15s,
        color 0.15s;
    z-index: 1;
}

.copy-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #e6edf3;
}
.copy-btn.copied {
    background: var(--ar-color-success-text, #0a8560);
    color: #fff;
    border-color: transparent;
}
```

par :

```css
.copy-btn {
    position: absolute;
    inset-block-start: 0.55rem;
    /* Logique RTL : le bouton suit le bord de fin de lecture. */
    inset-inline-end: 0.55rem;
    padding: 0.25rem 0.6rem;
    background: rgba(255, 255, 255, 0.08);
    color: #adb5bd;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 0.25rem;
    font-size: 0.75rem;
    cursor: pointer;
    opacity: 0;
    transition:
        opacity 0.18s var(--doc-ease),
        background 0.15s,
        color 0.15s;
    z-index: 1;
}

.code-block:hover .copy-btn,
.code-block:focus-within .copy-btn,
.playground-code-block:hover .copy-btn,
.playground-code-block:focus-within .copy-btn {
    opacity: 1;
}

.copy-btn:focus-visible {
    opacity: 1;
}

/* Sur pointeur tactile, pas de survol possible : le bouton reste visible. */
@media (hover: none) {
    .copy-btn {
        opacity: 1;
    }
}

.copy-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #e6edf3;
}
.copy-btn.copied {
    background: var(--ar-color-success-text, #0a8560);
    color: #fff;
    border-color: transparent;
    opacity: 1;
}
```

- [ ] **Step 2: `.code-block`/`.playground-code-block` doivent être le conteneur du hover**

Vérifier que `.code-block` et `.playground-code-block` (déjà `position: relative`, lignes 265-271) enveloppent bien le `<button class="copy-btn">` — c'est déjà le cas dans le markup existant (lignes 75-78 et 103-107), aucun changement de markup nécessaire.

- [ ] **Step 3: Vérifier la conformité de « Exemples » à la spec section 6 (aucun changement de structure attendu)**

La section « Exemples » (variantes, lignes 54-91) suit déjà le pattern demandé par la spec : titre (`h4`) et description en prose au-dessus, hors cadre, puis un cadre unique enveloppant preview + code repliable (`.preview` bordé en haut/latéral, `.code-block` bordé en bas, pas de bordure entre les deux — `border-bottom: 0` sur `.preview` ligne 258). Aucune modification de markup nécessaire ici — vérifier seulement, à l'étape suivante, que le rendu correspond visuellement au mockup (cadre continu, titre/description hors cadre).

- [ ] **Step 4: Vérifier visuellement**

Ouvrir une page composant avec des exemples : le bouton « Copier » doit être invisible au repos, apparaître au survol du bloc de code ou au focus clavier (Tab), rester toujours visible sur un appareil tactile (DevTools → émulation tactile), et confirmer « Copié ! » en restant visible après le clic même sans survol.

- [ ] **Step 5: `npm run test`**

Run: `cd apps/docs && npm run test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/src/components/Playground.astro
git commit -m "$(cat <<'EOF'
feat(docs): bouton copier en coin de bloc, révélé au survol/focus

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018PizSKiQEjKpMuoa2ewcJN
EOF
)"
```

---

## Task 9: API en lignes de vie + `ar-tab-group`

**Files:**

- Modify: `apps/docs/src/components/ComponentApi.astro` (réécriture quasi complète des sections lignes 58-289, styles lignes 291-336)

**Interfaces:**

- Consumes: `ar-tab-group`/`ar-tab`/`ar-tab-panel` (packages/core, déjà publiés) — `<ar-tab-group active="..." label="...">`, `<ar-tab panel="name">`, `<ar-tab-panel name="name">`. Association par correspondance `panel`/`name`, aucun `id` manuel requis (généré par le composant).
- Produces: chaque `<ar-tab-panel name="attributs">` (etc.) contient un élément portant l'`id` `api-attributs` (etc.) — consommé par Task 10 (activation d'onglet au clic TOC).

- [ ] **Step 1: Calculer la liste des catégories disponibles**

Dans le frontmatter, après les déclarations existantes (après ligne 35) :

```astro
interface ApiCategory {
    key:   string;
    label: string;
    count: number;
}

const categories: ApiCategory[] = [
    component.attributes && component.attributes.length > 0
        ? { key: 'attributs', label: 'Attributs', count: component.attributes.length }
        : null,
    component.slots && component.slots.length > 0
        ? { key: 'slots', label: 'Slots', count: component.slots.length }
        : null,
    component.events && component.events.length > 0
        ? { key: 'evenements', label: 'Événements', count: component.events.length }
        : null,
    publicMethods.length > 0
        ? { key: 'methodes', label: 'Méthodes', count: publicMethods.length }
        : null,
    component.cssParts && component.cssParts.length > 0
        ? { key: 'css-parts', label: 'CSS Parts', count: component.cssParts.length }
        : null,
    (ownProps.length > 0 || panelProps.length > 0)
        ? { key: 'css-props', label: 'CSS Custom Properties', count: ownProps.length + panelProps.length }
        : null,
].filter((c): c is ApiCategory => c !== null);

const firstCategory = categories[0]?.key ?? 'attributs';
```

- [ ] **Step 2: Remplacer les sections Attributs/Événements/Méthodes/CSS Parts/CSS Props/Slots par un `ar-tab-group`**

Remplacer tout le bloc allant de `{/* ── Attributs & Propriétés ── */}` (ligne 58) jusqu'à la fin de `{/* ── Slots ── */}` (ligne 288, juste avant `</div>`) par :

```astro
    {/* ── Référence API : une catégorie par onglet, ar-tab-group gère
         entièrement l'ARIA/le clavier (déjà publié, packages/core). ── */}
    {categories.length > 0 && (
        <ar-tab-group active={firstCategory} label="Référence API" class="api-tabs">
            {categories.map((cat) => (
                <ar-tab panel={cat.key}>
                    {cat.label} <span class="api-tab-count">{cat.count}</span>
                </ar-tab>
            ))}

            {component.attributes && component.attributes.length > 0 && (
                <ar-tab-panel name="attributs">
                    <h4 id="api-attributs" class="sr-only">Attributs</h4>
                    <div class="api-list">
                        {component.attributes.map((attr) => (
                            <div class="api-row">
                                <div>
                                    <span class="api-name">{attr.name}</span>
                                    <code class="api-sig">{attr.type?.text ?? '—'}</code>
                                    {attr.default !== undefined && (
                                        <code class="api-default">défaut&nbsp;: {attr.default}</code>
                                    )}
                                </div>
                                <p class="api-desc">{attr.description ?? ''}</p>
                            </div>
                        ))}
                    </div>
                </ar-tab-panel>
            )}

            {component.slots && component.slots.length > 0 && (
                <ar-tab-panel name="slots">
                    <h4 id="api-slots" class="sr-only">Slots</h4>
                    <div class="api-list">
                        {component.slots.map((slot) => (
                            <div class="api-row">
                                <span class="api-name">{slot.name || '(default)'}</span>
                                <p class="api-desc">{slot.description ?? ''}</p>
                            </div>
                        ))}
                    </div>
                </ar-tab-panel>
            )}

            {component.events && component.events.length > 0 && (
                <ar-tab-panel name="evenements">
                    <h4 id="api-evenements" class="sr-only">Événements</h4>
                    <div class="api-list">
                        {component.events.map((event) => (
                            <div class="api-row">
                                <span class="api-name">
                                    {event.name}
                                    {isCancelableEvent(event.description) && <span class="flag">annulable</span>}
                                </span>
                                <p class="api-desc">{stripCancelableMarker(event.description)}</p>
                            </div>
                        ))}
                    </div>
                </ar-tab-panel>
            )}

            {publicMethods.length > 0 && (
                <ar-tab-panel name="methodes">
                    <h4 id="api-methodes" class="sr-only">Méthodes</h4>
                    <div class="api-list">
                        {publicMethods.map((m) => {
                            const params = (m.parameters ?? [])
                                .map((p) => {
                                    let s = p.name;
                                    if (p.type?.text) s += `: ${p.type.text}`;
                                    if (p.default !== undefined) s += ` = ${p.default}`;
                                    return s;
                                })
                                .join(', ');
                            const returnType = m.return?.type?.text ?? 'void';
                            return (
                                <div class="api-row">
                                    <div>
                                        <span class="api-name">{m.name}()</span>
                                        {params && <code class="api-sig">{params}</code>}
                                        <code class="api-default">retour&nbsp;: {returnType}</code>
                                    </div>
                                    <p class="api-desc">{m.description ?? ''}</p>
                                </div>
                            );
                        })}
                    </div>
                </ar-tab-panel>
            )}

            {component.cssParts && component.cssParts.length > 0 && (
                <ar-tab-panel name="css-parts">
                    <h4 id="api-css-parts" class="sr-only">CSS Parts</h4>
                    <p class="hint">
                        Utilisez <code>::part(name)</code> pour styler ces éléments depuis l'extérieur.
                        {hasTransverseParts && (
                            <>
                                <br />Certaines parts indiquent un rôle transverse, partagé avec
                                d'autres composants — voir <a href="/theming/personnalisation-avancee#semantic-parts">Personnalisation avancée</a>.
                            </>
                        )}
                        {hasStateParts && (
                            <>
                                <br />Certaines parts portent un modificateur d'état (<code>--</code>) — voir <a href="/theming/personnalisation-avancee#state-parts">Personnalisation avancée</a>.
                            </>
                        )}
                    </p>
                    <div class="api-list">
                        {component.cssParts.map((part) => (
                            <div class="api-row">
                                <span class="api-name">{part.name}</span>
                                <p class="api-desc">{part.description ?? ''}</p>
                            </div>
                        ))}
                    </div>
                </ar-tab-panel>
            )}

            {(ownProps.length > 0 || panelProps.length > 0 || relatedTokens.length > 0) && (
                <ar-tab-panel name="css-props">
                    <h4 id="api-css-props" class="sr-only">CSS Custom Properties</h4>
                    {panelProps.length > 0 && (
                        <>
                            <p>
                                Ce composant utilise un panel flottant, partagé avec d'autres composants, qui expose des custom properties.<br />
                                Les thèmes peuvent redéfinir ces tokens globalement via <code>:root</code>, ou par composant comme dans cet exemple :
                            </p>
                            <div class="token-example">
                                <pre><code class="language-css">{`${component.tagName} {\n    --ar-panel-radius: 1rem;\n}`}</code></pre>
                            </div>
                            <div class="api-list panel-tokens-list">
                                {panelProps.map((prop) => (
                                    <div class="api-row">
                                        <span class="api-name">{prop.name}</span>
                                        <p class="api-desc">{prop.description ?? ''}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    {(panelProps.length > 0 && ownProps.length > 0) && (
                        <p class="own-props-intro">Il expose également des custom properties propres, personnalisables directement via <code>:root</code>.</p>
                    )}
                    {ownProps.length > 0 && (
                        <div class="api-list">
                            {ownProps.map((prop) => (
                                <div class="api-row">
                                    <span class="api-name">{prop.name}</span>
                                    <p class="api-desc">{prop.description ?? ''}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {relatedTokens.length > 0 && (
                        <ar-alert class="doc-callout-alert" variant="info" without-notification>
                            <div class="doc-callout-alert-content">
                                {relatedTokens.map((rt) => (
                                    <p>
                                        {rt.description}{' '}<br />
                                        <a href={`/components/${getSlug(rt.component)}#api-css-props`}>Voir les tokens de <code>{rt.component}</code></a>.
                                    </p>
                                ))}
                            </div>
                        </ar-alert>
                    )}
                </ar-tab-panel>
            )}
        </ar-tab-group>
    )}
```

(Le bloc `{/* ── Traduction ── */}` en tête de fichier, lignes 40-56, reste inchangé — hors du `ar-tab-group`, comme aujourd'hui.)

- [ ] **Step 3: Styles — lignes de vie + onglets**

Remplacer les styles à partir de `.hint { margin-bottom: 0.75rem; }` (ligne 302) jusqu'à la fin du fichier par :

```css
@import '../styles/doc-prose.css';

.component-api {
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
    margin-top: 2rem;
}

.hint {
    margin-bottom: 0.75rem;
}

.token-example {
    margin-bottom: 1rem;
}

.own-props-intro {
    margin-top: 1.875rem;
}

.token-example pre {
    margin: 0;
    padding: 1rem 1.25rem;
    overflow-x: auto;
    border-radius: 0.5rem;
    font-family: 'Fira Code', 'Cascadia Code', monospace;
    font-size: 0.8rem;
    line-height: 1.6;
    background: var(--doc-code-block-bg);
}

.token-example pre code {
    font-family: inherit;
    font-size: inherit;
    padding: 0;
    background: transparent;
    color: #cdd6f4;
}

/* ── Onglets ──────────────────────────────────────────── */

.api-tabs {
    display: block;
}

.api-tab-count {
    font-family: 'Fira Code', 'Cascadia Code', monospace;
    font-size: 0.72rem;
    opacity: 0.7;
}

/* ── API en « lignes de vie » — remplace les tableaux : plus de
       scroll horizontal en mobile. ─────────────────────────────── */

.api-list {
    display: flex;
    flex-direction: column;
}

.panel-tokens-list {
    margin-bottom: 1.875rem;
}

.api-row {
    display: grid;
    grid-template-columns: 15.5rem minmax(0, 1fr);
    gap: 0 1.75rem;
    padding: 0.95rem 0 0.95rem 1.15rem;
    position: relative;
    border-top: 1px solid var(--doc-border);
}

.api-row:first-child {
    border-top: 0;
}

/* Le fil relie toutes les entrées de la catégorie. */
.api-row::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 1px;
    background: var(--doc-rail);
}

.api-row:first-child::before {
    top: 0.95rem;
}
.api-row:last-child::before {
    bottom: 0.95rem;
}

.api-row::after {
    content: '';
    position: absolute;
    left: -3px;
    top: 1.35rem;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--doc-bg, var(--doc-paper));
    border: 1px solid var(--doc-rail);
}

.api-row:hover::after {
    background: var(--doc-bead);
    border-color: var(--doc-bead);
}

.api-name {
    font-family: 'Fira Code', 'Cascadia Code', monospace;
    font-size: 0.86rem;
    font-weight: 500;
    color: var(--doc-text);
    word-break: break-word;
}

.api-sig {
    display: block;
    font-family: 'Fira Code', 'Cascadia Code', monospace;
    font-size: 0.75rem;
    color: var(--doc-accent);
    margin-top: 0.2rem;
    line-height: 1.5;
    background: transparent;
    padding: 0;
}

.api-default {
    display: block;
    font-family: 'Fira Code', 'Cascadia Code', monospace;
    font-size: 0.72rem;
    color: var(--doc-text-muted);
    margin-top: 0.15rem;
    background: transparent;
    padding: 0;
}

.api-desc {
    font-size: 0.9rem;
    color: var(--doc-text-muted);
    margin: 0;
}

.api-desc code {
    font-family: 'Fira Code', 'Cascadia Code', monospace;
    font-size: 0.84em;
    background: var(--doc-surface);
    padding: 0.05rem 0.3rem;
    border-radius: var(--doc-radius-sm);
    color: var(--doc-text);
}

.flag {
    display: inline-block;
    font-size: 0.66rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 0.05rem 0.4rem;
    border-radius: 999px;
    border: 1px solid var(--doc-accent);
    color: var(--doc-accent);
    margin-left: 0.4rem;
    vertical-align: 1px;
}

@media (max-width: 900px) {
    .api-row {
        grid-template-columns: minmax(0, 1fr);
        gap: 0.4rem;
    }
}
```

- [ ] **Step 4: Retirer l'import `doc-table.css` (plus consommé ici)**

`doc-table.css` reste utilisé par `personnalisation-avancee.astro` (autre fichier, non touché) — seul l'import dans `ComponentApi.astro` disparaît (déjà fait par la réécriture complète du bloc `<style>` à l'étape précédente, qui ne réimporte pas `doc-table.css`).

- [ ] **Step 5: Vérifier visuellement + accessibilité**

Ouvrir une page composant avec plusieurs catégories (ex. `ar-dialog`) : onglets « Attributs / Slots / Événements / ... » avec compteur, changement de panneau au clic et au clavier (flèches, `ar-tab-group` gère déjà ça), lignes reliées par le rail avec perle au survol. Redimensionner sous 900px : les lignes passent en une colonne, plus de scroll horizontal.

- [ ] **Step 6: `npm run test` + `npm run test:a11y` + build**

```bash
cd apps/docs && npm run test && npm run build && npm run test:a11y
```

Expected: PASS partout (le `sr-only` sur les `h4` id conserve les ancres pour les lecteurs d'écran et pour Task 10, sans dupliquer visuellement le label déjà porté par l'onglet).

- [ ] **Step 7: Commit**

```bash
git add apps/docs/src/components/ComponentApi.astro
git commit -m "$(cat <<'EOF'
feat(docs): API en lignes de vie regroupées par ar-tab-group

Remplace les tableaux d'attributs/événements/méthodes/parts/props/slots
par des listes de définition reliées par le rail, organisées en onglets
via le composant ar-tab-group déjà publié — plus de scroll horizontal
en mobile, pas de JS de tabs à écrire.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018PizSKiQEjKpMuoa2ewcJN
EOF
)"
```

---

## Task 10: TOC → active l'onglet API correspondant au clic

**Files:**

- Modify: `apps/docs/src/components/TableOfContents.astro` (script, après le bloc `IntersectionObserver` ajouté en Task 5)

**Interfaces:**

- Consumes: `<ar-tab-panel name="...">` contenant un descendant avec l'`id` ciblé par le lien TOC (Task 9) ; propriété `active` de `<ar-tab-group>` (`packages/core`).

- [ ] **Step 1: Ajouter le gestionnaire de clic**

Dans le `<script>` de `TableOfContents.astro`, après le bloc existant `// Fermer le details mobile après un clic sur un lien` (fin de fichier) :

```js
    // Si le lien TOC cible une catégorie d'API repliée dans un onglet
    // (ar-tab-group), active l'onglet correspondant avant que le
    // navigateur ne scrolle vers l'ancre — sinon la cible reste masquée
    // (panneau inactif = hidden).
    document.querySelectorAll<HTMLAnchorElement>('.toc-link, .toc-link-m').forEach((link) => {
        link.addEventListener('click', () => {
            const id = link.getAttribute('href')?.slice(1);
            const target = id ? document.getElementById(id) : null;
            const panel = target?.closest('ar-tab-panel');
            const group = panel?.closest('ar-tab-group') as (HTMLElement & { active?: string }) | null;
            const panelName = panel?.getAttribute('name');
            if (group && panelName) {
                group.active = panelName;
            }
        });
    });
```

- [ ] **Step 2: Vérifier manuellement**

Sur une page composant, cliquer un lien TOC pointant vers une catégorie d'API qui n'est PAS l'onglet actif par défaut (ex. « Slots » si « Attributs » est actif) : l'onglet doit basculer ET la page doit scroller jusqu'au contenu de cette catégorie, désormais visible.

- [ ] **Step 3: `npm run test`**

Run: `cd apps/docs && npm run test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/components/TableOfContents.astro
git commit -m "$(cat <<'EOF'
feat(docs): un clic TOC vers une catégorie d'API active son onglet

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018PizSKiQEjKpMuoa2ewcJN
EOF
)"
```

---

## Task 11: Vérification finale

**Files:** aucun fichier modifié (sauf correctifs éventuels remontés par la vérification).

- [ ] **Step 1: Build complet + suite de tests**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run build
npm run test
```

Expected: build et tests passent sans erreur, toutes routes (home, contenu, composants, sous-composants) générées.

- [ ] **Step 2: Suite d'accessibilité**

```bash
cd apps/docs && npm run test:a11y
```

Expected: PASS — en particulier, vérifier que le nouveau rail/perle (éléments purement décoratifs) n'introduit aucune violation axe-core (contenu généré doit être `aria-hidden` ou non focusable — les `::before`/`::after` utilisés dans ce plan le sont nativement, aucune vérification manuelle supplémentaire nécessaire au-delà de la suite existante).

- [ ] **Step 3: Revue visuelle dans le navigateur (clair + sombre + mobile)**

```bash
cd apps/docs && npm run dev
```

Ouvrir dans le navigateur et comparer au mockup de référence (URL conservée dans l'historique de session) :

- Une page composant simple (`ar-dialog`) et une avec sous-composant (`ar-dropdown-item`), en clair puis en sombre (bouton thème du header).
- La nav en drawer (<820px) et la TOC repliée dans le flux (<1180px), indépendamment l'une de l'autre.
- Le bouton copier au survol/focus sur un bloc de code.
- Les onglets d'API et la navigation TOC → onglet.

- [ ] **Step 4: Contrôle de contraste WCAG AA sur les nouveaux tokens de statut**

Vérifier `--doc-alpha` et `--doc-stable` sur `--doc-bg` en clair et en sombre (outil DevTools ou contraste manuel) — les valeurs sont reprises telles quelles du mockup déjà vérifié par Opus pendant le brainstorming (cf. spec), mais une vérification finale sur le rendu réel (police/taille du badge) est nécessaire avant de clore.

- [ ] **Step 5: Corriger tout écart trouvé, committer les correctifs**

Si des ajustements sont nécessaires (géométrie du rail imbriqué, contraste, etc.), les appliquer directement dans les fichiers concernés et committer :

```bash
git add -A
git commit -m "$(cat <<'EOF'
fix(docs): ajustements de revue visuelle finale du fil

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018PizSKiQEjKpMuoa2ewcJN
EOF
)"
```

(Ne committer que si des correctifs ont réellement été apportés — sinon passer directement à la tâche suivante.)

---

## Task 12: Ouvrir la Pull Request

**Files:** aucun fichier modifié.

- [ ] **Step 1: Pousser la branche**

```bash
cd /Users/jon/Code/Active_projects/ariane
git push -u origin feat/doc-layout-fil-110
```

- [ ] **Step 2: Créer la PR vers `dev`**

```bash
gh pr create --base dev --title "docs: relook visuel du layout principal — « Le Fil » (#110)" --body "$(cat <<'EOF'
## Résumé

- Système visuel « le fil » (rail + perle) étendu du chrome (nav, TOC, listes d'API) — jusqu'ici réservé à la home.
- Header simplifié : nouveau logo, pastille de version, emplacement de recherche réservé (non implémenté).
- Nav latérale : rail segmenté par grande section, un niveau d'imbrication composant → sous-composant avec rail continu.
- Points de rupture découplés : drawer nav à 820px, sommaire replié dans le flux à 1180px (colonne TOC élargie à 296px ≥1440px).
- Fil d'Ariane + badge de statut sur les pages composant.
- Titres de section (h2) avec amorce ambre, h3 sans, puces et encarts alignés sur le vocabulaire du fil.
- Bouton « Copier » repositionné, révélé au survol/focus.
- API (attributs/slots/événements/méthodes/parts/props) en lignes de vie reliées par le rail, regroupées par `ar-tab-group` — fin des tableaux qui débordaient en mobile.

Spec : `docs/superpowers/specs/2026-09-10-doc-layout-redesign-110-design.md`

## Test plan

- [ ] `npm run build` et `npm run test` passent
- [ ] `npm run test:a11y` passe
- [ ] Revue visuelle clair/sombre sur une page composant simple et une page sous-composant
- [ ] Nav en drawer <820px, TOC repliée <1180px, vérifiés indépendamment
- [ ] Navigation TOC → onglet d'API fonctionnelle au clic

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_018PizSKiQEjKpMuoa2ewcJN
EOF
)"
```

- [ ] **Step 3: Rapporter l'URL de la PR à l'utilisateur**

Ne pas merger — cf. règle permanente (aucun merge sur `dev` sans confirmation explicite).
