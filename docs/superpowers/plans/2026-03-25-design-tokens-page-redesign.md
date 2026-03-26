# Design Tokens Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre la page Design Tokens de la doc pour afficher une grille palette visuelle par hue et des sous-sections sémantiques par groupe, tout en corrigeant les swatches cassés.

**Architecture:** `parse-tokens.ts` est étendu avec une fonction `parsePalette()` dédiée et une refonte de `categorize()`. Un nouveau composant `PaletteGrid.astro` rend la grille statiquement (SSR). `tokens.astro` orchestre les deux.

**Tech Stack:** Astro 5, TypeScript, CSS Grid/Flexbox. Aucune dépendance supplémentaire.

**Branche :** `fix/design-tokens-page` (déjà créée depuis `refactor/css-custom-properties`)

---

## File Map

| Fichier                                        | Action                                                                                             |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `apps/docs/src/utils/parse-tokens.ts`          | Modifier — nettoyage valeur, `isColor()`, `categorize()` refonte, `ALIAS_FILTER`, `parsePalette()` |
| `apps/docs/src/components/PaletteGrid.astro`   | Créer — grille de swatches par hue                                                                 |
| `apps/docs/src/pages/foundations/tokens.astro` | Modifier — intégrer `PaletteGrid`, sous-sections sémantiques, TOC mis à jour                       |

---

## Task 1 : Refondre `parse-tokens.ts`

**Files:**

- Modify: `apps/docs/src/utils/parse-tokens.ts`

### Contexte

Le fichier actuel a trois problèmes :

1. Les valeurs de type `#283276 /* oklch(...) */` ne sont pas nettoyées → `isColor()` retourne `false` → swatches cassés
2. `categorize()` a un catch-all `--ar-?-?color-` → "Couleurs" qui empêche toute granularité
3. Pas de fonction pour extraire la palette brute groupée par hue

### Nouveau contenu complet du fichier

- [ ] **Remplacer le contenu de `parse-tokens.ts` par :**

