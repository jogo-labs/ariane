# Header Theme Dropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le groupe de 3 boutons thème dans le header par un `ar-dropdown` à icône unique qui reflète le mode actif.

**Architecture:** Un seul fichier modifié — `apps/docs/src/layouts/Layout.astro`. Trois zones touchées indépendamment : HTML (structure du header), CSS (suppression des règles obsolètes + ajout style items), JS (logique thème réécrite autour du dropdown).

**Tech Stack:** Astro (layout), `ar-dropdown` + `ar-dropdown-item` (lib ariane), SVG Lucide (sun, moon, monitor), TypeScript inline Astro script.

---

## Fichiers modifiés

- Modify: `apps/docs/src/layouts/Layout.astro`
    - HTML : zone `header-actions` (lignes ~428–432)
    - CSS : règles `.theme-toggle`, `.theme-btn`, `.theme-btn.active`, `[data-theme="dark"] .theme-btn.active` (lignes ~234–266)
    - CSS : ajout règles `.theme-trigger-chevron`, `.theme-menu-item`
    - JS : bloc thème (lignes ~457–487)

---

## Task 1 : Remplacer le markup HTML

**Files:**

- Modify: `apps/docs/src/layouts/Layout.astro`

- [ ] **Step 1 : Supprimer le `.theme-toggle` existant et le remplacer**

Trouver ce bloc dans `header-actions` :

```html
<!-- Toggle thème groupé -->
<div class="theme-toggle" role="group" aria-label="Thème d'affichage">
    <button
        class="theme-btn"
        data-theme-mode="light"
        aria-label="Thème clair"
        title="Thème clair"
        aria-pressed="false"
    >
        ☀
    </button>
    <button
        class="theme-btn"
        data-theme-mode="system"
        aria-label="Thème automatique"
        title="Thème automatique"
        aria-pressed="false"
    >
        ⬤
    </button>
    <button
        class="theme-btn"
        data-theme-mode="dark"
        aria-label="Thème sombre"
        title="Thème sombre"
        aria-pressed="false"
    >
        ☾
    </button>
</div>
```

Le remplacer par :

```html
<!-- Trigger thème -->
<button class="icon-btn" id="theme-trigger" aria-label="Thème : Automatique">
    <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
    >
        <rect width="20" height="14" x="2" y="3" rx="2" />
        <path d="M8 21h8M12 17v4" />
    </svg>
    <span class="theme-trigger-chevron" aria-hidden="true">▾</span>
</button>
<!-- Dropdown thème (display:contents — sans impact sur le layout) -->
<ar-dropdown id="theme-dropdown" for="theme-trigger" placement="bottom-end">
    <ar-dropdown-item data-theme-mode="light">
        <button class="theme-menu-item">
            <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
            >
                <circle cx="12" cy="12" r="4" />
                <path
                    d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
                />
            </svg>
            Clair
        </button>
    </ar-dropdown-item>
    <ar-dropdown-item data-theme-mode="dark">
        <button class="theme-menu-item">
            <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
            >
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
            </svg>
            Sombre
        </button>
    </ar-dropdown-item>
    <hr style="border:none;border-top:1px solid var(--doc-border);margin:.25rem 0;" />
    <ar-dropdown-item data-theme-mode="system">
        <button class="theme-menu-item">
            <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
            >
                <rect width="20" height="14" x="2" y="3" rx="2" />
                <path d="M8 21h8M12 17v4" />
            </svg>
            Automatique
        </button>
    </ar-dropdown-item>
</ar-dropdown>
```

- [ ] **Step 2 : Commit**

```bash
git add apps/docs/src/layouts/Layout.astro
git commit -m "feat(docs): header — remplacer theme-toggle par ar-dropdown (HTML)"
```

---

## Task 2 : Mettre à jour le CSS

**Files:**

- Modify: `apps/docs/src/layouts/Layout.astro`

- [ ] **Step 1 : Supprimer les règles de l'ancien toggle**

Trouver et supprimer ces 4 blocs CSS :

```css
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
    background: var(--doc-accent-bg, #2d2040);
    color: var(--doc-accent, #a78bfa);
}
```

- [ ] **Step 2 : Ajouter les règles du nouveau trigger et des items**

Ajouter à la suite de `.icon-btn:hover { ... }` :

