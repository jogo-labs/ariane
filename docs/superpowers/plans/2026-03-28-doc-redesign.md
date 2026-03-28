# Doc Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyler le site de documentation Ariane — Inter, palette crème/violet, layout affiné, landing page avec hero centré + selling points — sans toucher à l'architecture de navigation.

**Architecture:** Tout le style vit dans les fichiers Astro (`Layout.astro`, `SiteNav.astro`, `TableOfContents.astro`, `Playground.astro`, `index.astro`). Les tokens `--doc-*` sont déclarés dans le `<style>` de `Layout.astro` et propagés à tous les composants. La landing page (`index.astro`) est réécrite entièrement avec `showNav={false}`.

**Tech Stack:** Astro 4, CSS Custom Properties, Google Fonts (Inter), HTML/CSS only — aucune dépendance JS ajoutée.

---

## Fichiers modifiés

| Fichier                                          | Ce qui change                                                               |
| ------------------------------------------------ | --------------------------------------------------------------------------- |
| `apps/docs/src/layouts/Layout.astro`             | Tokens CSS, Inter font, header (badge version + toggle groupé), largeur nav |
| `apps/docs/src/components/SiteNav.astro`         | Contraste section labels, couleur items, état actif violet                  |
| `apps/docs/src/components/TableOfContents.astro` | État actif violet + border-left, suppression bordure conteneur              |
| `apps/docs/src/components/Playground.astro`      | Playground card : bordure violette + ombre + label                          |
| `apps/docs/src/pages/index.astro`                | Réécriture complète : hero centré + selling points + CTA bas + footer       |

---

## Task 1 — Branche de travail

**Files:** aucun

- [ ] **Step 1 : Créer la branche depuis `dev`**

```bash
cd /Users/jon/Code/Active_projects/ariane
git checkout dev
git checkout -b feat/doc-redesign
```

Expected: `Switched to a new branch 'feat/doc-redesign'`

---

## Task 2 — Tokens CSS + Police Inter

**Files:**

- Modify: `apps/docs/src/layouts/Layout.astro` (bloc `<style>`, `:root` et `[data-theme="dark"]`, `html, body`)

### Contexte

Le bloc `:root` dans `Layout.astro` définit actuellement les tokens `--doc-*`. Il faut :

1. Ajouter Inter via Google Fonts dans le `<head>`
2. Remplacer les valeurs figées par la nouvelle palette crème/violet
3. Ajouter les tokens manquants : `--doc-accent`, `--doc-accent-bg`, `--doc-accent-border`, `--doc-text-subtle`, `--doc-code-bg`
4. Mettre à jour `[data-theme="dark"]` avec la nouvelle palette dark

- [ ] **Step 1 : Ajouter Inter dans le `<head>`**

Dans `Layout.astro`, après `<meta name="description" ...>` et avant le script inline anti-flash, ajouter :

```html
<!-- Inter — haute probabilité de cache navigateur -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
    rel="stylesheet"
/>
```

- [ ] **Step 2 : Remplacer le bloc `:root` dans `<style>`**

Remplacer l'intégralité du bloc `:root { ... }` (lignes 76–92) par :

```css
:root {
    /* Palette light — crème/violet */
    --doc-bg: #fafaf8;
    --doc-nav-bg: #fafaf8;
    --doc-text: #1a1a1a;
    --doc-text-muted: #6b7280;
    --doc-text-subtle: #4b5563;
    --doc-border: #e8e6e0;
    --doc-nav-border: #e8e6e0;
    --doc-accent: #7c3aed;
    --doc-accent-bg: #f3efff;
    --doc-accent-border: #e0d0ff;
    --doc-code-bg: #f3f4f6;
    --doc-code-block-bg: #161b22;
    --doc-header-bg: rgba(250, 250, 248, 0.92);
    --doc-header-h: 3.25rem;
    --doc-alpha-banner-h: 2rem;
    --doc-swatch-outline: 1px solid rgba(0, 0, 0, 0.25);
}
```

> **Note :** `--doc-bg`, `--doc-text`, `--doc-text-muted`, `--doc-border` ne sont plus câblés sur `--ar-color-*`. C'est intentionnel — la palette doc est désormais autonome.

- [ ] **Step 3 : Remplacer le bloc `[data-theme="dark"]`**

Remplacer le bloc existant (lignes 94–99) par :

```css
[data-theme='dark'] {
    --doc-bg: #161b22;
    --doc-nav-bg: #161b22;
    --doc-text: #e6edf3;
    --doc-text-muted: #8b949e;
    --doc-text-subtle: #8b949e;
    --doc-border: #21262d;
    --doc-nav-border: #21262d;
    --doc-accent: #7c3aed;
    --doc-accent-bg: #21262d;
    --doc-accent-border: #30215a;
    --doc-code-bg: #1e1e2e;
    --doc-code-block-bg: #161b22;
    --doc-swatch-outline: 1px solid rgba(255, 255, 255, 0.25);
}
```

- [ ] **Step 4 : Passer `html, body` à Inter**

Dans `Layout.astro`, ligne 111, remplacer :

```css
font-family:
    system-ui,
    -apple-system,
    sans-serif;
```

par :

```css
font-family:
    'Inter',
    system-ui,
    -apple-system,
    sans-serif;
```

