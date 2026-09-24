# Unification tokens / titres / espacements de la documentation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unifier les tokens `--doc-*` d'`apps/docs` sous l'identité Rivian (avec un vrai mode sombre « Voûte »), formaliser un système de titres/rythme vertical partagé, et réorganiser la navigation — sans toucher au layout visuel principal (sous-chantier 2, séparé).

**Architecture:** Un fichier de tokens unique (`apps/docs/src/styles/doc-tokens.css`, structure primitifs → sémantique, `light-dark()`) remplace les deux blocs `<style>` actuellement dupliqués/divergents de `HomeLayout.astro` et `Layout.astro`. Le rythme vertical (`doc-prose.css`) passe par un pattern owl-selector unique, partagé par les pages de contenu (après retrait de leurs wrappers `.main-section`/`.subsection`) et les pages composant (bloc `.narrative` déplacé depuis `[slug].astro`). Les titres des pages de contenu adoptent `NarrativeHeading`/`NarrativeSubheading` en composants Astro directs (pas de conversion MDX), avec `id` explicite pour préserver les ancres existantes.

**Tech Stack:** Astro 6, CSS natif (`light-dark()`, `color-scheme`, `color-mix()`), TypeScript pour les scripts de layout.

**Spec:** `docs/superpowers/specs/2026-09-09-doc-unification-titres-tokens-110-design.md`

## Global Constraints

- Palette sombre : Voûte (indigo nuit), valeurs et ratios de contraste définis dans la spec section 1 — ne pas improviser d'autres teintes.
- Vocabulaire de tokens rationalisé sur `default.css` pour tout ce qui n'est pas couleur (rayons, easing, typo, font-size, font-weight) — primitifs de couleur gardent un vocabulaire d'objets/matières propre à Ariane (pas les mots Rivian).
- Aucune régression d'ancre : toute page migrée doit conserver ses `id` actuels tels quels.
- Rework du layout visuel principal (colonnes, positionnement) hors scope — ne pas y toucher.
- Chaque commit doit laisser `npm test` (racine) vert avant de passer à la tâche suivante.

---

## Task 1: Créer le fichier de tokens unifié `doc-tokens.css`

**Files:**

- Create: `apps/docs/src/styles/doc-tokens.css`

**Interfaces:**

- Produces: tous les tokens `--doc-*` consommés par les tâches suivantes (liste complète ci-dessous). Toute tâche qui consomme un `--doc-*` doit utiliser exactement un de ces noms.

- [ ] **Step 1: Écrire le fichier de tokens**

```css
/**
 * doc-tokens.css
 *
 * Tokens --doc-* unifiés pour tout apps/docs (home + pages de contenu + pages
 * composant). Structure à 2 niveaux : primitifs (palette brute nommée par
 * objet/matière) → sémantique (light-dark(), un seul token par rôle).
 *
 * Palette sombre "Voûte" (indigo nuit) choisie après brainstorming visuel
 * (3 directions comparées, contraste WCAG vérifié) — cf.
 * docs/superpowers/specs/2026-09-09-doc-unification-titres-tokens-110-design.md
 * section 1. Les primitifs qui échoïaient explicitement le vocabulaire Rivian
 * (stone/forest) sont renommés (slate/grove) ; paper/ink restent inchangés.
 */

:root {
    color-scheme: light dark;

    /* ─── Primitifs clairs ──────────────────────────────────────────── */
    --doc-paper: #ffffff;
    --doc-slate: #f5f5f5;
    --doc-grove: #313a2e;
    --doc-grove-deep: #252826;
    --doc-ink: #141414;
    --doc-ink-muted: #565656;
    --doc-line: #141414;
    --doc-line-soft: rgba(20, 20, 20, 0.16);
    --doc-ember: #ffaa00;
    --doc-ember-hi: #ffbd2e;
    --doc-ember-wash: #fff3d6;
    /* Texte sur les bandes .doc-grove (zones sombres dédiées du thème clair,
       ex. footer home) — distinct du mode sombre du site. */
    --doc-on-dark: #f5f5f5;
    --doc-on-dark-muted: #b9bdba;
    --doc-on-dark-line: rgba(245, 245, 245, 0.18);

    /* ─── Primitifs sombres (Voûte) ─────────────────────────────────── */
    --doc-vault: #191d2e;
    --doc-vault-deep: #10131f;
    --doc-chalk: #e8eaf2;
    --doc-chalk-muted: #a2a7bd;
    /* Traits porteurs (bordure de champ, séparateur actif) : ~37% opacité
       pour rester ≥3:1. Traits décoratifs : ~14%, purement visuel. */
    --doc-thread: rgba(232, 234, 242, 0.37);
    --doc-thread-soft: rgba(232, 234, 242, 0.14);

    /* ─── Tokens sémantiques ────────────────────────────────────────── */
    --doc-bg: light-dark(var(--doc-paper), var(--doc-vault));
    --doc-nav-bg: var(--doc-bg);
    --doc-text: light-dark(var(--doc-ink), var(--doc-chalk));
    --doc-text-muted: light-dark(var(--doc-ink-muted), var(--doc-chalk-muted));
    /* Fusionné avec text-muted : les deux rôles n'étaient distingués que par
       une nuance de gris, pas assez pour justifier un 3e ton de texte. */
    --doc-text-subtle: var(--doc-text-muted);
    --doc-border: light-dark(var(--doc-line-soft), var(--doc-thread-soft));
    --doc-nav-border: var(--doc-border);
    --doc-accent: var(--doc-ember);
    --doc-accent-hover: light-dark(#cc8800, var(--doc-ember-hi));
    --doc-accent-bg: light-dark(
        var(--doc-ember-wash),
        color-mix(in srgb, var(--doc-ember) 16%, var(--doc-vault))
    );
    --doc-accent-border: color-mix(in srgb, var(--doc-ember) 45%, transparent);
    --doc-link-visited: light-dark(
        color-mix(in srgb, var(--doc-ember) 60%, black),
        color-mix(in srgb, var(--doc-ember) 70%, white)
    );
    --doc-code-block-bg: light-dark(var(--doc-grove-deep), var(--doc-vault-deep));
    --doc-nav-bg-hover: light-dark(var(--doc-slate), var(--doc-vault-deep));
    --doc-focus: light-dark(var(--doc-ink), var(--doc-ember));
    --doc-header-bg: light-dark(rgba(255, 255, 255, 0.92), rgba(25, 29, 46, 0.92));
    --doc-header-h: 3.25rem;
    --doc-alpha-banner-h: 2rem;

    /* ─── Rayons (vocabulaire rationalisé sur --ar-border-radius-*) ────── */
    --doc-radius-sm: 4px;
    --doc-radius-md: 12px;
    --doc-radius-lg: 20px;
    --doc-radius-xl: 40px;

    /* ─── Easing / typo ─────────────────────────────────────────────── */
    --doc-ease: cubic-bezier(0.83, 0, 0.17, 1);
    --doc-font-display: 'Instrument Sans', 'Inter', system-ui, sans-serif;
    --doc-font-body: 'Inter', system-ui, -apple-system, sans-serif;

    /* ─── Échelle typographique (vocabulaire rationalisé sur --ar-font-size-*/--ar-font-weight-*) ─── */
    --doc-font-size-xs: 0.75rem;
    --doc-font-size-sm: 0.9rem;
    --doc-font-size-md: 1.05rem;
    --doc-font-size-lg: 1.25rem;
    --doc-font-size-xl: 2rem;
    --doc-font-weight-normal: 400;
    --doc-font-weight-medium: 500;
    /* 4e palier (absent de --ar-font-weight-*) : c'est la graisse réellement
       utilisée par tous les titres existants (section-title, subsection-title,
       narrative h3/h4) — un choix fidèle aux valeurs réelles prime sur le
       calque exact de default.css (qui n'en a pas besoin, aucun composant
       n'utilise 600). */
    --doc-font-weight-semibold: 600;
    --doc-font-weight-bold: 700;

    /* ─── Rythme vertical (rôles sémantiques, pas une échelle abstraite —
       cf. spec section 1, écart assumé à --ar-spacing-*) ────────────── */
    --doc-space-paragraph: 1rem;
    --doc-space-subsection: 1.5rem;
    --doc-space-section: 2.5rem;
}

:root[data-theme='dark'] {
    color-scheme: dark;
}

:root[data-theme='light'] {
    color-scheme: light;
}
```