```css
.theme-trigger-chevron {
    font-size: 0.55rem;
    color: var(--doc-text-muted);
    margin-left: 2px;
}

.theme-menu-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.4rem 0.75rem;
    background: transparent;
    border: none;
    border-radius: 0.3rem;
    cursor: pointer;
    font-size: 0.85rem;
    font-family: inherit;
    color: var(--doc-text);
    text-align: left;
    white-space: nowrap;
}

.theme-menu-item:hover {
    background: var(--doc-nav-bg-hover);
}

.theme-menu-item[aria-current='true'] {
    color: var(--doc-accent);
    font-weight: 600;
}
```

- [ ] **Step 3 : Commit**

```bash
git add apps/docs/src/layouts/Layout.astro
git commit -m "feat(docs): header — mettre à jour le CSS (suppression theme-toggle, ajout theme-menu-item)"
```

---

## Task 3 : Réécrire la logique JS du thème

**Files:**

- Modify: `apps/docs/src/layouts/Layout.astro`

- [ ] **Step 1 : Remplacer le bloc thème dans le `<script>`**

Trouver ce bloc dans le `<script>` (après `resolveTheme`) :

```typescript
function applyMode(mode: string) {
    const theme = resolveTheme(mode);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.dataset.themeMode = mode;

    // Mettre à jour le bouton actif dans le toggle groupé
    document.querySelectorAll<HTMLButtonElement>('.theme-btn').forEach((btn) => {
        const isActive = btn.dataset.themeMode === mode;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
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

Le remplacer par :

```typescript
const THEME_ICONS: Record<string, string> = {
    light: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
    dark: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/></svg>',
    system: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
};

const THEME_LABELS: Record<string, string> = {
    light: 'Clair',
    dark: 'Sombre',
    system: 'Automatique',
};

function setTriggerIcon(mode: string) {
    const trigger = document.getElementById('theme-trigger');
    if (!trigger) return;
    const icon = THEME_ICONS[mode] ?? THEME_ICONS.system;
    const chevron = '<span class="theme-trigger-chevron" aria-hidden="true">▾</span>';
    trigger.innerHTML = icon + chevron;
    trigger.setAttribute('aria-label', `Thème : ${THEME_LABELS[mode] ?? 'Automatique'}`);
}

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

const savedMode = localStorage.getItem('ariane-theme') || 'system';
applyMode(savedMode);

document.querySelectorAll<HTMLElement>('ar-dropdown-item[data-theme-mode]').forEach((item) => {
    item.addEventListener('click', () => {
        const mode = item.dataset.themeMode || 'system';
        localStorage.setItem('ariane-theme', mode);
        applyMode(mode);
        const dd = document.getElementById('theme-dropdown') as HTMLElement & { open?: boolean };
        if (dd) dd.open = false;
    });
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if ((localStorage.getItem('ariane-theme') || 'system') === 'system') {
        applyMode('system');
    }
});
```

- [ ] **Step 2 : Commit**

```bash
git add apps/docs/src/layouts/Layout.astro
git commit -m "feat(docs): header — réécrire logique JS thème pour ar-dropdown"
```

---

## Task 4 : Vérification manuelle

**Files:** aucun

- [ ] **Step 1 : Lancer le serveur de dev**

```bash
npm run dev
```

Ouvrir `http://localhost:4321` dans le navigateur.

- [ ] **Step 2 : Vérifier le comportement nominal (desktop)**

- Le trigger affiche l'icône du mode actif + chevron ▾
- Cliquer le trigger ouvre le dropdown
- Les 3 items sont visibles : "Clair" (☀), "Sombre" (☾), séparateur, "Automatique" (monitor)
- L'item du mode actif est en violet / gras
- Cliquer un item change le thème, ferme le dropdown, et met à jour l'icône du trigger
- Rechargement de page : l'icône du trigger correspond au mode sauvegardé

- [ ] **Step 3 : Vérifier à 375px (mobile)**

Passer en DevTools responsive à 375px. Vérifier :

- Le logo `ariane●` + badge version s'affichent sans compression
- Le trigger et le bouton GitHub sont visibles côte à côte
- Le dropdown s'ouvre et se positionne correctement (bottom-end)

- [ ] **Step 4 : Vérifier le thème sombre**

Passer en mode "Sombre" : l'icône lune s'affiche. Repasser en "Automatique" : icône monitor. Repasser en "Clair" : icône soleil.

- [ ] **Step 5 : Commit final si tout est bon**

```bash
git add apps/docs/src/layouts/Layout.astro
git commit -m "chore(docs): header — vérification manuelle OK"
```

> Si ce commit ne produit aucun changement (fichier déjà propre), ne pas committer.