- [ ] **Step 5 : Mettre à jour `--doc-header-bg` dans `.site-header`**

Le header utilise `var(--doc-header-bg)`. La valeur est maintenant dans `:root` (cf. step 2). Vérifier que `.site-header` utilise bien `background: var(--doc-header-bg)` — c'est déjà le cas (ligne 148). Rien à changer.

Ajouter en plus dans `.site-header` :

```css
backdrop-filter: blur(8px);
```

- [ ] **Step 6 : Vérifier visuellement**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run dev
```

Ouvrir `http://localhost:4321`. Le fond doit être crème (#fafaf8), la police Inter, le header légèrement givré au scroll.

- [ ] **Step 7 : Commit**

```bash
git add apps/docs/src/layouts/Layout.astro
git commit -m "style(docs): Inter + nouvelle palette --doc-* crème/violet"
```

---

## Task 3 — Dimensions layout (nav 270px, TOC 180px)

**Files:**

- Modify: `apps/docs/src/layouts/Layout.astro` (`.layout-body.with-nav`, `.toc-column`, `.layout-body.with-toc .main-inner`)

- [ ] **Step 1 : Agrandir la nav de 260 → 270px**

Dans `Layout.astro`, remplacer :

```css
.layout-body.with-nav {
    display: grid;
    grid-template-columns: 260px 1fr;
}
```

par :

```css
.layout-body.with-nav {
    display: grid;
    grid-template-columns: 270px 1fr;
}
```

- [ ] **Step 2 : Réduire la TOC de 220 → 180px**

Remplacer :

```css
.toc-column {
    position: fixed;
    top: var(--doc-header-h);
    right: 0;
    width: 220px;
    height: calc(100vh - var(--doc-header-h));
    padding: 3rem 1rem 3rem 0;
    overflow-y: auto;
}
```

par :

```css
.toc-column {
    position: fixed;
    top: var(--doc-header-h);
    right: 0;
    width: 180px;
    height: calc(100vh - var(--doc-header-h));
    padding: 3rem 1rem 3rem 0;
    overflow-y: auto;
}
```

- [ ] **Step 3 : Ajuster le padding-right du contenu**

Remplacer :

```css
.layout-body.with-toc .main-inner {
    padding-right: 260px;
}
```

par :

```css
.layout-body.with-toc .main-inner {
    padding-right: 200px;
}
```

- [ ] **Step 4 : Commit**

```bash
git add apps/docs/src/layouts/Layout.astro
git commit -m "style(docs): nav 270px, TOC 180px"
```

---

## Task 4 — Header : badge version + toggle thème groupé

**Files:**

- Modify: `apps/docs/src/layouts/Layout.astro` (HTML du header + CSS)

### Contexte

Le header actuel a : `[burger] [logo] | [<select> thème] [icône GitHub]`

La spec veut : `[logo] [badge version] | [icône GitHub] [toggle ☀/⬤/☾ groupé]`

Le `<select>` est remplacé par 3 boutons groupés dans un `<div role="group">`.

- [ ] **Step 1 : Ajouter l'import de la version dans le frontmatter**

Le frontmatter de `Layout.astro` importe déjà `rootPkg`. Ajouter l'import de la version du core :

```astro
---
import SiteNav from '../components/SiteNav.astro';
import rootPkg from '../../../../package.json';
import { version } from '../../../../packages/core/package.json';
// ... reste inchangé
---
```

- [ ] **Step 2 : Remplacer le HTML du `.header-left`**

Remplacer le bloc `.header-left` (lignes 353–367) par :

```html
<div class="header-left">
    <!-- Burger : visible uniquement en mobile via CSS -->
    <button
        class="icon-btn"
        id="burger-btn"
        aria-label="Ouvrir la navigation"
        aria-expanded="false"
        aria-controls="site-nav-column"
    >
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
        >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
    </button>
    <h1>
        <a href="/" class="header-brand">
            {rootPkg.config.displayName}<span class="brand-dot">●</span>
        </a>
    </h1>
    <span class="header-version">v{version}</span>
</div>
```

- [ ] **Step 3 : Remplacer le HTML des `.header-actions`**

Remplacer le bloc `.header-actions` (lignes 368–386) par :

```html
<div class="header-actions">
    <!-- Lien GitHub -->
    <a
        href="https://github.com/jogo-labs/ariane"
        target="_blank"
        rel="noopener noreferrer"
        class="icon-btn header-github"
        aria-label="Code source sur GitHub"
    >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path
                d="M12 .3a12 12 0 0 0-3.79 23.4c.6.1.82-.26.82-.57v-2.2c-3.34.72-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.75-1.33-1.75-1.08-.74.08-.73.08-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.8 1.3 3.48 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.69.82.57A12 12 0 0 0 12 .3"
            />
        </svg>
    </a>
    <!-- Toggle thème groupé -->
    <div class="theme-toggle" role="group" aria-label="Thème d'affichage">
        <button class="theme-btn" data-theme-mode="light" aria-label="Thème clair">☀</button>
        <button class="theme-btn" data-theme-mode="system" aria-label="Thème automatique">⬤</button>
        <button class="theme-btn" data-theme-mode="dark" aria-label="Thème sombre">☾</button>
    </div>
</div>
```

- [ ] **Step 4 : Ajouter les styles CSS du badge et du toggle groupé**

