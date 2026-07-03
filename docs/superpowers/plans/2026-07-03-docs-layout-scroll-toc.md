# Docs Layout — Scroll de page & accès clavier au TOC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire scroller la page (pas le `<main>`) sur les pages de doc desktop, garder nav/TOC visibles via `position: sticky`, élargir légèrement la colonne TOC, et rendre le TOC atteignable au clavier via un skip link sans réordonner le DOM.

**Architecture:** Modification unique de `apps/docs/src/layouts/Layout.astro` (markup + CSS globale du layout). Aucun autre composant Astro n'est touché.

**Tech Stack:** Astro 6, CSS natif (pas de préprocesseur).

## Global Constraints

- Ne pas réordonner `main`/`aside` dans le DOM (CSS `order`/grid-column) — anti-pattern WCAG 1.3.2 (Meaningful Sequence).
- Le comportement mobile (`@media (max-width: 768px)`) ne doit pas changer.
- `grid-template-columns` desktop passe de `270px 1fr 180px` à `270px 1fr 220px` (colonne nav inchangée à 270px).
- Prettier (100 caractères, 4 espaces, quotes simples) s'applique via lint-staged au commit — pas d'action manuelle requise au-delà d'écrire du code cohérent.

---

## Spec de référence

`docs/superpowers/specs/2026-07-03-docs-layout-scroll-toc-design.md`

---

## Task 0: Créer la branche de travail

**Files:** aucun

- [ ] **Step 1: Créer et basculer sur la branche**

```bash
cd /Users/jon/Code/Active_projects/ariane && git checkout dev && git pull && git checkout -b chore/docs-layout-scroll-toc
```

Expected: `Switched to a new branch 'chore/docs-layout-scroll-toc'`

---

## Task 1: Skip links (accès clavier au TOC sans réordre du DOM)

**Files:**

- Modify: `apps/docs/src/layouts/Layout.astro`

**Interfaces:**

- Produces: ancre `#main-content` sur `<main>`, ancre `#toc` sur `<aside class="toc-column">`, classe CSS `.skip-link`.

- [ ] **Step 1: Ajouter les ancres `id` sur `main` et `aside`**

Dans `Layout.astro`, section markup (repérer le bloc `<main>` / `<aside class="toc-column">` actuel, vers la fin du fichier) :

```astro
            <main id="main-content">
                <div class="main-inner">
                    <slot />
                </div>
            </main>
            {showToc && (
                <aside class="toc-column" id="toc">
                    <slot name="toc" />
                </aside>
            )}
```

- [ ] **Step 2: Ajouter les deux liens d'évitement tout en haut de `<body>`**

Juste avant `<div class="alpha-banner" ...>` :

```astro
    <body>
        <a href="#main-content" class="skip-link">Aller au contenu principal</a>
        {showToc && <a href="#toc" class="skip-link">Aller au sommaire</a>}

        <div class="alpha-banner" role="banner">
```

- [ ] **Step 3: Ajouter le style `.skip-link` (masqué sauf au focus)**

Dans le bloc `<style>` global, juste avant la section `/* ── Header (toujours visible) ──────────────── */` :

```css
.skip-link {
    position: absolute;
    top: -3rem;
    left: 0.5rem;
    z-index: 1000;
    padding: 0.5rem 1rem;
    background: var(--doc-accent);
    color: #fff;
    border-radius: 0 0 0.4rem 0.4rem;
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 600;
    transition: top 0.15s ease;
}

.skip-link:focus {
    top: 0;
}
```

- [ ] **Step 4: Build de vérification**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=@ariane-ui/docs
```

Expected: build réussi (exit code 0), pas d'erreur Astro.

- [ ] **Step 5: Vérifier la présence du markup dans le HTML généré**

```bash
grep -o 'class="skip-link"[^>]*' /Users/jon/Code/Active_projects/ariane/apps/docs/dist/components/ar-datepicker/index.html
grep -o 'id="main-content"' /Users/jon/Code/Active_projects/ariane/apps/docs/dist/components/ar-datepicker/index.html
grep -o 'id="toc"' /Users/jon/Code/Active_projects/ariane/apps/docs/dist/components/ar-datepicker/index.html
```

Expected: chaque commande retourne au moins une occurrence.

- [ ] **Step 6: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add apps/docs/src/layouts/Layout.astro && git commit -m "feat(docs): ajoute des skip-links vers le contenu et le sommaire"
```

---

## Task 2: Scroll de page (desktop) + sidebars sticky

**Files:**

- Modify: `apps/docs/src/layouts/Layout.astro`

**Interfaces:**

- Consumes: classes `.layout-body`, `.nav-column`, `main`, `.toc-column` définies en Task précédente (markup inchangé par cette task, uniquement CSS).