```ts
/**
 * parse-tokens.ts
 *
 * Parse un fichier CSS de thème et extrait les CSS custom properties
 * organisées par catégorie sémantique, plus une fonction dédiée pour
 * la palette brute groupée par hue.
 */

export interface Token {
    name: string;
    value: string; // toujours nettoyé (sans commentaire oklch)
}

export interface TokenCategory {
    label: string;
    tokens: Token[];
}

export interface PaletteHue {
    name: string; // ex: "primary"
    stops: { stop: string; value: string }[]; // triés numériquement
}

// Hues reconnues dans l'ordre d'affichage
const PALETTE_HUES = [
    'primary',
    'neutral',
    'green',
    'yellow',
    'red',
    'blue',
    'orange',
    'cyan',
    'indigo',
    'purple',
    'pink',
] as const;

// Regex pour détecter un stop de palette brute : --ar-color-{hue}-{number}
const PALETTE_TOKEN_RE =
    /^--ar-color-(primary|neutral|green|yellow|red|blue|orange|cyan|indigo|purple|pink)-(\d+)$/;

// Filtre les alias sémantiques internes (--ar-color-success-05…-95, etc.)
// Ces tokens sont des alias vers la palette — ne pas les afficher
const ALIAS_FILTER = /^--ar-color-(success|warning|danger|info)-\d+$/;

const CATEGORY_RULES: { pattern: RegExp; label: string }[] = [
    // Palette brute — stops numériques (incl. neutral-0 et neutral-100)
    { pattern: PALETTE_TOKEN_RE, label: 'Palette brute' },
    // Tokens sémantiques de couleur — ordre critique (premier match gagne)
    { pattern: /^--ar-color-interactive/, label: 'Interaction' },
    { pattern: /^--ar-color-(text|bg|border)/, label: 'Texte & Surface' },
    { pattern: /^--ar-color-(success|warning|danger|info)-(bg|text)$/, label: 'États' },
    { pattern: /^--ar-focus-/, label: 'Focus' },
    // Autres tokens globaux
    { pattern: /^--ar-font-/, label: 'Typographie' },
    { pattern: /^--ar-spacing-/, label: 'Espacement & Forme' },
    { pattern: /^--ar-border-radius/, label: 'Espacement & Forme' },
    // Fallback : tokens composants (button, breadcrumb, stepper…)
];

const DISPLAY_ORDER = [
    'Palette brute',
    'Interaction',
    'Texte & Surface',
    'États',
    'Focus',
    'Typographie',
    'Espacement & Forme',
    'Tokens composants',
];

/** Nettoie une valeur CSS brute : retire le commentaire /* oklch(...) * / s'il existe. */
function cleanValue(raw: string): string {
    return raw.split('/*')[0].trim();
}

function categorize(name: string): string {
    for (const { pattern, label } of CATEGORY_RULES) {
        if (pattern.test(name)) return label;
    }
    return 'Tokens composants';
}

export function isColor(value: string): boolean {
    return /^#[0-9a-fA-F]{3,8}$/.test(value) || /^rgba?\(/.test(value) || /^oklch\(/.test(value);
}

/** Parse tous les tokens et les retourne groupés par catégorie sémantique. */
export function parseTokens(css: string): TokenCategory[] {
    const categories = new Map<string, Token[]>();
    const regex = /(--ar[\w-]+)\s*:\s*([^;]+)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(css)) !== null) {
        const name = match[1].trim();

        // Exclure les alias sémantiques internes (success/warning/danger/info + stops numériques)
        if (ALIAS_FILTER.test(name)) continue;

        const value = cleanValue(match[2]);
        const cat = categorize(name);

        if (!categories.has(cat)) categories.set(cat, []);
        (categories.get(cat) as Token[]).push({ name, value });
    }

    return DISPLAY_ORDER.filter((label) => categories.has(label)).map((label) => ({
        label,
        tokens: categories.get(label) as Token[],
    }));
}

/** Parse la palette brute et retourne les hues avec leurs stops triés numériquement. */
export function parsePalette(css: string): PaletteHue[] {
    const hueMap = new Map<string, { stop: string; value: string }[]>();

    const regex = /(--ar[\w-]+)\s*:\s*([^;]+)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(css)) !== null) {
        const name = match[1].trim();
        const paletteMatch = PALETTE_TOKEN_RE.exec(name);
        if (!paletteMatch) continue;

        const hue = paletteMatch[1];
        const stop = paletteMatch[2]; // ex: "0", "05", "100"
        const value = cleanValue(match[2]);

        if (!hueMap.has(hue)) hueMap.set(hue, []);
        (hueMap.get(hue) as { stop: string; value: string }[]).push({ stop, value });
    }

    // Trier les stops numériquement pour chaque hue
    for (const stops of hueMap.values()) {
        stops.sort((a, b) => parseInt(a.stop, 10) - parseInt(b.stop, 10));
    }

    // Retourner dans l'ordre déclaré des hues (hues absentes ignorées)
    return PALETTE_HUES.filter((hue) => hueMap.has(hue)).map((name) => ({
        name,
        stops: hueMap.get(name) as { stop: string; value: string }[],
    }));
}
```

- [ ] **Vérifier que le build Astro ne plante pas**

```bash
cd apps/docs && npm run build 2>&1 | tail -20
```

Attendu : aucune erreur TypeScript sur `parse-tokens.ts`.

- [ ] **Commit**

```bash
git add apps/docs/src/utils/parse-tokens.ts
git commit -m "refactor(parse-tokens): nettoyage valeur oklch, catégories granulaires, parsePalette()"
```

---

## Task 2 : Créer `PaletteGrid.astro`

**Files:**

- Create: `apps/docs/src/components/PaletteGrid.astro`

### Contexte

Ce composant reçoit la liste des hues (`PaletteHue[]`) et la liste unifiée des stops (`string[]`), et rend une grille HTML/CSS statique. Pas de JS côté client.

- Chaque ligne = une hue
- Chaque colonne = un stop (05, 10, 20… 95 — ou 0 et 100 pour neutral)
- Cellule : swatch (`background: value`) + valeur en dessous
- Cellule vide si la hue n'a pas ce stop
- `overflow-x: auto` pour les petits écrans
- Les valeurs `oklch(...)` sont passées directement en `background` CSS — les navigateurs modernes les supportent

### Contenu du composant

- [ ] **Créer `apps/docs/src/components/PaletteGrid.astro` :**