Dans le bloc `<style>` de `Layout.astro`, après les styles de `.icon-btn:hover`, ajouter :

```css
.brand-dot {
    display: inline-block;
    font-size: 0.55rem;
    color: var(--doc-accent, #7c3aed);
    margin-left: 3px;
    vertical-align: middle;
    position: relative;
    top: -2px;
}

.header-version {
    font-size: 0.7rem;
    font-weight: 500;
    color: var(--doc-text-muted, #6b7280);
    background: var(--doc-accent-bg, #f3efff);
    border: 1px solid var(--doc-accent-border, #e0d0ff);
    padding: 1px 8px;
    border-radius: 20px;
}

.theme-toggle {
    display: flex;
    gap: 1px;
    border: 1px solid var(--doc-border, #e8e6e0);
    border-radius: 7px;
    background: var(--doc-nav-bg, #fafaf8);
    padding: 2px;
}

.theme-btn {
    width: 26px;
    height: 26px;
    border-radius: 5px;
    border: none;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.72rem;
    color: var(--doc-text-muted, #6b7280);
    transition:
        background 0.12s,
        color 0.12s;
}

.theme-btn.active {
    background: #fff;
    color: var(--doc-accent, #7c3aed);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

[data-theme='dark'] .theme-btn.active {
    background: #21262d;
}
```

- [ ] **Step 5 : Supprimer les styles de `#theme-select` (devenu obsolète)**

Dans le bloc `<style>`, supprimer les blocs :

```css
#theme-select { ... }
#theme-select:hover { ... }
```

- [ ] **Step 6 : Remplacer le JS de gestion du thème**

Dans le `<script>` de `Layout.astro`, remplacer la section `// ── Thème ──` par :

```typescript
// ── Thème (Light / Auto / Dark) ────────────────────────────────────────

function resolveTheme(mode: string): 'light' | 'dark' {
    if (mode === 'dark') return 'dark';
    if (mode === 'light') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyMode(mode: string) {
    const theme = resolveTheme(mode);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.dataset.themeMode = mode;

    // Mettre à jour le bouton actif dans le toggle groupé
    document.querySelectorAll<HTMLButtonElement>('.theme-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.themeMode === mode);
    });
}

const savedMode = localStorage.getItem('ariane-theme') || 'system';
applyMode(savedMode);

document.querySelectorAll<HTMLButtonElement>('.theme-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
        const mode = btn.dataset.themeMode || 'system';
        localStorage.setItem('ariane-theme', mode);
        applyMode(mode);
    });
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if ((localStorage.getItem('ariane-theme') || 'system') === 'system') {
        applyMode('system');
    }
});
```

- [ ] **Step 7 : Vérifier visuellement**

Recharger `http://localhost:4321`. Le header doit afficher : `Ariane● v0.x | [GitHub] [☀ ⬤ ☾]`. Cliquer sur chaque bouton du toggle doit changer le thème et activer le bouton correspondant.

- [ ] **Step 8 : Commit**

```bash
git add apps/docs/src/layouts/Layout.astro
git commit -m "style(docs): header — badge version + toggle thème groupé"
```

---

## Task 5 — SiteNav : contraste + état actif violet

**Files:**

- Modify: `apps/docs/src/components/SiteNav.astro` (bloc `<style>`)

### Contexte

Problèmes actuels :

- Labels de section (`h2`) : `color: var(--doc-text-muted, #8b8fa7)` — `#8b8fa7` ne passe pas WCAG AA sur #fafaf8
- Items nav : `color: var(--doc-text-muted, #4a4e5a)` — fallback hardcodé différent du token
- État actif : bleu `--ar-color-interactive` → doit devenir violet `--doc-accent`
- Hover : `color-mix(...)` → fond `#f0ede6`, texte `#111`

- [ ] **Step 1 : Corriger le label de section**

Dans `SiteNav.astro`, remplacer :

```css
.nav-section h2 {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--doc-text-muted, #8b8fa7);
    padding: 0 0.75rem;
    margin: 0 0 0.4rem;
}
```

par :

```css
.nav-section h2 {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #6b7280;
    padding: 0 0.75rem;
    margin: 0 0 0.4rem;
}
```

- [ ] **Step 2 : Corriger la couleur des items nav + hover + actif**

Remplacer :

```css
.nav-list a {
    display: block;
    padding: 0.4rem 0.75rem;
    color: var(--doc-text-muted, #4a4e5a);
    text-decoration: none;
    border-radius: 0.375rem;
    font-size: 0.85rem;
    font-weight: 450;
    transition:
        background 0.12s,
        color 0.12s;
    border-left: 5px solid transparent;
}

.nav-list a:hover {
    background: color-mix(in srgb, var(--doc-nav-border, #e2e4e9) 60%, transparent);
    color: var(--doc-text, #1a1d26);
}

.nav-list a[aria-current='page'] {
    background: color-mix(in srgb, var(--ar-color-interactive, #2563eb) 10%, transparent);
    color: var(--ar-color-interactive, #2563eb);
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    font-weight: 600;
    border-left-color: var(--ar-color-interactive, #2563eb);
}
```

par :