- [ ] **Step 2: Vérifier que le fichier est syntaxiquement valide**

Run: `npx stylelint apps/docs/src/styles/doc-tokens.css --config .stylelintrc.json 2>/dev/null || npx prettier --check apps/docs/src/styles/doc-tokens.css`
Expected: pas d'erreur de syntaxe CSS (si aucun stylelint configuré dans le repo, `prettier --check` suffit à valider le parsing).

- [ ] **Step 3: Commit**

```bash
git add apps/docs/src/styles/doc-tokens.css
git commit -m "feat(docs): ajoute doc-tokens.css, tokens --doc-* unifiés (palette Voûte)"
```

---

## Task 2: Migrer `HomeLayout.astro` vers `doc-tokens.css`

**Files:**

- Modify: `apps/docs/src/layouts/HomeLayout.astro:72-117` (bloc `<style>` de tokens)
- Modify: `apps/docs/src/pages/index.astro` (renommage des primitifs consommés)

**Interfaces:**

- Consumes: tous les tokens `--doc-*`/`--doc-radius-*`/`--doc-ease`/`--doc-font-*` de Task 1.

- [ ] **Step 1: Remplacer le bloc de tokens local par l'import du fichier unifié**

Dans `apps/docs/src/layouts/HomeLayout.astro`, remplacer entièrement le `<style>` des lignes 72-117 (celui qui déclare `:root { --doc-paper: ...; ... --ease: ...; }`) par :

```astro
        <style>
            @import '../styles/doc-tokens.css';
        </style>
```

Garder le `<style is:global>` (lignes 46-71) et le `<style>` suivant (`html, body { ... }` etc., lignes 119+) inchangés — seul le bloc de déclaration de tokens est remplacé.

Note : `--doc-paper`, `--doc-ink` et `--doc-focus` (consommés directement dans le reste de `HomeLayout.astro` — header, skip-link, alpha-banner) ne changent pas de nom, aucune action nécessaire pour eux.

- [ ] **Step 2: Renommer les primitifs dans `HomeLayout.astro` et `index.astro` (scripté, ordre important)**

Exécuter dans cet ordre exact (les remplacements composés doivent précéder les remplacements simples, sinon `--doc-forest-dark` serait mal transformé en `--doc-grove-dark` au lieu de `--doc-grove-deep`) :

```bash
for f in apps/docs/src/layouts/HomeLayout.astro apps/docs/src/pages/index.astro; do
  sed -i '' \
    -e 's/--doc-forest-dark/--doc-grove-deep/g' \
    -e 's/--doc-forest/--doc-grove/g' \
    -e 's/--doc-stone/--doc-slate/g' \
    -e 's/--doc-accent-wash/--doc-ember-wash/g' \
    -e 's/--doc-accent-hi/--doc-ember-hi/g' \
    -e 's/--doc-accent/--doc-ember/g' \
    -e 's/--r-nano/--doc-radius-sm/g' \
    -e 's/--r-micro/--doc-radius-md/g' \
    -e 's/--r-macro/--doc-radius-lg/g' \
    -e 's/--r-mega/--doc-radius-xl/g' \
    -e 's/--ease:/--doc-ease:/g' \
    -e 's/var(--ease)/var(--doc-ease)/g' \
    -e 's/--font-display/--doc-font-display/g' \
    -e 's/--font-body/--doc-font-body/g' \
    "$f"
done
```

- [ ] **Step 3: Vérifier qu'aucune ancienne référence ne subsiste**

Run: `grep -rn -- "--doc-stone\|--doc-forest\b\|--doc-accent-wash\|--doc-accent-hi\|--r-nano\|--r-micro\|--r-macro\|--r-mega\|var(--ease)\|--font-display\|--font-body" apps/docs/src/layouts/HomeLayout.astro apps/docs/src/pages/index.astro`
Expected: aucune sortie (0 match). Si `--doc-accent` seul (sans suffixe) apparaît encore, c'est un bug du sed — il doit avoir été transformé en `--doc-ember`.

- [ ] **Step 4: Lancer le serveur de dev et vérifier visuellement la home (aucun changement attendu)**