```astro
---
import type { PaletteHue } from '../utils/parse-tokens.ts';

interface Props {
    hues: PaletteHue[];
    allStops: string[]; // stops unifiés triés numériquement
}

const { hues, allStops } = Astro.props;

// Construit un index value rapide par hue+stop
function getStopValue(hue: PaletteHue, stop: string): string | undefined {
    return hue.stops.find((s) => s.stop === stop)?.value;
}

// Couleurs claires qui ont besoin d'une bordure pour être visibles sur fond blanc
function needsBorder(value: string): boolean {
    if (!value) return false;
    // hex très clair (luminosité > ~90%)
    if (/^#[fF]{3,6}/.test(value)) return true;
    if (/^#[eEfF][eEfF]/.test(value)) return true;
    return false;
}
---

<div class="palette-wrap">
    <table class="palette-table">
        <thead>
            <tr>
                <th class="hue-label"></th>
                {allStops.map((stop) => (
                    <th class="stop-header">{stop}</th>
                ))}
            </tr>
        </thead>
        <tbody>
            {hues.map((hue) => (
                <tr>
                    <td class="hue-label">{hue.name}</td>
                    {allStops.map((stop) => {
                        const value = getStopValue(hue, stop);
                        return (
                            <td class="stop-cell">
                                {value ? (
                                    <div class="swatch-wrap">
                                        <div
                                            class={`swatch${needsBorder(value) ? ' swatch-bordered' : ''}`}
                                            style={`background: ${value}`}
                                            title={`--ar-color-${hue.name}-${stop}`}
                                        />
                                        <span class="stop-value">{value}</span>
                                    </div>
                                ) : (
                                    <div class="swatch-empty" />
                                )}
                            </td>
                        );
                    })}
                </tr>
            ))}
        </tbody>
    </table>
</div>

<style>
    .palette-wrap {
        overflow-x: auto;
        margin: 1rem 0;
    }

    .palette-table {
        border-collapse: collapse;
        white-space: nowrap;
    }

    .stop-header {
        font-size: 0.65rem;
        color: var(--doc-text-muted, #9ca3af);
        font-weight: 400;
        text-align: center;
        padding: 0 2px 0.4rem;
        width: 3.5rem;
        min-width: 3.5rem;
    }

    .hue-label {
        font-size: 0.75rem;
        font-family: monospace;
        color: var(--doc-text-muted, #6b7280);
        padding-right: 0.75rem;
        vertical-align: middle;
        white-space: nowrap;
        text-align: left;
    }

    thead .hue-label {
        /* cellule vide du coin supérieur gauche */
        min-width: 4.5rem;
    }

    .stop-cell {
        padding: 0 2px 0.5rem;
        vertical-align: top;
    }

    .swatch-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
    }

    .swatch {
        width: 3.5rem;
        height: 2rem;
        border-radius: 4px;
    }

    .swatch-bordered {
        border: 1px solid var(--doc-border, #e5e7eb);
    }

    .swatch-empty {
        width: 3.5rem;
        height: 2rem;
    }

    .stop-value {
        font-size: 0.6rem;
        font-family: monospace;
        color: var(--doc-text-muted, #9ca3af);
        text-align: center;
        max-width: 3.5rem;
        overflow: hidden;
        text-overflow: ellipsis;
    }
</style>
```

- [ ] **Vérifier que le build passe**

```bash
cd apps/docs && npm run build 2>&1 | tail -20
```

Attendu : aucune erreur liée à `PaletteGrid.astro`.

- [ ] **Commit**

```bash
git add apps/docs/src/components/PaletteGrid.astro
git commit -m "feat(docs): ajoute PaletteGrid — grille de swatches par hue"
```

---

## Task 3 : Mettre à jour `tokens.astro`

**Files:**

- Modify: `apps/docs/src/pages/foundations/tokens.astro`

### Contexte

La page doit :

1. Appeler `parsePalette()` pour la section palette brute → `<PaletteGrid>`
2. Appeler `parseTokens()` pour les sections sémantiques (inchangé sauf les labels)
3. Calculer `allStops` comme l'union de tous les stops de toutes les hues, triés numériquement
4. Passer les données au TOC

Note : `tokens.astro` **ne passe pas** de `tocEntries` à `<Layout>` actuellement — le TOC n'est pas activé sur cette page. On l'active avec `showToc={true}` et on construit les entrées.

### Nouveau contenu complet du fichier

- [ ] **Remplacer le contenu de `tokens.astro` :**