```css
.nav-list a {
    display: block;
    padding: 0.4rem 0.75rem;
    color: var(--doc-text-subtle, #4b5563);
    text-decoration: none;
    border-radius: 0.375rem;
    font-size: 0.85rem;
    font-weight: 450;
    transition:
        background 0.12s,
        color 0.12s;
    border-left: 5px solid transparent;
}

.nav-list a:hover {
    background: #f0ede6;
    color: #111;
}

[data-theme='dark'] .nav-list a:hover {
    background: var(--doc-accent-bg, #21262d);
    color: var(--doc-text, #e6edf3);
}

.nav-list a[aria-current='page'] {
    background: var(--doc-accent-bg, #f3efff);
    color: var(--doc-accent, #7c3aed);
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    font-weight: 600;
    border-left-color: var(--doc-accent, #7c3aed);
}
```

- [ ] **Step 3 : Corriger les sous-items**

Remplacer :

```css
.nav-children a {
    font-size: 0.8rem;
    padding: 0.3rem 0.6rem;
}
```

par :

```css
.nav-children a {
    font-size: 0.78rem;
    padding: 0.3rem 0.6rem;
    color: var(--doc-text-subtle, #4b5563);
}
```

- [ ] **Step 4 : Vérifier visuellement**

Naviguer sur une page composant. Le lien actif doit être violet (fond `#f3efff`, texte `#7c3aed`, border-left violet). En dark mode, le hover doit rester lisible.

- [ ] **Step 5 : Commit**

```bash
git add apps/docs/src/components/SiteNav.astro
git commit -m "style(docs): nav — contraste WCAG AAA + état actif violet"
```

---

## Task 6 — TOC : état actif violet, sans bordure conteneur

**Files:**

- Modify: `apps/docs/src/components/TableOfContents.astro` (bloc `<style>`)

- [ ] **Step 1 : Corriger la couleur des items inactifs**

Dans `TableOfContents.astro`, remplacer :

```css
.toc-link,
.toc-link-m {
    display: block;
    padding: 0.25rem 0.5rem;
    padding-left: 0.75rem;
    color: var(--doc-text-muted, #6b7280);
    text-decoration: none;
    border-left: 2px solid transparent;
    line-height: 1.4;
    transition:
        color 0.1s,
        background 0.1s,
        border-color 0.1s;
}
```

par :

```css
.toc-link,
.toc-link-m {
    display: block;
    padding: 0.25rem 0.5rem;
    padding-left: 0.75rem;
    color: var(--doc-text-subtle, #4b5563);
    text-decoration: none;
    border-left: 2px solid transparent;
    line-height: 1.4;
    font-size: 0.78rem;
    transition:
        color 0.1s,
        border-color 0.1s;
}
```

- [ ] **Step 2 : Corriger l'état actif (violet, pas de fond ni border-radius)**

Remplacer :

```css
.toc-link.active {
    color: var(--ar-color-interactive, #2563eb);
    font-weight: 600;
    border-color: var(--ar-color-interactive, #2563eb);
}
```

par :

```css
.toc-link.active {
    color: var(--doc-accent, #7c3aed);
    border-color: var(--doc-accent, #7c3aed);
}
```

- [ ] **Step 3 : Corriger le titre "Sur cette page"**

Remplacer :

```css
.toc-title {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--doc-text-muted, #9ca3af);
    margin: 0 0 0.5rem;
}
```

par :

```css
.toc-title {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #6b7280;
    margin: 0 0 0.5rem;
}
```

- [ ] **Step 4 : Supprimer la bordure sur `.toc-desktop` (la TOC flotte)**

Le `.toc-desktop` n'a pas de bordure gauche actuellement — c'est déjà correct. Vérifier qu'il n'y a pas de `border-left` parasite dans `.toc-column` dans `Layout.astro`. Si présent, supprimer.

- [ ] **Step 5 : Sous-items : indentation**

Remplacer :

```css
.toc-item.level-2 {
    padding-left: 0.75rem;
}
```

par :

```css
.toc-item.level-2 {
    padding-left: 1rem;
}
```

- [ ] **Step 6 : Commit**

```bash
git add apps/docs/src/components/TableOfContents.astro
git commit -m "style(docs): TOC — actif violet, contraste AAA, sous-items indentés"
```

---

## Task 7 — Playground : bordure violette + label

**Files:**

- Modify: `apps/docs/src/components/Playground.astro` (HTML + `<style>`)

- [ ] **Step 1 : Ajouter le label "● PLAYGROUND" au-dessus de la carte**

Dans `Playground.astro`, remplacer :

```astro
<section class="playground-section" id="playground" data-playground data-tag-name={tagName}>
    <h4 class="subsection-title">Playground</h4>
    <div class="playground-card">
```

par :

```astro
<section class="playground-section" id="playground" data-playground data-tag-name={tagName}>
    <div class="playground-label" aria-hidden="true"><span class="playground-dot">●</span> PLAYGROUND</div>
    <div class="playground-card">
```

- [ ] **Step 2 : Ajouter les styles du label et de la carte**

Dans le bloc `<style>` de `Playground.astro`, ajouter après `.playground-card { ... }` :

```css
.playground-label {
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--doc-accent, #7c3aed);
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.35rem;
}

.playground-dot {
    font-size: 0.5rem;
}
```

- [ ] **Step 3 : Appliquer bordure violette + ombre à `.playground-card`**

Remplacer :

```css
.playground-card {
    display: flex;
    flex-direction: column;
}
```