- [ ] **Step 1: Supprimer la hauteur fixe de `.layout-body`**

Retirer entièrement cette règle :

```css
.layout-body {
    height: calc(100vh - var(--doc-header-h) - var(--doc-alpha-banner-h));
}
```

- [ ] **Step 2: Passer `.nav-column` en sidebar sticky à scroll interne**

Remplacer :

```css
.nav-column {
    height: 100%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
}
```

par :

```css
.nav-column {
    position: sticky;
    top: var(--doc-header-h);
    max-height: calc(100vh - var(--doc-header-h) - var(--doc-alpha-banner-h));
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
}
```

- [ ] **Step 3: Retirer le scroll interne de `main`**

Remplacer :

```css
main {
    padding: 0;
    height: 100%;
    overflow-y: auto;
}
```

par :

```css
main {
    padding: 0;
}
```

- [ ] **Step 4: Passer `.toc-column` en sidebar sticky à scroll interne**

Remplacer :

```css
.toc-column {
    height: 100%;
    overflow-y: auto;
    padding: 3rem 0.5rem 3rem 0;
}
```

par :

```css
.toc-column {
    position: sticky;
    top: var(--doc-header-h);
    max-height: calc(100vh - var(--doc-header-h) - var(--doc-alpha-banner-h));
    overflow-y: auto;
    padding: 3rem 0.5rem 3rem 0;
}
```

- [ ] **Step 5: Build de vérification**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=@ariane-ui/docs
```

Expected: build réussi.

- [ ] **Step 6: Vérification manuelle en dev server**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run dev
```

Ouvrir `http://localhost:4321/components/ar-datepicker` (ou le port affiché) :

- Scroller la page : la scrollbar du navigateur doit bouger (pas une scrollbar interne au `main`).
- Vérifier que la nav de gauche et le TOC de droite restent visibles à l'écran pendant le scroll (sticky).
- Ouvrir le calendrier du datepicker : vérifier que le scroll de la page fonctionne toujours normalement pendant que le popover est ouvert (plus de blocage lié à l'ancien `overflow-y: auto` du `main`).

Arrêter le serveur (`Ctrl+C`) une fois vérifié.

- [ ] **Step 7: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add apps/docs/src/layouts/Layout.astro && git commit -m "fix(docs): scroll de page au lieu du scroll interne au main"
```

---

## Task 3: Élargir la colonne TOC (180px → 220px)

**Files:**

- Modify: `apps/docs/src/layouts/Layout.astro`

- [ ] **Step 1: Modifier `grid-template-columns`**

Remplacer :

```css
.layout-body.with-nav.with-toc {
    grid-template-columns: 270px 1fr 180px;
}
```

par :

```css
.layout-body.with-nav.with-toc {
    grid-template-columns: 270px 1fr 220px;
}
```

- [ ] **Step 2: Build de vérification**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run build --workspace=@ariane-ui/docs
```

Expected: build réussi.

- [ ] **Step 3: Commit**

```bash
cd /Users/jon/Code/Active_projects/ariane && git add apps/docs/src/layouts/Layout.astro && git commit -m "style(docs): élargit la colonne TOC pour améliorer la lisibilité des sous-titres"
```

---

## Task 4: Créer la Pull Request

**Files:** aucun

- [ ] **Step 1: Pousser la branche**

```bash
cd /Users/jon/Code/Active_projects/ariane && git push -u origin chore/docs-layout-scroll-toc
```

- [ ] **Step 2: Créer la PR vers `dev`**

```bash
cd /Users/jon/Code/Active_projects/ariane && gh pr create --base dev --title "chore(docs): scroll de page, sidebars sticky, skip-links TOC" --body "$(cat <<'EOF'
## Résumé

- Le scroll de la page remplace le scroll interne au `main` (desktop) — corrige le blocage de scroll quand un popover est ouvert dans le contenu.
- Nav latérale et TOC restent visibles via `position: sticky` pendant le scroll.
- Colonne TOC élargie de 180px à 220px pour la lisibilité des sous-titres.
- Deux skip-links (`sr-only`, focusables) ajoutés en haut de page : accès direct au contenu principal et au sommaire, sans réordonner le DOM (évite l'anti-pattern WCAG 1.3.2).

## Test plan

- [ ] `npm run build --workspace=@ariane-ui/docs` passe
- [ ] Vérification visuelle sur une page avec TOC et une page sans TOC
- [ ] Scroll de page fonctionnel avec un popover ouvert (ex. calendrier du datepicker)
- [ ] Tab depuis le chargement : skip-links visibles au focus, dans l'ordre attendu

Spec : `docs/superpowers/specs/2026-07-03-docs-layout-scroll-toc-design.md`
EOF
)"
```

Expected: URL de la PR affichée en sortie.