```astro
---
/**
 * tokens.astro
 *
 * Page auto-générée depuis le fichier de thème default.css.
 * Aucune duplication manuelle : ajouter un token dans le CSS → apparaît ici.
 */
import Layout from '../../layouts/Layout.astro';
import TableOfContents from '../../components/TableOfContents.astro';
import PaletteGrid from '../../components/PaletteGrid.astro';
import { parseTokens, parsePalette, isColor } from '../../utils/parse-tokens.ts';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const themePath = resolve(process.cwd(), '../../packages/core/src/styles/themes/default.css');
const css = readFileSync(themePath, 'utf-8');

const hues = parsePalette(css);
const categories = parseTokens(css);

// Union de tous les stops, triée numériquement
const allStops = [...new Set(hues.flatMap((h) => h.stops.map((s) => s.stop)))]
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

// Sections pour le TOC (palette brute + catégories sémantiques)
const tocEntries = [
    { id: 'palette-brute', label: 'Palette brute', level: 1 as const },
    ...categories.map((cat) => ({
        id: cat.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        label: cat.label,
        level: 1 as const,
    })),
];
---

<Layout title="Design Tokens" currentPath="/foundations/tokens" showToc={true}>

    <TableOfContents slot="toc" entries={tocEntries} />

    <div class="page-container">
        <div class="page-header">
            <h2 class="page-title">Design Tokens</h2>
            <p class="summary">
                Tokens extraits automatiquement du thème <code>default.css</code>.
                Modifiez le fichier de thème, ces valeurs se mettent à jour à la compilation.
            </p>
        </div>

        <!-- Palette brute -->
        <section id="palette-brute">
            <h3 class="section-title">Palette brute</h3>
            <p class="section-desc">
                Couleurs de base — ne pas utiliser directement dans les composants.
                Passer par les tokens sémantiques ci-dessous.
            </p>
            <PaletteGrid hues={hues} allStops={allStops} />
        </section>

        <!-- Sections sémantiques -->
        {categories
            .filter((cat) => cat.label !== 'Palette brute')
            .map((category) => {
                const id = category.label
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '');
                return (
                    <section id={id}>
                        <h3 class="section-title">{category.label}</h3>
                        <div class="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Token</th>
                                        <th>Valeur</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {category.tokens.map((token) => (
                                        <tr>
                                            <td><code>{token.name}</code></td>
                                            <td>
                                                {isColor(token.value) && (
                                                    <span
                                                        class="swatch"
                                                        style={`background: ${token.value}`}
                                                        title={token.value}
                                                    />
                                                )}
                                                <code class="value">{token.value}</code>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                );
            })}
    </div>

</Layout>

<style>
    @import '../../styles/doc-prose.css';
    @import '../../styles/doc-table.css';

    .section-desc {
        font-size: 0.875rem;
        color: var(--doc-text-muted, #6b7280);
        margin: -0.5rem 0 1rem;
    }

    .swatch {
        display: inline-block;
        width: 1.75rem;
        height: 1.75rem;
        border-radius: 4px;
        vertical-align: middle;
        margin-right: 0.5rem;
        border: 1px solid transparent;
    }

    .value {
        color: var(--doc-text-muted, #6b7280);
    }
</style>
```

- [ ] **Vérifier que le build passe**

```bash
cd apps/docs && npm run build 2>&1 | tail -30
```

Attendu : build Astro sans erreur TypeScript ni erreur de rendu.

- [ ] **Vérifier visuellement en dev**

```bash
cd apps/docs && npm run dev
```

Ouvrir `http://localhost:4321/foundations/tokens` et vérifier :

- Section "Palette brute" visible avec la grille
- Toutes les hues affichées (primary, neutral, green… pink)
- Swatches colorés (plus de cases grises/vides)
- Stops neutral-0 et neutral-100 présents dans les colonnes de header
- Sections sémantiques (Interaction, Texte & Surface, États, Focus…) avec leurs swatches
- TOC latéral avec toutes les sections

- [ ] **Commit**

```bash
git add apps/docs/src/pages/foundations/tokens.astro
git commit -m "feat(docs): refonte page Design Tokens — grille palette + sous-sections sémantiques"
```

---

## Task 4 : Vérification finale et push

- [ ] **Build de production complet**

```bash
cd /Users/jon/Code/Active_projects/ariane && npm run build 2>&1 | tail -30
```

Attendu : build sans erreur.

- [ ] **Vérifier l'absence de régressions sur les autres pages**

Ouvrir en dev et vérifier une page composant (ex: `/components/ar-alert`) — les swatches `@cssprop` dans `ComponentApi` ne doivent pas être impactés.

- [ ] **Push de la branche**

```bash
git push -u origin fix/design-tokens-page
```