par :

```css
.playground-card {
    display: flex;
    flex-direction: column;
    border: 1px solid #d4bbff;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.06);
}
```

- [ ] **Step 4 : Retirer les bordures individuelles de preview/code/controls dans le playground**

La carte a maintenant sa propre bordure. Les éléments enfants du playground (`.preview`, `.playground-code-block`, `.controls-panel`) ont chacun leur `border: 1px solid ...` qui créerait un double-bordure.

Dans les règles du playground spécifiquement, neutraliser les bordures latérales/externes (garder seulement les séparateurs internes) :

```css
.playground-section .preview {
    border: none;
    border-bottom: 1px solid #d4bbff;
    border-radius: 0;
}

.playground-section .playground-code-block {
    border: none;
    border-top: none;
    border-bottom: 1px solid #d4bbff;
    border-radius: 0;
}

.playground-section .controls-panel {
    border: none;
    border-radius: 0;
    border-top: none;
}
```

- [ ] **Step 5 : Corriger les bordures des selects dans les contrôles**

Remplacer dans `.control-row select, .control-row input[...]` :

```css
border: 1px solid var(--doc-border, #d1d5db);
```

par :

```css
border: 1px solid var(--doc-accent-border, #e0d0ff);
```

- [ ] **Step 6 : Vérifier visuellement**

Naviguer sur `/components/button`. Le playground doit afficher le label "● PLAYGROUND" violet, une bordure violette pâle autour de la carte entière, et une légère ombre violette.

- [ ] **Step 7 : Commit**

```bash
git add apps/docs/src/components/Playground.astro
git commit -m "style(docs): playground — bordure violette + label + ombre"
```

---

## Task 8 — Landing page : réécriture complète

**Files:**

- Modify: `apps/docs/src/pages/index.astro` (HTML + `<style>` complets)

### Contexte

La landing actuelle est un layout 2 colonnes (texte + illustration SVG). La spec veut :

- Hero centré, max-width 760px
- Eyebrow pill, titre avec gradient violet sur `<em>`, pitch, badges, 2 CTAs
- Séparateur `<hr>`
- Section "Pourquoi Ariane ?" — grille 3 cartes
- Placeholder différentiation
- CTA bas de page (fond `--doc-accent-bg`)
- Footer simple

La page utilise `showNav={false}` — la landing s'affiche plein écran.

- [ ] **Step 1 : Remplacer l'intégralité de `index.astro`**