Run: `npm run dev --workspace=apps/docs &` puis `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/`
Expected: `200`. Puis capture Playwright de la home (viewport 1280×900) — comparer visuellement à l'état avant migration (aucune différence attendue, seuls les noms de tokens ont changé, pas les valeurs).

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/layouts/HomeLayout.astro apps/docs/src/pages/index.astro
git commit -m "refactor(docs): migre HomeLayout.astro/index.astro vers doc-tokens.css"
```

---

## Task 3: Migrer `Layout.astro` vers `doc-tokens.css` et simplifier le toggle JS

**Files:**

- Modify: `apps/docs/src/layouts/Layout.astro:115-194` (blocs `<style>` de tokens + dark mode)
- Modify: `apps/docs/src/layouts/Layout.astro:36-45` (script inline anti-flash)
- Modify: `apps/docs/src/layouts/Layout.astro:550-616` (script du toggle thème)

**Interfaces:**

- Consumes: tokens sémantiques de Task 1 (`--doc-bg`, `--doc-nav-bg`, `--doc-text`, `--doc-text-muted`, `--doc-text-subtle`, `--doc-border`, `--doc-nav-border`, `--doc-accent`, `--doc-accent-hover`, `--doc-accent-bg`, `--doc-accent-border`, `--doc-link-visited`, `--doc-code-block-bg`, `--doc-header-bg`, `--doc-header-h`, `--doc-alpha-banner-h`, `--doc-nav-bg-hover`).

- [ ] **Step 1: Remplacer le bloc de tokens dupliqué par l'import unifié**

Remplacer les lignes 137-180 de `Layout.astro` (le bloc `:root { --doc-bg: #fafbfc; ... }` suivi du bloc `[data-theme="dark"] { ... }`) par :

```astro
            @import '../styles/doc-tokens.css';
```

(à l'intérieur du même `<style>` non-global qui commence ligne 115 — ne pas créer de nouveau bloc `<style>`, juste remplacer le contenu). Les tokens `--doc-cta-bg`, `--doc-cta-border`, `--doc-code-bg` ne sont **pas** repris (morts, jamais consommés — vérifié par grep sur tout `apps/docs/src` avant suppression).

- [ ] **Step 2: Vérifier qu'aucun code ne consommait les tokens morts avant de les supprimer définitivement**

Run: `grep -rn "var(--doc-cta-bg\|var(--doc-cta-border\|var(--doc-code-bg" apps/docs/src`
Expected: aucune sortie. Si une sortie apparaît, ne pas supprimer ce token — l'ajouter à `doc-tokens.css` (Task 1) à la place.

- [ ] **Step 3: Simplifier le script inline anti-flash**

Remplacer (lignes 36-45) :

```astro
        <script is:inline>
            (function () {
                var stored = localStorage.getItem('ariane-theme') || 'system';
                var theme = stored === 'system'
                    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                    : stored;
                document.documentElement.setAttribute('data-theme', theme);
                document.documentElement.dataset.themeMode = stored;
            })();
        </script>
```

par :

```astro
        <script is:inline>
            (function () {
                var stored = localStorage.getItem('ariane-theme') || 'system';
                if (stored === 'light' || stored === 'dark') {
                    document.documentElement.setAttribute('data-theme', stored);
                }
                document.documentElement.dataset.themeMode = stored;
            })();
        </script>
```

« Système » ne pose plus d'attribut `data-theme` du tout — `color-scheme: light dark` (dans `doc-tokens.css`) résout nativement via `prefers-color-scheme`.

- [ ] **Step 4: Simplifier `resolveTheme`/`applyMode` et retirer le listener `matchMedia`**

Remplacer (lignes 550-616, script principal) :

```ts
function resolveTheme(mode: string): 'light' | 'dark' {
    if (mode === 'dark') return 'dark';
    if (mode === 'light') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
```

par (fonction supprimée, plus nécessaire) : rien — supprimer entièrement `resolveTheme`.

Remplacer `applyMode` :

```ts
function applyMode(mode: string) {
    const theme = resolveTheme(mode);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.dataset.themeMode = mode;
    setTriggerIcon(mode);
    document.querySelectorAll<HTMLElement>('ar-dropdown-item[data-theme-mode]').forEach((item) => {
        const btn = item.querySelector<HTMLElement>('button');
        if (!btn) return;
        if (item.dataset.themeMode === mode) {
            btn.setAttribute('aria-current', 'true');
        } else {
            btn.removeAttribute('aria-current');
        }
    });
}
```

par :

```ts
function applyMode(mode: string) {
    if (mode === 'light' || mode === 'dark') {
        document.documentElement.setAttribute('data-theme', mode);
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    document.documentElement.dataset.themeMode = mode;
    setTriggerIcon(mode);
    document.querySelectorAll<HTMLElement>('ar-dropdown-item[data-theme-mode]').forEach((item) => {
        const btn = item.querySelector<HTMLElement>('button');
        if (!btn) return;
        if (item.dataset.themeMode === mode) {
            btn.setAttribute('aria-current', 'true');
        } else {
            btn.removeAttribute('aria-current');
        }
    });
}
```

Puis supprimer entièrement le bloc (fin du script, juste avant la section « Nav burger ») :

```ts
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if ((localStorage.getItem('ariane-theme') || 'system') === 'system') {
        applyMode('system');
    }
});
```

`setTriggerIcon`/`THEME_ICONS`/`THEME_LABELS` restent inchangés (clés `'light'|'dark'|'system'`, indépendantes de la résolution `data-theme`).

- [ ] **Step 5: Vérifier manuellement le toggle dans les 3 modes**

Run un test Playwright ad hoc (script jetable, pas commité) :

```js
// vérifie : mode 'dark' pose data-theme="dark", mode 'system' ne pose aucun data-theme
await page.goto('http://localhost:4321/getting-started/quickstart');
await page.click('#theme-trigger');
await page.click('ar-dropdown-item[data-theme-mode="dark"] button');
const themeAttr = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
// themeAttr === 'dark'
await page.click('#theme-trigger');
await page.click('ar-dropdown-item[data-theme-mode="system"] button');
const themeAttrSystem = await page.evaluate(() =>
    document.documentElement.getAttribute('data-theme'),
);
// themeAttrSystem === null
```

Expected: `themeAttr === 'dark'`, `themeAttrSystem === null`.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/src/layouts/Layout.astro
git commit -m "refactor(docs): Layout.astro consomme doc-tokens.css, simplifie le toggle système"
```

---

## Task 4: Rythme vertical dans `doc-prose.css` — tokens + owl-selector, absorption du bloc `.narrative`

**Files:**

- Modify: `apps/docs/src/styles/doc-prose.css`
- Modify: `apps/docs/src/pages/components/[slug].astro:223-300` (retrait du bloc `.narrative`, déplacé)

**Interfaces:**

- Consumes: `--doc-space-section`, `--doc-space-subsection`, `--doc-space-paragraph`, `--doc-font-size-*`, `--doc-font-weight-*` (Task 1).
- Produces: classes `.page-title`/`.section-title`/`.subsection-title` avec règles de rythme owl-selector, réutilisables par les pages de contenu (Task 5) ET par `.narrative` (contenu MDX des pages composant).

- [ ] **Step 1: Remplacer les valeurs littérales de titres/rythme par les tokens, ajouter l'owl-selector**

Dans `apps/docs/src/styles/doc-prose.css`, remplacer :

```css
.page-title {
    color: var(--doc-text);
    font-size: 2rem;
    margin: 0;
}

.page-title + .page-content {
    margin-top: 1.5rem;
}

.main-section,
.subsection {
    display: flex;
    flex-direction: column;
}

.main-section {
    gap: 2rem;

    > div p {
        margin: 0;
    }
}

.subsection {
    gap: 1rem;

    p {
        margin: 0;
    }
}

.section-title {
    font-size: 1.25rem;
    font-weight: 600;
    border-bottom: 2px solid var(--doc-border);
    padding-bottom: 1rem;
    margin: 0 0 2rem;
    color: var(--doc-text);
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.subsection-title {
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--doc-text-subtle);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
```

par :

```css
/* ── Rythme vertical ──────────────────────────────────────────────────
 * Règles : (1) séparation (avant un titre) vs groupement (entre éléments
 * de contenu liés) sont deux natures d'espacement distinctes ; (2) le
 * margin-top d'un titre est toujours strictement supérieur à son
 * margin-bottom (un titre colle à ce qu'il introduit) ; (3) le poids de
 * la coupure suit le niveau (section > sous-section) ; (4) owl-selector :
 * l'espacement ne s'applique qu'entre éléments adjacents, jamais en
 * margin-bottom fixe ; (5) le premier titre après .page-title n'a pas de
 * double espace. */

.page-title {
    color: var(--doc-text);
    font-size: var(--doc-font-size-xl);
    font-weight: var(--doc-font-weight-bold);
    margin: 0;
}

.section-title {
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

.subsection-title {
    font-size: var(--doc-font-size-md);
    font-weight: var(--doc-font-weight-semibold);
    color: var(--doc-text-subtle);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

:where(.page-title) + * {
    margin-top: var(--doc-space-paragraph);
}

:where(.section-title) + * {
    margin-top: var(--doc-space-subsection);
}

:where(.subsection-title) + * {
    margin-top: var(--doc-space-paragraph);
}

:where(.narrative) > :where(.section-title, h3) {
    margin-top: var(--doc-space-section);
}

:where(.narrative) > :where(.section-title, h3):first-child {
    margin-top: 0;
}

:where(.narrative) :where(.subsection-title, h4) {
    margin-top: var(--doc-space-subsection);
}

:where(.narrative) :where(p, ul, ol, pre, table) + :where(p, ul, ol, pre, table) {
    margin-top: var(--doc-space-paragraph);
}
```

Le sélecteur `h3`/`h4` (en plus de `.section-title`/`.subsection-title`) couvre les titres générés par `NarrativeHeading`/`NarrativeSubheading` sur les pages composant — ils reçoivent aussi explicitement les classes `.section-title`/`.subsection-title` (Task 6 pour les pages de contenu ; les pages composant les reçoivent via `[slug].astro`, cf. step 3 de cette tâche), donc le doublon de sélecteur est une redondance défensive, pas un besoin strict — à garder pour la lisibilité (le fichier documente clairement les deux façons dont un titre peut arriver ici).

Hors scope délibéré : `.page-container { row-gap: 4rem; }` (déjà dans `doc-prose.css`, non modifié par cette tâche) reste un littéral non tokenisé. C'est un espacement de layout structurel de haut niveau (entre `.page-header` et le contenu narratif — une seule occurrence par page), pas une règle de rythme entre titres — distinct du périmètre de cette tâche, pas un oubli.

- [ ] **Step 2: Retirer `.page-title + .page-content` (règle morte, aucune classe `.page-content` dans le repo)**

Déjà fait au step 1 (la règle n'apparaît plus dans le remplacement).

- [ ] **Step 3: Déplacer le bloc `.narrative` de `[slug].astro` vers `doc-prose.css`, tokeniser**

Dans `apps/docs/src/pages/components/[slug].astro`, supprimer le bloc (lignes 223-239) :

```css
.narrative :global(h3) {
    font-size: 1.25rem;
    font-weight: 600;
    border-bottom: 2px solid var(--doc-border);
    padding-bottom: 1rem;
    margin: 2rem 0 1rem;
    color: var(--doc-text);
}

.narrative :global(h3:first-child) {
    margin-top: 0;
}

.narrative :global(h4) {
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--doc-text-subtle);
    margin: 1.25rem 0 0.5rem;
}

.narrative :global(p) {
    font-size: 0.9rem;
    line-height: 1.75;
    color: var(--doc-text);
    margin: 0;
}

.narrative :global(.narrative-list) {
    font-size: 0.9rem;
    line-height: 1.75;
    color: var(--doc-text);
    margin: 0;
    padding-left: 1.25rem;
}
```

Dans `apps/docs/src/components/NarrativeHeading.astro`, poser la classe `section-title` sur le `<h3>` rendu :

```astro
<h3 id={slug} class="section-title" {...rest}><slot /></h3>
```

Dans `apps/docs/src/components/NarrativeSubheading.astro`, poser la classe `subsection-title` sur le `<h4>` rendu :

```astro
<h4 id={slug} class="subsection-title" {...rest}><slot /></h4>
```

Dans `apps/docs/src/styles/doc-prose.css`, ajouter (à la suite du bloc du step 1) les règles de contenu narratif restantes (celles qui ne sont pas des titres — `p`/`.narrative-list`/`table`/`th`/`td`/`kbd`), reprises telles quelles depuis `[slug].astro` sauf `font-size` tokenisé :

```css
.narrative p {
    font-size: var(--doc-font-size-sm);
    line-height: 1.75;
    color: var(--doc-text);
    margin: 0;
}

.narrative .narrative-list {
    font-size: var(--doc-font-size-sm);
    line-height: 1.75;
    color: var(--doc-text);
    margin: 0;
    padding-left: 1.25rem;
}
```

(Les règles `table`/`th`/`td`/`kbd` de `[slug].astro:256-300` restent dans `[slug].astro` — spécifiques à ce contexte, pas de rôle de rythme vertical, hors scope de cette tâche.)

- [ ] **Step 4: Lancer les tests a11y (routes découvertes automatiquement, aucune casse attendue par le déplacement de règles CSS)**

Run: `cd apps/docs && npm run test:a11y`
Expected: toutes les pages passent (0 violation nouvelle — le déplacement de CSS ne change pas la structure DOM).

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/styles/doc-prose.css apps/docs/src/pages/components/[slug].astro apps/docs/src/components/NarrativeHeading.astro apps/docs/src/components/NarrativeSubheading.astro
git commit -m "refactor(docs): rythme vertical tokenisé, owl-selector, .narrative mutualisé dans doc-prose.css"
```

---

## Task 5: Migrer les 4 pages `getting-started/*.astro` — retrait des wrappers, titres en composants

**Files:**

- Modify: `apps/docs/src/pages/getting-started/quickstart.astro`
- Modify: `apps/docs/src/pages/getting-started/utilisation.astro`
- Modify: `apps/docs/src/pages/getting-started/shadow-dom.astro`
- Modify: `apps/docs/src/pages/getting-started/i18n.astro`

**Interfaces:**

- Consumes: `NarrativeHeading`/`NarrativeSubheading` (`apps/docs/src/components/`, Task 4 — acceptent `id` en prop, posent `.section-title`/`.subsection-title`).

Chaque page suit le même schéma de transformation : import de `NarrativeHeading`/`NarrativeSubheading`, retrait des wrappers `<section class="main-section">`/`<section class="subsection">` (remplacés par une simple succession d'éléments dans un conteneur `.narrative`), remplacement de `<h3 class="section-title">Texte</h3>` par `<NarrativeHeading id="xxx">Texte</NarrativeHeading>` (id repris tel quel de l'actuel `<section id="xxx">`), idem `<h4 class="subsection-title">` → `<NarrativeSubheading id="yyy">`.

- [ ] **Step 1: `quickstart.astro`**

Ajouter l'import :

```astro
import NarrativeHeading from '../../components/NarrativeHeading.astro';
import NarrativeSubheading from '../../components/NarrativeSubheading.astro';
```

Remplacer le contenu du `<div class="page-container">` (à partir de `<section id="cdn" class="main-section">` jusqu'à la fermeture du dernier `</section>` avant `</div>`) par une structure `.narrative` plate :

```astro
        <div class="narrative">
            <NarrativeHeading id="cdn">Via CDN <span class="badge">Recommandé</span></NarrativeHeading>
            <p>
                La méthode la plus rapide — aucun outil requis. Ajoutez les deux balises dans
                votre <code>&lt;head&gt;</code> et utilisez les composants directement en HTML.
            </p>

            <NarrativeSubheading id="autoloader">Autoloader <span class="badge badge-subtle">À privilégier</span></NarrativeSubheading>
            <p>
                Ne charge chaque composant que lorsqu'il est utilisé dans la page.
                Idéal pour la plupart des projets CDN.
            </p>
            <pre><code class="language-html" set:text={codeAutoloader} /></pre>
            <p class="hint">
                Les deux balises sont requises : le script enregistre les composants,
                le CSS fournit le thème.
            </p>
            <p class="hint">
                En développement local, remplacez <code>autoloader.prod.js</code> par
                <code>autoloader.js</code> pour obtenir des avertissements détaillés dans la console.
            </p>
            <p>Les composants sont ensuite utilisables directement :</p>
            <pre><code class="language-html" set:text={codeUsage} /></pre>

            <NarrativeSubheading id="bundle">Bundle complet</NarrativeSubheading>
            <p>
                Charge tous les composants en une seule requête. Adapté si vous utilisez
                beaucoup de composants ou souhaitez éviter les imports dynamiques.
            </p>
            <pre><code class="language-html" set:text={codeBundle} /></pre>

            <NarrativeSubheading id="prefix">Renommer les tags</NarrativeSubheading>
            <p>
                Pour éviter toute collision avec une autre librairie, ou adopter votre propre
                convention de nommage, définissez <code>window.ARIANE_CONFIG.prefix</code>
                <strong>avant</strong> le script Ariane (autoloader ou bundle complet) :
            </p>
            <pre><code class="language-html" set:text={codePrefixConfig} /></pre>
            <p>Les composants s'utilisent alors sous le préfixe configuré :</p>
            <pre><code class="language-html" set:text={codePrefixUsage} /></pre>
            <p class="hint">
                Le préfixe par défaut est <code>ar</code>. Un seul préfixe global s'applique
                à tous les composants — pour un renommage libre par composant, voir
                l'<a href="#headless-import">import headless</a> côté npm.
            </p>

            <NarrativeHeading id="npm">Setup avancé <span class="badge">Avec bundler</span></NarrativeHeading>
            <p>
                Pour les projets utilisant Vite, Webpack, Rollup ou tout autre bundler.
            </p>
            <pre><code class="language-bash" set:text={codeNpmInstall} /></pre>

            <NarrativeSubheading>Import global</NarrativeSubheading>
            <p>Enregistre tous les composants en une seule ligne :</p>
            <pre><code class="language-typescript" set:text={codeNpmGlobal} /></pre>

            <NarrativeSubheading>Import individuel <span class="badge badge-subtle">Tree-shaking</span></NarrativeSubheading>
            <p>Pour inclure uniquement les composants effectivement utilisés :</p>
            <pre><code class="language-typescript" set:text={codeNpmIndividuel} /></pre>

            <NarrativeSubheading id="headless-import">Import headless <span class="badge badge-subtle">Renommage libre</span></NarrativeSubheading>
            <p>
                Pour choisir vous-même le tag de chaque composant plutôt que d'utiliser les
                tags <code>ar-*</code> par défaut, importez les classes depuis
                <code>@ariane-ui/core/headless</code> — aucun enregistrement automatique,
                vous appelez <code>customElements.define()</code> vous-même :
            </p>
            <pre><code class="language-typescript" set:text={codeNpmHeadless} /></pre>
            <p class="hint">
                Contrairement au préfixe global du CDN, ce mode permet de renommer chaque
                composant individuellement.
            </p>

            <NarrativeSubheading id="ide-autocomplete">Autocomplétion IDE</NarrativeSubheading>
            <p>
                Le paquet npm publie des fichiers de données VS Code générés automatiquement
                depuis le Custom Elements Manifest — autocomplétion des tags <code>ar-*</code>,
                de leurs attributs, et des custom properties CSS (<code>--ar-*</code>).
                Référencez-les dans le <code>.vscode/settings.json</code> de votre projet :
            </p>
            <pre><code class="language-json" set:text={codeVsCodeSettings} /></pre>
        </div>
```

Note : `id="prerequis"` reste sur `<ar-alert>` (pas un heading, cas particulier documenté dans la spec — inchangé).

- [ ] **Step 2: `utilisation.astro`** — même transformation

Remplacer les wrappers `<section id="..." class="main-section">`/`<section class="subsection">` par `.narrative` + `NarrativeHeading id="composants"`, `NarrativeHeading id="chargement"` + `NarrativeSubheading` (sans id, 2 occurrences actuellement sans id — inchangé, pas de régression), `NarrativeHeading id="personnalisation"` + 4× `NarrativeSubheading` (sans id, inchangé), `NarrativeHeading id="presets"`. Contenu textuel identique à l'actuel, juste le remplacement de balise.

- [ ] **Step 3: `shadow-dom.astro`** — même transformation

`NarrativeHeading id="pourquoi"`, `NarrativeHeading id="charger-un-theme"` + `NarrativeSubheading id="preparez-theme"` + `NarrativeSubheading id="theme-defaut"`.

- [ ] **Step 4: `i18n.astro`** — même transformation, + correction du drift de label trouvé en audit**

`NarrativeHeading id="principe"` + `NarrativeSubheading id="locale-resolution"` + `NarrativeSubheading id="default-imports"`, `NarrativeHeading id="traductions"`, `NarrativeHeading id="traductions-disponibles"`.

En plus de la migration, corriger le drift trouvé pendant l'audit : dans le frontmatter, `tocEntries` a `{ id: 'traductions', label: 'Fournir sa propre traduction', ... }` alors que le titre réel de la section est « Créer votre propre traduction ». Aligner le label de `tocEntries` sur le texte réel du titre :

```ts
{ id: 'traductions', label: 'Créer votre propre traduction', level: 1 as const },
```

- [ ] **Step 5: Retirer les styles `.main-section`/`.subsection` désormais inutilisés des 4 pages, ajouter `.narrative`**

Chaque page a un `<style>@import '../../styles/doc-prose.css';</style>` — aucun changement requis ici (les classes `.main-section`/`.subsection` restent définies dans `doc-prose.css` pour l'instant mais ne sont plus utilisées par ces 4 pages ; elles seront retirées avec `naming-conventions.astro` dans Task 6, seule page restante à les utiliser après cette tâche — voir Task 6 step 3).

- [ ] **Step 6: Vérifier que toutes les ancres existantes fonctionnent toujours**

Run: `cd apps/docs && npm run dev &` puis, pour chaque page migrée, vérifier que chaque `id` de `tocEntries` existe bien dans le DOM rendu :

```bash
for page in quickstart utilisation shadow-dom i18n; do
  curl -s "http://localhost:4321/getting-started/$page" | grep -o 'id="[a-z-]*"' | sort -u
done
```

Expected : pour chaque page, tous les `id` listés dans son `tocEntries` (frontmatter) apparaissent dans la sortie.

- [ ] **Step 7: Lancer les tests a11y**

Run: `cd apps/docs && npm run test:a11y`
Expected: 0 violation nouvelle sur les 4 pages migrées.

- [ ] **Step 8: Commit**

```bash
git add apps/docs/src/pages/getting-started/quickstart.astro apps/docs/src/pages/getting-started/utilisation.astro apps/docs/src/pages/getting-started/shadow-dom.astro apps/docs/src/pages/getting-started/i18n.astro
git commit -m "refactor(docs): migre les 4 pages getting-started vers NarrativeHeading/Subheading, retire les wrappers"
```

---

## Task 6: Déplacer et renommer « Conventions de nommage » → « Parts & Slots »

**Files:**

- Create: `apps/docs/src/pages/theming/parts-and-slots.astro`
- Delete: `apps/docs/src/pages/getting-started/naming-conventions.astro`
- Modify: `apps/docs/src/components/ComponentApi.astro:164,170`
- Modify: `apps/docs/astro.config.mjs`

**Interfaces:**

- Consumes: `NarrativeHeading`/`NarrativeSubheading` (Task 4), même transformation que Task 5.

- [ ] **Step 1: Créer `theming/parts-and-slots.astro`**

Créer le répertoire `apps/docs/src/pages/theming/` et y créer `parts-and-slots.astro`, contenu repris de `naming-conventions.astro` avec : `title="Parts & Slots"`, `currentPath="/theming/parts-and-slots"`, `<h2 class="page-title">Parts & Slots</h2>`, et les 3 sections migrées vers `NarrativeHeading`/`NarrativeSubheading` (même transformation que Task 5) :

```astro
---
import Layout from '../../layouts/Layout.astro';
import TableOfContents from '../../components/TableOfContents.astro';
import NarrativeHeading from '../../components/NarrativeHeading.astro';
import NarrativeSubheading from '../../components/NarrativeSubheading.astro';

const tocEntries = [
    { id: 'semantic-parts', label: 'CSS Part sémantiques', level: 1 as const },
    { id: 'state-parts', label: 'Parts d\'état', level: 1 as const },
    { id: 'slots', label: 'Conventions de slot', level: 1 as const },
];
---

<Layout
    title="Parts & Slots"
    description="Vocabulaire de CSS part sémantiques, parts d'état et conventions de slot partagés par tous les composants Ariane."
    currentPath="/theming/parts-and-slots"
    showToc={true}
>
    <div class="page-container">
        <div class="page-header">
            <h2 class="page-title">Parts & Slots</h2>
        </div>

        <div class="narrative">
            <NarrativeHeading id="semantic-parts">CSS Part sémantiques</NarrativeHeading>
            <p>
                En plus de <code>CSS part</code> propres à chacun, les composants Ariane
                exposent des CSS part qui ont un rôle <strong>sémantique et transverse</strong>.<br />
                Un même élément expose souvent plusieurs CSS part complémentaires, par exemple
                <code>control</code> (sémantique) et <code>link</code> (spécifique).
            </p>
            <p style="margin-top: 1rem">
                Ces <code>::part()</code> sémantiques facilitent la personnalisation des éléments communs à
                chacun des composants, permettant une meilleure intégration à un Design System.
            </p>

            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th scope="col">Part sémantique</th>
                            <th scope="col">Signification</th>
                            <th scope="col">Exemples</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><code>(nom du composant)</code></td>
                            <td>Racine du composant.</td>
                            <td>
                                <code>ar-charcounter::part(charcounter)</code>,
                                <code>ar-datepicker::part(datepicker)</code>,
                                <code>ar-breadcrumb::part(breadcrumb)</code>
                            </td>
                        </tr>
                        <tr>
                            <td><code>panel</code></td>
                            <td>Conteneur flottant secondaire (datepicker, dropdown...).</td>
                            <td><code>ar-datepicker::part(panel)</code></td>
                        </tr>
                        <tr>
                            <td><code>trigger</code></td>
                            <td>Ouvre/ferme un panel ou une zone repliable.</td>
                            <td><code>ar-datepicker::part(trigger)</code></td>
                        </tr>
                        <tr>
                            <td><code>header</code> / <code>footer</code></td>
                            <td>En-tête / pied de composant.</td>
                            <td><code>ar-datepicker::part(header)</code></td>
                        </tr>
                        <tr>
                            <td><code>body</code></td>
                            <td>Zone de contenu principal.</td>
                            <td>
                                <code>ar-dialog::part(body)</code>,
                                <code>ar-alert::part(body)</code>
                            </td>
                        </tr>
                        <tr>
                            <td><code>control</code></td>
                            <td>
                                Élément interactif générique (hors
                                field/action-button/trigger).
                            </td>
                            <td>
                                <code>ar-pagination::part(link)</code>,
                                <code>ar-datepicker::part(day)</code>
                            </td>
                        </tr>
                        <tr>
                            <td><code>field</code></td>
                            <td>
                                Élément qui reçoit une saisie. Deux sous-rôles standard,
                                réutilisables par tout futur composant :
                                <code>input</code> (champ texte/textarea) et
                                <code>select</code> (liste déroulante).
                            </td>
                            <td>
                                <code>ar-datepicker::part(input)</code>,
                                <code>ar-pagination::part(select)</code>
                            </td>
                        </tr>
                        <tr>
                            <td><code>action-button</code></td>
                            <td>
                                Bouton qui déclenche une action ponctuelle (pas un toggle de
                                panel).
                            </td>
                            <td>
                                <code>ar-pagination::part(prev)</code>,
                                <code>ar-datepicker::part(today-button)</code>
                            </td>
                        </tr>
                        <tr>
                            <td><code>indicator</code></td>
                            <td>Marqueur/indicateur visuel.</td>
                            <td><code>ar-table-sort::part(indicator)</code></td>
                        </tr>
                        <tr>
                            <td><code>label</code></td>
                            <td>Texte descriptif.</td>
                            <td><code>ar-datepicker::part(label)</code></td>
                        </tr>
                        <tr>
                            <td><code>icon</code></td>
                            <td>Icône.</td>
                            <td><code>ar-alert::part(icon)</code></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <NarrativeHeading id="state-parts">Parts d'état</NarrativeHeading>
            <p>
                Certains <code>::part()</code> portent en plus un <strong>modificateur
                    d'état</strong>, selon la convention
                <code>&lt;élément&gt;--&lt;état&gt;</code> : l'élément de base reste
                présent, l'état s'ajoute en second part sur le même attribut (ex.
                <code>part="bullet bullet--current"</code>). <br />
                Ces parts d'état permettent une customisation avancée des composants dans leur différents états.
            </p>

            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th scope="col">État</th>
                            <th scope="col">Signification</th>
                            <th scope="col">Exemples</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><code>--current</code></td>
                            <td>Position atteinte par navigation.</td>
                            <td><code>ar-pagination::part(item--current)</code></td>
                        </tr>
                        <tr>
                            <td><code>--selected</code></td>
                            <td>Choix actif de l'utilisateur.</td>
                            <td><code>ar-tab::part(tab--selected)</code></td>
                        </tr>
                        <tr>
                            <td><code>--disabled</code></td>
                            <td>Désactivé.</td>
                            <td><code>ar-pagination::part(nav-button--disabled)</code></td>
                        </tr>
                        <tr>
                            <td><code>--pending</code></td>
                            <td>Traitement en cours.</td>
                            <td><code>ar-table-sort::part(sort-button--pending)</code></td>
                        </tr>
                        <tr>
                            <td><code>--warning</code></td>
                            <td>État d'avertissement.</td>
                            <td><code>ar-charcounter::part(count--warning)</code></td>
                        </tr>
                        <tr>
                            <td><code>--error</code></td>
                            <td>État d'erreur.</td>
                            <td><code>ar-charcounter::part(count--error)</code></td>
                        </tr>
                        <tr>
                            <td><code>--desktop</code></td>
                            <td>Affichage desktop d'un élément ayant une variante mobile.</td>
                            <td><code>ar-breadcrumb::part(list--desktop)</code></td>
                        </tr>
                        <tr>
                            <td><code>--mobile</code></td>
                            <td>Affichage mobile d'un élément ayant une variante desktop.</td>
                            <td><code>ar-breadcrumb::part(list--mobile)</code></td>
                        </tr>
                        <tr>
                            <td><code>--substep</code></td>
                            <td>Sous-liste d'étape imbriquée dans une liste d'étape parente.</td>
                            <td><code>ar-stepper::part(list--substep)</code></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <NarrativeHeading id="slots">Conventions de slot</NarrativeHeading>
            <p>
                Les <code>&lt;slot&gt;</code> suivent des conventions déjà cohérentes sur
                toute la librairie, sans qu'un nouveau vocabulaire ait été nécessaire :
            </p>
            <ul>
                <li>
                    <strong>Slot par défaut (sans nom)</strong> — contenu principal du
                    composant.
                </li>
                <li>
                    <strong><code>trigger</code></strong> — même sens que le rôle
                    <code>trigger</code> des part : élément qui ouvre/ferme le composant.
                </li>
                <li>
                    <strong>Suffixe <code>&lt;rôle&gt;-icon</code></strong> — icône
                    remplaçable associée à un élément précis (<code>close-icon</code>,
                    <code>home-icon</code>, <code>trigger-icon</code>,
                    <code>prev-icon</code>/<code>next-icon</code>,
                    <code>warning-icon</code>/<code>error-icon</code>).
                </li>
                <li>
                    <strong><code>header-actions</code></strong>,
                    <strong><code>footer</code></strong> — reprennent le nom des rôles
                    <code>::part()</code> homonymes.
                </li>
            </ul>
        </div>
    </div>

    <TableOfContents entries={tocEntries} slot="toc" />
</Layout>

<style>
    @import '../../styles/doc-prose.css';
    @import '../../styles/doc-table.css';
</style>
```

- [ ] **Step 2: Supprimer l'ancien fichier**

```bash
rm apps/docs/src/pages/getting-started/naming-conventions.astro
```

- [ ] **Step 3: Retirer les classes `.main-section`/`.subsection`/`.page-title + .page-content` de `doc-prose.css` (plus aucun consommateur)**

Vérifier d'abord :

Run: `grep -rln "main-section\|class=\"subsection\"" apps/docs/src/pages`
Expected: aucune sortie (toutes les pages qui utilisaient ces classes ont été migrées en Task 5 + cette tâche).

Puis, dans `apps/docs/src/styles/doc-prose.css`, supprimer le bloc :

```css
.main-section,
.subsection {
    display: flex;
    flex-direction: column;
}

.main-section {
    gap: 2rem;

    > div p {
        margin: 0;
    }
}

.subsection {
    gap: 1rem;

    p {
        margin: 0;
    }
}
```

- [ ] **Step 4: Mettre à jour les 2 liens dans `ComponentApi.astro`**

Dans `apps/docs/src/components/ComponentApi.astro`, lignes 164 et 170 : remplacer `/getting-started/naming-conventions#semantic-parts` par `/theming/parts-and-slots#semantic-parts`, et `/getting-started/naming-conventions#state-parts` par `/theming/parts-and-slots#state-parts`.

- [ ] **Step 5: Ajouter une redirection dans `astro.config.mjs`**

Dans `apps/docs/astro.config.mjs`, à l'intérieur de `defineConfig({...})`, ajouter :

```js
    redirects: {
        '/getting-started/naming-conventions': '/theming/parts-and-slots',
    },
```

- [ ] **Step 6: Vérifier qu'aucune référence à l'ancienne URL ne subsiste (hors redirection et specs déjà écrites)**

Run: `grep -rln "naming-conventions" apps/docs/src apps/docs/astro.config.mjs`
Expected: uniquement `astro.config.mjs` (la redirection elle-même) et éventuellement `apps/docs/src/utils/transverse-roles.ts` (commentaire, à mettre à jour par cohérence — remplacer la mention par « Parts & Slots »/`theming/parts-and-slots`).

- [ ] **Step 7: Vérifier la redirection et la nouvelle page**

Run: `npm run dev --workspace=apps/docs &` puis :

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/theming/parts-and-slots
curl -sI http://localhost:4321/getting-started/naming-conventions | head -1
```

Expected: `200` pour la nouvelle URL, `301`/`308` (redirection) pour l'ancienne.

- [ ] **Step 8: Lancer les tests a11y**

Run: `cd apps/docs && npm run test:a11y`
Expected: 0 violation (nouvelle route découverte automatiquement par `discover-pages.mjs`).

- [ ] **Step 9: Commit**

```bash
git add apps/docs/src/pages/theming/parts-and-slots.astro apps/docs/src/components/ComponentApi.astro apps/docs/astro.config.mjs apps/docs/src/styles/doc-prose.css apps/docs/src/utils/transverse-roles.ts
git rm apps/docs/src/pages/getting-started/naming-conventions.astro
git commit -m "refactor(docs): renomme Conventions de nommage en Parts & Slots, déplace vers theming/"
```

---

## Task 7: Réorganiser `SiteNav.astro` en 3 groupes

**Files:**

- Modify: `apps/docs/src/components/SiteNav.astro:29-38,94-103`

**Interfaces:**

- Aucune nouvelle interface — modification interne du composant.

- [ ] **Step 1: Scinder `gettingStartedLinks` en 3 tableaux**

Remplacer (lignes 29-38) :

```ts
const gettingStartedLinks: NavLink[] = [
    { href: '/getting-started/quickstart', label: 'Démarrage rapide', ariaCurrent: undefined },
    { href: '/getting-started/utilisation', label: 'Utilisation', ariaCurrent: undefined },
    { href: '/getting-started/shadow-dom', label: 'Shadow DOM applicatif', ariaCurrent: undefined },
    {
        href: '/getting-started/naming-conventions',
        label: 'Conventions de nommage',
        ariaCurrent: undefined,
    },
    { href: '/getting-started/i18n', label: 'Internationalisation', ariaCurrent: undefined },
].map((link) => ({
    ...link,
    ariaCurrent: currentPath === link.href ? ('page' as const) : undefined,
}));
```

par :

```ts
function withCurrent(links: Omit<NavLink, 'ariaCurrent'>[]): NavLink[] {
    return links.map((link) => ({
        ...link,
        ariaCurrent: currentPath === link.href ? ('page' as const) : undefined,
    }));
}

const gettingStartedLinks: NavLink[] = withCurrent([
    { href: '/getting-started/quickstart', label: 'Démarrage rapide' },
    { href: '/getting-started/utilisation', label: 'Utilisation' },
    { href: '/getting-started/i18n', label: 'Internationalisation' },
]);

const themingLinks: NavLink[] = withCurrent([
    { href: '/getting-started/shadow-dom', label: 'Shadow DOM applicatif' },
    { href: '/theming/parts-and-slots', label: 'Parts & Slots' },
]);

const resourcesLinks: NavLink[] = withCurrent([]);
```

- [ ] **Step 2: Rendre les 3 groupes (Resources masqué si vide)**

Remplacer (lignes 94-103) :

```astro
        <div class="nav-section">
            <h2>Bien démarrer</h2>
            <ul class="nav-list">
                {gettingStartedLinks.map((link) => (
                    <li>
                        <a href={link.href} aria-current={link.ariaCurrent}>{link.label}</a>
                    </li>
                ))}
            </ul>
        </div>
```

par :

```astro
        <div class="nav-section">
            <h2>Getting Started</h2>
            <ul class="nav-list">
                {gettingStartedLinks.map((link) => (
                    <li>
                        <a href={link.href} aria-current={link.ariaCurrent}>{link.label}</a>
                    </li>
                ))}
            </ul>
        </div>

        <div class="nav-section">
            <h2>Theming & Utilities</h2>
            <ul class="nav-list">
                {themingLinks.map((link) => (
                    <li>
                        <a href={link.href} aria-current={link.ariaCurrent}>{link.label}</a>
                    </li>
                ))}
            </ul>
        </div>

        {resourcesLinks.length > 0 && (
            <div class="nav-section">
                <h2>Resources</h2>
                <ul class="nav-list">
                    {resourcesLinks.map((link) => (
                        <li>
                            <a href={link.href} aria-current={link.ariaCurrent}>{link.label}</a>
                        </li>
                    ))}
                </ul>
            </div>
        )}
```

(`resourcesLinks` reste vide dans ce chantier — cf. spec, hors scope de produire du contenu pour #12/#10 — la section n'apparaît donc pas tant qu'aucun lien n'y est ajouté, pas de section vide visible.)

- [ ] **Step 3: Vérifier le rendu de la nav**

Run: `npm run dev --workspace=apps/docs &` puis `curl -s http://localhost:4321/getting-started/quickstart | grep -o '<h2>[^<]*</h2>' | head -5`
Expected: `<h2>Getting Started</h2>`, `<h2>Theming & Utilities</h2>` (pas de `<h2>Resources</h2>`, liste vide), `<h2>Composants</h2>`.

- [ ] **Step 4: Lancer les tests a11y**

Run: `cd apps/docs && npm run test:a11y`
Expected: 0 violation.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/src/components/SiteNav.astro
git commit -m "refactor(docs): réorganise SiteNav.astro en 3 groupes (Getting Started/Theming & Utilities/Resources)"
```

---

## Task 8: Documentation — ADR-006 et charte graphique

**Files:**

- Create: `docs/decisions/ADR-006-identite-visuelle-unifiee-doc.md`
- Create: `docs/design/charte-graphique.md`

- [ ] **Step 1: Écrire l'ADR-006**

Format aligné sur les ADR existants (`docs/decisions/ADR-005-tokens-pilotes-par-attribut.md` pour la structure de référence : Statut/Contexte/Décision/Conséquences).

```markdown
# ADR-006 : Identité visuelle unifiée pour apps/docs

## Statut

Accepté (2026-09-09)

## Contexte

`HomeLayout.astro` (home, PR #202) et `Layout.astro` (pages de contenu et
composant) définissaient chacun leur propre jeu de tokens `--doc-*`, avec des
noms identiques (`--doc-accent`, `--doc-code-block-bg`) portant des valeurs
incompatibles — pas deux thèmes d'un même système, mais deux systèmes
distincts qui se recouvraient par accident de nommage. `HomeLayout.astro`
n'avait par ailleurs aucun mode sombre, tandis que `Layout.astro` avait un
mode sombre fonctionnel mais sous une palette bleu cobalt sans lien avec
l'identité Rivian de la home.

## Décision

Unifier tout `apps/docs` sous l'identité visuelle Rivian (validée par 2
itérations de design sur la home), dans un fichier de tokens unique
(`apps/docs/src/styles/doc-tokens.css`), structuré en 2 niveaux (primitifs →
sémantique), avec un mode sombre complet ("Voûte", indigo nuit — choisi après
brainstorming visuel comparant 3 directions, cf.
`docs/superpowers/specs/2026-09-09-doc-unification-titres-tokens-110-design.md`).
L'ancien système bleu cobalt de `Layout.astro` est retiré, pas conservé en
parallèle.

## Alternatives écartées

- **Garder les deux systèmes séparés** (home vs reste du site) — écarté :
  perpétue la confusion de nommage, et une home visuellement déconnectée du
  reste du site ne sert pas l'identité de marque.
- **Renommer sans trancher la couleur** (ex. `--doc-home-*`/`--doc-content-*`)
  — écarté : ne résout pas le vrai problème (deux identités visuelles
  concurrentes), juste la collision de nom.

## Conséquences

- Tous les tokens `--doc-*` non-couleur (rayons, easing, typo) sont
  rationalisés sur le vocabulaire de `packages/core/src/styles/themes/default.css`
  (`--ar-border-radius-*`, `--ar-font-size-*`, etc.) — les deux systèmes
  n'ont aucun lien fonctionnel, mais une terminologie alignée facilite la
  lecture pour un mainteneur qui passe de l'un à l'autre.
- Les primitifs de couleur gardent un vocabulaire d'objets/matières propre à
  Ariane (paper/slate/grove/ink/ember côté clair, vault/chalk/thread côté
  sombre) — inspiré de Rivian, pas copié (mots différents).
- Le rework du layout visuel principal (colonnes, positionnement) reste hors
  scope de cette décision — sous-chantier séparé.
```

- [ ] **Step 2: Écrire la charte graphique vivante**

```markdown
# Charte graphique — apps/docs

> Référence vivante, mise à jour au fil des pages traitées. Décrit l'état
> actuel des tokens visuels du site de documentation, pas une décision
> figée — cf. ADR-006 pour le raisonnement derrière ce choix.

Source de vérité : `apps/docs/src/styles/doc-tokens.css`.

## Palette

### Primitifs clairs

| Nom                                                   | Valeur                            | Rôle                                            |
| ----------------------------------------------------- | --------------------------------- | ----------------------------------------------- |
| `--doc-paper`                                         | `#ffffff`                         | Sol neutre 1                                    |
| `--doc-slate`                                         | `#f5f5f5`                         | Sol neutre 2                                    |
| `--doc-grove` / `--doc-grove-deep`                    | `#313a2e` / `#252826`             | Bandes sombres dédiées (zones clair uniquement) |
| `--doc-ink` / `--doc-ink-muted`                       | `#141414` / `#565656`             | Texte                                           |
| `--doc-line` / `--doc-line-soft`                      | `#141414` / 16%                   | Traits                                          |
| `--doc-ember` / `--doc-ember-hi` / `--doc-ember-wash` | `#ffaa00` / `#ffbd2e` / `#fff3d6` | Accent                                          |

### Primitifs sombres — Voûte (indigo nuit)

| Nom                                  | Valeur                | Rôle   |
| ------------------------------------ | --------------------- | ------ |
| `--doc-vault` / `--doc-vault-deep`   | `#191d2e` / `#10131f` | Sol    |
| `--doc-chalk` / `--doc-chalk-muted`  | `#e8eaf2` / `#a2a7bd` | Texte  |
| `--doc-thread` / `--doc-thread-soft` | ~37% / ~14% opacité   | Traits |

Ratios de contraste vérifiés (AAA) : `chalk`/`vault` 13,91:1, `chalk-muted`/`vault`
7,00:1, `ember`/`vault` 8,76:1. L'ambre (`ember`) est le même primitif dans les
deux modes — inutilisable en texte sur fond clair (1,9:1), il sert de lien et
d'anneau de focus en sombre.

## Typographie

Familles : `--doc-font-display` (Instrument Sans), `--doc-font-body` (Inter).

Échelle de taille : `--doc-font-size-xs/sm/md/lg/xl` (0.75/0.9/1.05/1.25/2rem).
Échelle de graisse : `--doc-font-weight-normal/medium/semibold/bold`
(400/500/600/700).

## Rayons

`--doc-radius-sm/md/lg/xl` : 4/12/20/40px.

## Easing

`--doc-ease` : `cubic-bezier(0.83, 0, 0.17, 1)` — courbe unique pour toute
transition réagissant au pointeur ou au clavier.

## Rythme vertical

`--doc-space-paragraph`/`--doc-space-subsection`/`--doc-space-section` :
1/1.5/2.5rem. Règles :

1. Séparation (avant un titre) et groupement (entre éléments liés) sont deux
   natures d'espacement distinctes.
2. Le `margin-top` d'un titre est toujours strictement supérieur à son
   `margin-bottom`.
3. Le poids de la coupure suit le niveau : section > sous-section.
4. Owl-selector (`:where(...) + *`) plutôt que des `margin-bottom` fixes.
5. Le premier titre après `.page-title` a un espacement réduit.

## Historique

- 2026-09-09 : unification initiale (home + pages de contenu + pages
  composant), mode sombre Voûte ajouté. Cf. issue #110, sous-chantier 1.
```

- [ ] **Step 3: Commit**

```bash
git add docs/decisions/ADR-006-identite-visuelle-unifiee-doc.md docs/design/charte-graphique.md
git commit -m "docs: ajoute ADR-006 et la charte graphique vivante d'apps/docs"
```

---

## Task 9: Vérification finale

**Files:** aucun (tâche de vérification uniquement).

- [ ] **Step 1: Suite de tests complète**

Run: `npm test` (racine du repo)
Expected: tous les tests passent (Vitest core + docs).

- [ ] **Step 2: Tests a11y complets**

Run: `cd apps/docs && npm run test:a11y`
Expected: 0 violation sur toutes les routes (découverte automatique, inclut `theming/parts-and-slots`, exclut `getting-started/naming-conventions` disparue).

- [ ] **Step 3: Build Astro**

Run: `npm run build --workspace=apps/docs`
Expected: build réussi, aucune erreur (notamment sur l'import `@import '../styles/doc-tokens.css'` depuis les deux layouts, et le nouveau répertoire `pages/theming/`).

- [ ] **Step 4: Vérification visuelle Playwright — clair et sombre, une page par famille**

Capturer et comparer visuellement (viewport 1280×900) :

- `/` (home) — clair et sombre (nouveau, absent avant ce chantier)
- `/getting-started/quickstart` (page de contenu migrée) — clair et sombre
- `/components/datepicker` (page composant) — clair et sombre

Pour chaque capture sombre, injecter `document.documentElement.setAttribute('data-theme', 'dark')` avant la capture. Vérifier à l'œil : lisibilité du texte, contraste des titres/liens, pas de couleur résiduelle de l'ancien système cobalt (`#2955a8`/`#161b22`).

- [ ] **Step 5: Contrôle de contraste WCAG AA sur la palette dark**

Run un script Playwright ad hoc calculant le ratio de contraste `getComputedStyle` pour les paires `--doc-text`/`--doc-bg`, `--doc-text-muted`/`--doc-bg`, `--doc-accent`/`--doc-bg` en mode sombre sur une page réelle rendue.
Expected: toutes les paires ≥ 4.5:1 (texte normal) ou ≥ 3:1 (UI/large texte) — déjà vérifié analytiquement par Opus (section 1 de la spec), cette étape confirme que les tokens sémantiques composés (`color-mix()`) n'ont pas dérivé des valeurs primitives vérifiées.

- [ ] **Step 6: Vérifier l'absence de référence résiduelle à l'ancien système**

Run: `grep -rn "#2955a8\|#161b22\|#6fa0e0" apps/docs/src`
Expected: aucune sortie (toutes les valeurs cobalt ont été retirées avec le bloc `[data-theme="dark"]` de `Layout.astro`, Task 3).

- [ ] **Step 7: Commit final si des ajustements ont été faits pendant la vérification**

```bash
git add -A
git commit -m "fix(docs): ajustements post-vérification visuelle (contraste/couleurs)"
```

(Ne committer que s'il y a effectivement eu des ajustements — sinon, rien à faire.)