```astro
---
import Layout from '../layouts/Layout.astro';
import manifest from '@cem';
import { version } from '../../../../packages/core/package.json';
import { type CemDeclaration, getCustomElements } from '../utils/cem-types.ts';
import { getSlug } from '../utils/tag-name.ts';

const allComponents: CemDeclaration[] = getCustomElements(manifest);
const rootComponents = allComponents.filter((c) => !c['x-parent']);
const componentCount = rootComponents.length;
const firstComponentHref = rootComponents[0]?.tagName
    ? '/components/' + getSlug(rootComponents[0].tagName)
    : '/components/button';
---

<Layout title="Accueil" showNav={false}>
    <!-- Hero -->
    <section class="hero">
        <div class="hero-eyebrow">Web Components accessibles</div>

        <h1 class="hero-title">
            Des composants qui<br>
            <em>fonctionnent vraiment</em>
        </h1>

        <p class="hero-pitch">
            Ariane est une fondation pour construire des interfaces accessibles.
            Des Custom Elements natifs, thémables, compatibles avec tous les frameworks —
            sans imposer un look à ta place.
        </p>

        <div class="hero-badges">
            <span class="badge"><span class="badge-dot"></span>v{version}</span>
            <span class="badge"><span class="badge-dot green"></span>{componentCount} composants</span>
            <span class="badge"><span class="badge-dot gray"></span>Licence MIT</span>
            <span class="badge"><span class="badge-dot gray"></span>Lit 3 · TypeScript</span>
        </div>

        <div class="hero-ctas">
            <a href="/getting-started/quickstart" class="btn-primary">Démarrage rapide →</a>
            <a href={firstComponentHref} class="btn-secondary">Voir les composants</a>
        </div>
    </section>

    <hr class="divider" />

    <!-- Selling points -->
    <section class="selling-section">
        <div class="selling-header">
            <h2>Pourquoi Ariane ?</h2>
            <p>Une bibliothèque qui résout les vrais problèmes d'accessibilité, sans te dicter le reste.</p>
        </div>

        <div class="selling-grid">
            <div class="selling-card">
                <div class="selling-icon">♿</div>
                <h3>Accessible par défaut</h3>
                <p>ARIA, navigation clavier et rôles sémantiques intégrés dans chaque composant. Pas une option — une exigence de base.</p>
            </div>
            <div class="selling-card">
                <div class="selling-icon">⚡</div>
                <h3>Indépendant du framework</h3>
                <p>Custom Elements natifs : ça fonctionne avec React, Vue, Svelte, Angular ou du HTML pur. Une seule librairie, partout.</p>
            </div>
            <div class="selling-card">
                <div class="selling-icon">🏗</div>
                <h3>Fondation pour ton Design System</h3>
                <p>CSS Custom Properties exposés sur chaque composant. Ariane pose les fondations ; toi tu définis l'identité visuelle.</p>
            </div>
        </div>

        <!-- Placeholder différentiation -->
        <div class="placeholder-section">
            <p><strong>Section à venir</strong></p>
            <p>Comparaison avec Web Awesome, Radix UI, Headless UI — ce qu'Ariane fait différemment et pour qui.</p>
        </div>
    </section>

    <!-- CTA bas de page -->
    <div class="cta-bottom">
        <h2>Prêt à commencer ?</h2>
        <p>Parcourez la documentation et le catalogue de composants.</p>
        <div class="cta-bottom-actions">
            <a href="/getting-started/quickstart" class="btn-primary">Démarrage rapide →</a>
            <a href={firstComponentHref} class="btn-secondary">Explorer les composants</a>
        </div>
    </div>

    <!-- Footer -->
    <footer class="landing-footer">
        <p>Ariane — Licence MIT</p>
        <p>
            Construit avec
            <a href="https://lit.dev" target="_blank" rel="noopener noreferrer">Lit 3</a>
            ·
            <a href="https://github.com/jogo-labs/ariane" target="_blank" rel="noopener noreferrer">GitHub</a>
        </p>
    </footer>
</Layout>

<style>
    /* ── Hero ─────────────────────────────────────────────── */

    .hero {
        max-width:   760px;
        margin:      0 auto;
        padding:     6rem 2rem 5rem;
        text-align:  center;
    }

    .hero-eyebrow {
        display:        inline-flex;
        align-items:    center;
        gap:            0.4rem;
        font-size:      0.75rem;
        font-weight:    600;
        color:          var(--doc-accent, #7c3aed);
        background:     var(--doc-accent-bg, #f3efff);
        border:         1px solid var(--doc-accent-border, #e0d0ff);
        padding:        0.25rem 0.85rem;
        border-radius:  20px;
        margin-bottom:  1.75rem;
        letter-spacing: 0.02em;
    }

    .hero-eyebrow::before {
        content:       '';
        width:         6px;
        height:        6px;
        background:    var(--doc-accent, #7c3aed);
        border-radius: 50%;
        display:       inline-block;
    }

    .hero-title {
        font-size:      3.25rem;
        font-weight:    800;
        letter-spacing: -0.04em;
        line-height:    1.1;
        color:          var(--doc-text, #0f0f0f);
        margin-bottom:  1.25rem;
    }

    .hero-title em {
        font-style:              normal;
        background:              linear-gradient(135deg, #7c3aed, #a855f7);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip:         text;
    }

    .hero-pitch {
        font-size:    1.05rem;
        color:        var(--doc-text-subtle, #4b5563);
        line-height:  1.75;
        max-width:    560px;
        margin:       0 auto 2rem;
    }

    .hero-badges {
        display:         flex;
        justify-content: center;
        gap:             0.5rem;
        flex-wrap:       wrap;
        margin-bottom:   2.25rem;
    }

    .badge {
        display:       inline-flex;
        align-items:   center;
        gap:           0.35rem;
        font-size:     0.72rem;
        font-weight:   500;
        color:         var(--doc-text-muted, #6b7280);
        background:    var(--doc-bg, #fff);
        border:        1px solid var(--doc-border, #e8e6e0);
        padding:       0.25rem 0.75rem;
        border-radius: 20px;
    }

    .badge-dot {
        width:         6px;
        height:        6px;
        border-radius: 50%;
        background:    var(--doc-accent, #7c3aed);
        flex-shrink:   0;
    }

    .badge-dot.green { background: #16a34a; }
    .badge-dot.gray  { background: #9ca3af; }

    .hero-ctas {
        display:         flex;
        justify-content: center;
        gap:             0.75rem;
        flex-wrap:       wrap;
    }

    /* ── Boutons ──────────────────────────────────────────── */

    .btn-primary {
        display:         inline-flex;
        align-items:     center;
        gap:             0.4rem;
        background:      var(--doc-accent, #7c3aed);
        color:           #fff;
        font-family:     inherit;
        font-size:       0.9rem;
        font-weight:     600;
        padding:         0.65rem 1.5rem;
        border-radius:   8px;
        text-decoration: none;
        border:          none;
        cursor:          pointer;
        box-shadow:      0 1px 3px rgba(124,58,237,0.3);
        transition:      background 0.15s;
    }

    .btn-primary:hover { background: #6d28d9; }

    .btn-secondary {
        display:         inline-flex;
        align-items:     center;
        gap:             0.4rem;
        background:      transparent;
        color:           var(--doc-text, #374151);
        font-family:     inherit;
        font-size:       0.9rem;
        font-weight:     600;
        padding:         0.65rem 1.5rem;
        border-radius:   8px;
        text-decoration: none;
        border:          1.5px solid var(--doc-border, #e8e6e0);
        cursor:          pointer;
        transition:      border-color 0.15s, color 0.15s;
    }

    .btn-secondary:hover {
        border-color: var(--doc-accent, #7c3aed);
        color:        var(--doc-accent, #7c3aed);
    }

    /* ── Séparateur ────────────────────────────────────────── */

    .divider {
        border:     none;
        border-top: 1px solid var(--doc-border, #e8e6e0);
        margin:     0;
    }

    /* ── Selling points ─────────────────────────────────── */

    .selling-section {
        max-width: 1100px;
        margin:    0 auto;
        padding:   5rem 2.5rem;
    }

    .selling-header {
        text-align:    center;
        margin-bottom: 3.5rem;
    }

    .selling-header h2 {
        font-size:      1.85rem;
        font-weight:    700;
        letter-spacing: -0.03em;
        color:          var(--doc-text, #0f0f0f);
        margin-bottom:  0.6rem;
    }

    .selling-header p {
        font-size:  0.95rem;
        color:      var(--doc-text-muted, #6b7280);
        max-width:  480px;
        margin:     0 auto;
    }

    .selling-grid {
        display:               grid;
        grid-template-columns: repeat(3, 1fr);
        gap:                   1.5rem;
        margin-bottom:         3rem;
    }

    .selling-card {
        background:  var(--doc-bg, #fff);
        border:      1px solid var(--doc-border, #e8e6e0);
        border-radius: 12px;
        padding:     1.75rem;
        transition:  border-color 0.15s, box-shadow 0.15s;
    }

    .selling-card:hover {
        border-color: #c4b5fd;
        box-shadow:   0 4px 16px rgba(124,58,237,0.06);
    }

    .selling-icon {
        width:           40px;
        height:          40px;
        background:      var(--doc-accent-bg, #f3efff);
        border-radius:   10px;
        display:         flex;
        align-items:     center;
        justify-content: center;
        font-size:       1.2rem;
        margin-bottom:   1rem;
    }

    .selling-card h3 {
        font-size:      0.95rem;
        font-weight:    700;
        color:          var(--doc-text, #111);
        letter-spacing: -0.01em;
        margin-bottom:  0.4rem;
    }

    .selling-card p {
        font-size:   0.82rem;
        color:       var(--doc-text-muted, #6b7280);
        line-height: 1.7;
        margin:      0;
    }

    /* ── Placeholder différentiation ────────────────────── */

    .placeholder-section {
        border:        2px dashed var(--doc-accent-border, #e0d0ff);
        border-radius: 12px;
        padding:       2rem;
        text-align:    center;
        background:    color-mix(in srgb, var(--doc-accent-bg, #f3efff) 30%, transparent);
        margin-bottom: 0;
    }

    .placeholder-section p {
        font-size:   0.82rem;
        color:       var(--doc-text-muted, #9d8fc2);
        margin:      0 0 0.25rem;
    }

    .placeholder-section strong {
        color: var(--doc-accent, #7c3aed);
    }

    /* ── CTA bas de page ────────────────────────────────── */

    .cta-bottom {
        background:  var(--doc-accent-bg, #f3efff);
        border-top:  1px solid var(--doc-accent-border, #e0d0ff);
        border-bottom: 1px solid var(--doc-accent-border, #e0d0ff);
        text-align:  center;
        padding:     4rem 2rem;
    }

    .cta-bottom h2 {
        font-size:      1.6rem;
        font-weight:    700;
        letter-spacing: -0.03em;
        color:          var(--doc-text, #0f0f0f);
        margin-bottom:  0.5rem;
    }

    .cta-bottom p {
        font-size:     0.9rem;
        color:         var(--doc-text-muted, #6b7280);
        margin-bottom: 1.75rem;
    }

    .cta-bottom-actions {
        display:         flex;
        justify-content: center;
        gap:             0.75rem;
        flex-wrap:       wrap;
    }

    /* ── Footer ─────────────────────────────────────────── */

    .landing-footer {
        padding:         2rem 2.5rem;
        border-top:      1px solid var(--doc-border, #e8e6e0);
        display:         flex;
        justify-content: space-between;
        align-items:     center;
        flex-wrap:       wrap;
        gap:             0.5rem;
    }

    .landing-footer p {
        font-size: 0.78rem;
        color:     var(--doc-text-muted, #6b7280);
        margin:    0;
    }

    .landing-footer a {
        color:           var(--doc-accent, #7c3aed);
        text-decoration: none;
    }

    .landing-footer a:hover { text-decoration: underline; }

    /* ── Responsive ─────────────────────────────────────── */

    @media (max-width: 860px) {
        .hero { padding: 4rem 1.5rem 3rem; }
        .hero-title { font-size: 2.25rem; }
        .selling-section { padding: 3rem 1.5rem; }
        .selling-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 480px) {
        .hero-title { font-size: 1.85rem; }
    }
</style>
```

- [ ] **Step 2 : Vérifier visuellement**

Recharger `http://localhost:4321`. La landing doit montrer : hero centré, section selling points, CTA violet, footer. Vérifier les 3 CTAs (démarrage rapide, voir composants, explorer).

- [ ] **Step 3 : Vérifier dark mode**

Activer le dark mode via le toggle. Le hero fond doit passer à `#161b22`, les badges à `#21262d`. Les cartes selling points : `#1c2128`. Le CTA bottom : fond sombre violet.

Les tokens `--doc-accent-bg` et `--doc-accent-border` sont déjà overridés dans `[data-theme="dark"]` (Task 2). Vérifier que ça s'applique bien.

Pour le CTA bottom en dark, `--doc-accent-bg` devient `#21262d` — acceptable. Si le rendu est trop terne, ajouter dans `[data-theme="dark"]` (dans `Layout.astro`) :

```css
[data-theme='dark'] {
    /* ... tokens existants ... */
    --doc-cta-bg: #1a1030;
    --doc-cta-border: #30215a;
}
```

Et dans `index.astro` utiliser `var(--doc-cta-bg, var(--doc-accent-bg))` pour `.cta-bottom`.

- [ ] **Step 4 : Commit**

```bash
git add apps/docs/src/pages/index.astro
git commit -m "feat(docs): landing page — hero centré + selling points + CTA + footer"
```

---

## Task 9 — Build et vérification finale

**Files:** aucun nouveau fichier

- [ ] **Step 1 : Build complet**

```bash
cd /Users/jon/Code/Active_projects/ariane
npm run build
```

Expected: build sans erreur TypeScript ni Astro. S'il y a des erreurs sur les imports (ex. `version` depuis `package.json`), vérifier que l'import est `import { version } from '../../../../packages/core/package.json'` dans `index.astro`.

- [ ] **Step 2 : Checklist visuelle (light mode)**

| Élément             | Attendu                                                             |
| ------------------- | ------------------------------------------------------------------- |
| Header              | logo + `●` violet + badge `v0.x` violet pâle \| GitHub + toggle ☀⬤☾ |
| Nav — label section | `#6b7280`, uppercase, 0.65rem                                       |
| Nav — item inactif  | `#4b5563`                                                           |
| Nav — item actif    | fond `#f3efff`, texte `#7c3aed`, border-left violet                 |
| TOC — inactif       | `#4b5563`                                                           |
| TOC — actif         | texte `#7c3aed` + border-left violet, pas de fond                   |
| Playground          | label `● PLAYGROUND` violet, carte avec bordure `#d4bbff` + ombre   |
| Landing hero        | centré, gradient violet sur `em`, badges, 2 CTA                     |
| Landing selling     | grille 3 cartes avec icônes                                         |
| Landing CTA         | fond `#f3efff`, bordures violettes                                  |

- [ ] **Step 3 : Checklist dark mode**

Activer dark mode. Vérifier :

- Fond `#161b22`, texte `#e6edf3`
- Nav fond `#161b22`, bordure `#21262d`
- Items nav actifs encore lisibles en violet
- Landing : badges sombres, cartes sombres, CTA bottom sombre

- [ ] **Step 4 : Checklist mobile**

Passer la fenêtre < 768px. Vérifier :

- Burger visible, nav en drawer
- TOC devient `<details>` collapsible
- Landing : hero pleine largeur, grille selling en 1 colonne

- [ ] **Step 5 : Ouvrir une PR**

```bash
git push -u origin feat/doc-redesign
gh pr create \
  --title "style(docs): redesign — Inter, palette crème/violet, landing page" \
  --body "Redesign visuel du site de documentation.

## Changements

- Police Inter via Google Fonts
- Nouvelle palette CSS (\`--doc-*\`) : crème/violet, WCAG AA/AAA
- Header : badge version + toggle thème groupé (3 boutons)
- Navigation : contraste corrigé, état actif violet
- TOC : actif violet + border-left, pas de fond
- Playground : bordure violette + ombre + label PLAYGROUND
- Landing page : hero centré + selling points + CTA bas + footer
- Dark mode : tokens dédiés pour tous les éléments de la landing

## Test

- [ ] Light mode : toutes les couleurs correctes
- [ ] Dark mode : aucune couleur hardcodée
- [ ] Mobile : burger + TOC collapsible
- [ ] \`npm run build\` passe sans erreur

🤖 Generated with [Claude Code](https://claude.com/claude-code)" \
  --base dev
```

---

## Self-Review

**Spec coverage :**

| Section spec                                             | Task couvrant                               |
| -------------------------------------------------------- | ------------------------------------------- |
| § 1 Typographie & Palette — Inter                        | Task 2 step 1                               |
| § 1 Tokens light                                         | Task 2 step 2                               |
| § 1 Tokens dark                                          | Task 2 step 3                               |
| § 2 Layout — Nav 270px, TOC 180px                        | Task 3                                      |
| § 2 Header — badge version, GitHub, toggle groupé        | Task 4                                      |
| § 3 Nav — labels contraste, items, hover, actif          | Task 5                                      |
| § 4 TOC — pas de bordure, actif violet, sous-items       | Task 6                                      |
| § 5 Page composant — playground séparé, bordure violette | Task 7                                      |
| § 6 Landing page                                         | Task 8                                      |
| § 7 Accessibilité — ARIA aria-label sur boutons icônes   | Task 4 (les `aria-label` sont dans le HTML) |
| § 8 Mobile — recolor tokens                              | Automatique via tokens `--doc-*`            |
| § 9 Dark mode landing                                    | Task 8 step 3 + tokens Task 2               |

**Points vérifiés :**

- `--doc-text-subtle` est défini en Task 2 et utilisé dans Task 5, 6, 8 ✓
- `--doc-accent`, `--doc-accent-bg`, `--doc-accent-border` définis en Task 2 et utilisés partout ✓
- Le `<select>` theme est supprimé et remplacé par `.theme-toggle` / `.theme-btn` ✓
- Le JS du thème est mis à jour pour utiliser `data-theme-mode` au lieu du `<select>` ✓
- La landing `showNav={false}` — pas de sidebar ✓
- Grille selling : 3 colonnes desktop, 1 colonne < 860px ✓
